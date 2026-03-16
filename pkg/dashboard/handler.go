// Package dashboard provides an HTTP handler that serves the web dashboard
// static files and proxies WebSocket connections to the Hermes gRPC message buses.
package dashboard

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"sync"

	"github.com/nasa/hermes/pkg/host"
	"github.com/nasa/hermes/pkg/log"
	"github.com/nasa/hermes/pkg/pb"
	"golang.org/x/net/websocket"
)

// Handler serves the dashboard SPA and WebSocket proxy.
type Handler struct {
	staticDir string
	logger    log.Logger
	mux       *http.ServeMux
}

// NewHandler creates a dashboard HTTP handler that serves static files
// from staticDir and proxies WebSocket connections to gRPC buses.
func NewHandler(staticDir string) *Handler {
	h := &Handler{
		staticDir: staticDir,
		logger:    log.GetLogger(context.TODO()),
		mux:       http.NewServeMux(),
	}

	// Accept WebSocket connections from any origin (read-only dashboard)
	wsServer := websocket.Server{Handler: h.handleWebSocket}
	h.mux.Handle("/ws", wsServer)
	h.mux.Handle("/", http.FileServer(http.Dir(staticDir)))

	return h
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mux.ServeHTTP(w, r)
}

// wsMessage is the envelope for all WebSocket messages.
type wsMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// wsSubscribeFilter mirrors the client subscription filter.
type wsSubscribeFilter struct {
	Source  string   `json:"source"`
	Names  []string `json:"names"`
	Context string  `json:"context"`
}

// wsSubscribeRequest is a client subscription message.
type wsSubscribeRequest struct {
	Type   string            `json:"type"`
	Filter wsSubscribeFilter `json:"filter"`
	ID     string            `json:"id"`
}

func (h *Handler) handleWebSocket(ws *websocket.Conn) {
	defer ws.Close()

	ctx, cancel := context.WithCancel(ws.Request().Context())
	defer cancel()

	var mu sync.Mutex
	send := func(msgType string, data any) {
		encoded, err := json.Marshal(data)
		if err != nil {
			h.logger.Warn("failed to marshal WebSocket message", "type", msgType, "err", err)
			return
		}
		msg := wsMessage{Type: msgType, Data: encoded}
		mu.Lock()
		defer mu.Unlock()
		if err := websocket.JSON.Send(ws, msg); err != nil {
			h.logger.Debug("failed to send WebSocket message", "type", msgType, "err", err)
		}
	}

	send("connected", struct{}{})

	// Track active subscription cancellations
	var subMu sync.Mutex
	subs := map[string]context.CancelFunc{}

	cancelSub := func(name string) {
		subMu.Lock()
		defer subMu.Unlock()
		if c, ok := subs[name]; ok {
			c()
			delete(subs, name)
		}
	}

	newSubCtx := func(name string) context.Context {
		cancelSub(name)
		subMu.Lock()
		defer subMu.Unlock()
		subCtx, subCancel := context.WithCancel(ctx)
		subs[name] = subCancel
		return subCtx
	}

	defer func() {
		subMu.Lock()
		for _, c := range subs {
			c()
		}
		subMu.Unlock()
	}()

	for {
		var req wsSubscribeRequest
		if err := websocket.JSON.Receive(ws, &req); err != nil {
			h.logger.Debug("WebSocket read error (client likely disconnected)", "err", err)
			return
		}

		switch req.Type {
		case "subscribe_telemetry":
			subCtx := newSubCtx("telemetry")
			filter := req.Filter
			host.Telemetry.On(subCtx, func(msg *pb.SourcedTelemetry) {
				if filter.Source != "" && msg.GetSource() != filter.Source {
					return
				}
				if len(filter.Names) > 0 && !slices.Contains(filter.Names, msg.GetTelemetry().GetRef().GetName()) {
					return
				}
				send("telemetry", msg)
			})

		case "subscribe_events":
			subCtx := newSubCtx("events")
			filter := req.Filter
			host.Event.On(subCtx, func(msg *pb.SourcedEvent) {
				if filter.Source != "" && msg.GetSource() != filter.Source {
					return
				}
				send("event", msg)
			})

		case "subscribe_fsw":
			subCtx := newSubCtx("fsw")
			host.Profiles.ConnectionState.Subscribe(subCtx, func(f []*pb.Fsw) {
				send("fsw_list", f)
			})

		case "get_dictionaries":
			dicts := host.Dictionaries.All()
			type dictHead struct {
				ID   string `json:"id"`
				Type string `json:"type"`
			}
			heads := make([]dictHead, 0, len(dicts))
			for id, d := range dicts {
				heads = append(heads, dictHead{ID: id, Type: d.GetHead().GetType()})
			}
			send("dictionaries", heads)

		case "get_dictionary":
			dict := host.Dictionaries.Get(req.ID)
			if dict == nil {
				send("error", map[string]string{"message": fmt.Sprintf("dictionary not found: %s", req.ID)})
			} else {
				send("dictionary", dict)
			}

		case "unsubscribe":
			// req.ID carries the subscription name when used as a simple field
			cancelSub(req.ID)

		default:
			send("error", map[string]string{"message": fmt.Sprintf("unknown message type: %s", req.Type)})
		}
	}
}
