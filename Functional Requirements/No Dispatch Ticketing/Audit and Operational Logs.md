# Software Requirements Specification (SRS): Audit and Operational Logs

**Document ID:** SRS-ND-AUD  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies auditability for account/vehicle management and Driver trip operations.

### 1.2 Scope

Account, vehicle, and trip activity that remains within the no-dispatch-ticketing system. Dispatch departure logs and ticket/reservation history are excluded.

## 2. Overall description

**Actors:** Driver and authorized account-management operator.

## 3. Specific requirements

- **SRS-ND-AUD-FR-001:** The system shall record supported account-management actions with actor, action, target entity, timestamp, and contextual details where available.
- **SRS-ND-AUD-FR-002:** The system shall retain Driver trip start/end and associated trip/GPS history for authorized review.
- **SRS-ND-AUD-FR-003:** Audit history shall remain distinct from trip history; a trip record shall describe a transport operation, while an audit record shall describe a system/account action.
- **SRS-ND-AUD-FR-004:** The management portal shall restrict audit-log access to authorized accounts.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** audit records have a model, API, and admin audit page. Trip records and GPS samples are stored and viewed separately from audit events.
- **Partial:** audit writes exist for selected account, profile, vehicle, trip, and security actions, but coverage and context fields are not uniform. The audit API is still restricted to `ticketing_officer`.
- **Pending:** verify every management mutation is audited, establish retention/export policy, and decide how to handle legacy dispatch/incident audit records. The deployed database revision was not inspected during this review.

