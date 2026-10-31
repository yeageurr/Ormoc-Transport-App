# Software Requirements Specification (SRS): Non-functional Requirements — Usability

**Document ID:** SRS-NFR-USE
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines usability requirements for the Admin web portal, Driver mobile app, and public Commuter app, with particular attention to readable status and safe use while driving.

## 2. Requirements

### 2.1 Driver mobile app

- **SRS-NFR-USE-DRIVER-001:** Primary trip actions and trip state shall use plain, consistent labels for outgoing, returning, active, paused, and completed states.
- **SRS-NFR-USE-DRIVER-002:** Trip controls shall provide visible loading, disabled, success, and actionable error states so a Driver can distinguish an accepted operation from a pending or failed one.
- **SRS-NFR-USE-DRIVER-003:** The Driver app shall avoid requiring text entry while the vehicle is moving; optional delay details shall be entered only when safely stopped.
- **SRS-NFR-USE-DRIVER-004:** Important location and route labels shall be human-readable. Coordinates may be available in diagnostic/technical views but shall not be the only location description presented to the Driver.
- **SRS-NFR-USE-DRIVER-005:** Text and touch controls shall remain legible and operable at supported screen sizes, font scaling settings, and safe-area insets.

### 2.2 Commuter mobile app

- **SRS-NFR-USE-COMM-001:** Route selection, queue confirmation, queue success, and “No thanks” actions shall have visibly distinct labels and states.
- **SRS-NFR-USE-COMM-002:** Live vehicle and delay-notice information shall identify its route and indicate when the data is unavailable or stale rather than implying a current update.
- **SRS-NFR-USE-COMM-003:** Location permission denials and unavailable GPS shall be explained with a recovery action that does not misrepresent the Commuter's location.

### 2.3 Admin web portal

- **SRS-NFR-USE-ADMIN-001:** User, vehicle, trip, and audit tables shall provide clear column headings, empty states, loading states, and errors.
- **SRS-NFR-USE-ADMIN-002:** Destructive or account-status actions shall identify the affected Driver/vehicle and require an explicit confirmation before submission.
- **SRS-NFR-USE-ADMIN-003:** Forms shall identify required fields, validation errors, and the correction needed before submission.

### 2.4 Consistency and accessibility

- **SRS-NFR-USE-COMMON-001:** The three applications shall use consistent names for shared entities and states, while presenting information appropriate to each role.
- **SRS-NFR-USE-COMMON-002:** Interactive controls shall expose an accessible name and state to assistive technology; non-text status indicators shall also have text labels.

## 3. Current implementation notes

- The Driver UI uses route/direction selections, trip status, progress indicators, and human-readable address/route labels in relevant screens. Device size, font scaling, accessibility, and distracted-driving usability have not been systematically evaluated.
- The Commuter UI includes a geofence route prompt, queue flow, live map, and delay-notice banner. Accessibility and stale-data presentation should be checked on physical devices.
- Admin pages include forms/tables and confirmation flows for some sensitive actions. A complete accessibility/usability review has not been performed.
