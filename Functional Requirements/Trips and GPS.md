# Software Requirements Specification (SRS): Trips and GPS

**Document ID:** SRS-ND-TRIP  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

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
- **SRS-ND-TRIP-FR-011:** A Driver may pause and resume an active trip. A pause may store one of the supported delay reasons and optional details, and may be broadcast to commuters; GPS sampling shall continue during the pause whenever the app can obtain a location fix.

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** one-way outgoing/returning trips directly reference Driver, vehicle, and route. Completion is separate from direction. Outgoing trip start checks terminal vehicle readiness; returning trips do not require starting within the terminal geofence. The app supports pause/resume, trip summary, and GPS-path history.
- **Present with limits:** while the trip screen is foregrounded and location permission/services are available, the app requests high-accuracy fixes about every five seconds and uploads them. Backend ownership checks protect trip GPS writes; implausible jumps and small stationary drift are excluded from distance totals. Pause records may carry a reason and commuter-broadcast flag while GPS continues.
- **Not implemented:** GPS upload failure has no durable local queue, automatic replay, idempotency key, or guaranteed background/screen-off capture. The system cannot promise capture when the device cannot obtain a fresh GNSS fix.
- **ETA status:** the endpoint provides a route/distance-speed baseline when recent location and geometry are available. A trained and validated AI/ML ETA model is not implemented.
- **Environment caveat:** outgoing readiness and route/geofence configuration must be verified on the target device/database; this document does not certify a deployment's data state.
