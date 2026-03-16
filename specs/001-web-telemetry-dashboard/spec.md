# Feature Specification: Web-Based Telemetry Dashboard

**Feature Branch**: `001-web-telemetry-dashboard`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Web-Based Dashboard (Beyond Grafana) — Add a lightweight web UI (React, reusing the existing src/modules/) for read-only telemetry monitoring and event viewing — useful for stakeholders who don't need the full VSCode environment."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Real-Time Telemetry Monitoring (Priority: P1)

As a mission stakeholder (e.g., project manager, systems engineer, or scientist), I want to open a web browser and see live telemetry values streaming from one or more connected spacecraft, so that I can monitor mission health without installing or configuring VSCode.

The dashboard displays a continuously updating view of telemetry channels organized by source. Each telemetry point shows its current value, timestamp, and channel name. Values update in real time as new data arrives from connected flight software instances.

**Why this priority**: This is the core value proposition of the feature — providing accessible, real-time mission visibility to team members outside the VSCode development workflow. Without live telemetry, the dashboard has no reason to exist.

**Independent Test**: Can be fully tested by connecting the dashboard to a running Hermes backend with at least one active flight software connection. Delivers immediate value by giving stakeholders a live window into mission telemetry.

**Acceptance Scenarios**:

1. **Given** a Hermes backend is running with at least one connected flight software instance producing telemetry, **When** a stakeholder opens the dashboard URL in a web browser, **Then** they see telemetry values updating in real time without any prior setup or installation.
2. **Given** the dashboard is displaying telemetry from a single source, **When** a second flight software connection begins producing telemetry, **Then** the dashboard shows telemetry from both sources, clearly labeled by source name.
3. **Given** telemetry is streaming, **When** the stakeholder filters by a specific channel name or source, **Then** only matching telemetry channels are displayed and the filter persists until cleared.
4. **Given** the dashboard is displaying live telemetry, **When** the network connection to the backend is temporarily lost, **Then** the dashboard shows a clear connectivity warning and automatically reconnects and resumes streaming when the connection is restored.

---

### User Story 2 — Event Log Viewing and Filtering (Priority: P2)

As a mission stakeholder, I want to view a chronological log of spacecraft events (EVRs) with severity-based filtering, so that I can quickly identify warnings, anomalies, and critical events without digging through raw logs.

The event viewer shows a scrollable, time-ordered list of events. Each event displays its timestamp, severity level (e.g., DIAGNOSTIC, WARNING_LO, WARNING_HI, FATAL), formatted message, and source. Stakeholders can filter events by severity, source, and text search to focus on what matters to them.

**Why this priority**: Event viewing complements telemetry monitoring and is the second most requested capability for mission oversight. Stakeholders frequently need to review recent events after observing a telemetry anomaly.

**Independent Test**: Can be tested by connecting to a Hermes backend that is generating events. Delivers value by providing filtered, human-readable event history independent of the telemetry view.

**Acceptance Scenarios**:

1. **Given** a Hermes backend is producing events from connected flight software, **When** the stakeholder navigates to the event viewer, **Then** they see a chronological list of events with timestamp, severity, message, and source clearly displayed.
2. **Given** the event viewer is showing events of all severities, **When** the stakeholder selects only WARNING_HI and FATAL severity filters, **Then** only events matching those severity levels are displayed.
3. **Given** a large volume of events has been received (1,000+), **When** the stakeholder scrolls through the event list, **Then** the viewer remains responsive with smooth scrolling and does not freeze or lag.
4. **Given** the stakeholder is reviewing events, **When** they enter a search term in the text filter, **Then** only events whose message contains that term are shown.

---

### User Story 3 — Multi-Source Connection Overview (Priority: P3)

As a mission stakeholder, I want to see an overview of all connected flight software instances and their connection status, so that I can understand which spacecraft systems are online and actively producing data.

The connection overview displays each flight software connection with its name, connection status (connected/disconnected), and summary metadata. This gives stakeholders situational awareness of the overall mission environment.

**Why this priority**: While not the primary use case, connection visibility provides essential context for interpreting telemetry and events. A stakeholder seeing unexpected telemetry behavior needs to quickly check whether a data source is still connected.

**Independent Test**: Can be tested by starting the dashboard with multiple flight software profiles in various states (connected, disconnected). Delivers value by providing at-a-glance system health awareness.

**Acceptance Scenarios**:

1. **Given** the Hermes backend has multiple flight software connections configured, **When** the stakeholder views the connection overview, **Then** each connection is listed with its name and current status (connected or disconnected).
2. **Given** a flight software connection is active, **When** that connection drops, **Then** the overview updates the status to disconnected within 5 seconds without requiring a page refresh.
3. **Given** the connection overview is displayed, **When** the stakeholder clicks on a specific connection, **Then** they see additional details such as the associated dictionary name and connection profile.

---

### Edge Cases

- What happens when no flight software connections are active? The dashboard displays an empty state with a clear message indicating no active connections and suggesting that a Hermes backend with active connections is required.
- What happens when the Hermes backend itself is unreachable? The dashboard displays a prominent error banner indicating the backend is unavailable, with automatic retry and a manual reconnect option.
- What happens when the telemetry dictionary is not yet loaded? Telemetry channels are displayed with their raw identifiers until the dictionary becomes available, at which point human-readable names replace the raw IDs without interrupting the view.
- How does the dashboard handle an extremely high telemetry rate (thousands of channels updating per second)? The dashboard uses virtualized rendering and throttles visual updates to maintain a responsive UI, potentially batching rapid updates into periodic display refreshes.
- What happens if two flight software sources use overlapping channel names? Channels are disambiguated by prefixing or grouping them by source name so there is no confusion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST display real-time telemetry values from all connected flight software sources, showing channel name, current value, timestamp, and source identifier.
- **FR-002**: The dashboard MUST display a chronological event log showing timestamp, severity level, formatted message, and source for each event.
- **FR-003**: Users MUST be able to filter telemetry channels by source name and channel name (partial text match).
- **FR-004**: Users MUST be able to filter events by severity level (multi-select), source, and free-text search across event messages.
- **FR-005**: The dashboard MUST show the connection status of each flight software instance and update status changes within 5 seconds.
- **FR-006**: The dashboard MUST be entirely read-only — no commanding, configuration changes, or write operations to the backend are permitted.
- **FR-007**: The dashboard MUST support multiple simultaneous users viewing the same data without interference.
- **FR-008**: The dashboard MUST render correctly in modern web browsers (latest two major versions of Chrome, Firefox, Safari, and Edge).
- **FR-009**: The dashboard MUST remain responsive when handling at least 500 telemetry channels updating once per second.
- **FR-010**: The dashboard MUST support switching between UTC, local, and SCLK time formats for all displayed timestamps.
- **FR-011**: The dashboard MUST clearly indicate connectivity issues (backend unreachable, connection lost) and automatically attempt to reconnect.
- **FR-012**: The dashboard MUST reuse existing shared modules (types, utilities, API interfaces) from the Hermes codebase to maintain consistency.

### Key Entities

- **Telemetry Channel**: A named data point from a flight software source. Attributes include channel name, current value, data type, timestamp (UTC and SCLK), and source identifier.
- **Event (EVR)**: A discrete occurrence reported by flight software. Attributes include timestamp, severity level (DIAGNOSTIC through FATAL), formatted message, message arguments, and source identifier.
- **Flight Software Connection**: A logical connection to a spacecraft flight software instance. Attributes include connection name, status (connected/disconnected), associated dictionary, and profile name.
- **Dictionary**: A definition catalog that maps raw telemetry/event identifiers to human-readable names, types, and formatting rules.

### Assumptions

- The dashboard connects to an already-running Hermes backend; it does not manage or start backend services.
- Authentication follows the same mechanism used by the existing Hermes infrastructure. If no authentication is currently in place, the dashboard launches without a login gate (consistent with the existing VSCode extension behavior).
- The dashboard does not replace Grafana for deep analytics, historical trend analysis, or custom alerting — it provides a complementary real-time monitoring view.
- Stakeholders access the dashboard over the same network as the Hermes backend (local network, VPN, or similar); public internet exposure is not a requirement.
- The existing event severity levels (DIAGNOSTIC, ACTIVITY_LO, ACTIVITY_HI, WARNING_LO, WARNING_HI, COMMAND, FATAL) are used as-is from the current type definitions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A stakeholder with no prior Hermes experience can open the dashboard URL and see live telemetry within 30 seconds, without any installation or configuration.
- **SC-002**: The dashboard displays telemetry updates with no more than 2 seconds of latency from the time data is received by the Hermes backend.
- **SC-003**: The event viewer supports filtering a log of 10,000+ events by severity and text search, returning results within 1 second.
- **SC-004**: The dashboard remains visually responsive (no UI freezing or dropped frames) while displaying at least 500 simultaneously updating telemetry channels.
- **SC-005**: 90% of stakeholders can locate a specific telemetry channel or event within 1 minute using the provided filtering tools, as measured by usability testing.
- **SC-006**: The dashboard reduces the number of ad-hoc "what's the current status?" requests to the engineering team by at least 50%, as measured over a 30-day period after deployment.
- **SC-007**: The dashboard supports at least 10 simultaneous users viewing the same mission data without degradation in responsiveness.
