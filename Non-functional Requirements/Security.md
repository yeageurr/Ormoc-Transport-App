# Software Requirements Specification (SRS): Non-functional Requirements — Security

**Document ID:** SRS-NFR-SEC
**Version:** 1.1
**Review date:** 2026-10-31

> Current source uses Admin and Driver accounts. Requirements are grouped by the modules whose data or actions they protect. Source notes do not verify hosted secrets, database state, or deployment configuration.

## 1. Purpose and scope

This document defines security requirements for authentication, Admin management, Driver trip/profile functions, public Commuter endpoints, notifications, and personal/location data.

## 2. Requirements

### 2.1 Authentication and account sessions

- **SRS-NFR-SEC-AUTH-001:** Login shall verify that the account role matches the requested portal: `admin` for the Admin web portal and `driver` for the Driver app.
- **SRS-NFR-SEC-AUTH-002:** Invalid credentials, inactive accounts, and portal-role mismatch shall produce the same generic response and shall not disclose whether an account exists or reveal its role.
- **SRS-NFR-SEC-AUTH-003:** The backend shall issue no authenticated session/token when login is rejected and shall validate account status and role on protected requests.
- **SRS-NFR-SEC-AUTH-004:** Passwords shall be stored as one-way hashes and shall never be returned in API responses or written to logs.
- **SRS-NFR-SEC-AUTH-005:** Accounts with `must_change_password = true` shall be blocked from ordinary protected operations until initial password setup succeeds. Forgotten-password recovery shall be separately authorized by a valid OTP/reset token.
- **SRS-NFR-SEC-AUTH-006:** The system shall limit an account to three consecutive failed login attempts and require the configured recovery/cooldown before another attempt. This is a requirement; it is not implemented in current backend source.

### 2.2 Password recovery and email verification

- **SRS-NFR-SEC-OTP-001:** Password-reset and email-change OTP values shall be time-limited, stored only as salted hashes, and compared without exposing the submitted or expected code.
- **SRS-NFR-SEC-OTP-002:** OTP delivery shall enforce a 60-second resend cooldown and a three-send limit followed by a three-minute cooldown. Password-reset OTP verification attempts shall be capped to prevent guessing; current password-reset source does not cap them.
- **SRS-NFR-SEC-OTP-003:** Password-reset tokens shall be random, short-lived, single-use, stored as hashes, and invalidated after successful password replacement.
- **SRS-NFR-SEC-OTP-004:** Phone/email changes shall require current-password verification; a new email shall not become the committed profile address until its OTP is verified.
- **SRS-NFR-SEC-OTP-005:** PhilSMS and SMTP credentials shall remain backend-only secrets. Provider failures shall not disclose OTPs or credentials in API responses or logs.

### 2.3 Admin web portal

- **SRS-NFR-SEC-ADMIN-001:** Driver-account, vehicle, audit, trip, dashboard, and live-map endpoints shall enforce Admin authorization server-side; hiding a page or button shall not serve as authorization.
- **SRS-NFR-SEC-ADMIN-002:** Admin driver/vehicle edits and status changes shall validate target ownership/eligibility and shall record an audit event where the operation supports auditing.
- **SRS-NFR-SEC-ADMIN-003:** Audit and trip data shall be limited to authorized Admin access and shall not expose password hashes, OTP hashes, reset tokens, or unnecessary credentials.

### 2.4 Driver mobile app

- **SRS-NFR-SEC-DRIVER-001:** Driver API requests shall use the authenticated Driver token; trip, GPS, profile, notification, and queue-count access shall be scoped to the signed-in Driver or their permitted route/trip context.
- **SRS-NFR-SEC-DRIVER-002:** Mobile access tokens shall be stored in platform-secure storage and cleared on logout and password-recovery completion.
- **SRS-NFR-SEC-DRIVER-003:** The backend shall reject GPS writes for a trip not owned by the authenticated Driver and reject new GPS samples after trip completion.

### 2.5 Public Commuter app and data minimization

- **SRS-NFR-SEC-COMM-001:** Public route, vehicle, terminal, delay-notice, and queue APIs shall return only fields required for their commuter use; public live-vehicle responses shall not expose Driver account/contact information.
- **SRS-NFR-SEC-COMM-002:** Anonymous passenger queue sessions shall use an unguessable opaque token, validate terminal geofence coordinates server-side, and avoid collecting commuter account identity when none is required.
- **SRS-NFR-SEC-COMM-003:** Public APIs shall validate and bound incoming coordinates, tokens, and identifiers and shall not trust client-provided route/queue state without server checks.

### 2.6 Transport, configuration, and diagnostics

- **SRS-NFR-SEC-COMMON-001:** Production credentials and sensitive API traffic shall use TLS; secrets shall be provided through the hosting environment or managed secret store, not committed source or client bundles.
- **SRS-NFR-SEC-COMMON-002:** Diagnostic logs shall exclude passwords, bearer tokens, OTP values, and full sensitive profile data.
- **SRS-NFR-SEC-COMMON-003:** CORS shall allow only configured web origins in production; CORS shall not be treated as an authorization mechanism.

## 3. Current implementation notes

- **Present in source:** current roles are `admin` and `driver`; login checks portal-role compatibility and uses the generic “Account doesn't exist” response for invalid credentials, inactive accounts, and role mismatch. Protected API and WebSocket access enforce account/role checks.
- **Present in source:** passwords and OTP/reset secrets are hashed; Driver native tokens use Expo SecureStore. Password-reset requests enforce a 60-second resend interval and three-send cooldown behavior. Email-change flow uses OTP verification. PhilSMS/SMTP delivery is environment-dependent.
- **Not implemented:** three-failed-login throttling and a maximum password-reset OTP verification-attempt count. Current password-reset `attempts` metadata is incremented but has no enforcement threshold.
- **Policy caveat:** the backend's authenticated password-change endpoint is available only while initial password setup is required; subsequent replacement uses password recovery. The Driver profile still links to a change-password screen, so this user-facing policy needs reconciliation.
- **Deployment caveat:** source review does not confirm production TLS, CORS origins, secret values, provider delivery, edge rate limits, or target database revision. WebSocket connections are process-local and need shared messaging for multi-worker delivery.

## 4. Related requirements

- [Authentication and Accounts](../Functional%20Requirements/No%20Dispatch%20Ticketing/Authentication%20and%20Accounts.md)
- [Driver Profiles and Vehicles](../Functional%20Requirements/No%20Dispatch%20Ticketing/Driver%20Profiles%20and%20Vehicles.md)
- [Trips and GPS](../Functional%20Requirements/No%20Dispatch%20Ticketing/Trips%20and%20GPS.md)
- [Passenger Queue](../Functional%20Requirements/No%20Dispatch%20Ticketing/Passenger%20Queue.md)
