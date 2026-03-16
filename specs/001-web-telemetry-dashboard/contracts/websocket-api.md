# WebSocket API Contract: Dashboard ↔ Hermes Backend

**Feature Branch**: `001-web-telemetry-dashboard`
**Date**: 2026-03-16
**Protocol**: WebSocket (RFC 6455)
**Endpoint**: `ws://<host>:<dashboard-port>/ws`

## Overview

The dashboard communicates with the Hermes Go backend via a single WebSocket connection. All messages are JSON-encoded UTF-8 text frames. Each message has a `type` field that determines the payload structure.

## Connection Lifecycle

1. Client opens WebSocket to `ws://<host>:<port>/ws`
2. Server sends `{ "type": "connected" }` upon successful upgrade
3. Client sends subscription messages to start receiving data
4. Server streams data messages for active subscriptions
5. Either side can close; client should auto-reconnect on unexpected closure

### Authentication

If the backend is configured with authentication:
- Client includes credentials in the WebSocket URL query: `ws://host:port/ws?token=<token>` or via initial handshake message
- Server validates before upgrading the connection
- Invalid credentials result in HTTP 401 before WebSocket upgrade

## Client → Server Messages

### subscribe_telemetry

Start or update the telemetry data subscription.

```json
{
  "type": "subscribe_telemetry",
  "filter": {
    "source": "",
    "names": [],
    "context": "ALL"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filter.source` | string | No | Filter to single FSW source ID. Empty = all sources. |
| `filter.names` | string[] | No | Filter to specific channel names. Empty = all channels. |
| `filter.context` | string | No | `"REALTIME_ONLY"`, `"RECORDED_ONLY"`, or `"ALL"` (default). |

### subscribe_events

Start or update the event data subscription.

```json
{
  "type": "subscribe_events",
  "filter": {
    "source": "",
    "context": "ALL"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filter.source` | string | No | Filter to single FSW source ID. Empty = all sources. |
| `filter.context` | string | No | `"REALTIME_ONLY"`, `"RECORDED_ONLY"`, or `"ALL"` (default). |

### subscribe_fsw

Subscribe to flight software connection state changes.

```json
{
  "type": "subscribe_fsw"
}
```

No additional fields. Server will send the current FSW list immediately, then send updates on any change.

### get_dictionaries

Request all available dictionary metadata.

```json
{
  "type": "get_dictionaries"
}
```

### get_dictionary

Request a specific dictionary by ID (for resolving channel/event names).

```json
{
  "type": "get_dictionary",
  "id": "<dictionary-id>"
}
```

### unsubscribe

Cancel an active subscription.

```json
{
  "type": "unsubscribe",
  "subscription": "telemetry"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscription` | string | Yes | One of: `"telemetry"`, `"events"`, `"fsw"` |

## Server → Client Messages

### connected

Sent immediately after WebSocket upgrade succeeds.

```json
{
  "type": "connected"
}
```

### telemetry

A single telemetry data point. Sent for each telemetry update received from the gRPC `SubTelemetry` stream.

```json
{
  "type": "telemetry",
  "data": {
    "source": "fsw-1",
    "context": "REALTIME",
    "telemetry": {
      "ref": {
        "id": "123",
        "name": "TEMP_SENSOR_1",
        "component": "thermal",
        "type": { "kind": "f32" }
      },
      "time": {
        "utc": 1742140000000,
        "sclk": 12345.6789
      },
      "value": 23.5,
      "labels": {}
    }
  }
}
```

### event

A single event record. Sent for each event received from the gRPC `SubEvent` stream.

```json
{
  "type": "event",
  "data": {
    "source": "fsw-1",
    "context": "REALTIME",
    "event": {
      "ref": {
        "id": "456",
        "name": "TEMP_WARNING",
        "component": "thermal",
        "severity": "WARNING_HI"
      },
      "time": {
        "utc": 1742140000000,
        "sclk": 12345.6789
      },
      "message": "Temperature exceeded threshold: 85.2°C",
      "args": [{ "f32": 85.2 }]
    }
  }
}
```

### fsw_list

Full list of current flight software connections. Sent on initial subscription and on any change.

```json
{
  "type": "fsw_list",
  "data": [
    {
      "id": "fsw-1",
      "type": "fprime",
      "profileId": "profile-1",
      "capabilities": ["COMMAND", "SEQUENCE", "FILE"],
      "forwards": []
    }
  ]
}
```

### dictionaries

List of available dictionary metadata.

```json
{
  "type": "dictionaries",
  "data": [
    {
      "id": "dict-1",
      "type": "fprime"
    }
  ]
}
```

### dictionary

Full dictionary content for a specific dictionary.

```json
{
  "type": "dictionary",
  "data": {
    "id": "dict-1",
    "type": "fprime",
    "telemetry": [],
    "events": [],
    "commands": []
  }
}
```

### error

Error notification from the server.

```json
{
  "type": "error",
  "message": "Failed to subscribe to telemetry: no FSW connections available"
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid message type | Server sends `error` message with details |
| Backend gRPC unavailable | Server sends `error` message; client shows connectivity banner |
| WebSocket connection closed unexpectedly | Client auto-reconnects with exponential backoff (1s, 2s, 4s, max 30s) |
| Authentication failure | HTTP 401 before WebSocket upgrade |
| Subscription to non-existent source | Server sends empty data stream (no error) |

## Rate Limiting

- The server does **not** rate-limit messages. Backpressure is managed by WebSocket flow control.
- The client SHOULD debounce UI rendering for high-frequency telemetry updates (recommended: batch updates every 100ms for display refresh).
- The client SHOULD NOT request `unsubscribe` + `subscribe` more often than once per second for the same subscription type.
