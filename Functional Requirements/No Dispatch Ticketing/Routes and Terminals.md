# Software Requirements Specification (SRS): Routes and Terminals

**Document ID:** SRS-ND-ROUTE  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies route catalog, terminal location, route geometry, and geofence data used by Driver and Commuter functions.

### 1.2 Scope

Routes connect a terminal origin to a destination and support route selection, trip records, maps, and passenger queue participation. Queue-number prefixes and dispatch assignments are outside this system's scope.

## 2. Overall description

**Actors:** Driver, Commuter, and authorized account-management operator.

## 3. Specific requirements

- **SRS-ND-ROUTE-FR-001:** Each active route shall identify its terminal origin, destination, distance, optional average travel duration, and optional map geometry.
- **SRS-ND-ROUTE-FR-002:** The system shall provide active public route information to the Commuter app and authenticated route choices to the Driver app.
- **SRS-ND-ROUTE-FR-003:** A terminal shall provide configured geographic bounds for geofence checks and public queue prompting.
- **SRS-ND-ROUTE-FR-004:** Route and terminal identifiers shall remain stable foreign-key references for trip and passenger queue data.
- **SRS-ND-ROUTE-FR-005:** Route geometry generation or updates shall be restricted to authorized management access.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** terminal/destination/route models, public active-route and geometry APIs, terminal bounds, route management APIs, and route-based trip validation.
- **Partial:** management APIs still use the legacy `ticketing_officer` role. Live vehicle route association can fall back to dispatch logs; passenger queue counts also depend on today's dispatch log. Route data exists, but not every runtime association is dispatch-independent.
- **Pending:** replace legacy route lookups, confirm each environment's route/geofence configuration, and verify target database migration state.

