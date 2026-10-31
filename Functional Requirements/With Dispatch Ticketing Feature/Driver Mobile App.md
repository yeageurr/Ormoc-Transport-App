# Software Requirements Specification (SRS): Driver Mobile App

**Document ID:** SRS-DRIVER-APP  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for driver-facing mobile functions and their interactions with backend services.

### 1.2 Scope

Driver-facing mobile functions and their interactions with backend services.

## 2. Overall description

**Actors:** Driver. Server-side validation remains authoritative.

## 3. Specific requirements

- **SRS-DRIVER-APP-FR-001:** The system shall ensure that provide sign-in, password recovery, home/dashboard, trip logs, profile, and notifications.
- **SRS-DRIVER-APP-FR-002:** The system shall ensure that home displays the current route/dispatch state and daily trip metrics; “Make a Reservation” changes to “View my Ticket” whenever an active pending or approved reservation exists. It is unavailable during an active trip.
- **SRS-DRIVER-APP-FR-003:** The system shall ensure that reservation submission displays the driver's route, vehicle, operating date, and request status. An active request opens its current ticket/request; a new request is allowed only after consumption or expiry.
- **SRS-DRIVER-APP-FR-004:** The system shall ensure that my Tickets is separate from trip logs. It displays concise queue/reference rows and a full-detail view for current/recent ticket records.
- **SRS-DRIVER-APP-FR-005:** The system shall ensure that start Trip opens QR scanning. A successful scan must show the validated ticket context and begin only the matching outgoing trip. Returning trip creation follows the approved non-dispatched flow.
- **SRS-DRIVER-APP-FR-006:** The system shall ensure that during trips, show the live map/current location, route direction, trip controls, and trip summary after completion. Location changes should be human-readable where shown.
- **SRS-DRIVER-APP-FR-007:** The system shall ensure that profile changes follow password and email/phone verification requirements. Refresh should reload account and trip state.
- **SRS-DRIVER-APP-FR-008:** The system shall display the live number of commuters waiting in the passenger queue for the Driver's current dispatched route. The count shall refresh while the Home screen is open and exclude queue sessions that left the terminal or have not sent a heartbeat for two minutes.

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
