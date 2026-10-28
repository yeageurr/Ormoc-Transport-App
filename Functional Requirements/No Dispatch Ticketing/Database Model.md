# Software Requirements Specification (SRS): Database Model

**Document ID:** SRS-ND-DATA  
**Version:** 1.0  
**Review date:** 2026-10-28
**Source of truth:** SQLAlchemy models and Alembic migrations under `backend/app/models` and `backend/alembic/versions`.


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document summarizes the data needed by the no-dispatch-ticketing requirements and records legacy schema dependencies that have not yet been removed.

### 1.2 Scope

The intended core model includes accounts, Driver profiles, vehicles, terminals, destinations, routes, route-based trips, latest Driver locations, GPS trip samples, anonymous commuter queue entries, notifications, and audit events. This is a requirements summary, not a replacement for ORM or migration source.

## 2. Entity catalog

| Entity/table | No-dispatch purpose |
|---|---|
| `accounts` | Login identity, password hash, role/status, and initial-password state. |
| `users` | Driver identity, contact details, license data, and account relationship. |
| `vehicles` | Canonical vehicle owner, optional borrower, plate/body/color/type, condition, registration, and activity state. |
| `terminals` | Terminal identity and geofence bounds. |
| `destinations` | Route destination names and geographic coordinates. |
| `routes` | Terminal-to-destination route, distance, optional average duration, geometry, and active state. |
| `trips` | One-way route trip with Driver, vehicle, route, direction, timestamps, measurements, and completion state. |
| `trip_pause_events` | Pause/resume timestamps for a trip; GPS tracking continues during a pause. |
| `driver_locations` | Latest known foreground location for a Driver/vehicle. |
| `gps_logs` | Ordered location samples linked to a trip. |
| `passenger_queue_entries` | Anonymous route/terminal session with active and presence timestamps. |
| `notifications` | Account-targeted message, read state, and timestamp. |
| `audit_logs` | Actor, action, target, contextual data, and timestamp. |
| `email_verifications`, `password_reset_otps` | Hashed OTP/reset data, expiration, and verification state. |

## 3. Data integrity requirements

- **SRS-ND-DATA-FR-001:** A Driver profile shall reference one account; identifiers and unique contact/vehicle fields shall retain their applicable unique constraints.
- **SRS-ND-DATA-FR-002:** A route-based trip shall store direct Driver, vehicle, route, direction, start time, and completion state; a new trip shall not require a dispatch record or ticket.
- **SRS-ND-DATA-FR-003:** A passenger queue entry shall reference one route and terminal and shall use an opaque session token without commuter personal data.
- **SRS-ND-DATA-FR-004:** GPS samples shall reference the trip for which they were captured and retain capture time and coordinates.
- **SRS-ND-DATA-FR-005:** Account roles and status shall be enforced by application authorization and corresponding schema constraints.

## 4. Current schema gaps and migration status (source review: 2026-10-28)

- **Source schema:** ORM includes account, Driver, vehicle, terminal, destination, route, direct-trip, GPS, passenger-queue, notification, audit, verification, and trip-pause entities. `vehicles.borrower_id` distinguishes a canonical owner from one current borrower.
- **Transitional schema:** `dispatcher`, `ticketing_officer`, dispatch logs, assignments, reservations, tickets, incidents, and nullable dispatch/ticket references remain. No dispatch-removal migration exists.
- **Alembic source head:** `f2b7c9d1e3a5` (`add_trip_pause_events`). The local/cloud database revision was not queried; run `alembic current` against the intended database before claiming it is upgraded.
- **GPS gap:** mobile samples have no client idempotency key, durable offline queue, or background synchronization. Passenger count lookup still depends on today's dispatch log. The schema is transitional, not a clean no-dispatch schema.

## 5. Implementation status (source review: 2026-10-28)

- **Present:** route-based trips, trip-pause events, and anonymous commuter queue models/APIs exist in source.
- **Not complete:** dispatch roles/tables remain; no dispatch-removal migration exists.
- **Environment caveat:** source Alembic head is `f2b7c9d1e3a5`; target database revision is unverified.

