# Software Requirements Specification (SRS): Audit and Operational Logs

**Document ID:** SRS-ND-AUD  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

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

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** audit records are stored separately from trips and GPS history. Admin audit pages query the backend; trip history and ordered GPS samples have separate Driver and Admin views.
- **Partial:** account, vehicle, authentication, and trip operations emit audit records where implemented. The API/page do not establish that every read or mutation is logged, nor that records are exported or retained under a finalized retention policy.
- **Removed from current source:** dispatch departure logs, ticket/reservation history, dispatcher assignment records, and incident reports.
- **Environment caveat:** verify the target database migration and deployed audit configuration before relying on production completeness.
