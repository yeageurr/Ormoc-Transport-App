# Software Requirements Specification (SRS): Driver Profiles and Vehicles

**Document ID:** SRS-ND-PROFILE  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies Driver profile data, vehicle ownership/borrowing, and self-service updates.

### 1.2 Scope

Driver identity and contact details, license information, associated vehicle, and vehicle operational state. Dispatch-specific vehicle assignment is excluded.

## 2. Overall description

**Actors:** Driver and authorized account-management operator.

## 3. Specific requirements

- **SRS-ND-PROFILE-FR-001:** Each Driver profile shall be linked to one account and have a unique Driver identifier and contact number.
- **SRS-ND-PROFILE-FR-002:** A Driver shall be able to view their profile and currently associated vehicle details.
- **SRS-ND-PROFILE-FR-003:** A Driver shall be able to update permitted basic contact details and email; email changes shall be persisted only after OTP verification of the new address.
- **SRS-ND-PROFILE-FR-004:** A vehicle shall have one canonical owner. If another Driver borrows it, the system shall reference that same vehicle record and preserve the owner/borrower distinction.
- **SRS-ND-PROFILE-FR-005:** Vehicle data shall include plate, body number, color, vehicle type, registration expiry, condition, and current activity status as applicable.
- **SRS-ND-PROFILE-FR-006:** The system shall validate phone numbers as strings containing exactly 11 numeric digits and validate email structure before submission.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** Driver profile lookup includes the associated vehicle plate; account creation supports a new vehicle or an eligible existing vehicle; vehicle model has separate owner and borrower fields. Driver profile flows support phone/email updates and email OTP verification. The admin portal can edit Driver license and vehicle plate/registration details.
- **Partial:** backend management actions remain authorized as `ticketing_officer`. Verify every field-level rule and audit path before treating Driver-versus-management permissions as complete. Current profile vehicle display primarily exposes the plate, not the full vehicle detail set.
- **Pending:** verify shared borrowed-vehicle edits propagate consistently to owner and borrower views and confirm the target database has the borrower migration.

