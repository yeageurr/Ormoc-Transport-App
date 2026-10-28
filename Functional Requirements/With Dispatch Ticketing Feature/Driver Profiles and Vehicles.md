# Software Requirements Specification (SRS): Driver Profiles and Vehicles

**Document ID:** SRS-PROFILE  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** Driver/account/vehicle APIs; create a Driver with a new or eligible borrowed vehicle; explicit owner/borrower fields; profile and email OTP; management updates for Driver license, plate, and registration expiry; associated vehicle plate in Driver profile.
- **Partial:** field permissions and shared owner/borrower edits require action-by-action verification, including audit coverage and the target database migration.
- **Pending:** deployed-schema and full authorization/audit verification.

## 5. Additional constraints and open decisions

- Account creation with a new vehicle should commit or roll back as one transaction.
- A vehicle should have an unambiguous owner and explicit borrower/assignment relationships; borrowing must not silently transfer ownership.
- Plate, license, and expiry changes should be auditable and validated before persistence.
