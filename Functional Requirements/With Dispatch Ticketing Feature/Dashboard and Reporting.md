# Software Requirements Specification (SRS): Dashboard and Reporting

**Document ID:** SRS-REPORT  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

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

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
