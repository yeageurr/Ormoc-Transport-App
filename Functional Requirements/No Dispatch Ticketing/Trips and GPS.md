# Software Requirements Specification (SRS): Trips and GPS

**Document ID:** SRS-ND-TRIP  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies independent route-based Driver trips, completion, location capture, and trip-path history.

### 1.2 Scope

Each trip is a one-way leg associated directly with a Driver, vehicle, route, and direction. Dispatch assignment, dispatch logs, and ticket validation are outside the intended trip-start flow.

## 2. Overall description

**Actor:** Driver. Authorized management users may access operational trip data where the API allows it.

## 3. Specific requirements

- **SRS-ND-TRIP-FR-001:** The system shall record each one-way trip independently with direction `outgoing` or `returning`; completion shall be a separate trip lifecycle field.
- **SRS-ND-TRIP-FR-002:** The Driver shall select an active route and direction before trip start. New trips shall store the Driver ID and vehicle ID directly and shall not require a dispatch ticket.
- **SRS-ND-TRIP-FR-003:** An outgoing trip shall require the vehicle to be ready at the terminal according to the configured terminal geofence/activity rule. A returning trip may start outside the terminal geofence.
- **SRS-ND-TRIP-FR-004:** The system shall reject trip start when the selected route is inactive, the vehicle is unavailable/under maintenance, or the same vehicle already has an incomplete trip.
- **SRS-ND-TRIP-FR-005:** Ending a trip shall store arrival time, duration, completion state, available speed data, and distance derived from accepted GPS samples.
- **SRS-ND-TRIP-FR-006:** During a foreground active trip, the mobile app shall request and upload GPS samples approximately every five seconds and associate each persisted sample with the active trip.
- **SRS-ND-TRIP-FR-007:** The system shall expose ordered GPS samples to the Driver's trip-history detail view so the app can draw the traveled path.
- **SRS-ND-TRIP-FR-008:** GPS samples shall be accepted only for an active trip owned by the authenticated Driver; completed trips shall reject further samples.
- **SRS-ND-TRIP-FR-009:** The app shall not treat an old location as a new fix when the operating system cannot provide a current position.
- **SRS-ND-TRIP-FR-010:** During an active trip, the app shall display an ETA based on route-matched current location when the required data is available. It shall identify a distance/speed fallback as an estimate, reserve “trained model” labeling for a validated trained model, and show unavailable state when the GPS fix or route geometry is missing or stale.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** new one-way trips store Driver, vehicle, route, direction, start/end, completion, and measurements directly; outgoing readiness checks vehicle `loading` state and returning may start outside the terminal. Pause/resume markers are stored while GPS capture continues. Trip history exposes ordered GPS samples.
- **Present with limits:** while the active-trip screen is foregrounded and location permission/services are available, the app requests high-accuracy fixes about every five seconds and posts them. Backend checks trip ownership and rejects completed-trip samples; distance calculation ignores small stationary drift and implausible jumps.
- **Known operational issue:** outgoing readiness requires geofence/vehicle processing to reach `loading`. A reported test stayed at “Waiting for the terminal” while physically inside; this is not verified resolved.
- **Partial:** failed GPS uploads are discarded; no durable offline queue, idempotent retry, background/screen-off capture, or automatic reconnect sync exists.
- **ETA status:** authenticated `GET /eta/trip/{trip_id}` now map-matches the latest trip GPS fix to route geometry and returns a clearly labeled distance/speed baseline. The Driver shows it in the collapsed trip card and displays `--` when the fix is stale or route data is unavailable. This is not a trained ML prediction.
- **Legacy/pending:** nullable dispatch/ticket columns and code paths remain, though new trip start is direct route-based and does not consume tickets. Training and serving the learned ETA model remains pending until sufficient reviewed real data is available.

