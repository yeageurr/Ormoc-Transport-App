# Software Requirements Specification (SRS): Passenger Queue

**Document ID:** SRS-ND-QUEUE  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

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

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** anonymous queue model and public join/current/heartbeat APIs validate the terminal geofence. The Commuter stores an opaque session token and sends foreground heartbeats about every 30 seconds. Sessions older than two minutes are excluded from the authoritative count.
- **Present in source:** committed count changes are broadcast to connected Driver accounts over an authenticated WebSocket; Driver Home also polls REST about every 15 seconds as a fallback. The backend associates a Driver with a route using that Driver's latest trip for the current Manila day, not a dispatch log.
- **Partial:** there is no immediate event at the exact two-minute expiry; polling or a later count-changing operation refreshes the value. WebSocket connections are held in process, so multiple backend workers/instances need shared pub/sub for cross-worker delivery. A session represents an app presence, not a verified passenger headcount.
- **Operational limit:** foreground app execution, GPS permission, and network access affect timely join/leave updates. Apply the current Alembic chain to the target database.
