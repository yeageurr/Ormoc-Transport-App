# Software Requirements Specification (SRS): Account Management and Audit

**Document ID:** SRS-ND-ADMIN  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** the admin web portal has Driver account management and audit-log pages. The backend supports Driver creation with a new or eligible borrowed vehicle, Driver listing, regulatory-field updates, suspend/reactivate, and audit queries.
- **Partial:** the portal/backend still authenticate and authorize the management operator as `ticketing_officer`; a distinct no-dispatch administrator role has not been implemented. Audit coverage depends on each endpoint and is not yet proven complete for every operation.
- **Out of intended scope but still present:** dispatch, reservation, ticket, incident, and dispatcher APIs/models remain registered in the backend; some legacy admin pages remain in the repository.
- **Pending:** remove or explicitly retain legacy features after a data-retention decision; verify action-by-action audit coverage and final management-role permissions.

