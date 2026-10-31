# Software Requirements Specification (SRS): Non-functional Requirements — Data Integrity

**Document ID:** SRS-NFR-DATA
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines consistency and preservation requirements for account, Driver/vehicle, route/trip, GPS, commuter queue, notification, audit, and verification data.

## 2. Requirements

### 2.1 Accounts, Driver profiles, and vehicles

- **SRS-NFR-DATA-ACCOUNT-001:** Each Driver profile shall reference exactly one account; unique login, Driver, phone, email, plate, and body identifiers shall not be silently duplicated.
- **SRS-NFR-DATA-VEHICLE-001:** A vehicle shall retain one canonical owner independently of an optional borrower. Borrowing shall update the assignment relationship without changing the owner identity.
- **SRS-NFR-DATA-VEHICLE-002:** Driver account creation with a new vehicle shall persist the account, profile, and vehicle as one logical operation; partial records shall be rolled back or surfaced for explicit recovery.

### 2.2 Routes, trips, and GPS

- **SRS-NFR-DATA-TRIP-001:** Every new trip shall retain direct references to one Driver, vehicle, and route; trip direction shall be outgoing or returning, while completion shall remain a separate lifecycle field.
- **SRS-NFR-DATA-GPS-001:** Each accepted GPS sample shall belong to the authenticated Driver's active trip and preserve its coordinates and capture time.
- **SRS-NFR-DATA-TRIP-002:** Ending a trip shall record its final state and measurements consistently; repeated end requests shall not create duplicate trip completions or alter a previously completed trip's history.

### 2.3 Passenger queue, audit, and security records

- **SRS-NFR-DATA-QUEUE-001:** Each passenger session shall have a unique opaque token and one route/terminal association; count changes shall use committed database state as their source of truth.
- **SRS-NFR-DATA-AUDIT-001:** Audit events shall identify the actor when known, action, target, outcome, and recorded time. They shall remain distinct from trip and GPS records.
- **SRS-NFR-DATA-OTP-001:** OTP and reset-token secrets shall be stored as hashes, and expiry/send/attempt metadata shall be associated with the correct account.

### 2.4 Schema evolution

- **SRS-NFR-DATA-MIG-001:** Every schema change shall be represented by an ordered Alembic migration and shall preserve existing data or explicitly document the transformation/removal before deployment.
- **SRS-NFR-DATA-MIG-002:** A deployment shall not be declared schema-current based only on repository migration head; the target database's current revision shall be checked.

## 3. Current implementation notes

- Current models include direct Driver/vehicle/route trip references, foreign keys, uniqueness constraints, an opaque unique queue token, and hashed OTP fields.
- Admin driver/vehicle creation is implemented as a backend workflow. Transaction behavior and failure recovery should be verified with integration tests.
- `audit_logs.target_table` and `target_id` are polymorphic and therefore do not have a single target-row foreign key. Audit completeness is endpoint-specific.
- GPS upload currently has no client-generated idempotency identifier or durable offline queue. These are integrity/reliability gaps for network interruptions.
- Alembic source head is `5a8d2c4f7b91`; local and hosted database revisions are not established by this document.
