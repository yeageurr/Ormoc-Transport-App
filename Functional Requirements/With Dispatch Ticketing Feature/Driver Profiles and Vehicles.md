# Software Requirements Specification (SRS): Driver Profiles and Vehicles

**Document ID:** SRS-PROFILE  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for driver profile fields, vehicle records, ownership, borrowing, and authorized updates.

### 1.2 Scope

Driver profile fields, vehicle records, ownership, borrowing, and authorized updates.

## 2. Overall description

**Actors:** Ticketing Officer and Driver.

## 3. Specific requirements

- **SRS-PROFILE-FR-001:** The system shall ensure that ticketing Officers create driver accounts together with a vehicle, either by adding a vehicle or selecting an existing vehicle for a driver to borrow.
- **SRS-PROFILE-FR-002:** The system shall ensure that a driver can update their own contact details, email, password, vehicle color, and body number, subject to the verification rules in [Authentication and Accounts](Authentication%20and%20Accounts.md).
- **SRS-PROFILE-FR-003:** The system shall ensure that a Ticketing Officer can update a driver's license number and the vehicle's plate number and registration expiry. The agreed policy also permits updating a borrowed vehicle's owner record; those changes apply to the shared vehicle and therefore affect both borrower and owner views.
- **SRS-PROFILE-FR-004:** The system shall ensure that vehicle data includes identifiers and operational details needed by dispatch and trip records. Vehicle activity state must be checked during dispatch and trip start.
- **SRS-PROFILE-FR-005:** The system shall ensure that phone numbers remain strings in storage, contain digits only, and have exactly 11 digits. Email input must have a valid structure; ownership is confirmed through OTP.

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
