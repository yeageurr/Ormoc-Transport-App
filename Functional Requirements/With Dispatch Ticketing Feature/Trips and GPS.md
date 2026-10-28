# Software Requirements Specification (SRS): Trips, Geofencing, and GPS Records

**Document ID:** SRS-TRIP  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for one-way trip lifecycle, dispatch relationships, terminal geofence checks, and persistent GPS records.

### 1.2 Scope

One-way trip lifecycle, dispatch relationships, terminal geofence checks, and persistent GPS records.

## 2. Overall description

**Actors:** Driver starts/completes trips; authorized staff view location and trip history.

### 2.1 Location and connectivity assumptions

The phone determines location from satellite GNSS signals; mobile data is not required for a GPS fix. Internet access is needed to send fixes to the backend in real time. If GNSS reception itself is blocked or unavailable, the application cannot guarantee a fresh position and shall identify the location as unavailable or stale rather than presenting an old coordinate as current.

## 3. Specific requirements

- **SRS-TRIP-FR-001:** The system shall ensure that each completed one-way leg is an individual trip. Direction is `outgoing` or `returning`; completion is represented by the trip lifecycle, not by a third direction/status value.
- **SRS-TRIP-FR-002:** The system shall ensure that outgoing trips require an approved, valid dispatch ticket and terminal readiness/geofence validation. Returning trips travel toward the terminal and do not require starting inside the terminal geofence.
- **SRS-TRIP-FR-003:** The system shall ensure that a trip record references its route/direction and, when dispatched, the dispatch/ticket context. A non-dispatched return may have no dispatch reference and records its driver and vehicle directly.
- **SRS-TRIP-FR-004:** The system shall ensure that start and completion timestamps, status, route, driver, vehicle, and dispatch/ticket references must be consistent and auditable.
- **SRS-TRIP-FR-005:** The system shall make current Driver location available for live-map and geofence-readiness functions.
- **SRS-TRIP-FR-006:** During an active trip, the Driver mobile application shall request and timestamp a location fix every five seconds, subject to operating-system location availability, and associate each fix with the active trip and Driver.
- **SRS-TRIP-FR-007:** The Driver mobile application shall capture satellite-based GNSS fixes independently of internet connectivity; loss of mobile data shall stop neither location capture nor local queuing.
- **SRS-TRIP-FR-008:** The Driver mobile application shall write each captured fix to a durable local queue (SQLite or equivalent) before attempting network upload. Each queued record shall include a unique sample identifier, trip and Driver identifiers, capture timestamp, latitude, longitude, and available accuracy/speed/heading metadata.
- **SRS-TRIP-FR-009:** When network connectivity is unavailable or unstable, the Driver mobile application shall retain queued fixes locally and shall not discard them because an upload failed.
- **SRS-TRIP-FR-010:** When connectivity is restored, the Driver mobile application shall automatically upload queued fixes and mark or remove them from the local queue only after the backend confirms successful persistence.
- **SRS-TRIP-FR-011:** The synchronization process shall retry transient upload failures without losing queued fixes and shall prevent duplicate backend records when an upload is retried, using the unique sample identifier as an idempotency key.
- **SRS-TRIP-FR-012:** The backend shall persist synchronized GPS fixes as trip location history and retain each fix's capture timestamp, sample identifier, and trip association.
- **SRS-TRIP-FR-013:** If the operating system cannot provide a fresh location fix, the application shall indicate that location is unavailable or stale and shall not record a previous fix as a new current-position sample.
- **SRS-TRIP-FR-014:** During an active trip, the application shall continue location capture when backgrounded or the screen is off, subject to granted location permissions and operating-system background-execution rules.
- **SRS-TRIP-FR-015:** The system shall reject GPS fixes associated with a trip or Driver other than the authenticated Driver's active trip.
- **SRS-TRIP-FR-016:** The system shall prevent duplicate trip starts and completion by an unrelated Driver. Ticket validation, ticket consumption, and outgoing trip creation shall be atomic.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** one-way direction, completion field, trip start/end, direct Driver/vehicle/route links, readiness checks, current location, ordered GPS history, five-second foreground GPS uploads, and pause/resume records while GPS continues.
- **Current-flow difference:** the Driver app starts route-based trips without ticket scanning; legacy dispatch/ticket fields remain for historical compatibility, and scan-to-trip is not atomic.
- **Partial:** failed uploads are dropped; no durable offline queue, idempotent replay, or background/screen-off capture. A reported outgoing start remained waiting inside the terminal and is not confirmed resolved.
- **Pending:** offline/background sync, operational readiness verification, preserving historical data before schema cleanup, and ETA prediction.

