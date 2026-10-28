# Software Requirements Specification (SRS): Dashboard and Reporting

**Document ID:** SRS-REPORT  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for driver and staff dashboard metrics and operational reporting.

### 1.2 Scope

Driver and staff dashboard metrics and operational reporting.

## 2. Overall description

**Actors:** Driver, Ticketing Officer, and Dispatcher, subject to authorization.

## 3. Specific requirements

- **SRS-REPORT-FR-001:** The system shall ensure that driver daily metrics use trip records for the current Asia/Manila date: completed one-way trip count, distance, and average travel speed when valid source data exists. Display zero/empty states clearly when there is no data.
- **SRS-REPORT-FR-002:** The system shall ensure that a round trip consists of two one-way trip records. Do not count an outgoing/returning pair as one completed trip.
- **SRS-REPORT-FR-003:** The system shall ensure that staff dashboards and logs must distinguish live vehicle state, dispatch departure history, ticket lifecycle history, and completed trip history.
- **SRS-REPORT-FR-004:** The system shall ensure that values and trend indicators must be derived from the selected comparison periods and actual data; do not show hard-coded trends as if calculated.
- **SRS-REPORT-FR-005:** The system shall ensure that identify unavailable metrics or placeholders clearly; do not fabricate passenger counts or ETA values.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** Driver dashboard derives trip metrics from trip data; admin dashboard, live map, trip/dispatch/audit/incident pages and APIs remain in source. Driver passenger count receives WebSocket updates on count transitions and retains a 15-second REST fallback.
- **Partial:** complete ticket/queue reporting and Dispatcher dashboard are not end-to-end. Passenger count route remains dispatch-derived; GPS distance can be incomplete when sample uploads fail. Some web pages belong to the older broad-admin scope.
- **Pending:** define report periods and data sources, complete ticket/departure reconciliation, and implement ETA if approved.

