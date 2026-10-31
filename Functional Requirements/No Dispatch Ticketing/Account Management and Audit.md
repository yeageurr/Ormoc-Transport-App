# Software Requirements Specification (SRS): Account Management and Audit

**Document ID:** SRS-ND-ADMIN  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

## 1. Introduction

### 1.1 Purpose

This document specifies the web portal's driver-account and vehicle management features and its audit-log access.

### 1.2 Scope

The management portal is limited to driver accounts, associated vehicles, account status actions, and audit review. Dispatch operations, ticket issuance, and dispatcher assignment are excluded.

## 2. Overall description

**Actors:** Authorized account-management operator.

## 3. Specific requirements

- **SRS-ND-ADMIN-FR-001:** The operator shall create a Driver account and its associated vehicle information in one guided workflow.
- **SRS-ND-ADMIN-FR-002:** The vehicle workflow shall support creating a new vehicle or selecting an existing eligible vehicle for a borrowing relationship, while preserving its canonical owner.
- **SRS-ND-ADMIN-FR-003:** The operator shall be able to view Driver account details and vehicle association, and suspend/reactivate a Driver account.
- **SRS-ND-ADMIN-FR-004:** The operator shall be able to inspect audit records for account and driver-related actions, including actor, action, target, time, result/details when available.
- **SRS-ND-ADMIN-FR-005:** The portal shall not present dispatch operations, dispatcher assignments, dispatch-ticket management, or dispatch-record history as available workflows.
- **SRS-ND-ADMIN-FR-006:** Account and vehicle actions shall be authorized by the backend and recorded in the audit log where the corresponding audit operation exists.
- **SRS-ND-ADMIN-FR-007:** When creating a Driver and a new vehicle through the driver-creation workflow, the vehicle type shall be fixed to Multicab. Existing selectable vehicles shall be limited to eligible multicabs.
- **SRS-ND-ADMIN-FR-008:** The Admin portal shall provide dashboard, live-vehicle map, trip-history, vehicle-management, driver-account, and audit-log pages exposed by the current application.

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** Admin web pages include driver account management, vehicles, audit logs, dashboard, live map, and trip logs. Backend endpoints create Drivers with a new vehicle or an eligible existing multicab, list and update driver records, suspend/reactivate accounts, and expose audit records. Vehicle type is fixed to Multicab in the driver-creation form.
- **Present with limits:** driver regulatory edits are managed through Admin APIs; Drivers maintain permitted personal details through their profile. Audit logging is implemented on supported operations, but coverage is endpoint-specific and should not be interpreted as a complete event ledger.
- **Removed from current source:** dispatcher assignment, dispatch-ticket operations, reservations, and incident reporting. The old ticketing portal is not the current management portal.
- **Environment caveat:** source behavior does not prove that production is running this revision or that its database has applied all migrations. Verify deployed API and database state separately.
