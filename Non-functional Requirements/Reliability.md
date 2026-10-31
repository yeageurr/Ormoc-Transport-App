# Software Requirements Specification (SRS): Non-functional Requirements — Reliability

**Document ID:** SRS-NFR-REL
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines continuity and recoverability requirements for backend state changes, Driver trips/GPS, Commuter queue presence, notifications, and authentication.

## 2. Requirements

### 2.1 API and persistent state

- **SRS-NFR-REL-API-001:** The backend shall report a state-changing operation as successful only after its required database transaction commits.
- **SRS-NFR-REL-API-002:** A transient notification, email, SMS, or WebSocket delivery failure shall not roll back an already committed trip, profile, account, or queue state unless the operation explicitly requires delivery as a precondition.
- **SRS-NFR-REL-API-003:** Retryable state-changing requests shall either be idempotent or return enough state for a client to determine whether the original request committed before retrying.

### 2.2 Driver trips and GPS

- **SRS-NFR-REL-TRIP-001:** A trip start, pause/resume event, and trip completion shall remain associated with the same persisted trip record after app navigation or process restart.
- **SRS-NFR-REL-GPS-001:** The Driver app shall retain captured GPS samples in durable local storage when uploads fail and automatically retry synchronization after connectivity returns. Samples shall be removed from the local queue only after server acknowledgement.
- **SRS-NFR-REL-GPS-002:** GPS retry shall not create duplicate server samples; each sample shall have a stable client-generated identifier or equivalent idempotency mechanism.
- **SRS-NFR-REL-GPS-003:** If GPS permission, GNSS service, or a fresh fix is unavailable, the app shall indicate the limitation and shall not represent an old fix as a current reading.

### 2.3 Commuter passenger queue

- **SRS-NFR-REL-QUEUE-001:** If a queue heartbeat or leave request fails, the app shall preserve its session token and retry while the session remains valid and the app can run.
- **SRS-NFR-REL-QUEUE-002:** The backend shall exclude inactive or stale queue entries from counts even when a commuter app closes without sending a leave event.
- **SRS-NFR-REL-QUEUE-003:** Loss of WebSocket delivery shall not prevent the Driver from refreshing the authoritative queue count through REST.

### 2.4 Notifications and authentication

- **SRS-NFR-REL-NOTIF-001:** Persistent in-app notifications shall remain retrievable after reconnect even if real-time delivery fails.
- **SRS-NFR-REL-AUTH-001:** A temporary network failure during session restoration shall result in a recoverable loading/error state, not a permanently blank screen or silent deletion of valid credentials.

## 3. Current implementation notes

- Trip and pause data are stored by backend APIs. GPS fixes are uploaded while the trip screen is foregrounded, but failed uploads are currently discarded; durable offline storage/replay and idempotency are gaps.
- Passenger sessions become stale for count purposes after the configured heartbeat age. Commuter heartbeats are foreground-oriented; background suspension or loss of network can delay leave detection.
- In-app notifications persist in the database and can be fetched after reconnect. Email/SMS and WebSocket delivery do not have a general durable outbox/retry service.
- WebSocket connections are in-process; deployments with multiple workers require shared messaging for reliable cross-worker delivery.
