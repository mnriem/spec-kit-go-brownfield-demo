# Data Model: Web-Based Telemetry Dashboard

**Feature Branch**: `001-web-telemetry-dashboard`
**Date**: 2026-03-16

> The dashboard is **read-only** and does not persist data. All entities below are transient, received via WebSocket from the Hermes gRPC backend. Type definitions reuse `@gov.nasa.jpl.hermes/types` wherever possible.

## Entities

### TelemetryChannel

Represents a single live telemetry data point from a flight software source.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| name | string | `TelemetryRef.name` | Human-readable channel name (from dictionary) |
| rawId | string | `TelemetryRef.id` | Raw identifier (used before dictionary loads) |
| value | any | `Telemetry.value` | Current telemetry value (number, string, enum) |
| dataType | TypeKind | `TelemetryRef.type` | Data type enum (i8, i16, f32, f64, enum, etc.) |
| timeUtc | number | `Time.utc` | UTC timestamp in milliseconds |
| timeSclk | number | `Time.sclk` | Spacecraft clock value |
| source | string | `SourcedTelemetry.source` | Flight software connection ID |
| context | SourceContext | `SourcedTelemetry.context` | REALTIME or RECORDED |

**Relationships**: Belongs to a `FlightSoftwareConnection` (via `source`). Defined by a `Dictionary` entry.

**Composite Key**: `(source, name)` — uniquely identifies a channel within the dashboard.

### Event (EVR)

Represents a discrete occurrence reported by flight software.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| name | string | `EventRef.name` | Event definition name |
| severity | EvrSeverity | `EventRef.severity` | DIAGNOSTIC, ACTIVITY_LO, ACTIVITY_HI, WARNING_LO, WARNING_HI, COMMAND, FATAL |
| message | string | `Event.message` | Formatted event message |
| args | Value[] | `Event.args` | Parsed event arguments |
| timeUtc | number | `Time.utc` | UTC timestamp in milliseconds |
| timeSclk | number | `Time.sclk` | Spacecraft clock value |
| source | string | `SourcedEvent.source` | Flight software connection ID |
| context | SourceContext | `SourcedEvent.context` | REALTIME or RECORDED |
| component | string | `EventRef.component` | Component that emitted the event |
| index | number | (derived) | Sequential display index for virtual scrolling |

**Relationships**: Belongs to a `FlightSoftwareConnection` (via `source`). Defined by a `Dictionary` entry.

**Ordering**: Displayed in arrival order (ascending index). Filterable by severity, source, and message text.

### FlightSoftwareConnection

Represents a logical connection to a spacecraft flight software instance.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | `Fsw.id` | Unique identifier (human-readable name) |
| type | string | `Fsw.type` | FSW connection type |
| profileId | string | `Fsw.profile_id` | Associated profile identifier |
| capabilities | FswCapability[] | `Fsw.capabilities` | COMMAND, SEQUENCE, FILE, etc. |
| status | ConnectionStatus | (derived) | CONNECTED or DISCONNECTED (derived from subscription state) |
| forwards | string[] | `Fsw.forwards` | IDs of other FSWs whose telemetry is forwarded through this one |

**Relationships**: Has many `TelemetryChannel` entries and `Event` entries. Associated with a `Dictionary`.

### Dictionary

A catalog that maps raw telemetry/event identifiers to human-readable definitions.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | `DictionaryHead.id` | Dictionary identifier |
| type | string | `DictionaryHead.type` | Dictionary type/format |
| telemetryDefs | TelemetryDef[] | `Dictionary.telemetry` | Telemetry channel definitions |
| eventDefs | EventDef[] | `Dictionary.events` | Event definitions |

**Relationships**: Used by `FlightSoftwareConnection` to resolve channel names and event formatting.

## State Transitions

### Dashboard Connection State

```
DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTED
                    ↓
               RECONNECTING → CONNECTED
                    ↓
               DISCONNECTED (after max retries)
```

| State | Description |
|-------|-------------|
| DISCONNECTED | No WebSocket connection to Hermes backend |
| CONNECTING | Initial WebSocket handshake in progress |
| CONNECTED | Active WebSocket connection, receiving data |
| RECONNECTING | Connection lost, automatic reconnection in progress |

### FSW Connection Status

```
CONNECTED ↔ DISCONNECTED
```

Status is derived from the `SubscribeFsw` stream. When an FSW appears in the `FswList`, it is CONNECTED. When it disappears, it is DISCONNECTED. Updates must reflect within 5 seconds (per FR-005).

## WebSocket Message Protocol

Messages exchanged between the browser and Go proxy over WebSocket.

### Client → Server (Subscriptions)

| Message Type | Payload | Description |
|-------------|---------|-------------|
| `subscribe_telemetry` | `{ source?: string, names?: string[] }` | Start/update telemetry subscription with optional filter |
| `subscribe_events` | `{ source?: string }` | Start/update event subscription with optional source filter |
| `subscribe_fsw` | `{}` | Subscribe to FSW connection state changes |
| `get_dictionaries` | `{}` | Request all available dictionaries |
| `unsubscribe` | `{ type: string }` | Stop a subscription |

### Server → Client (Data)

| Message Type | Payload | Description |
|-------------|---------|-------------|
| `telemetry` | `Sourced<Telemetry>` (JSON) | Single telemetry update |
| `event` | `Sourced<Event>` (JSON) | Single event |
| `fsw_list` | `Fsw[]` (JSON) | Full FSW connection list (on change) |
| `dictionaries` | `DictionaryHead[]` (JSON) | Dictionary metadata list |
| `error` | `{ message: string }` | Error notification |
| `connected` | `{}` | Connection established confirmation |

## Validation Rules

- **Telemetry values**: Displayed as-is from the backend; no client-side validation. The `Convert.valueFromProto()` utility handles type conversion.
- **Event severity**: Must be one of the `EvrSeverity` enum values. Unknown values displayed as "UNKNOWN".
- **Time formats**: All timestamps must support display in UTC, LOCAL, and SCLK formats (per FR-010). Conversion uses existing `TimeFormat` enum and display logic from `@gov.nasa.jpl.hermes/types`.
- **Source filtering**: Source identifiers must exactly match `Fsw.id` values. Partial matching is not supported for source filters (only for channel name text search per FR-003).
