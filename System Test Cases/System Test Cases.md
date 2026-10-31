# System Test Cases — Ormoc Transport App (No Dispatch)

**Document ID:** STC-ND-001  
**Version:** 1.0  
**Review date:** 2026-10-31  
**Source baseline:** `main` no-dispatch system; traceability is to the current `Functional Requirements/` SRS documents.

> These are planned system-level tests, not execution results. Every case is **Not Run** until performed and recorded in a controlled test environment. Do not run account, trip, or migration cases against production data.

## 1. Purpose and scope

This document defines end-to-end system test cases for the Driver mobile app, Commuter mobile app, Admin web portal, and FastAPI backend. It covers the current no-dispatch scope: account access, driver/vehicle management, route-based trips, GPS, passenger presence queue, commuter delay notices, notifications, dashboards, and audit records.

Dispatch ticketing, reservations, QR tickets, dispatcher workflows, and incident reporting are excluded. A pause-related delay notice is included because it is a distinct commuter-facing feature in the current system.

## 2. Test conventions

- **Test level:** system / end-to-end, using the mobile clients, web portal, API, and a non-production database together.
- **Execution status:** all cases start as `Not Run`. Record actual result, date, tester, build/API revision, and defect ID when executed.
- **Priority:** `P1` = core access or trip/queue path; `P2` = important supporting behavior; `P3` = secondary or environment-dependent behavior.
- **Data safety:** use dedicated test accounts, test vehicles/routes, and disposable trips/queue sessions. Never exercise suspension, trip creation, OTP delivery, or destructive migration tests on production accounts/data.
- **Time handling:** date-boundary and daily metric cases use `Asia/Manila` unless a case says otherwise.
- **External services:** SMS cases require a configured PhilSMS test-capable environment; email cases require configured SMTP and a mailbox controlled by the tester.

## 3. Entry criteria and test setup

Before execution:

1. Confirm the backend, clients, and target database are the intended test revisions; record the Git commit/build version and `alembic current` output.
2. Confirm the test database is at the source Alembic head and contains an active terminal, at least one active route with geometry, and test multicab vehicles.
3. Create one active Driver with a vehicle, one Admin, a suspended Driver, a disabled Driver, and a second Driver for authorization/ownership checks.
4. Configure one account with verified email and one with a valid Philippine mobile number. Verify SMTP/PhilSMS settings without exposing provider secrets in test evidence.
5. Install current Driver and Commuter builds on supported test devices; grant location permissions and enable device location. Use a known location inside and outside the terminal geofence.
6. Ensure a second device/session can observe commuter map and Driver queue changes. For GPS timing tests, allow the app to remain foregrounded and record the device/network conditions.

## 4. System test cases

### 4.1 Authentication and accounts

| ID | Traceability | Scenario and test data | Steps | Expected result | Priority | Status |
|---|---|---|---|---|---|---|
| ST-AUTH-001 | SRS-ND-AUTH-FR-001, FR-002 | Driver signs in through Driver portal with valid phone username and password. | Open Driver app; submit valid credentials. | Authentication succeeds and the Driver reaches the appropriate protected flow. No other portal's role is disclosed. | P1 | Not Run |
| ST-AUTH-002 | SRS-ND-AUTH-FR-002 | Invalid password, unknown username, or role mismatch at a portal. | Submit credentials that are invalid or belong to a different portal role. | Access is denied with the generic account/credential failure behavior; no protected data is returned and the response does not disclose another portal's account role. | P1 | Not Run |
| ST-AUTH-003 | SRS-ND-AUTH-FR-002 | Suspended and disabled Driver accounts attempt login. | Attempt login once with each inactive test account. | Both accounts are denied; account remains unchanged and the client receives no protected session. | P1 | Not Run |
| ST-AUTH-004 | SRS-ND-AUTH-FR-003 | New account requires initial password change. | Sign in with a new account; try navigating to Home before changing the temporary password; complete a valid password change and sign in again. | Protected app functions are blocked until successful change; `must_change_password` becomes false; subsequent login reaches normal app flow. | P1 | Not Run |
| ST-AUTH-005 | SRS-ND-AUTH-FR-004, FR-005 | Password recovery by email OTP. | Request reset for a test email; retrieve OTP; submit correct OTP; set and confirm a valid new password; log in. | OTP is delivered and validated; password is replaced; the new password works and the old one fails. OTP/password secrets are not exposed in client-visible responses or logs. | P1 | Not Run |
| ST-AUTH-006 | SRS-ND-AUTH-FR-004, FR-007 | Password recovery by mobile OTP. | Request reset for a test Philippine mobile number; retrieve the SMS OTP; verify it; set a new password; log in. | PhilSMS delivers the OTP; verification and password reset succeed; login accepts the new password. | P1 | Not Run |
| ST-AUTH-007 | SRS-ND-AUTH-FR-008 | OTP resend cooldown. | Request a code, attempt another request inside 60 seconds, then test the three-send limit and subsequent cooldown using controlled time or recorded timestamps. | Resend requests are blocked during the 60-second cooldown; after three sends, the three-minute cooldown is applied. The test records exact observed API responses/times. | P2 | Not Run |
| ST-AUTH-008 | SRS-ND-AUTH-FR-005, FR-006 | Password policy and logout. | Submit a password that violates configured validation; then log in successfully and log out. | Invalid password is rejected without changing credentials. Logout clears the local access token and protected pages require authentication. | P1 | Not Run |

**Known policy exception:** repeated failed-login throttling and OTP verification-attempt limits are not implemented in the current source. Do not mark them passed unless implemented and separately verified.

### 4.2 Driver account, profile, and vehicle management

| ID | Traceability | Scenario and test data | Steps | Expected result | Priority | Status |
|---|---|---|---|---|---|---|
| ST-USER-001 | SRS-ND-ADMIN-FR-001, FR-007 | Admin creates Driver with a new vehicle. | In Admin portal, enter valid personal/license data and vehicle fields; submit. | Driver and vehicle are created and linked; vehicle type is fixed to Multicab; account requires initial password setup; success is shown only after backend success. | P1 | Not Run |
| ST-USER-002 | SRS-ND-ADMIN-FR-002, FR-007 | Admin assigns an eligible existing multicab to a borrowing Driver. | Create a Driver and choose an eligible existing vehicle; submit; inspect owner and borrower records. | Existing vehicle is associated as borrowed without creating a duplicate or replacing its canonical owner; vehicle type/eligibility rules are enforced. | P1 | Not Run |
| ST-USER-003 | SRS-ND-ADMIN-FR-001, SRS-ND-PROFILE-FR-006 | Invalid or duplicate account/vehicle values. | Attempt creation with malformed phone/email and duplicate phone/plate values. | Client/API validation rejects invalid data; no partial Driver or vehicle record is left behind. | P1 | Not Run |
| ST-USER-004 | SRS-ND-ADMIN-FR-003 | Admin views Driver and associated vehicle. | Open a Driver's details/profile from Admin portal. | Correct Driver details and associated vehicle are shown; private fields belonging to another account are not exposed. | P2 | Not Run |
| ST-USER-005 | SRS-ND-ADMIN-FR-003, FR-006 | Admin suspends and reactivates Driver. | Suspend a test Driver; confirm login denial; reactivate; sign in again. | Status transitions persist; suspension blocks access and reactivation restores access; each supported action creates its expected audit entry. | P1 | Not Run |
| ST-USER-006 | SRS-ND-ADMIN-FR-006 | Admin edits license and vehicle regulatory fields. | Update license number/expiry and vehicle plate using Admin portal; try duplicate values. | Authorized edits persist and are audited; duplicates/invalid fields are rejected; unrelated personal details are unchanged. | P2 | Not Run |
| ST-USER-007 | SRS-ND-PROFILE-FR-003, FR-006 | Driver edits personal details and verifies changed email. | Enter valid contact data; try a nonnumeric or wrong-length phone; change email and submit OTP. | Phone validation gives the specified feedback and prevents invalid submission. New email is saved only after correct OTP verification; cancellation/incorrect OTP leaves old email intact. | P1 | Not Run |

### 4.3 Routes, terminals, and trip lifecycle

| ID | Traceability | Scenario and test data | Steps | Expected result | Priority | Status |
|---|---|---|---|---|---|---|
| ST-TRIP-001 | SRS-ND-ROUTE-FR-001, FR-002; SRS-ND-TRIP-FR-002 | Driver loads route choices. | Open trip-start flow with active and inactive routes in test data. | Only eligible active routes are selectable; route name, destination, direction, and available map geometry correspond to backend data. | P1 | Not Run |
| ST-TRIP-002 | SRS-ND-TRIP-FR-003; SRS-ND-ROUTE-FR-003 | Outgoing trip starts after terminal readiness. | Keep Driver app foregrounded; place vehicle/device inside configured terminal geofence; allow readiness dwell; select outgoing route and start. | Backend recognizes terminal readiness and creates one active outgoing trip with authenticated Driver, associated vehicle, and selected route. | P1 | Not Run |
| ST-TRIP-003 | SRS-ND-TRIP-FR-003 | Outgoing trip start outside terminal or before readiness. | Outside geofence or before the readiness condition, attempt outgoing trip start. | Start is rejected with an actionable reason; no trip record is created. | P1 | Not Run |
| ST-TRIP-004 | SRS-ND-TRIP-FR-003 | Returning trip may start away from terminal. | Select returning and an active route while outside terminal geofence; start. | Trip starts without requiring terminal readiness and is stored as returning with direct Driver/vehicle/route identity. | P1 | Not Run |
| ST-TRIP-005 | SRS-ND-TRIP-FR-004 | Prevent conflicting/invalid trip starts. | While a trip is active, try to start another; repeat with inactive route and unavailable vehicle. | Each invalid attempt is rejected; the existing trip remains unchanged and no duplicate active trip is created. | P1 | Not Run |
| ST-TRIP-006 | SRS-ND-TRIP-FR-006, FR-008, FR-009 | GPS samples during active trip and ownership enforcement. | Start a trip; keep app foregrounded and moving; inspect trip samples; attempt a sample for another Driver's trip and after completion. | Valid fresh fixes are stored against the active owned trip at approximately five-second intervals when available. Unauthorized and completed-trip writes are rejected. | P1 | Not Run |
| ST-TRIP-007 | SRS-ND-TRIP-FR-005, FR-007 | Complete trip and inspect trip history. | End the trip; open Trip Logs and its detail overlay. | Completion, arrival time, duration and available measurements are saved; the ordered GPS samples draw the recorded path. Missing samples are represented honestly, not as a fabricated path. | P1 | Not Run |
| ST-TRIP-008 | SRS-ND-TRIP-FR-011; SRS-ND-NOTIF-FR-005 | Pause and resume without a commuter broadcast. | During active trip, pause; choose “Nothing's wrong”; resume trip. | Pause/resume timestamps are stored; no public delay notice is exposed; GPS logging continues where fresh fixes are available. | P1 | Not Run |
| ST-TRIP-009 | SRS-ND-TRIP-FR-011; SRS-ND-NOTIF-FR-005 | Pause with broadcast reason and optional details. | Pause; choose each supported reason, including “Others” with details; enable broadcast; view Commuter live map; resume. | Pause reason/details and broadcast choice are stored. The matching route notice appears while active and follows the configured resume/expiry behavior; it is no longer presented as active after resumption. | P1 | Not Run |
| ST-TRIP-010 | SRS-ND-REPORT-FR-001 to FR-003 | Driver Home daily metrics use completed trips for Manila date. | Complete known trips with known measured distance/speed on current day; view Home; repeat across date boundary or with no completed trips. | Each one-way completed trip counts once; distance and speed use available completed-trip measurements; current-day filtering uses Asia/Manila; empty values show zero/empty state without counting incomplete trips. | P2 | Not Run |

### 4.4 Commuter live map and passenger queue

| ID | Traceability | Scenario and test data | Steps | Expected result | Priority | Status |
|---|---|---|---|---|---|---|
| ST-COMM-001 | SRS-ND-COMM-FR-001, FR-002, FR-003 | Commuter sees active routes, vehicles, and own location. | Open live map with location permission granted; compare route and vehicle data to backend; move device. | Active route/vehicle details match API data; location marker follows device GPS; human-readable address is shown when reverse geocoding succeeds; no Driver contact/account data is exposed. | P1 | Not Run |
| ST-COMM-002 | SRS-ND-COMM-FR-004 | Geofence route prompt appears only inside terminal. | Test once inside and once outside configured terminal bounds. | Prompt appears inside the supported geofence; it does not appear outside. “No thanks” dismisses the prompt for the current terminal visit. | P1 | Not Run |
| ST-COMM-003 | SRS-ND-COMM-FR-005, FR-008; SRS-ND-QUEUE-FR-001, FR-002 | Commuter confirms route and joins anonymous queue. | Inside geofence, select an active route and confirm; inspect API/database using test tooling. | One opaque session is created for selected route/terminal without personal identity; app shows processing then success and returns to live map. | P1 | Not Run |
| ST-COMM-004 | SRS-ND-QUEUE-FR-003, FR-004; SRS-ND-COMM-FR-006 | Heartbeat, geofence exit, and stale session behavior. | Join queue; send heartbeats; leave geofence; separately allow a test session to become older than two minutes. | Valid heartbeats update last-seen; leaving deactivates the session; inactive/stale sessions are excluded from counts. Timeliness is bounded by foreground execution and refresh behavior. | P1 | Not Run |
| ST-COMM-005 | SRS-ND-QUEUE-FR-005, FR-006 | Driver queue count follows commuter join/leave. | Connect Driver app and Commuter app; create and deactivate a queue session for the Driver's current route; interrupt WebSocket once. | Connected Driver receives count changes; REST polling/focus refresh recovers after interruption; API failure is shown as unavailable, not a false zero. | P1 | Not Run |
| ST-COMM-006 | SRS-ND-COMM-FR-007 | Approaching vehicle cue. | With location permission, use a test vehicle whose fresh position approaches the commuter; then use stale/far vehicle data. | Wave/approach cue appears only when available current location and sufficiently fresh vehicle position satisfy the implementation's approach rule; stale/unrelated vehicle data does not create a false cue. | P2 | Not Run |
| ST-COMM-007 | SRS-ND-COMM-FR-009; SRS-ND-NOTIF-FR-005 | Commuter sees a Driver delay broadcast. | Driver broadcasts a pause notice for a route; refresh or wait for map polling; resume trip. | Commuter sees the route-matched reason/details and pause state while valid; notice updates/ceases after resume or configured recency period. Unbroadcast pause is not public. | P1 | Not Run |

### 4.5 Notifications, dashboard, and audit

| ID | Traceability | Scenario and test data | Steps | Expected result | Priority | Status |
|---|---|---|---|---|---|---|
| ST-OPS-001 | SRS-ND-NOTIF-FR-001, FR-002 | Driver reads and marks own notification. | Create/receive a test notification; fetch it; mark it read; try to access another account's notification. | Owned notification appears and read state persists; cross-account access is denied; notification remains retrievable after reconnect if live delivery was missed. | P2 | Not Run |
| ST-OPS-002 | SRS-ND-ADMIN-FR-004, FR-006; SRS-ND-AUD-FR-001, FR-004 | Admin reviews account/vehicle audit activity. | Create or update test account/vehicle, suspend/reactivate account; inspect audit page/API. | Supported actions include actor, action, target, and timestamp/context where implemented; audit access is restricted to authorized Admin. | P1 | Not Run |
| ST-OPS-003 | SRS-ND-AUD-FR-002, FR-003 | Trip history is separate from audit history. | Start/end a test trip and generate one account action; inspect each history surface. | Trip and GPS data appear in trip history; account action appears in audit history; neither history is mislabeled as the other. | P2 | Not Run |
| ST-OPS-004 | SRS-ND-REPORT-FR-004, FR-005; SRS-ND-ADMIN-FR-008 | Admin dashboard and live map data. | Load Admin dashboard, live map, trip logs, and audit pages with known test records; compare values to APIs. | Pages use current backend data, respect authorization, show empty/unavailable states distinctly, and do not present removed dispatch features. | P2 | Not Run |

### 4.6 Cross-cutting security and reliability checks

These cases verify observable safeguards. They do not assert unapproved numerical performance targets.

| ID | Traceability | Scenario and test data | Steps | Expected result | Priority | Status |
|---|---|---|---|---|---|---|
| ST-X-001 | SRS-ND-AUTH-FR-002; SRS-ND-ADMIN-FR-006; SRS-ND-AUD-FR-004 | API authorization boundaries. | With Driver credentials, request Admin-only account/audit/route-management endpoints; with one Driver token, request another Driver's profile/trip/notification. | Backend rejects unauthorized role/ownership requests; changing client UI or request parameters cannot grant access. | P1 | Not Run |
| ST-X-002 | SRS-ND-TRIP-FR-006 to FR-009; SRS-ND-COMM-FR-006 | Temporary network loss during foreground use. | Interrupt network during trip GPS upload and during commuter heartbeat; restore network and inspect behavior. | App reports or recovers from connectivity failure without corrupting trip/queue state. Document missing GPS samples or delayed queue updates; do not expect durable replay because it is not implemented. | P2 | Not Run |
| ST-X-003 | SRS-ND-DATA-FR-001 to FR-005 | Referential integrity and duplicate submissions. | Submit invalid foreign keys/duplicate requests via authorized test API client; inspect persisted records. | Database/API constraints prevent orphan or duplicate-invalid records; a failed operation leaves no partial transaction. | P1 | Not Run |
| ST-X-004 | SRS-ND-NOTIF-FR-003, FR-004; SRS-ND-AUTH-FR-007 | Email/SMS provider unavailable. | In test environment, temporarily disable provider credentials or simulate provider error; perform an eligible account action. | Provider failure is handled without exposing secrets or undoing an already committed core account action; failure is observable through safe logs/client behavior and can be diagnosed. | P2 | Not Run |

## 5. Exit criteria and reporting

The suite is ready for sign-off when all P1 cases have been executed on recorded client/API/database versions, failures have linked defect IDs, environment-dependent cases identify the provider/build used, and unresolved known gaps are explicitly accepted or tracked. A test run must not be reported as passed based solely on source inspection.

For each execution, record:

- Test case ID, tester, execution date/time, app version/build, API commit/deployment, and database Alembic revision.
- Actual result, pass/fail/blocked status, concise evidence, and defect/issue reference.
- Device model/OS, permission state, network conditions, test account/route/vehicle identifiers using non-sensitive test data.
- For external notification cases, provider/environment result without copying tokens or OTP secrets into the report.

## 6. Known exclusions and follow-up

- No dispatch, QR-ticket, reservation, dispatcher, ticketing-officer, or incident-reporting tests are included.
- Durable offline GPS buffering/replay, guaranteed background tracking, distributed WebSocket pub/sub, login-attempt limiting, OTP verification-attempt limiting, and trained ETA-model accuracy are not current implemented capabilities; they require separate requirements and implementation before positive acceptance tests can be added.
- Numeric load, response-time, availability, and recovery targets are not specified here because the current NFR documents do not define approved measurable thresholds. Add measurable acceptance limits before running quantitative performance/reliability qualification.
