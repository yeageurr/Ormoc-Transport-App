# Software Requirements Specification (SRS): Driver Profiles and Vehicles

**Document ID:** SRS-ND-PROFILE  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

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

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** each Driver account has a linked profile. Driver profile response includes the associated vehicle plate. Admin driver creation supports a new vehicle or an eligible existing multicab; a new vehicle is created as a multicab in this workflow. Vehicle ownership and borrowing are represented separately.
- **Present in source:** Drivers can update permitted personal/contact fields; email changes are OTP-verified. Admin endpoints support Driver license and vehicle regulatory edits. Driver profile currently displays the associated plate, not every vehicle attribute.
- **Partial:** verify vehicle selection/ownership and field-level authorization using the deployed database, especially for borrowed vehicles. The current source review does not establish that every cross-account vehicle edit is propagated to every client immediately.
- **Environment caveat:** uniqueness constraints and migration state must be checked on the target database.
