import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface WsMessage {
    type: string;
    data?: unknown;
}

type MessageHandler = (data: unknown) => void;

export interface UseGrpcStreamResult {
    state: ConnectionState;
    lastError: string | null;
    reconnectAttempt: number;
    subscribe: (type: string, filter?: Record<string, unknown>) => void;
    unsubscribe: (type: string) => void;
    send: (message: WsMessage) => void;
    on: (type: string, handler: MessageHandler) => void;
    off: (type: string, handler: MessageHandler) => void;
}

const MAX_BACKOFF_MS = 30_000;

function getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}

export function useGrpcStream(wsUrl?: string): UseGrpcStreamResult {
    const [state, setState] = useState<ConnectionState>('disconnected');
    const [lastError, setLastError] = useState<string | null>(null);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listenersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());

    const dispatch = useCallback((type: string, data: unknown) => {
        const handlers = listenersRef.current.get(type);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }, []);

    const on = useCallback((type: string, handler: MessageHandler) => {
        let handlers = listenersRef.current.get(type);
        if (!handlers) {
            handlers = new Set();
            listenersRef.current.set(type, handlers);
        }
        handlers.add(handler);
    }, []);

    const off = useCallback((type: string, handler: MessageHandler) => {
        const handlers = listenersRef.current.get(type);
        if (handlers) {
            handlers.delete(handler);
        }
    }, []);

    const connect = useCallback(() => {
        const url = wsUrl ?? getWsUrl();
        setState('connecting');

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setState('connected');
            setReconnectAttempt(0);
            setLastError(null);
        };

        ws.onmessage = (event) => {
            try {
                const msg: WsMessage = JSON.parse(event.data as string);
                switch (msg.type) {
                    case 'error': {
                        const errData = msg.data as { message?: string };
                        const errMsg = errData?.message ?? 'Unknown error';
                        setLastError(errMsg);
                        dispatch('error', errMsg);
                        break;
                    }
                    case 'connected':
                        break;
                    default:
                        dispatch(msg.type, msg.data);
                        break;
                }
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            wsRef.current = null;
            setState((prev) => {
                if (prev === 'connected' || prev === 'connecting') {
                    return 'reconnecting';
                }
                return prev;
            });
        };

        ws.onerror = () => {
            setLastError('WebSocket connection error');
        };
    }, [wsUrl, dispatch]);

    // Reconnection with exponential backoff
    useEffect(() => {
        if (state === 'reconnecting') {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_BACKOFF_MS);
            reconnectTimerRef.current = setTimeout(() => {
                setReconnectAttempt((n) => n + 1);
                connect();
            }, delay);

            return () => {
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                }
            };
        }
    }, [state, reconnectAttempt, connect]);

    // Initial connection
    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    const send = useCallback((message: WsMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    const subscribe = useCallback((type: string, filter?: Record<string, unknown>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: `subscribe_${type}`, filter: filter ?? {} }));
        }
    }, []);

    const unsubscribe = useCallback((type: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'unsubscribe', id: type }));
        }
    }, []);

    return { state, lastError, reconnectAttempt, subscribe, unsubscribe, send, on, off };
}
