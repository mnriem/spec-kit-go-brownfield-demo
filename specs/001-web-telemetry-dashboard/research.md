# Research: Web-Based Telemetry Dashboard

**Feature Branch**: `001-web-telemetry-dashboard`
**Date**: 2026-03-16

## R1: gRPC-Web Browser Connectivity

**Context**: The Hermes backend exposes a gRPC `Api` service on port 50051. Browsers cannot make native gRPC calls (HTTP/2 trailers are not accessible from browser JavaScript). The dashboard needs a strategy for browser-to-gRPC communication.

**Decision**: WebSocket proxy in the Go backend

**Rationale**: The Go backend already manages the gRPC server. Adding a WebSocket endpoint alongside it avoids introducing an external proxy dependency (like Envoy or grpc-web). The Go handler upgrades HTTP connections to WebSocket, then forwards messages to the local gRPC service methods. This keeps the architecture simple (Principle VII), avoids a new external dependency, and reuses the existing `otelgrpc` instrumentation (Principle VI).

**Alternatives considered**:

| Alternative | Why Rejected |
|-------------|-------------|
| grpc-web + Envoy proxy | Adds an external proxy service to the deployment. Violates Principle VII (simplicity). Requires additional Docker service and configuration. |
| grpc-web + Connect-Go | Connect-Go is a separate RPC framework. Mixing it with existing `google.golang.org/grpc` adds complexity and a new dependency without clear benefit. |
| REST API wrapper | Would require defining and maintaining a separate REST API parallel to the gRPC one. Duplicates interface definitions, violates Principle I (protocol-driven). |
| Server-Sent Events (SSE) | Only supports server-to-client streaming. The dashboard needs bidirectional communication for subscription management (filter changes, reconnection). |

## R2: Frontend Framework and Styling

**Context**: The constitution mandates React ≥19 and esbuild for bundling. The existing VSCode webviews use `@vscode-elements/react-elements` for UI components, which are VSCode-specific. The dashboard needs a standalone styling approach.

**Decision**: Plain React with standard HTML/CSS, no component framework

**Rationale**: The dashboard has a small surface area (3 views, ~8 components). Adding a UI component library (Material UI, Radix, etc.) introduces a significant dependency for minimal benefit. Plain HTML elements with a focused CSS file keeps the bundle small, avoids dependency churn, and is consistent with Principle VII (simplicity). The dashboard can reference the VSCode color palette conventions for visual consistency without depending on VSCode packages.

**Alternatives considered**:

| Alternative | Why Rejected |
|-------------|-------------|
| `@vscode-elements/react-elements` | Depends on VSCode webview APIs (`acquireVsCodeApi`). Cannot function outside a VSCode webview context. |
| Material UI / Chakra UI | Adds 200KB+ to bundle, introduces complex dependency tree, overkill for 3 views. |
| Tailwind CSS | Adds build tooling dependency; esbuild plugin ecosystem for Tailwind adds complexity. Plain CSS is sufficient for this scope. |

## R3: Telemetry and Event Data Flow

**Context**: The existing VSCode extension connects to gRPC via `@gov.nasa.jpl.hermes/rpc` which uses `@grpc/grpc-js` (Node.js native gRPC). The browser cannot use `@grpc/grpc-js`. The dashboard needs a data flow from gRPC subscriptions to React state.

**Decision**: Go WebSocket proxy handles gRPC subscriptions server-side; dashboard receives JSON messages over WebSocket

**Rationale**: The Go backend is already the gRPC server host. It can subscribe to its own services internally (or forward to the gRPC client interface) and relay messages as JSON over WebSocket to the browser. This means the browser never needs a gRPC client — it receives typed JSON messages that map directly to the existing TypeScript types (`Sourced<Telemetry>`, `Sourced<Event>`, `Fsw[]`). The `@gov.nasa.jpl.hermes/types` module provides the TypeScript type definitions and `Convert` utilities to deserialize these.

**Data flow**:
```
Browser (React) ←WebSocket JSON→ Go Backend (pkg/dashboard) ←internal→ gRPC Api service
```

**Alternatives considered**:

| Alternative | Why Rejected |
|-------------|-------------|
| Run `@grpc/grpc-js` in-browser via polyfills | `@grpc/grpc-js` requires Node.js `http2` module. Browser polyfills are incomplete and unreliable for streaming. |
| Compile proto to grpc-web stubs | Requires Envoy or Connect proxy, adds proto build step for a separate target, complicates build pipeline. |

## R4: Shared Module Reuse Strategy

**Context**: The spec requires reusing `@gov.nasa.jpl.hermes/types`, `@gov.nasa.jpl.hermes/api`, and `@gov.nasa.jpl.hermes/util`. These modules currently import `vscode` types in some places.

**Decision**: Reuse `types` and `util` directly (they have no `vscode` runtime dependency). Create a thin dashboard-specific API adapter that implements the read-only subset of the `Api` interface over WebSocket.

**Rationale**: The `types` module contains pure type definitions, conversion utilities (`Convert`), and enums (`EvrSeverity`, `TimeFormat`) — none of which depend on VSCode at runtime. The `util` module provides `sprintf` and `generateShortUid` — also pure functions. The `api` module defines the `Api` interface which uses `vscode.Event<T>` for event subscriptions — this needs adaptation. The dashboard will implement a WebSocket-based client that provides equivalent event emitter semantics without the `vscode` dependency.

**Module dependency analysis**:

| Module | VSCode Runtime Dep? | Dashboard Strategy |
|--------|--------------------|--------------------|
| `@gov.nasa.jpl.hermes/types` | No (types only) | Direct import |
| `@gov.nasa.jpl.hermes/util` | No (pure functions) | Direct import |
| `@gov.nasa.jpl.hermes/api` | Yes (`vscode.Event`) | Import types only, implement WebSocket adapter |
| `@gov.nasa.jpl.hermes/rpc` | Yes (`@grpc/grpc-js`) | Not used in browser — proxy handles gRPC |
| `@gov.nasa.jpl.hermes/rjsf` | Yes (VSCode toolkit) | Not used — dashboard uses plain HTML |
| `@gov.nasa.jpl.hermes/vscode` | Yes (VSCode API) | Not used |

## R5: Virtual Scrolling for Event Lists

**Context**: Constitution Principle V mandates virtual scrolling for datasets >500 rows, recommending `@tanstack/react-virtual`. The existing EvrTable already uses this library.

**Decision**: Use `@tanstack/react-virtual` (already a project dependency)

**Rationale**: Already used in the project (EvrTable in `src/extensions/core/app/evrs/`), so it's not a new dependency. Provides the exact virtual scrolling capability needed for the event viewer. The existing EvrTable provides a proven pattern to adapt.

## R6: Build and Serving Strategy

**Context**: The dashboard needs to be built and served. The project uses esbuild exclusively (Principle V). The Go backend serves gRPC on port 50051.

**Decision**: esbuild bundles the dashboard SPA into a static directory. The Go backend serves the static files over HTTP on a configurable port (default 8080) alongside the WebSocket proxy endpoint.

**Rationale**: Serving from the Go backend avoids needing a separate web server. The dashboard is a single-page app that can be served as a static bundle (index.html + JS + CSS). esbuild produces a small, fast build. The Go backend already has the infrastructure for flag-based configuration (`--dashboard-port`, `--dashboard-dir`).

**Alternatives considered**:

| Alternative | Why Rejected |
|-------------|-------------|
| Separate Node.js server | Adds a service to the deployment, more moving parts, violates simplicity. |
| Embed static files in Go binary | Possible with `embed.FS`, but during development you'd lose hot-reload. Better to serve from filesystem with embed as a release optimization. |
| Serve on same port as gRPC (50051) | gRPC and HTTP can technically share a port with `cmux`, but this adds complexity and risks interference. Separate port is cleaner. |

## R7: Authentication Approach

**Context**: The spec assumes "authentication follows the same mechanism used by the existing Hermes infrastructure." The existing infrastructure supports three modes: none, user/password, and token-based (via gRPC metadata).

**Decision**: The WebSocket proxy inherits the backend's authentication configuration. If the backend is configured with authentication, the dashboard presents a simple login form that obtains credentials and passes them as WebSocket connection parameters.

**Rationale**: No new authentication mechanism is introduced. The Go proxy handler validates credentials against the same store used by the gRPC service. For unauthenticated deployments (the common local development case), no login is required.
