# Software Requirements Specification (SRS): Authentication and Accounts

**Document ID:** SRS-AUTH  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for authentication, account state, credential recovery, and role access for Drivers, Dispatchers, and Ticketing Officers.

### 1.2 Scope

Authentication, account state, credential recovery, and role access for Drivers, Dispatchers, and Ticketing Officers.

## 2. Overall description

**Actors:** Driver, Dispatcher, and Ticketing Officer.

## 3. Specific requirements

- **SRS-AUTH-FR-001:** The system shall ensure that users authenticate with their account credentials. Drivers use their phone number as the login identifier; staff roles are Ticketing Officer and Dispatcher.
- **SRS-AUTH-FR-002:** The system shall ensure that disabled or suspended accounts cannot authenticate. Authorized Ticketing Officers can reactivate accounts.
- **SRS-AUTH-FR-003:** The system shall ensure that password changes require the current password. Password recovery verifies an account using a one-time code, then allows the user to set and confirm a replacement password.
- **SRS-AUTH-FR-004:** The system shall ensure that email changes require password verification and proof of control of the new address by a six-digit OTP. A phone-number change requires password verification and updates the driver's login identifier; the driver must sign in again to refresh the token identity.
- **SRS-AUTH-FR-005:** The system shall ensure that activity emails shall notify the account owner when an account, profile, or password change occurs, with event time and performer IP when available.
- **SRS-AUTH-FR-006:** The system shall ensure that the agreed login limit is three failed attempts. OTP sending is subject to a 60-second cooldown, up to three sends, then a three-minute cooldown. OTP entry failures are currently unlimited for development. SMS delivery is deferred until a provider is selected.
- **SRS-AUTH-FR-007:** The system shall ensure that only Ticketing Officers create driver and dispatcher accounts. There is no separate Admin or generic Staff role in the target operating model.
- **SRS-AUTH-FR-008:** The system shall ensure that every newly created account has `must_change_password = true` and cannot use protected application features until its account holder changes the temporary password. A successful initial password change shall set the flag to `false`. Routine password changes shall not be available afterward; forgotten-password recovery remains a separate account-recovery flow.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** Driver, Dispatcher, and Ticketing Officer roles; portal-specific login/session checks; generic invalid-login response; account status handling; first-login password setup; email reset and profile-verification OTP flows.
- **Partial:** Ticketing Officer and Driver clients exist; Dispatcher mobile client does not. OTP sends enforce a 60-second resend cooldown but not the agreed three-send/three-minute extended cooldown. Login has no three-failure lockout. SMS OTP is unavailable. Selected account emails depend on SMTP configuration.
- **Pending:** shared throttling, Dispatcher client and endpoint-scope verification, bootstrap procedure, and deployed-service validation. The no-dispatch product direction is documented separately.

## 5. Additional constraints and open decisions

- Preserve legacy terminal/account references when converting existing Admin accounts to Ticketing Officer.
- Confirm how the OTP-send counter resets after the three-minute cooldown.
- Ensure secrets and OTP values are never returned in API responses or stored as plaintext.
