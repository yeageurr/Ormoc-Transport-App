# User Stories — Ormoc Transport App (No Dispatch)

**Document ID:** US-ND-001  
**Version:** 1.0  
**Review date:** 2026-10-31  
**Source baseline:** `main` no-dispatch system; stories trace to the current `Functional Requirements/` and `Non-functional Requirements/` documents.

> These stories describe user goals and acceptance criteria. **Implemented**, **Partial**, and **Backlog** describe the source review only; they are not test results or proof of deployment. Dispatch ticketing, QR tickets, reservations, dispatcher workflows, and incident reporting are excluded.

## 1. Purpose and conventions

This document translates the current SRS requirements into user-centered stories for the Driver app, Commuter app, and Admin web portal.

- **Implemented:** the main behavior is present in source, subject to the stated conditions and environment.
- **Partial:** a basic flow exists, but a known limitation prevents full acceptance.
- **Backlog:** required behavior is not implemented or needs a product/policy decision.
- **Acceptance criteria:** observable conditions that must hold for the story to be accepted. Use the related System Test Cases for end-to-end verification.
- **Traceability:** references the SRS requirement IDs in `Functional Requirements/` or `Non-functional Requirements/`.

## 2. Epic A — Authentication and account access

### US-AUTH-001 — Driver sign-in

**Story:** As a Driver, I want to sign in with my phone-based username and password so that I can use my own protected trip and profile functions.

**Acceptance criteria:**

- Valid Driver credentials create a Driver session and open the appropriate Driver app flow.
- Invalid credentials, inactive accounts, and use of credentials from the wrong portal are rejected with generic failure behavior.
- A rejected login does not return an access token or protected account data.

**Traceability:** SRS-ND-AUTH-FR-001, FR-002; SRS-NFR-SEC-AUTH-001–003.  
**Status:** Implemented in source.

### US-AUTH-002 — Required initial password setup

**Story:** As a newly created Driver, I want to set a new password before using the app so that my temporary account password is not my continuing credential.

**Acceptance criteria:**

- While `must_change_password` is true, ordinary protected Driver functions remain inaccessible.
- A valid initial password change updates the account flag to false and permits normal app use.
- An invalid password leaves the account requirement unchanged and gives useful validation feedback.

**Traceability:** SRS-ND-AUTH-FR-003; SRS-NFR-SEC-AUTH-005.  
**Status:** Implemented in source. The profile's later Change Password screen conflicts with the backend's one-time initial-change policy; resolve that policy before considering subsequent password changes accepted.

### US-AUTH-003 — Recover password with OTP

**Story:** As a Driver who cannot sign in, I want to verify a code sent to my registered email or phone and set a new password so that I can recover access without staff resetting it manually.

**Acceptance criteria:**

- A code is sent only through a configured email or SMS provider to an account's registered recovery destination.
- A valid, unexpired code allows the Driver to set and confirm a valid new password.
- An incorrect/expired code or mismatched password confirmation does not change the password.
- Provider credentials, plaintext OTPs, and plaintext passwords are not returned in client responses or logs.
- Resend cooldown is enforced: 60 seconds between sends and a three-minute cooldown after three sends.

**Traceability:** SRS-ND-AUTH-FR-004, FR-005, FR-007, FR-008; SRS-NFR-SEC-OTP-001–003.  
**Status:** Implemented in source, subject to SMTP/PhilSMS configuration. Login-failure throttling and OTP verification-attempt caps are not implemented.

### US-AUTH-004 — Safely end a session

**Story:** As a Driver, I want to log out and have my saved session cleared so that another person using my phone cannot access my account.

**Acceptance criteria:**

- Logout removes the locally stored access token.
- Returning to a protected screen after logout requires authentication.
- A temporary failure while restoring a session results in a recoverable loading/error state rather than a permanent blank screen.

**Traceability:** SRS-ND-AUTH-FR-006; SRS-NFR-REL-AUTH-001.  
**Status:** Implemented in source; verify on supported devices.

## 3. Epic B — Admin driver and vehicle management

### US-ADMIN-001 — Create a Driver and a vehicle

**Story:** As an Admin, I want to create a Driver account with a new multicab in one guided flow so that the Driver can use the app with a valid vehicle association.

**Acceptance criteria:**

- The form collects required Driver, contact, license, and vehicle details and validates them before submission.
- New-vehicle creation sets vehicle type to Multicab in this workflow.
- The Driver and vehicle are linked only if the backend transaction succeeds; failure does not leave partial records.
- The new account requires initial password setup.

**Traceability:** SRS-ND-ADMIN-FR-001, FR-007; SRS-ND-PROFILE-FR-001, FR-005, FR-006.  
**Status:** Implemented in source.

### US-ADMIN-002 — Assign a borrowed multicab

**Story:** As an Admin, I want to associate an eligible existing multicab with a borrowing Driver while preserving its owner so that a borrowed vehicle is represented once and ownership remains clear.

**Acceptance criteria:**

- The selection list contains only eligible existing multicabs.
- Assignment references the existing vehicle record; it does not duplicate the vehicle or replace its canonical owner.
- Vehicle ownership and borrower association remain distinguishable in stored data and relevant views.
- Invalid or conflicting assignments are rejected without partial changes.

**Traceability:** SRS-ND-ADMIN-FR-002, FR-007; SRS-ND-PROFILE-FR-004.  
**Status:** Implemented in source; verify borrowed-vehicle rules against the target database.

### US-ADMIN-003 — Maintain Driver access and regulatory details

**Story:** As an Admin, I want to view Driver details, update permitted license and vehicle regulatory information, and suspend or reactivate an account so that I can maintain operational eligibility and access.

**Acceptance criteria:**

- Admin can view a Driver's account and associated vehicle details.
- Authorized edits cover the permitted license and vehicle fields; invalid or duplicate values are rejected.
- Suspending a Driver blocks subsequent access; reactivation restores eligible access.
- Supported changes record the actor, action, target, and timestamp in audit history.

**Traceability:** SRS-ND-ADMIN-FR-003, FR-006; SRS-ND-PROFILE-FR-005; SRS-ND-AUD-FR-001, FR-004.  
**Status:** Implemented in source for supported actions; audit coverage is endpoint-specific.

### US-ADMIN-004 — Review operations and audit data

**Story:** As an Admin, I want to review dashboard, live vehicle, trip-history, and audit information so that I can monitor the current system and investigate supported account actions.

**Acceptance criteria:**

- Admin portal provides the current dashboard, vehicle map, trip history, vehicle/account management, and audit pages.
- Trip/GPS history is distinguishable from audit history.
- Empty, zero, and unavailable values are presented distinctly where supported.
- Access is enforced by the backend, not only by hiding UI controls.
- Dispatch operations, ticket issuance, dispatcher assignment, and incident reporting are not offered in the current portal.

**Traceability:** SRS-ND-ADMIN-FR-004–006, FR-008; SRS-ND-REPORT-FR-004, FR-005; SRS-ND-AUD-FR-002–004.  
**Status:** Implemented in source with endpoint-specific audit coverage.

## 4. Epic C — Driver profile and trip operations

### US-DRIVER-001 — View and update my profile

**Story:** As a Driver, I want to view my personal details and associated vehicle and update the personal fields I am permitted to change so that my account information stays current.

**Acceptance criteria:**

- The profile shows the signed-in Driver's own details and associated vehicle plate where one exists.
- Phone input contains exactly 11 numeric digits before it can be submitted.
- A changed email is saved only after successful OTP verification of the new address.
- The Driver cannot use profile requests to alter Admin-controlled regulatory fields.

**Traceability:** SRS-ND-PROFILE-FR-001–006.  
**Status:** Implemented in source, subject to ownership and email-provider verification.

### US-DRIVER-002 — Select route and trip direction

**Story:** As a Driver, I want to choose an active route and whether I am travelling outgoing or returning so that each one-way leg is recorded accurately without a dispatch ticket.

**Acceptance criteria:**

- Only active routes are offered for a new trip.
- A new trip stores the authenticated Driver, associated vehicle, selected route, and selected direction.
- Each outgoing or returning leg is a separate trip record; completion is not used as the direction value.
- A route/ticket/dispatch record is not required to start a trip.

**Traceability:** SRS-ND-TRIP-FR-001, FR-002; SRS-ND-ROUTE-FR-001, FR-002.  
**Status:** Implemented in source.

### US-DRIVER-003 — Start a trip under the right conditions

**Story:** As a Driver, I want the app to check the selected route, vehicle availability, active-trip state, and terminal readiness for outgoing trips so that the trip starts with valid operational data.

**Acceptance criteria:**

- Outgoing trip start requires vehicle readiness at the configured terminal geofence.
- Returning trip start does not require the Driver to be inside the terminal geofence.
- An inactive route, unavailable vehicle, or conflicting active trip is rejected with no duplicate trip created.
- A successful start opens the active-trip view and persists the trip.

**Traceability:** SRS-ND-TRIP-FR-003, FR-004; SRS-ND-ROUTE-FR-003.  
**Status:** Implemented in source; depends on accurate terminal bounds and current location availability.

### US-DRIVER-004 — Track and complete an active trip

**Story:** As a Driver, I want my active trip to record fresh GPS samples and let me end the trip with a summary so that the route and trip measurements can be reviewed later.

**Acceptance criteria:**

- While the trip screen is foregrounded and location is available, the app requests/uploads GPS fixes approximately every five seconds.
- GPS writes are associated with the authenticated Driver's active trip; unauthorized or completed-trip samples are rejected.
- The app does not treat an old fix as a new current location.
- Ending a trip persists completion and available time/distance/speed data.
- Trip history displays ordered recorded samples as the traveled path; absent data is not fabricated.

**Traceability:** SRS-ND-TRIP-FR-005–009; SRS-ND-AUD-FR-002.  
**Status:** Partial: foreground capture and trip path are implemented, but offline durable replay and guaranteed background capture are not.

### US-DRIVER-005 — Pause a trip and optionally notify commuters

**Story:** As a Driver, I want to pause during a delay, choose a reason, optionally add details and broadcast it, then resume so that commuters can understand a route interruption.

**Acceptance criteria:**

- The Driver can pause and resume an active trip.
- Pause reason and optional “Others” details are stored with the pause event.
- The Driver can choose not to broadcast; a non-broadcast pause is not exposed publicly.
- A broadcast notice is associated with the trip's route and shows its reason/details and pause state to commuters while valid.
- GPS sampling continues during the pause whenever the app can obtain a fresh fix.

**Traceability:** SRS-ND-TRIP-FR-011; SRS-ND-NOTIF-FR-005; SRS-ND-COMM-FR-009.  
**Status:** Implemented in source; public notice refresh is polling-based and GPS remains subject to device/network availability.

### US-DRIVER-006 — Review trips and daily metrics

**Story:** As a Driver, I want to see today's completed trip count, measured distance and available speed metrics, then review past trips and their GPS paths so that I can understand my recorded activity.

**Acceptance criteria:**

- Outgoing and returning completed legs count separately for the current Asia/Manila date.
- Metrics use persisted trip data; incomplete/missing measurements are not presented as measured values.
- Recent trips show the current-day records and trip history supports date filtering.
- Opening a trip shows its details and route trace when GPS samples are available.

**Traceability:** SRS-ND-REPORT-FR-001–003; SRS-ND-DRIVER-FR-002, FR-005; SRS-ND-TRIP-FR-007.  
**Status:** Implemented in source, dependent on successfully stored GPS/measurement data.

### US-DRIVER-007 — View notifications and passenger presence count

**Story:** As a Driver, I want to retrieve my notifications and see the current commuter presence count for my operating route so that I can stay informed about account messages and passengers waiting.

**Acceptance criteria:**

- The Driver can list and mark their own notifications as read; another account's notification is inaccessible.
- The displayed queue value represents active, non-stale app sessions for the Driver's current route, not a verified headcount.
- Connected clients receive count changes when possible; REST refresh recovers after a WebSocket interruption.
- A failed count request is shown as unavailable, not as zero.

**Traceability:** SRS-ND-DRIVER-FR-006, FR-007; SRS-ND-QUEUE-FR-004–007; SRS-ND-NOTIF-FR-001–002.  
**Status:** Implemented with foreground/network and in-process WebSocket limits.

## 5. Epic D — Commuter discovery and queue presence

### US-COMM-001 — Explore routes and live vehicles

**Story:** As a Commuter, I want to view active routes, live vehicle positions, and my own current location so that I can understand nearby transport options.

**Acceptance criteria:**

- The map displays active public routes and current vehicle data available from the backend.
- Device location follows a fresh device GPS fix and shows a human-readable address when reverse geocoding is available.
- Public vehicle information does not expose Driver account credentials or private contact details.
- Stale/unavailable location data is not presented as current.

**Traceability:** SRS-ND-COMM-FR-001–003; SRS-NFR-ACC-GPS-001–003.  
**Status:** Implemented with GPS, geocoder, and polling availability limits.

### US-COMM-002 — Get a route prompt at the terminal

**Story:** As a Commuter inside a terminal geofence, I want to be prompted to choose a route and either join its waiting count or decline so that I can indicate my intent without creating an account.

**Acceptance criteria:**

- The route prompt appears only when the device is inside the configured terminal geofence.
- The Commuter can select an active route, proceed, or choose “No thanks.”
- Declining dismisses the prompt for the current terminal visit and does not create a queue entry.
- Prompt behavior uses current location and terminal configuration rather than a hard-coded terminal assumption.

**Traceability:** SRS-ND-COMM-FR-004; SRS-ND-QUEUE-FR-001.  
**Status:** Implemented, subject to device permission and geofence configuration.

### US-COMM-003 — Join and leave an anonymous queue session

**Story:** As a Commuter, I want to confirm my selected route and have my anonymous presence counted while I am waiting at the terminal so that the Driver can see an approximate waiting count.

**Acceptance criteria:**

- Confirming creates an opaque route/terminal queue session without requiring identity or personal data.
- Foreground heartbeat refreshes presence approximately every 30 seconds.
- Leaving the geofence deactivates the entry when a location update is received; inactive and entries stale over two minutes are excluded from the count.
- One app session represents one passenger presence, not an inferred group size.
- App/network failures do not show an unavailable count as zero.

**Traceability:** SRS-ND-COMM-FR-005, FR-006, FR-008; SRS-ND-QUEUE-FR-001–004, FR-007.  
**Status:** Implemented with foreground and network timing limitations; no exact-boundary expiry push exists.

### US-COMM-004 — Notice approaching vehicles and trip delays

**Story:** As a Commuter, I want to see when a current vehicle is approaching and receive an active route-matched delay notice so that I can make an informed decision while waiting.

**Acceptance criteria:**

- The approaching cue appears only when current commuter location and sufficiently fresh vehicle data support the approach determination.
- A delay notice appears only when the Driver chose to broadcast it and the notice matches the selected route.
- Notice content reflects the stored reason/details and pause/resume state.
- Stale vehicle/notice data is not presented as live/current.

**Traceability:** SRS-ND-COMM-FR-007, FR-009; SRS-ND-NOTIF-FR-005; SRS-NFR-ACC-NOTICE-001.  
**Status:** Implemented with polling and data freshness limits.

## 6. Epic E — Reliability and future capability stories

These stories are derived from stated quality requirements or planned capability, but are **not accepted as implemented**. They remain backlog until development and verification are complete.

### US-REL-001 — Preserve and synchronize GPS samples offline

**Story:** As a Driver travelling through weak-signal areas, I want captured GPS samples saved locally and synchronized after connectivity returns so that the trip path is not lost.

**Acceptance criteria:**

- A fresh GPS fix is durably queued locally when upload fails.
- Queued samples upload automatically after connectivity returns and are removed only after server acknowledgement.
- Retries do not create duplicate samples.
- Lack of GNSS fixes is reported distinctly from a network upload failure.

**Traceability:** SRS-NFR-REL-GPS-001–003.  
**Status:** Backlog; current client does not durably queue/replay failed GPS uploads.

### US-REL-002 — Enforce login attempt limits

**Story:** As a system owner, I want repeated failed login attempts limited so that automated password guessing is harder.

**Acceptance criteria:**

- The configured limit of three consecutive failures is enforced consistently by the backend.
- The response does not disclose whether the account exists.
- The account's recovery/cooldown behavior is documented and consistently applied.

**Traceability:** SRS-NFR-SEC-AUTH-006.  
**Status:** Backlog; the current implementation notes report no failed-login throttle.

### US-REL-003 — Limit OTP guessing attempts

**Story:** As a system owner, I want password-reset OTP verification attempts limited so that a delivered code cannot be guessed through unlimited submissions.

**Acceptance criteria:**

- A documented verification-attempt threshold is enforced server-side.
- Reaching the threshold invalidates or locks the challenge for the defined recovery period.
- OTP values remain hashed and are not revealed by API responses or logs.

**Traceability:** SRS-NFR-SEC-OTP-002.  
**Status:** Backlog; current password-reset verification attempts are not capped.

### US-ETA-001 — Provide validated model-based ETA

**Story:** As a Driver or Commuter, I want a reliable ETA based on validated trip data so that I can plan around expected arrival time.

**Acceptance criteria:**

- The system uses a trained model evaluated against held-out historical trips before labeling its result as AI/ML ETA.
- ETA response includes enough status/source information to distinguish model output, fallback estimate, and unavailable state.
- Stale/missing location or route geometry does not produce a misleading precise arrival estimate.
- Accuracy acceptance thresholds are defined and approved before release.

**Traceability:** SRS-ND-TRIP-FR-010; SRS-NFR-ACC-ETA-001.  
**Status:** Backlog; current endpoint provides a distance/speed or route baseline, not a validated trained model.

### US-SCALE-001 — Deliver live events across backend instances

**Story:** As a Driver or Commuter, I want live queue and notice updates to reach me regardless of which backend instance handles my connection so that the displayed state remains consistent as the service scales.

**Acceptance criteria:**

- Cross-instance event delivery uses shared messaging or an equivalent mechanism.
- A WebSocket interruption can recover authoritative state through REST refresh.
- Duplicate, delayed, or out-of-order events do not corrupt displayed queue or trip state.

**Traceability:** SRS-ND-QUEUE-FR-005; SRS-NFR-REL-QUEUE-003; SRS-NFR-SCALE-REALTIME-001.  
**Status:** Backlog for multi-worker reliability; current WebSocket manager is process-local.

## 7. Story coverage and follow-up

- The implemented/partial stories map to current Admin, Driver, Commuter, trip, queue, notification, audit, and route SRS requirements.
- Backlog stories preserve current known security/reliability/ETA gaps; they must not be represented as completed features.
- Numeric service-level targets (response time, availability, throughput, and recovery time) need stakeholder approval before they can be written as measurable release acceptance criteria.
- Use [System Test Cases](../System%20Test%20Cases/System%20Test%20Cases.md) to plan verification. Record actual test outcomes separately; this story document does not claim that any case has passed.
