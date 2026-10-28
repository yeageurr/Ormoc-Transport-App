# Software Requirements Specification (SRS): Database Model

**Document ID:** SRS-DATA  
**Version:** 1.0  
**Review date:** 2026-10-28
**Source of truth:** SQLAlchemy models and Alembic migrations under `backend/app/models` and `backend/alembic/versions`.


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document describes the system's persistent data model, principal relationships, integrity rules, and migration status. It complements the module-specific functional requirements; it does not replace the model definitions or migration scripts.

### 1.2 Scope

The document covers the backend PostgreSQL schema represented by the current ORM models. It does not describe a future local GPS cache on the Driver's phone as an existing database table.

## 2. Data storage overview

The backend shall use relational tables, foreign keys, unique constraints, check constraints, and indexes to preserve account, dispatch, reservation, ticket, trip, and audit data. Date and timestamp values used for daily operations shall follow the applicable Asia/Manila business rules. Timestamp columns representing instants use timezone-aware types.

## 3. Entity and table catalog

| Table | Purpose and principal relationships |
|---|---|
| `accounts` | Login identity, role, status, credential hashes, and account timestamps. One-to-one with a Driver profile where applicable. |
| `users` | Driver profile, public driver ID, contact details, license data, and FK to `accounts`. |
| `vehicles` | Vehicle owner, registration, body/plate details, condition, and operational activity state. |
| `terminals` | Terminal identity and geofence bounds. `admin_id` remains a legacy-named FK to `accounts`; Ticketing Officer role conversion preserves these account IDs. |
| `destinations` | Named route destinations and geographic coordinates. |
| `routes` | Terminal-to-destination relationship, distance, configured average duration, geometry, active state, and unique queue prefix. |
| `dispatcher_profiles` | Dispatcher contact/profile details linked to an account. |
| `dispatcher_assignments` | Dispatcher, route, operating date, assigning Ticketing Officer, and closure metadata. |
| `dispatch_logs` | Operational dispatch/departure record linked to account, Driver, vehicle, and route. The `admin_id` field is retained for legacy compatibility. |
| `queue_reservations` | Driver reservation request, route/date, optional queue number, approval/progress states, and approval/cancellation/expiry audit fields. |
| `passenger_queue_entries` | Anonymous commuter queue session linked to a route and terminal, with active/presence timestamps used to count commuters waiting on that route. |
| `dispatch_tickets` | Ticket UUID, public reference, reservation, Driver, vehicle, route, queue number, issuer, validity, and lifecycle timestamps. One ticket is associated with one reservation. |
| `trips` | One-way outgoing or returning trip, dispatch or direct Driver/vehicle identity, optional ticket, completion values, and trip measurements. |
| `driver_locations` | Latest known Driver/vehicle location for live operational views; this is a current-state record, not a complete track. |
| `gps_logs` | Persistent GPS samples associated with a trip. The current model has no client sample UUID/idempotency column. |
| `trip_pause_events` | Timestamped pause/resume markers linked to a trip; GPS tracking continues while paused. |
| `geofence_events` | Terminal/vehicle entry and exit event history. |
| `incidents` | Incident details, reporting Driver, trip, location, status, and review/resolution actors. Backend data remains even when incident UI is hidden. |
| `notifications` | Account-targeted notification content, read state, and timestamp. |
| `broadcast_notifications` | Route- or terminal-scoped broadcast event history. |
| `audit_logs` | Actor, action, target table/ID, details, and timestamp for audited operations. |
| `email_verifications` | Pending email change, salted OTP hash, expiration, attempts, and send time. |
| `password_reset_otps` | Password recovery OTP and reset-token hashes, expiration, attempts, and send time. |

## 4. Data integrity requirements

- **DATA-FR-001:** Every entity shall have a primary key. Relationships between persistent entities shall use foreign keys where defined by the domain model.
- **DATA-FR-002:** Account role values shall be `driver`, `dispatcher`, or `ticketing_officer`. The former `admin` role is converted to `ticketing_officer` without changing account identifiers.
- **DATA-FR-003:** A Driver profile shall reference one account. Driver contact number and public Driver ID shall be unique. Vehicle plate and body number shall be unique.
- **DATA-FR-004:** Each route shall have a unique queue prefix independent of its numeric database key.
- **DATA-FR-005:** The database shall allow at most one open assignment for a route and operating date and at most one open route assignment for a Dispatcher on an operating date.
- **DATA-FR-006:** A queue reservation shall use approval states `pending`, `approved`, `cancelled`, or `expired`; queue progress shall be nullable or `on_queue`, `loading`, or `departed`.
- **DATA-FR-007:** The database shall enforce no more than one active pending/on-queue/loading reservation per Driver.
- **DATA-FR-008:** Queue numbers shall be in the range 1–9999 when allocated. The reservation queue number shall be null when the reservation is pending, cancelled, expired, or departed, according to the current lifecycle constraints.
- **DATA-FR-009:** A dispatch ticket shall have a UUID primary key and a unique eight-character public reference. Its reservation relationship shall be one-to-one.
- **DATA-FR-010:** Ticket validity shall agree with its lifecycle timestamps: a ticket is valid only while `used_at`, `cancelled_at`, and `expired_at` are all null.
- **DATA-FR-011:** A trip direction shall be `outgoing` or `returning`. Trip completion shall be represented separately by `is_complete` and arrival/duration data.
- **DATA-FR-012:** A trip shall use exactly one identity source: a non-null dispatch reference with null direct Driver/vehicle references, or a null dispatch reference with both direct Driver and vehicle references populated.
- **DATA-FR-013:** OTP and reset-token secrets shall be represented in storage by salted/hash values rather than plaintext codes or tokens.
- **DATA-FR-014:** The database shall retain used, cancelled, and expired tickets and their lifecycle timestamps for operational history.
- **DATA-FR-015:** Passenger queue entries shall have an opaque session token, route and terminal foreign keys, and presence timestamps. They shall not store commuter names or account data.

## 5. Enumeration catalog

| Enumeration | Stored values |
|---|---|
| Account role | `driver`, `dispatcher`, `ticketing_officer` |
| Account status | `active`, `suspended`, `disabled` |
| Reservation approval | `pending`, `approved`, `cancelled`, `expired` |
| Queue progress | `on_queue`, `loading`, `departed` |
| Trip direction | `outgoing`, `returning` |
| Vehicle condition | `new`, `operational`, `under_maintenance` |
| Vehicle activity | `active`, `loading`, `on-route` |
| Geofence event | `enter`, `exit` |
| Incident status/type, notification type, broadcast type, audit action | Defined by the corresponding enums in `backend/app/enums.py`. |

## 6. Migration and schema status

- **Repository status:** the source Alembic head is `f2b7c9d1e3a5` (`add_trip_pause_events`), following the commuter queue migration `e6a3b8d2f5c1`.
- **Database status:** the local/cloud PostgreSQL revision was not queried during this review. Check the intended database with `alembic current`; do not assume it matches source head.
- **GPS schema gap:** `gps_logs` does not currently contain the unique client sample identifier required for safe offline retry deduplication. The Driver-side durable offline queue is also not represented by a backend table; it will live in local app storage. Decide whether to add a unique sample UUID to `gps_logs` before implementing synchronization.

## 7. Implementation status and known gaps (source review: 2026-10-28)

- **Present in source:** account, Driver/Dispatcher profile, owned/borrowed vehicle, terminal, route, dispatch, reservation, ticket, direct/dispatch-linked trip, GPS/location, passenger queue, trip-pause, incident, notification, audit, and OTP entities.
- **Alembic source head:** `f2b7c9d1e3a5` (`add_trip_pause_events`). The current local/deployed PostgreSQL revision was not checked; do not assume it matches the source head.
- **Known gaps:** no durable offline GPS queue or client-sample idempotency field; direct trips retain nullable legacy dispatch/ticket fields; trip-to-ticket one-to-one is not enforced by a database unique constraint.
- **Product status:** this document describes the dispatch-ticketing model. No dispatch-role/table cleanup migration has been authored/applied for the current product direction.

## 8. Entity-relationship diagram

The diagram below represents the current database foreign keys and uniqueness constraints. Optional foreign keys are marked with optional cardinality. The trip identity-source check constraint requires either a dispatch record or direct Driver/vehicle identity for each trip.

```mermaid
erDiagram
    ACCOUNTS {
        int account_id PK
        string account_code UK
        string username UK
        string role
        string status
    }
    USERS {
        int user_id PK
        string driver_id UK
        int account_id FK
        string contact_number UK
        string license_num UK
    }
    DISPATCHER_PROFILES {
        int dispatcher_profile_id PK
        int account_id FK
        string contact details
    }
    VEHICLES {
        int vehicle_id PK
        int owner_id FK
        int borrower_id FK
        string body_number UK
        string plate_number UK
        string condition
        string activity_status
    }
    TERMINALS {
        int terminal_id PK
        int admin_id FK
        string terminal_name
    }
    DESTINATIONS {
        int destination_id PK
        string name
    }
    ROUTES {
        int route_id PK
        int origin_id FK
        int destination_id FK
        string queue_prefix UK
        decimal distance
    }
    DISPATCHER_ASSIGNMENTS {
        int id PK
        date operating_date
        int route_id FK
        int dispatcher_id FK
        int assigned_by FK
        datetime closed_at
    }
    DISPATCH_LOGS {
        int dispatch_id PK
        int admin_id FK
        int driver_id FK
        int vehicle_id FK
        int route_id FK
    }
    QUEUE_RESERVATIONS {
        int id PK
        int driver_id FK
        int vehicle_id FK
        int route_id FK
        int approved_by FK
        int cancelled_by FK
        int queue_number
        string approval_status
        string queue_status
    }
    PASSENGER_QUEUE_ENTRIES {
        int passenger_queue_entry_id PK
        string session_token UK
        int route_id FK
        int terminal_id FK
        boolean is_active
        datetime joined_at
        datetime last_seen_at
        datetime left_at
    }
    DISPATCH_TICKETS {
        uuid id PK
        int reservation_id FK, UK
        int driver_id FK
        int vehicle_id FK
        int route_id FK
        int issued_by FK
        string public_reference UK
        datetime used_at
        datetime cancelled_at
        datetime expired_at
    }
    TRIPS {
        int trip_id PK
        int dispatch_id FK
        int driver_id FK
        int vehicle_id FK
        uuid dispatch_ticket_id FK
        string direction
        boolean is_complete
    }
    DRIVER_LOCATIONS {
        int driver_id PK, FK
        int vehicle_id FK
        int dispatch_id FK
        decimal latitude
        decimal longitude
    }
    TRIP_PAUSE_EVENTS {
        int pause_event_id PK
        int trip_id FK
        datetime paused_at
        datetime resumed_at
    }
    GPS_LOGS {
        int gps_log_id PK
        int trip_id FK
        decimal latitude
        decimal longitude
        datetime recorded_at
    }
    GEOFENCE_EVENTS {
        int event_id PK
        int terminal_id FK
        int vehicle_id FK
        string event_type
    }
    INCIDENTS {
        int incident_id PK
        int trip_id FK
        int reported_by FK
        int resolved_by FK
        int updated_by FK
        string incident_type
        string status
    }
    NOTIFICATIONS {
        int notification_id PK
        int recipient_id FK
        string notification_type
        boolean is_read
    }
    BROADCAST_NOTIFICATIONS {
        int broadcast_id PK
        int terminal_id FK
        int route_id FK
        string broadcast_type
    }
    AUDIT_LOGS {
        int audit_id PK
        int actor_id FK
        string action
        string target_table
        int target_id
    }
    EMAIL_VERIFICATIONS {
        int verification_id PK
        int account_id FK
        string pending_email
        string code_hash
    }
    PASSWORD_RESET_OTPS {
        int reset_id PK
        int account_id FK
        string target_email
        string code_hash
    }

    ACCOUNTS ||--o| USERS : has_driver_profile
    ACCOUNTS ||--o| DISPATCHER_PROFILES : has_dispatcher_profile
    USERS ||--o{ VEHICLES : owns
    USERS o|--o| VEHICLES : borrows
    ACCOUNTS o|--o| TERMINALS : legacy_admin_reference
    TERMINALS ||--o{ ROUTES : origin
    DESTINATIONS ||--o{ ROUTES : destination
    ACCOUNTS ||--o{ DISPATCHER_ASSIGNMENTS : assigned_dispatcher
    ACCOUNTS ||--o{ DISPATCHER_ASSIGNMENTS : assigned_by
    ACCOUNTS o|--o{ DISPATCHER_ASSIGNMENTS : closed_by
    ROUTES ||--o{ DISPATCHER_ASSIGNMENTS : assigned_route
    ACCOUNTS o|--o{ DISPATCH_LOGS : recorded_by
    USERS ||--o{ DISPATCH_LOGS : dispatched_driver
    VEHICLES ||--o{ DISPATCH_LOGS : dispatched_vehicle
    ROUTES ||--o{ DISPATCH_LOGS : dispatched_route
    USERS ||--o{ QUEUE_RESERVATIONS : requests
    VEHICLES ||--o{ QUEUE_RESERVATIONS : reserved_vehicle
    ROUTES ||--o{ QUEUE_RESERVATIONS : reserved_route
    ROUTES ||--o{ PASSENGER_QUEUE_ENTRIES : receives
    TERMINALS ||--o{ PASSENGER_QUEUE_ENTRIES : hosts
    ACCOUNTS o|--o{ QUEUE_RESERVATIONS : approved_by
    ACCOUNTS o|--o{ QUEUE_RESERVATIONS : cancelled_by
    QUEUE_RESERVATIONS ||--o| DISPATCH_TICKETS : issues
    USERS ||--o{ DISPATCH_TICKETS : ticket_driver
    VEHICLES ||--o{ DISPATCH_TICKETS : ticket_vehicle
    ROUTES ||--o{ DISPATCH_TICKETS : ticket_route
    ACCOUNTS ||--o{ DISPATCH_TICKETS : issued_by
    DISPATCH_LOGS o|--o{ TRIPS : dispatch_source
    USERS o|--o{ TRIPS : direct_driver
    VEHICLES o|--o{ TRIPS : direct_vehicle
    DISPATCH_TICKETS o|--o{ TRIPS : referenced_ticket
    TRIPS ||--o{ GPS_LOGS : records
    TRIPS ||--o{ TRIP_PAUSE_EVENTS : pause_history
    USERS ||--o| DRIVER_LOCATIONS : current_location
    VEHICLES ||--o{ DRIVER_LOCATIONS : current_vehicle
    DISPATCH_LOGS o|--o{ DRIVER_LOCATIONS : current_dispatch
    TERMINALS ||--o{ GEOFENCE_EVENTS : records
    VEHICLES ||--o{ GEOFENCE_EVENTS : triggers
    TRIPS ||--o{ INCIDENTS : has
    USERS ||--o{ INCIDENTS : reports
    ACCOUNTS o|--o{ INCIDENTS : reviews
    ACCOUNTS ||--o{ NOTIFICATIONS : receives
    TERMINALS o|--o{ BROADCAST_NOTIFICATIONS : terminal_scope
    ROUTES o|--o{ BROADCAST_NOTIFICATIONS : route_scope
    ACCOUNTS ||--o{ AUDIT_LOGS : performs
    ACCOUNTS ||--o{ EMAIL_VERIFICATIONS : verifies_email
    ACCOUNTS ||--o{ PASSWORD_RESET_OTPS : resets_password
```
