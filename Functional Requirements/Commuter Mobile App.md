# Software Requirements Specification (SRS): Commuter Mobile App

**Document ID:** SRS-ND-COMM  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

## 1. Introduction

### 1.1 Purpose

This document specifies public route discovery, live vehicle visibility, and anonymous terminal passenger-queue participation for commuters.

### 1.2 Scope

The Commuter app does not require a Driver or staff account. It has no reservation approval, dispatch ticket, QR ticket, or payment flow.

## 2. Overall description

**Actor:** Commuter using the public mobile app.

## 3. Specific requirements

- **SRS-ND-COMM-FR-001:** The app shall display public active routes and available route geometry.
- **SRS-ND-COMM-FR-002:** The app shall show live on-route vehicle positions and public vehicle details, without exposing Driver contact or account data.
- **SRS-ND-COMM-FR-003:** The app shall display the Commuter's current human-readable location where device GPS and reverse geocoding are available.
- **SRS-ND-COMM-FR-004:** The app shall show a route prompt only when the device is within the configured terminal geofence. The Commuter may dismiss the prompt for the current terminal visit.
- **SRS-ND-COMM-FR-005:** After route selection and confirmation, the app shall submit a queue entry, show processing and success states, and return to the live map.
- **SRS-ND-COMM-FR-006:** While the Commuter remains within the geofence, the app shall send periodic presence heartbeats. Leaving the geofence shall deactivate the queue entry; stale entries shall not contribute to the active count.
- **SRS-ND-COMM-FR-007:** The app shall identify nearby approaching vehicles in the map UI when current location and sufficiently fresh vehicle positions support that determination.
- **SRS-ND-COMM-FR-008:** Anonymous queue entries shall not contain commuter account or personal identity data; each app queue session currently represents one passenger.
- **SRS-ND-COMM-FR-009:** The live map shall display a route-matched driver delay notice when the driver broadcasts a pause reason, and cease displaying it after the notice is resumed or otherwise no longer active/recent.

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** entrance/introduction, public active routes, live vehicle map/details, device GPS with human-readable location, terminal geofence route prompt, “No thanks,” anonymous passenger queue join/success flow, and an in-map approaching-vehicle cue.
- **Present in source:** the map polls live vehicles and delay notices; route-matched broadcast notices appear to commuters. Queue heartbeats run while the app is foregrounded, and leaving the geofence deactivates the session when the device reports it.
- **Partial:** public vehicle updates and delay notices are polling-based, not OS push notifications. Queue presence requires location permission and network access; background suspension and connectivity loss can delay updates. Each anonymous queue session represents one app session, not verified human headcount.
- **Not implemented:** commuter login, payment, reservations/QR tickets, background/offline queue synchronization, and trained ETA prediction.
