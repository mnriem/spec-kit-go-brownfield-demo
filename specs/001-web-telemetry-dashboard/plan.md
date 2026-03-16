# Implementation Plan: Web-Based Telemetry Dashboard

**Branch**: `001-web-telemetry-dashboard` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-web-telemetry-dashboard/spec.md`

## Summary

Add a lightweight, read-only web dashboard that provides real-time telemetry monitoring, event viewing, and connection status for mission stakeholders who do not use the VSCode environment. The dashboard is a standalone React application served alongside the existing Go backend, connecting to the same gRPC `Api` service that powers the VSCode extension. It reuses existing shared TypeScript modules (`@gov.nasa.jpl.hermes/types`, `@gov.nasa.jpl.hermes/api`, `@gov.nasa.jpl.hermes/util`) and adapts existing UI patterns (EvrTable's virtual scrolling and filtering) for a browser context free of VSCode dependencies.

## Technical Context

**Language/Version**: TypeScript ≥5.5 (strict mode), Go ≥1.26 (backend proxy)
**Primary Dependencies**: React 19, `@tanstack/react-virtual`, `@grpc/grpc-js` (via proxy), esbuild
**Storage**: N/A (read-only; all data streamed from existing Hermes backend via gRPC)
**Testing**: Jest + ts-jest (unit), Docker-based integration tests (gRPC streaming)
**Target Platform**: Modern web browsers (latest 2 versions of Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (single-page app served by Go backend)
**Performance Goals**: 500 concurrent telemetry channels at 1 Hz update rate, 10,000+ events with sub-second filtering, 10 simultaneous dashboard users
**Constraints**: Read-only (no commanding), <2s telemetry latency, esbuild-only bundling (no Webpack), must reuse existing shared modules
**Scale/Scope**: ~8-10 new source files, 3 primary views (telemetry, events, connections), 1 new Go HTTP handler

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Protocol-Driven Design | ✅ PASS | Dashboard consumes existing gRPC `Api` service — `SubTelemetry`, `SubEvent`, `SubscribeFsw`, `AllFsw`, `AllDictionary`. No new proto definitions required. All data flows through existing `.proto`-defined services. |
| II | Dual-Language Code Quality | ✅ PASS | TypeScript strict mode enforced. Workspace imports via `@gov.nasa.jpl.hermes/*` aliases. Go proxy handler follows existing error-wrapping and context patterns. |
| III | Testing Discipline | ✅ PASS | Unit tests for data transformation, filtering logic, and connection state management. Integration tests for gRPC streaming via Docker. Table-driven tests for filter combinations. Coverage must not decrease. |
| IV | User Experience Consistency | ⚠️ ADAPTED | Constitution specifies VSCode-specific patterns (`WebViewPanelBase`, Codicon icons, VS Code messenger). The web dashboard is intentionally a non-VSCode surface; it adapts the same interaction patterns (severity filtering, time format switching, virtual scrolling) to standard HTML/CSS without requiring VSCode toolkit dependencies. This is a justified departure — the entire purpose of this feature is to provide access outside VSCode. |
| V | Performance & Real-Time | ✅ PASS | Virtual scrolling via `@tanstack/react-virtual` for event lists (constitution-mandated for >500 rows). Debounced UI updates for high-frequency telemetry. esbuild for bundling. |
| VI | Observability | ✅ PASS | Go proxy handler instrumented with existing `otelgrpc` interceptors. Dashboard HTTP endpoint registered with existing server metrics. Structured logging via `pkg/log`. |
| VII | Simplicity & Maintainability | ✅ PASS | Reuses existing modules instead of creating parallel implementations. Single Go HTTP handler for WebSocket proxy. No new direct dependencies beyond what's needed (grpc-web proxy pattern). Lean SPA with no routing framework. |

**Gate Result**: PASS (Principle IV adapted with documented justification — web dashboard is inherently outside VSCode scope)

## Project Structure

### Documentation (this feature)

```text
specs/001-web-telemetry-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── modules/                          # Existing shared modules (reused)
│   ├── api/                          # Api interface — consumed by dashboard
│   ├── types/                        # Telemetry, Event, EvrSeverity, Convert
│   ├── util/                         # sprintf, generateShortUid
│   └── rpc/                          # gRPC client — consumed by dashboard proxy
├── dashboard/                        # NEW — web dashboard application
│   ├── package.json                  # Workspace package with shared deps
│   ├── tsconfig.json                 # TypeScript config (strict, ES2022)
│   ├── src/
│   │   ├── index.html                # SPA entry point
│   │   ├── index.tsx                 # React app bootstrap
│   │   ├── App.tsx                   # Root component with tab navigation
│   │   ├── hooks/
│   │   │   ├── useGrpcStream.ts      # WebSocket-based gRPC streaming hook
│   │   │   └── useConnectionStatus.ts # Backend connectivity monitoring
│   │   ├── views/
│   │   │   ├── TelemetryView.tsx     # Real-time telemetry table (P1)
│   │   │   ├── EventView.tsx         # EVR log with filtering (P2)
│   │   │   └── ConnectionsView.tsx   # FSW connection overview (P3)
│   │   ├── components/
│   │   │   ├── FilterBar.tsx         # Shared filter controls
│   │   │   ├── TimeFormatSelector.tsx # UTC/Local/SCLK switcher
│   │   │   ├── StatusBanner.tsx      # Connectivity status indicator
│   │   │   └── EmptyState.tsx        # No-data placeholder
│   │   └── styles/
│   │       └── dashboard.css         # Dashboard-specific styles
│   └── test/
│       ├── TelemetryView.test.tsx    # Unit tests
│       ├── EventView.test.tsx        # Unit tests
│       └── hooks.test.ts             # Hook unit tests

pkg/
├── dashboard/                        # NEW — Go HTTP/WebSocket handler
│   └── handler.go                    # Serves SPA + WebSocket-to-gRPC proxy

cmd/
└── backend/
    └── main.go                       # MODIFIED — register dashboard handler

test/
└── dashboard_test.go                 # NEW — integration tests
```

**Structure Decision**: The dashboard is a new yarn workspace package (`src/dashboard/`) that follows the existing monorepo pattern. It depends on shared modules via `@gov.nasa.jpl.hermes/*` workspace aliases. The Go backend gains a single new package (`pkg/dashboard/`) that serves the built SPA assets and proxies WebSocket connections to the gRPC `Api` service. This keeps the dashboard self-contained while maximizing code reuse.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle IV departure (non-VSCode UI) | The feature's explicit purpose is browser-based access for non-VSCode users | N/A — there is no VSCode-compatible way to serve a standalone web dashboard |
