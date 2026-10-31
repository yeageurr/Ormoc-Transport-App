# Software Requirements Specification (SRS): Routes and Terminals

**Document ID:** SRS-ROUTE  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

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

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
