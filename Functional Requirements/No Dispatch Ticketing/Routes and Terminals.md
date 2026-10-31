# Software Requirements Specification (SRS): Routes and Terminals

**Document ID:** SRS-ND-ROUTE  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

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

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** terminal, destination, and route models; active public route APIs; authenticated Driver route list; route geometry; and terminal bounds used for outgoing readiness and the Commuter queue prompt.
- **Present in source:** route updates/geometry operations are restricted to Admin authorization. New trips directly reference route IDs. Commuter live vehicle route labels derive from the active trip rather than a dispatch log.
- **Partial:** route and geofence data must be verified per environment. A vehicle must reach the backend's ready/loading state inside the configured terminal boundary before an outgoing trip can start; GPS permission, polling, and correct boundary data affect this process.
- **Not implemented:** queue-number prefixes, dispatch assignments, and dispatch-specific route operations were removed from the current source.
