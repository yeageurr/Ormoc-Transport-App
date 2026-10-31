# Software Requirements Specification (SRS): Audit and Operational Logs

**Document ID:** SRS-AUD  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for audit events, dispatch departure logs, ticket history, reservation history, and trip logs.

### 1.2 Scope

Audit events, dispatch departure logs, ticket history, reservation history, and trip logs.

## 2. Overall description

**Actors:** Ticketing Officer, Dispatcher, and Driver, subject to role and assignment authorization.

## 3. Specific requirements

- **SRS-AUD-FR-001:** The system shall ensure that dispatch/assignment records represent actions that occurred and are treated as audit records. Corrections must be recorded as new traceable actions rather than silently rewriting history.
- **SRS-AUD-FR-002:** The system shall ensure that maintain separate records for a dispatch/departure log, a dispatch ticket, a queue reservation, and a completed one-way trip.
- **SRS-AUD-FR-003:** The system shall ensure that a dispatch departure log should contain the agreed compact operational fields (ticket/reference, vehicle plate, departure time); ticket history retains the richer ticket and lifecycle details.
- **SRS-AUD-FR-004:** The system shall ensure that account administration, reservation approval/cancellation, ticket use/cancellation/expiry, assignment closure, and trip lifecycle actions should retain actor and timestamp where applicable.
- **SRS-AUD-FR-005:** The system shall ensure that authorized users can inspect relevant logs; access must respect role and assignment scope.

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
