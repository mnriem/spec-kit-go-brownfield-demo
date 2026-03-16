# Tasks: Web-Based Telemetry Dashboard

**Input**: Design documents from `/specs/001-web-telemetry-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the dashboard workspace package and build tooling

- [x] T001 Create dashboard workspace package with package.json at src/dashboard/package.json — set name to `@gov.nasa.jpl.hermes/dashboard`, add dependencies: `react` (^19), `react-dom` (^19), `@tanstack/react-virtual`, and workspace deps `@gov.nasa.jpl.hermes/types`, `@gov.nasa.jpl.hermes/util`; add devDependencies for `@types/react`, `@types/react-dom`; add scripts for `build`, `watch`, `test`
- [x] T002 Create TypeScript configuration at src/dashboard/tsconfig.json — enable `strict: true`, target ES2022, module ES2022, jsx react-jsx; configure paths alias for `@gov.nasa.jpl.hermes/*` workspace packages; extend from root tsconfig patterns
- [x] T003 Register dashboard workspace in root package.json — add `src/dashboard` to the `workspaces` array alongside existing entries
- [x] T004 Add dashboard esbuild configuration in build.js — add a new build entry for `src/dashboard/src/index.tsx` that outputs to `src/dashboard/out/`, bundles CSS, uses the existing `esbuildProblemMatcherPlugin`, and handles the `sassPlugin`/CSS modules plugins; configure external modules as needed for browser target
- [x] T005 Create SPA entry HTML file at src/dashboard/src/index.html — minimal HTML5 document with `<div id="root">`, script tag referencing the esbuild output bundle, viewport meta tag for responsive layout, and page title "Hermes Dashboard"

**Checkpoint**: `yarn install` succeeds, `yarn build` includes dashboard, SPA skeleton loads in browser

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Go WebSocket proxy, client-side WebSocket hook, app shell, and shared components — MUST be complete before ANY user story view can function

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement Go WebSocket-to-gRPC proxy handler in pkg/dashboard/handler.go — create an HTTP handler struct that accepts a `*grpc.Server` or the internal API service reference; implement WebSocket upgrade using `golang.org/x/net/websocket` or `nhooyr.io/websocket`; handle client subscription messages (`subscribe_telemetry`, `subscribe_events`, `subscribe_fsw`, `get_dictionaries`, `get_dictionary`, `unsubscribe`) by calling the corresponding gRPC Api service methods internally; relay gRPC streaming responses as JSON text frames per the WebSocket API contract in specs/001-web-telemetry-dashboard/contracts/websocket-api.md; serve static files from a configurable directory for all non-`/ws` HTTP requests; add structured logging via `pkg/log` and OpenTelemetry instrumentation via existing `otelgrpc` patterns; support concurrent WebSocket clients (FR-007); ensure read-only — only subscription/query RPCs are proxied, never Command/Sequence/Uplink
- [x] T007 Register dashboard handler in cmd/backend/main.go — add `--dashboard-port` (default 8080) and `--dashboard-dir` (default empty) CLI flags using `pflag`; when `--dashboard-dir` is non-empty, create an `http.Server` on the dashboard port using `pkg/dashboard.Handler`; start the HTTP server in a goroutine alongside the existing gRPC server; add graceful shutdown coordinated with existing `signal.NotifyContext`; add log message indicating dashboard URL on startup; when `--dashboard-dir` is empty, skip dashboard server entirely (preserve existing behavior)
- [x] T008 Implement WebSocket streaming React hook in src/dashboard/src/hooks/useGrpcStream.ts — create `useGrpcStream` custom hook that manages a single WebSocket connection to `ws://<host>/ws`; implement the connection state machine (DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING) from data-model.md; handle automatic reconnection with exponential backoff (1s, 2s, 4s, max 30s) per the contract; provide `subscribe(type, filter)` and `unsubscribe(type)` methods; expose typed event callbacks for `telemetry`, `event`, `fsw_list`, `dictionaries`, `error` message types; parse incoming JSON messages and dispatch to registered callbacks; export connection state for UI consumption
- [x] T009 [P] Implement connection status hook in src/dashboard/src/hooks/useConnectionStatus.ts — create `useConnectionStatus` hook that wraps `useGrpcStream` connection state; expose `status` (connected/connecting/disconnected/reconnecting), `lastError` (string | null), and `reconnectAttempt` (number) for StatusBanner consumption
- [x] T010 [P] Create StatusBanner component in src/dashboard/src/components/StatusBanner.tsx — renders a dismissible banner at the top of the page showing WebSocket connection state; display green "Connected" indicator when connected; display yellow "Reconnecting..." with attempt count during reconnection; display red "Disconnected — Backend unreachable" with manual reconnect button when all retries exhausted; auto-hide the green indicator after 3 seconds
- [x] T011 [P] Create EmptyState component in src/dashboard/src/components/EmptyState.tsx — reusable placeholder for views with no data; accept `title` and `message` props; used when no FSW connections are active (edge case), no telemetry received yet, or no events recorded; render centered text with a muted icon
- [x] T012 [P] Create TimeFormatSelector component in src/dashboard/src/components/TimeFormatSelector.tsx — dropdown/toggle that switches between UTC, Local, and SCLK time display formats; use `TimeFormat` enum from `@gov.nasa.jpl.hermes/types`; maintain selected format in React state and pass via context or prop callback; reused by TelemetryView (US1) and EventView (US2)
- [x] T013 [P] Create FilterBar component in src/dashboard/src/components/FilterBar.tsx — reusable filter toolbar with: text search input (partial match), multi-select dropdown for sources, and optional multi-select for severity levels; accept `sources: string[]`, `severities?: EvrSeverity[]`, `onFilterChange` callback; debounce text input by 150ms; emit structured filter state `{ text: string, sources: string[], severities?: EvrSeverity[] }`
- [x] T014 Create root App component in src/dashboard/src/App.tsx — render a simple tab-based navigation with three tabs: "Telemetry" (default active), "Events", and "Connections"; render the active view component (TelemetryView, EventView, or ConnectionsView) based on selected tab; include StatusBanner at the top (always visible across all tabs); initialize the WebSocket connection via `useGrpcStream` and pass the stream context down to child views via React context; include the dashboard header with "Hermes Dashboard" branding
- [x] T015 Create React app bootstrap in src/dashboard/src/index.tsx — import React and ReactDOM; create root using `createRoot` on the `#root` element from index.html; render `<App />` component; import global dashboard.css
- [x] T016 Create dashboard styles in src/dashboard/src/styles/dashboard.css — define base styles: dark theme consistent with VSCode/Hermes aesthetic (dark background, light text); style tab navigation, table layouts, filter inputs, status banners; use CSS custom properties for color palette; style severity level badges (DIAGNOSTIC=gray, ACTIVITY_LO/HI=blue, WARNING_LO=yellow, WARNING_HI=orange, COMMAND=cyan, FATAL=red); ensure responsive layout for common screen sizes; style scrollable containers for virtual scrolling

**Checkpoint**: Dashboard loads at `http://localhost:8080` showing the app shell with three tabs, StatusBanner reflects WebSocket connection state, shared components render correctly. No data displayed yet (views are stubs).

---

## Phase 3: User Story 1 — Real-Time Telemetry Monitoring (Priority: P1) 🎯 MVP

**Goal**: Stakeholders open a browser and see live telemetry values streaming from connected spacecraft in real time

**Independent Test**: Start Hermes backend with an active FSW connection, open `http://localhost:8080`, verify the Telemetry tab shows live updating channel values with name, value, timestamp, and source

### Implementation for User Story 1

- [x] T017 [US1] Implement TelemetryView in src/dashboard/src/views/TelemetryView.tsx — subscribe to `subscribe_telemetry` via `useGrpcStream` on mount with empty filter (all sources, all channels); maintain a `Map<string, TelemetryChannel>` keyed by composite key `(source, name)` that accumulates the latest value for each channel; render a table with columns: Source, Channel Name, Value, Time (formatted per TimeFormatSelector); update values in-place as new telemetry messages arrive; batch UI renders using `requestAnimationFrame` or `setTimeout(0)` at 100ms intervals to prevent excessive re-renders at high telemetry rates (FR-009: 500 channels at 1 Hz); display raw channel IDs when dictionary is not yet loaded, switch to human-readable names when dictionary arrives (edge case from spec); show EmptyState when no telemetry has been received; include FilterBar with source and channel name text search (FR-003); group or sort channels by source name to disambiguate overlapping channel names across sources (edge case from spec)
- [x] T018 [US1] Wire dictionary resolution into TelemetryView in src/dashboard/src/views/TelemetryView.tsx — on WebSocket connect, send `get_dictionaries` message; when dictionaries response arrives, send `get_dictionary` for each dictionary ID to fetch full definitions; build a lookup map from `(telemetryRef.id)` → `{ name, component, type }` using types from `@gov.nasa.jpl.hermes/types`; when telemetry messages arrive, resolve `ref.id` to human-readable name via the dictionary lookup; if dictionary is not yet loaded, display raw `ref.id` as channel name and replace seamlessly once dictionary is available (edge case from spec)
- [x] T019 [US1] Add telemetry source filtering in src/dashboard/src/views/TelemetryView.tsx — extract unique source IDs from the telemetry channel map; pass sources list to FilterBar component; when source filter changes, visually hide non-matching channels (client-side filtering; keep all data in memory for instant filter toggling); when text filter changes, filter channels whose name contains the search text (case-insensitive partial match per FR-003); persist filter state until explicitly cleared
- [x] T020 [US1] Add multi-source dynamic discovery in src/dashboard/src/views/TelemetryView.tsx — subscribe to `subscribe_fsw` to detect new FSW connections appearing at runtime; when a new source appears in the telemetry stream that was not previously seen, automatically add it to the source filter list and display its channels; clearly label each channel row with its source name (acceptance scenario 2: second FSW connection appears dynamically)

**Checkpoint**: Telemetry tab shows live streaming values from all connected FSWs. Filtering by source and channel name works. Dictionary resolution provides human-readable names. Multiple simultaneous sources are clearly labeled. This is the MVP — functional and independently testable.

---

## Phase 4: User Story 2 — Event Log Viewing and Filtering (Priority: P2)

**Goal**: Stakeholders view a chronological log of spacecraft events (EVRs) with severity-based filtering, text search, and smooth virtual scrolling for large event volumes

**Independent Test**: Start Hermes backend with an FSW generating events, navigate to Events tab, verify chronological event list displays with severity colors, filter by WARNING_HI and FATAL, search by message text, and scroll 1,000+ events smoothly

### Implementation for User Story 2

- [x] T021 [US2] Implement EventView with virtual scrolling in src/dashboard/src/views/EventView.tsx — subscribe to `subscribe_events` via `useGrpcStream` on mount; maintain an array of `DisplayEvent` objects (from `@gov.nasa.jpl.hermes/types`) with sequential index assignment; render using `@tanstack/react-virtual` `useVirtualizer` with estimated row size of 28px and overscan of 20 (adapting the proven pattern from `src/extensions/core/app/evrs/index.tsx`); render table with columns: Index, Time (formatted per TimeFormatSelector), Severity, Component, Name, Message; apply CSS severity classes for color-coded rows (FATAL=red, WARNING_HI=orange, WARNING_LO=yellow, DIAGNOSTIC=gray per dashboard.css); show EmptyState component when no events have been received; implement auto-scroll to bottom for new events with a "Follow" toggle checkbox (same pattern as existing EvrTable)
- [x] T022 [US2] Add severity and source filtering to EventView in src/dashboard/src/views/EventView.tsx — include FilterBar with source multi-select, severity multi-select (using `EvrSeverity` enum values from `@gov.nasa.jpl.hermes/types`), and text search input; implement client-side filtering: severity filter uses Set-based inclusion check; source filter uses Set-based inclusion check; text filter uses case-insensitive `includes()` on event message; all three filters compose (AND logic); support "All" option for sources and severities that auto-selects all current values (adapting the `filteredSources`/`filteredSeverities` pattern from existing EvrTable); memoize filtered results using `useMemo` for performance with 10,000+ events (FR-004, SC-003)
- [x] T023 [US2] Add time format switching to EventView in src/dashboard/src/views/EventView.tsx — include TimeFormatSelector in the event toolbar; implement `formatTime(event, format)` function supporting UTC (ISO 8601), LOCAL (ISO without Z), and SCLK (fixed-point decimal) using the same logic pattern from the existing EvrTable's `formatTime` function (FR-010); apply selected format to all timestamp cells

**Checkpoint**: Events tab shows chronological event log with severity coloring. Filtering by severity, source, and text works. Virtual scrolling handles 10,000+ events smoothly. Time format can be toggled. Independently testable alongside or without User Story 1.

---

## Phase 5: User Story 3 — Multi-Source Connection Overview (Priority: P3)

**Goal**: Stakeholders see an overview of all connected flight software instances with live status updates

**Independent Test**: Start Hermes backend with multiple FSW profiles (some connected, some disconnected), navigate to Connections tab, verify each FSW is listed with correct status and that status changes reflect within 5 seconds

### Implementation for User Story 3

- [x] T024 [US3] Implement ConnectionsView in src/dashboard/src/views/ConnectionsView.tsx — subscribe to `subscribe_fsw` via `useGrpcStream` on mount; maintain a list of `FlightSoftwareConnection` entities (from data-model.md); render a card or list layout showing each FSW with: name (`id`), type, connection status (green "Connected" / red "Disconnected" badge), profile ID; derive connection status from the `fsw_list` subscription: FSWs present in the latest list are CONNECTED, those that disappeared are DISCONNECTED; update status within 5 seconds of change (FR-005) — the WebSocket subscription already provides near-real-time updates; show EmptyState when no FSW connections exist with message "No flight software connections active"
- [x] T025 [US3] Add connection detail expansion in src/dashboard/src/views/ConnectionsView.tsx — when a stakeholder clicks on a connection card/row, expand to show additional details: associated dictionary name (fetched via `get_dictionaries`), profile name, capabilities list (COMMAND, SEQUENCE, FILE, etc. from `FswCapability`), and forwarded FSW IDs if any (acceptance scenario 3); implement as a collapsible detail section within each card; fetch dictionary metadata on first expansion if not already cached

**Checkpoint**: Connections tab shows all FSW instances with live status. Clicking a connection reveals details. Status updates reflect within 5 seconds. Independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, Docker integration, and documentation

- [x] T026 [P] Add dashboard build step to docker/Dockerfile — add the dashboard to the existing frontend build stage: copy `src/dashboard/package.json` in the dependency installation layer; ensure `yarn build` in the build stage also builds the dashboard; in the final runtime stage, copy `src/dashboard/out/` to a known path and pass `--dashboard-dir` and `--dashboard-port 8080` to the backend entrypoint; expose port 8080 alongside existing 50051
- [x] T027 [P] Update docker-compose.yml for dashboard port — add port mapping `8080:8080` to the backend service definition (or create a dashboard service entry if the backend is containerized separately); ensure the dashboard is accessible when running `docker compose up`
- [x] T028 [P] Add dashboard section to project README.md — document: what the dashboard is (read-only telemetry/event viewer for stakeholders), how to build (`yarn build` includes dashboard), how to run (`--dashboard-port`, `--dashboard-dir` flags), URL to access (`http://localhost:8080`), browser requirements; keep it concise (link to quickstart.md for details)
- [x] T029 Verify cross-browser rendering — manually test the dashboard in Chrome, Firefox, Safari, and Edge (latest 2 versions per FR-008); verify: tab navigation, telemetry table updates, event virtual scrolling, filter controls, severity color coding, time format switching, responsive layout; fix any CSS or JS compatibility issues found
- [x] T030 Performance validation for telemetry throughput — simulate or connect to a backend producing 500+ telemetry channels at 1 Hz; verify the dashboard remains responsive (no UI freezing, no dropped frames) per SC-004; verify telemetry latency is under 2 seconds from backend receipt (SC-002); if performance issues are found, tune the render batching interval in TelemetryView or add additional debouncing in useGrpcStream
- [x] T031 Validate quickstart.md end-to-end — follow every step in specs/001-web-telemetry-dashboard/quickstart.md from a clean state; verify: `yarn install` works, `yarn build` includes dashboard, Go backend starts with dashboard flags, dashboard loads in browser, all three tabs function; update quickstart.md if any steps are incorrect or missing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) — no dependencies on other stories
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) — no dependencies on other stories
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — independent, no cross-story dependencies
- **User Story 2 (P2)**: Can start after Phase 2 — independent, shares FilterBar and TimeFormatSelector components (built in Phase 2)
- **User Story 3 (P3)**: Can start after Phase 2 — independent, lightest implementation

### Within Each User Story

- Models/data structures before service/view logic
- Core view implementation before filtering/enhancement tasks
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T001–T005 are sequential (each depends on prior workspace setup)
- **Phase 2**: T009, T010, T011, T012, T013 can all run in parallel (different files, no interdependencies); T006 and T007 are sequential (handler before registration); T008 depends on T006 (needs to know WebSocket message format); T014 depends on T010–T013 (composes the shared components); T015 depends on T014; T016 can run in parallel with T008–T013
- **Phase 3**: T017 must come first; T018, T019, T020 can be done in sequence or parallel after T017
- **Phase 4**: T021 must come first; T022, T023 depend on T021
- **Phase 5**: T024 first, T025 depends on T024
- **Phase 6**: T026, T027, T028 can all run in parallel; T029–T031 are sequential validation tasks

---

## Parallel Example: Phase 2 (Foundational)

```text
# Sequential first (WebSocket infrastructure):
T006: Go WebSocket proxy handler in pkg/dashboard/handler.go
T007: Register handler in cmd/backend/main.go

# Then parallel (shared components — all different files):
T009: useConnectionStatus hook in src/dashboard/src/hooks/useConnectionStatus.ts
T010: StatusBanner in src/dashboard/src/components/StatusBanner.tsx
T011: EmptyState in src/dashboard/src/components/EmptyState.tsx
T012: TimeFormatSelector in src/dashboard/src/components/TimeFormatSelector.tsx
T013: FilterBar in src/dashboard/src/components/FilterBar.tsx
T016: Dashboard CSS in src/dashboard/src/styles/dashboard.css

# Then sequential (depends on above):
T008: useGrpcStream hook (depends on T006 contract knowledge)
T014: App.tsx (composes T010-T013 components)
T015: index.tsx (depends on T014)
```

## Parallel Example: User Stories after Phase 2

```text
# All three user stories can proceed in parallel after Phase 2:
Developer A: T017-T020 (US1: Telemetry)
Developer B: T021-T023 (US2: Events)
Developer C: T024-T025 (US3: Connections)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T016)
3. Complete Phase 3: User Story 1 (T017–T020)
4. **STOP and VALIDATE**: Open dashboard, verify live telemetry streams with filtering
5. Deploy/demo if ready — stakeholders can monitor telemetry immediately

### Incremental Delivery

1. Setup + Foundational → Dashboard shell loads with WebSocket connectivity
2. Add User Story 1 (Telemetry) → **MVP deployed** — live telemetry monitoring
3. Add User Story 2 (Events) → Event log with filtering and virtual scrolling
4. Add User Story 3 (Connections) → FSW connection overview
5. Polish → Docker, docs, cross-browser validation, performance tuning
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The Go WebSocket proxy (T006) is the highest-risk task — start there
- Total: 31 tasks across 6 phases
