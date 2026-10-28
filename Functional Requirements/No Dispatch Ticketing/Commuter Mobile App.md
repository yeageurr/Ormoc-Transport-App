# Software Requirements Specification (SRS): Commuter Mobile App

**Document ID:** SRS-ND-COMM  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** entrance/introduction, public routes, live vehicle map/details, current-device location display, terminal-geofence route prompt, “No thanks,” anonymous queue join/success flow, and approaching-vehicle visual cue.
- **Present:** queue presence is renewed while the app is foregrounded. GPS fixes are watched at roughly 10-second/10-meter intervals; leaving the geofence sends a deactivation heartbeat. After a committed queue-count transition, the backend pushes the route's absolute count to the assigned Driver over an authenticated WebSocket.
- **Partial:** vehicle route association can still fall back to legacy dispatch data. Queue presence needs foreground location permission and network access; background suspension/offline movement cannot be reported immediately. The approach cue is in-app, not an OS push notification.
- **Pending:** make vehicle-to-route association independent of dispatch records, define background/offline queue behavior and retention, and verify WebSocket delivery in the deployed topology. Learned ETA prediction remains untrained and is not shown in the Commuter app.

