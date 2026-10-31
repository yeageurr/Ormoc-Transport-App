# Database Matrix

**Document ID:** SRS-ND-DATA-MATRIX  
**Version:** 1.0  
**Review date:** 2026-10-31  
**Source of truth:** SQLAlchemy models in `backend/app/models`.

> This matrix documents model columns in the current source, not an introspected local or hosted database. Types are shown in PostgreSQL-oriented form. `PK` means primary key, `FK` foreign key, `UQ` unique, and `IDX` indexed. Enum columns use PostgreSQL named enum types; labels below use the Python enum names unless noted. Defaults describe model/database defaults where declared. Confirm actual deployed columns and constraints against that database's Alembic revision.

## `accounts`

Login identity, authorization role, account status, and credentials for Admin and Driver users.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `account_id` | Integer | Not null; PK; autoincrement | Internal identity referenced by profile, notification, audit, and verification records. |
| `account_code` | VARCHAR(10) | Not null; UQ | Human-readable account reference used in management and audit contexts. |
| `username` | VARCHAR(50) | Not null; UQ | Login identifier; Driver accounts use the phone-based username. |
| `display_name` | VARCHAR(100) | Nullable | Optional label for Admin-facing account display. |
| `email` | VARCHAR(255) | Nullable; UQ | Optional account contact and email-based password recovery destination. |
| `password_hash` | VARCHAR(255) | Not null | One-way password hash; plaintext credentials must not be stored. |
| `password_reset_token_hash` | VARCHAR(64) | Nullable | Hashed legacy/reset token value; avoids storing a usable reset token in plaintext. |
| `password_reset_expires_at` | TIMESTAMP WITH TIME ZONE | Nullable | Expiry for the legacy/reset token. |
| `status` | ENUM `account_status` | Not null; default `ACTIVE` | Controls whether the account can authenticate; values: `ACTIVE`, `SUSPENDED`, `DISABLED`. |
| `role` | ENUM `account_role` | Not null | Selects authorization policy; current values: `ADMIN`, `DRIVER`. |
| `created_on` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Records account creation time. |
| `updated_on` | TIMESTAMP WITH TIME ZONE | Nullable; updated on change | Records the latest account update time when an update occurs. |
| `last_login` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Stores the last recorded login time. |
| `must_change_password` | BOOLEAN | Not null; default `true` | Gates first use until the temporary password is replaced; password reset clears the flag. |

## `users`

Driver profile and licensing/contact details. Admin accounts do not have a row here.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `user_id` | Integer | Not null; PK; autoincrement | Internal Driver-profile identity used by trips, vehicles, and locations. |
| `driver_id` | VARCHAR(10) | Not null; UQ | Public Driver identifier shown in the Driver app; separate from internal `user_id`. |
| `account_id` | Integer | Not null; FK → `accounts.account_id`; UQ | Connects one Driver profile to its login account and enforces one profile per account. |
| `first_name` | VARCHAR(50) | Not null | Driver's given name for profile and operational displays. |
| `last_name` | VARCHAR(50) | Not null | Driver's family name for profile and operational displays. |
| `contact_number` | VARCHAR(11) | Not null; UQ | Phone contact and Driver login identifier. Stored as text to preserve leading zeroes. |
| `email` | VARCHAR(255) | Nullable; UQ | Optional Driver contact and verified email-recovery address. |
| `license_num` | VARCHAR(13) | Not null; UQ | Driver license identifier for regulatory/account administration. |
| `license_expiry` | TIMESTAMP WITH TIME ZONE | Not null | Date/time at which the recorded Driver license expires. |

## `vehicles`

Vehicle identity, canonical ownership, optional borrowing, registration state, and operational availability.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `vehicle_id` | Integer | Not null; PK; autoincrement | Internal vehicle identity referenced by trips, locations, and geofence events. |
| `owner_id` | Integer | Not null; FK → `users.user_id` | Canonical Driver owner. Ownership remains attached when another Driver borrows the vehicle. |
| `borrower_id` | Integer | Nullable; FK → `users.user_id`; UQ | Optional current borrower; unique so one Driver is assigned as borrower to at most one vehicle at a time. |
| `body_color` | VARCHAR(7) | Not null | Vehicle color, stored as a short color value (typically a hex code). |
| `body_number` | VARCHAR(10) | Not null; UQ | Internal/visible vehicle body identifier. |
| `plate_number` | VARCHAR(8) | Not null; UQ | Vehicle registration plate used for identity and operational displays. |
| `vehicle_type` | VARCHAR(50) | Not null | Vehicle class. Driver-account creation currently fixes this workflow to Multicab. |
| `condition` | ENUM `vehicle_condition` | Not null; default `NEW` | Maintenance/roadworthiness state; values: `NEW`, `OPERATIONAL`, `UNDER_MAINTENANCE`. |
| `activity_status` | ENUM `vehicle_activity_status` | Not null by typed model; default `ACTIVE` | Current operation state; values: `ACTIVE`, `LOADING`, `ON_ROUTE`. |
| `is_registered` | BOOLEAN | Not null | Indicates whether the vehicle registration is recorded as valid/current. |
| `registry_expiration` | TIMESTAMP WITH TIME ZONE | Not null | Registration expiry used for vehicle compliance review. |
| `created_on` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Vehicle record creation time. |
| `updated_on` | TIMESTAMP WITH TIME ZONE | Nullable; updated on change | Latest vehicle edit time. |

## `terminals`

Terminal location and rectangular geofence bounds used by commuter presence and Driver readiness flows.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `terminal_id` | Integer | Not null; PK; autoincrement | Internal terminal identity referenced by routes, queue entries, and geofence events. |
| `admin_id` | Integer | Nullable; FK → `accounts.account_id`; UQ | Optional Admin association retained for terminal administration. |
| `terminal_name` | VARCHAR(50) | Not null | Human-readable terminal name. |
| `min_latitude` | NUMERIC(9,6) | Not null | Southern/smallest latitude boundary of the rectangular geofence. |
| `min_longitude` | NUMERIC(9,6) | Not null | Western/smallest longitude boundary of the rectangular geofence. |
| `max_latitude` | NUMERIC(9,6) | Not null | Northern/largest latitude boundary of the rectangular geofence. |
| `max_longitude` | NUMERIC(9,6) | Not null | Eastern/largest longitude boundary of the rectangular geofence. |
| `address` | TEXT | Not null; UQ | Human-readable terminal address for display and administration. |

## `destinations`

Named route endpoints with coordinates and a display address.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `destination_id` | Integer | Not null; PK; autoincrement | Internal destination identity referenced by routes. |
| `name` | VARCHAR(50) | Not null | Destination/route label shown to Drivers and commuters. |
| `latitude` | NUMERIC(9,6) | Not null | Destination latitude for mapping and route geometry. |
| `longitude` | NUMERIC(9,6) | Not null | Destination longitude for mapping and route geometry. |
| `address` | TEXT | Not null; UQ | Human-readable destination address. |

## `routes`

Route definition between a terminal origin and a destination, including distance, optional travel-time reference, and map geometry.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `route_id` | Integer | Not null; PK; autoincrement | Stable route identity referenced by trips and queue entries. |
| `origin_id` | Integer | Not null; FK → `terminals.terminal_id` | Identifies the route's starting terminal. |
| `destination_id` | Integer | Not null; FK → `destinations.destination_id` | Identifies the route's destination. |
| `distance` | NUMERIC(6,2) | Not null | Configured route distance, used in route details and baseline calculations. |
| `average_travel_duration` | NUMERIC(6,2) | Nullable | Historical/configured average duration in minutes; it is not an AI prediction. |
| `route_geometry` | JSON | Nullable | Optional GeoJSON-like LineString coordinates for drawing the route and map-matching ETA baseline. |
| `is_active` | BOOLEAN | Not null; default `true` | Determines whether a route is offered for new trips and public route discovery. |

## `trips`

One-way trip leg with direct Driver, vehicle, and route references. Completion is separate from direction.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `trip_id` | Integer | Not null; PK; autoincrement | Internal trip identity for detail, GPS, pause, and reporting records. |
| `driver_id` | Integer | Not null; FK → `users.user_id` | Driver who performed the trip. |
| `vehicle_id` | Integer | Not null; FK → `vehicles.vehicle_id` | Vehicle used for the trip. |
| `route_id` | Integer | Not null; FK → `routes.route_id`; IDX | Route selected for this trip leg; indexed for route/time queries. |
| `status` | ENUM `trip_status` | Not null; default `OUTGOING` | Direction only; current values are `OUTGOING` and `RETURNING`. Completion is represented by `is_complete`. |
| `time_departed` | TIMESTAMP WITH TIME ZONE | Not null | Trip start/departure time. |
| `time_arrived` | TIMESTAMP WITH TIME ZONE | Nullable | Trip completion/arrival time; null while the trip is active. |
| `trip_duration_minutes` | NUMERIC(6,2) | Nullable | Measured duration in minutes, calculated when the trip ends. |
| `average_speed_km` | NUMERIC(6,2) | Nullable | Recorded/calculated average speed in kilometers per hour when available. |
| `distance_traveled_km` | NUMERIC(8,3) | Nullable | Distance calculated from accepted GPS samples. |
| `is_complete` | BOOLEAN | Not null; model default `false` | Lifecycle flag distinguishing active from completed trips, independent of direction. |

## `trip_pause_events`

Pause and resume history for active trips, including optional delay notice data.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `pause_event_id` | Integer | Not null; PK; autoincrement | Identifies one pause interval. |
| `trip_id` | Integer | Not null; FK → `trips.trip_id` with `ON DELETE CASCADE`; IDX | Associates the pause with its trip and speeds trip-event lookup. |
| `paused_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | When the Driver paused the trip. |
| `resumed_at` | TIMESTAMP WITH TIME ZONE | Nullable | When the Driver resumed; null means the pause is still open. |
| `delay_reason` | VARCHAR(32) | Nullable | Selected reason such as traffic, accident, road incident, or other. |
| `delay_details` | TEXT | Nullable | Driver-entered explanation when additional detail is needed. |
| `broadcast_to_commuters` | BOOLEAN | Not null; default `false` | Indicates whether this pause is exposed as a commuter delay notice. |

## `driver_locations`

Latest known Driver/vehicle location snapshot; this is not a trip's ordered GPS history.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `driver_id` | Integer | Not null; PK and FK → `users.user_id` | Driver identity and one-row-per-Driver key. |
| `vehicle_id` | Integer | Not null; FK → `vehicles.vehicle_id` | Vehicle associated with the latest location. |
| `latitude` | NUMERIC(9,6) | Not null | Latest known latitude. |
| `longitude` | NUMERIC(9,6) | Not null | Latest known longitude. |
| `speed_kmh` | NUMERIC(6,2) | Not null; default `0` | Latest reported speed for map/status presentation. |
| `recorded_at` | TIMESTAMP WITH TIME ZONE | Not null; server default and update time | Time of the latest location write. |

## `gps_logs`

Time-ordered GPS samples captured during a trip; used for trip path and measured distance.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `gps_log_id` | Integer | Not null; PK; autoincrement | Identifies a stored GPS sample. |
| `trip_id` | Integer | Not null; FK → `trips.trip_id` | Associates the sample with the trip whose path it documents. |
| `latitude` | NUMERIC(9,6) | Not null | Captured latitude. |
| `longitude` | NUMERIC(9,6) | Not null | Captured longitude. |
| `recorded_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Capture/persistence timestamp used to order the path. |
| `speed_kmh` | NUMERIC(6,2) | Not null | Speed reported with the GPS sample; supports measurement and analysis. |

## `passenger_queue_entries`

Anonymous commuter presence session for one selected route and terminal; it is not a numbered reservation or passenger identity record.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `passenger_queue_entry_id` | Integer | Not null; PK; autoincrement | Internal queue-session identity. |
| `session_token` | VARCHAR(64) | Not null; UQ | Opaque credential allowing the commuter app to retrieve and update its queue session without an account. |
| `route_id` | Integer | Not null; FK → `routes.route_id` with `ON DELETE CASCADE` | Route selected by the commuter; groups the live count by route. |
| `terminal_id` | Integer | Not null; FK → `terminals.terminal_id` with `ON DELETE CASCADE` | Terminal geofence where the queue session was created. |
| `is_active` | BOOLEAN | Not null; default `true` | Whether the session is currently counted, subject to heartbeat freshness. |
| `joined_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Time the commuter joined the route queue. |
| `last_seen_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Most recent heartbeat, used to age out stale presence. |
| `left_at` | TIMESTAMP WITH TIME ZONE | Nullable | Time the session was explicitly deactivated after leaving. |

The model declares the composite index `ix_passenger_queue_route_active_seen` on (`route_id`, `is_active`, `last_seen_at`) to support active-count queries.

## `notifications`

Persistent account-targeted in-app notices with read state.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `notification_id` | Integer | Not null; PK; autoincrement | Notification identity used by list/read operations. |
| `recipient_id` | Integer | Not null; FK → `accounts.account_id` | Account allowed to retrieve and mark the notification read. |
| `notification_type` | ENUM `notification_type` | Not null | Categorizes the notification; values: `SUSPENSION`, `WARNING`, `UPDATED`. |
| `message` | TEXT | Nullable | User-facing notification content. |
| `is_read` | BOOLEAN | Not null; model default `false` | Tracks whether the recipient has read the notification. |
| `created_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Notification creation time for ordering and display. |

## `audit_logs`

Audit records for supported account, vehicle, trip, and system actions. This is distinct from trip and GPS history.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `audit_id` | Integer | Not null; PK; autoincrement | Audit event identity. |
| `actor_id` | Integer | Nullable; FK → `accounts.account_id` | Account that performed the action, when the actor is an account. Nullable for system actions. |
| `actor_type` | VARCHAR(20) | Not null; default `account` | Distinguishes account-originated actions from other actor types, including system activity. |
| `action` | ENUM `audit_action` | Not null | Action category; persisted labels are lowercase: `create`, `update`, `suspend`, `resolve`, `delete`. |
| `target_table` | VARCHAR(50) | Not null | Name of the logical entity/table affected. |
| `target_id` | Integer | Not null | Identifier of the affected record; polymorphic target, so it is not a single-table FK. |
| `details` | TEXT | Not null | Human-readable summary of the action and affected data. |
| `outcome` | VARCHAR(20) | Not null; default `success` | Outcome label for successful or failed action attempts. |
| `context` | JSON | Nullable | Additional structured context, such as request/actor metadata. |
| `created_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Time the audit event was recorded. |

## `email_verifications`

Pending email-change OTP challenge, stored separately from the Driver's committed profile email.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `verification_id` | Integer | Not null; PK; autoincrement | Email verification challenge identity. |
| `account_id` | Integer | Not null; FK → `accounts.account_id` with `ON DELETE CASCADE`; UQ | Associates at most one pending email verification with an account. |
| `pending_email` | VARCHAR(255) | Not null | Proposed email address, not yet trusted until successful verification. |
| `code_salt` | VARCHAR(32) | Not null | Salt used when hashing the OTP. |
| `code_hash` | VARCHAR(64) | Not null | Hash of the OTP; the raw code is not stored. |
| `expires_at` | TIMESTAMP WITH TIME ZONE | Not null | Expiration time after which the code cannot verify the email. |
| `attempts` | Integer | Not null; model default `0` | Counts OTP verification attempts for the challenge. |
| `last_sent_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Supports resend cooldown enforcement. |

## `password_reset_otps`

Email or SMS password-recovery challenge, including hashed OTP and hashed one-time reset token state.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `reset_id` | Integer | Not null; PK; autoincrement | Password-reset challenge identity. |
| `account_id` | Integer | Not null; FK → `accounts.account_id` with `ON DELETE CASCADE`; UQ | Allows at most one current reset challenge per account. |
| `target_email` | VARCHAR(255) | Nullable | Email delivery destination when email recovery is selected. |
| `target_phone` | VARCHAR(11) | Nullable | SMS delivery destination when phone recovery is selected. |
| `code_salt` | VARCHAR(32) | Not null | Salt for the OTP hash. |
| `code_hash` | VARCHAR(64) | Not null | Hashed OTP; the raw recovery code is not stored. |
| `expires_at` | TIMESTAMP WITH TIME ZONE | Not null | OTP expiry time. |
| `attempts` | Integer | Not null; model default `0` | Counts submitted OTP attempts; current password-reset flow does not enforce a maximum. |
| `send_count` | Integer | Not null; default `0` | Tracks sends for cooldown/three-send policy. |
| `last_sent_at` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Enforces minimum delay between code sends. |
| `cooldown_until` | TIMESTAMP WITH TIME ZONE | Nullable | Extended cooldown expiry after the configured send threshold. |
| `reset_token_hash` | VARCHAR(64) | Nullable | Hash of the short-lived token issued after OTP verification. |
| `reset_token_expires_at` | TIMESTAMP WITH TIME ZONE | Nullable | Expiry for the post-verification password-reset token. |

The model declares `ck_password_reset_otp_single_destination`, requiring exactly one of `target_email` or `target_phone` to be non-null.

## `geofence_events`

Vehicle enter/exit events for a terminal geofence; used to support terminal-readiness and operational state.

| Field | Main data type | Null / key / default | Purpose |
|---|---|---|---|
| `event_id` | Integer | Not null; PK; autoincrement | Geofence event identity. |
| `terminal_id` | Integer | Not null; FK → `terminals.terminal_id` | Terminal boundary where the event occurred. |
| `vehicle_id` | Integer | Not null; FK → `vehicles.vehicle_id` | Vehicle associated with the geofence event. |
| `event_type` | ENUM `geofence_event_type` | Not null; default `ENTER` | Event kind; values: `ENTER`, `EXIT`. |
| `event_time` | TIMESTAMP WITH TIME ZONE | Not null; server default current time | Time the enter/exit event was recorded. |

## Cross-table notes

- Direction values in `trips.status` are `OUTGOING` and `RETURNING`; the `COMPLETED` value was removed. `trips.is_complete` records lifecycle completion.
- Driver/vehicle/route identity is required directly on every current trip; dispatch and ticket foreign keys are not part of the current model.
- Coordinates use six decimal places in stored `NUMERIC(9,6)` fields. Device location accuracy and heading are not currently persisted in these models.
- GPS capture is foreground-oriented in the mobile app. The models do not provide a durable offline upload queue, client sample idempotency key, or background synchronization state.
- Vehicle `owner_id` is required and `borrower_id` is optional. The API defines operational assignment behavior; a database FK alone does not prove the assigned Driver is permitted to use the vehicle.
- `alembic_version`, if present, is migration infrastructure, not an application model. Historical dispatch/incident migrations remain in the repository but those entities are not in the current ORM model registry.

See [Entity Relationship Diagram](Entity%20Relationship%20Diagram.md) for the table relationships.
