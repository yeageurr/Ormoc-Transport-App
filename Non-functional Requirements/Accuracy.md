# Software Requirements Specification (SRS): Non-functional Requirements — Accuracy

**Document ID:** SRS-NFR-ACC
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines accuracy and truthful-state requirements for GPS, routes/geofences, trip metrics and ETA, commuter queue counts, live vehicles, and delay notices.

## 2. Requirements

### 2.1 GPS and live locations

- **SRS-NFR-ACC-GPS-001:** Every stored trip GPS sample shall use the device-provided coordinates and capture time for that sample; persistence precision shall not be represented as a claim of device measurement accuracy.
- **SRS-NFR-ACC-GPS-002:** The application shall identify location as unavailable or stale when it cannot obtain a fresh fix and shall not synthesize a new fix from a prior coordinate.
- **SRS-NFR-ACC-GPS-003:** Live vehicle data shall expose its recorded timestamp so clients can distinguish recent positions from stale ones.

### 2.2 Routes, trip distance, speed, and ETA

- **SRS-NFR-ACC-TRIP-001:** A trip's route and direction shall come from the selected/validated route-trip record; labels shall not infer route identity from unrelated historical records.
- **SRS-NFR-ACC-TRIP-002:** Trip distance and speed shall be derived from accepted GPS measurements and shall be marked unavailable or incomplete when the source samples are insufficient.
- **SRS-NFR-ACC-ETA-001:** The current distance/speed ETA baseline shall be labeled as an estimate and shall not be described as AI/ML prediction unless a trained model is deployed and validated against held-out data.
- **SRS-NFR-ACC-GEOFENCE-001:** Geofence outcomes shall be computed from the configured terminal boundary and fresh device coordinates; the user-facing readiness state shall reflect the backend's authoritative status.

### 2.3 Commuter queue and delay notices

- **SRS-NFR-ACC-QUEUE-001:** A displayed queue count shall be the number of active, non-stale app sessions for that route, not a verified human passenger count. Failed count retrieval shall be shown as unavailable, not zero.
- **SRS-NFR-ACC-NOTICE-001:** A delay notice shall retain the route, selected reason, optional Driver details, and pause/resume times from the associated trip-pause event. It shall be shown only for the matching route and active/recent notice window.

### 2.4 Dashboard and audit

- **SRS-NFR-ACC-DASH-001:** Dashboard metrics and trend comparisons shall be calculated from their documented source fields and time windows; zero, missing, and unavailable values shall remain distinguishable.
- **SRS-NFR-ACC-AUDIT-001:** Audit descriptions shall reflect persisted action outcome and target data; a display label shall not imply that a failed operation succeeded.

## 3. Current implementation notes

- Coordinates are stored to six decimal places in model fields, but decimal precision is not equivalent to GPS accuracy. GPS samples may be incomplete because failed mobile uploads are currently not durably queued.
- Backend trip-distance logic filters small stationary drift and implausible jumps. Its output remains dependent on the quality and coverage of accepted GPS samples.
- The Driver ETA is a distance/speed baseline, not a trained ML prediction. There is no validated accuracy score for production use in this source review.
- Passenger queue count measures anonymous app sessions and expires stale heartbeats after the configured period; it does not establish actual passenger headcount.
- Route geometry, terminal bounds, device coordinates, external map data, and deployed database contents must be validated in each environment.
