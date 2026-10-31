# Software Requirements Specification (SRS): Database Model

**Document ID:** SRS-ND-DATA  
**Version:** 1.0  
**Review date:** 2026-10-31
**Source of truth:** SQLAlchemy models and Alembic migrations under `backend/app/models` and `backend/alembic/versions`.


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

## 1. Introduction

### 1.1 Purpose

This document summarizes the current no-dispatch data model and identifies remaining operational and deployment limitations.

For visual relationships, see [Entity Relationship Diagram](Entity%20Relationship%20Diagram.md). For the complete current field list, types, nullability, keys, and field purposes, see the [Database Matrix](Database%20Matrix.md).

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
| `geofence_events` | Driver geofence enter/exit records where emitted by the trip-readiness workflow. |
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

## 4. Current schema and migration status (source review: 2026-10-31)

- **Source schema:** ORM includes account, Driver, vehicle, terminal, destination, route, direct-trip, GPS, passenger-queue, notification, audit, verification, and trip-pause entities. `vehicles.borrower_id` distinguishes a canonical owner from one current borrower.
- **Current source roles and tables:** the registered models use `admin` and `driver` accounts and contain no dispatcher, ticketing-officer, dispatch-log, dispatch-ticket, reservation, or incident entities. Historical migrations remain in the chain to document and migrate earlier deployments.
- **Cleanup migration:** `4e9f2b7c1d63` removes dispatch-ticketing and incident schema and makes trips route-owned. `5a8d2c4f7b91` adds optional delay-notice data to trip pause events.
- **Alembic source head:** `5a8d2c4f7b91`. This is the repository head only. The local and hosted database revisions were not queried; run `python -m alembic current` from `backend` with the intended database configuration before claiming an environment is upgraded.
- **GPS and queue limits:** mobile GPS samples have no durable offline queue, replay/idempotency key, or guaranteed background capture. Passenger queue sessions are anonymous presence records and require live app/location updates to promptly reflect exits.

## 5. Implementation status (source review: 2026-10-31)

- **Present in source:** route-based trips, trip-pause and delay-notice fields, anonymous commuter queue, OTP records, audit records, and notifications.
- **Environment caveat:** source Alembic head is `5a8d2c4f7b91`; target database revision is unverified.

