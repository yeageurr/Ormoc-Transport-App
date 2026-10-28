# Software Requirements Specification (SRS): Passenger Queue

**Document ID:** SRS-ND-QUEUE  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies how commuters join a route-specific passenger queue at the terminal and how the Driver app reads its active count.

### 1.2 Scope

This is an anonymous passenger-presence count, not a numbered Driver reservation, dispatcher approval queue, or QR ticket.

## 2. Overall description

**Actors:** Commuter and Driver.

## 3. Specific requirements

- **SRS-ND-QUEUE-FR-001:** A Commuter shall be able to join a selected active route's passenger queue only while inside that route origin's terminal geofence.
- **SRS-ND-QUEUE-FR-002:** The system shall issue an opaque session token and associate it with route, terminal, active state, join time, last-seen time, and optional leave time. It shall not require an account or personal identity.
- **SRS-ND-QUEUE-FR-003:** The Commuter app shall refresh presence approximately every 30 seconds while queued and foregrounded. A heartbeat outside the geofence shall deactivate the entry.
- **SRS-ND-QUEUE-FR-004:** The active count shall exclude inactive entries and entries whose last heartbeat is older than two minutes.
- **SRS-ND-QUEUE-FR-005:** The Driver app shall display the active commuter count associated with the Driver's current operating route. The backend shall push count changes to the Driver over an authenticated real-time channel; the app shall refresh from the count API on screen focus and periodically as a recovery fallback.
- **SRS-ND-QUEUE-FR-006:** The queue count shall be presented as unavailable when the request fails, rather than falsely presenting an unavailable result as zero.
- **SRS-ND-QUEUE-FR-007:** The count shall represent app sessions/passengers, not an inferred number of people travelling together.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** anonymous queue model and join/current/heartbeat endpoints validate terminal geofence; entries older than two minutes are excluded. Commuter app stores an opaque token and sends foreground heartbeats about every 30 seconds, plus an exit heartbeat when a GPS fix detects leaving.
- **Present:** after a committed count-changing join/reactivation/deactivation, the backend pushes the authoritative route count to the currently assigned Driver over WebSocket. The Driver authenticates with its bearer token, updates Home immediately, and retains 15-second REST polling as fallback.
- **Partial/blocking:** REST count lookup and WebSocket recipients still resolve the Driver's route through the latest `dispatch_logs` row for today's Manila date. The count therefore depends on legacy dispatch data and blocks a fully dispatch-independent queue flow. WebSocket connections are in-process; multi-worker/instance deployment needs shared pub/sub. Stale entries stop counting after two minutes, but no event fires exactly at timeout; fallback polling catches that.
- **Operational limits:** the count represents app queue sessions, not verified headcount. Background suspension, network loss, or unavailable GPS delays leave detection. Apply the queue migration to the intended PostgreSQL database.

