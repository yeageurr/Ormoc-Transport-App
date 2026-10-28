# Software Requirements Specification (SRS): Audit and Operational Logs

**Document ID:** SRS-AUD  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** distinct audit, dispatch-log, reservation, ticket, trip, and GPS entities/APIs. Ticketing portal has audit and dispatch-history pages, details, password-confirmed masterlist export, and print flows.
- **Partial:** not every lifecycle transition is proven to create a consistent immutable audit trail; dispatcher-facing client surfaces are incomplete. Dispatch-history exports need database-backed verification in the deployed environment.
- **Pending:** verify fields, correction/reissue treatment, retention, actor attribution, and live export data. This is the prior/alternate dispatch-ticketing design, not the current no-dispatch baseline.

