# Software Requirements Specification (SRS): Authentication and Accounts

**Document ID:** SRS-AUTH  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

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

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
