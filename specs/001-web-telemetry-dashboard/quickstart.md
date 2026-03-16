# Quickstart: Web-Based Telemetry Dashboard

**Feature Branch**: `001-web-telemetry-dashboard`

## Prerequisites

- Node.js ≥20 and Yarn (workspace monorepo)
- Go ≥1.26
- A running Hermes backend with at least one FSW connection (for live data)
- Docker Compose (for integration tests)

## Development Setup

### 1. Install dependencies

```bash
cd /path/to/hermes
yarn install
```

The dashboard is a workspace package at `src/dashboard/`. Dependencies are installed automatically via the root `yarn install`.

### 2. Build all packages (including dashboard)

```bash
yarn build
```

This builds all workspace packages including the dashboard SPA. The dashboard output is in `src/dashboard/out/` (index.html, JS bundle, CSS).

To build only the dashboard:

```bash
cd src/dashboard
yarn build
```

### 3. Start the Hermes backend with dashboard

```bash
# From repository root
go run ./cmd/backend --dashboard-port 8080 --dashboard-dir src/dashboard/out
```

The backend serves:
- gRPC API on the default port (50051)
- Dashboard web UI on `http://localhost:8080`
- WebSocket proxy on `ws://localhost:8080/ws`

### 4. Open the dashboard

Navigate to `http://localhost:8080` in a modern web browser.

## Development Workflow

### Watch mode (frontend)

```bash
cd src/dashboard
yarn watch
```

Rebuilds the SPA on file changes. Refresh the browser to see updates.

### Run frontend unit tests

```bash
yarn test --scope=@gov.nasa.jpl.hermes/dashboard
# or
cd src/dashboard && yarn test
```

### Run integration tests

```bash
# Requires Docker
make test-integration
```

### Lint

```bash
yarn lint
```

## Architecture Overview

```
┌──────────────────────────────────┐
│  Browser (React SPA)             │
│  - TelemetryView                 │
│  - EventView                     │
│  - ConnectionsView               │
└──────────┬───────────────────────┘
           │ WebSocket (JSON)
           ▼
┌──────────────────────────────────┐
│  Go Backend (pkg/dashboard)      │
│  - HTTP static file server       │
│  - WebSocket → gRPC proxy        │
└──────────┬───────────────────────┘
           │ internal gRPC calls
           ▼
┌──────────────────────────────────┐
│  Hermes gRPC Api Service         │
│  - SubTelemetry, SubEvent        │
│  - SubscribeFsw, AllFsw          │
│  - GetDictionary, AllDictionary  │
└──────────────────────────────────┘
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/dashboard/src/index.tsx` | React app entry point |
| `src/dashboard/src/App.tsx` | Root component with tab navigation |
| `src/dashboard/src/views/TelemetryView.tsx` | Live telemetry channel display |
| `src/dashboard/src/views/EventView.tsx` | EVR log with filtering |
| `src/dashboard/src/views/ConnectionsView.tsx` | FSW connection overview |
| `src/dashboard/src/hooks/useGrpcStream.ts` | WebSocket streaming hook |
| `pkg/dashboard/handler.go` | Go HTTP/WebSocket handler |
| `cmd/backend/main.go` | Backend entry (modified to register dashboard) |

## Configuration

The dashboard is configured via Go backend CLI flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--dashboard-port` | `8080` | HTTP port for the dashboard |
| `--dashboard-dir` | `""` | Path to built dashboard files (empty = disabled) |

When `--dashboard-dir` is empty, the dashboard is not served (existing behavior preserved).

## Docker

The dashboard is included in the existing Docker build:

```bash
# Build and run with docker-compose (includes monitoring stack)
docker compose up --build

# Or standalone:
docker build -f docker/Dockerfile -t hermes .
docker run -p 50051:50051 -p 8080:8080 hermes
```
