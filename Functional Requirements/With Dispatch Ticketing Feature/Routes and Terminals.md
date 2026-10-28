# Software Requirements Specification (SRS): Routes and Terminals

**Document ID:** SRS-ROUTE  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for route catalog and terminal data used by reservations, dispatch, trip tracking, and maps.

### 1.2 Scope

Route catalog and terminal data used by reservations, dispatch, trip tracking, and maps.

## 2. Overall description

**Actors:** Ticketing Officer maintains data; Drivers and Dispatchers consume it through authorized workflows.

## 3. Specific requirements

- **SRS-ROUTE-FR-001:** The system shall ensure that routes define the destination, terminal relationship, route geometry/distance, average travel duration where configured, active state, and queue-number prefix.
- **SRS-ROUTE-FR-002:** The system shall ensure that queue display numbers use a route-specific prefix and a four-digit sequence, such as `192-0001`; route database IDs remain independent of the display format.
- **SRS-ROUTE-FR-003:** The system shall ensure that terminal records provide the location/boundary used by outgoing-trip geofence checks.
- **SRS-ROUTE-FR-004:** The system shall ensure that route and terminal references used by assignments, reservations, dispatch records, and trips shall remain stable and referentially valid.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** terminal/destination/route models, queue prefixes, route geometry, public/management APIs, and geofence data for trip readiness and commuter queue prompt.
- **Partial:** route/terminal values and schema must be verified per environment. Driver trips now use direct route IDs, but some live vehicle and passenger-count paths retain dispatch associations.
- **Pending:** geofence operation verification, route-catalog verification, target database revision, and dispatch-independent cleanup where it is still needed.

