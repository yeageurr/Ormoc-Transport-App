# Software Requirements Specification (SRS): Authentication and Accounts

**Document ID:** SRS-ND-AUTH  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies authentication, account status, initial password setup, and password recovery for the no-dispatch-ticketing system.

### 1.2 Scope

Driver authentication and account access used by the driver mobile app and the account-management web portal. Dispatcher and ticketing workflows are outside this system scope.

## 2. Overall description

**Actors:** Driver and account-management portal operator. The current backend still authorizes the management portal using the legacy `ticketing_officer` role; removing that role is an implementation gap for this branch.

## 3. Specific requirements

- **SRS-ND-AUTH-FR-001:** The system shall authenticate a Driver using the Driver's phone-based username and password through the Driver portal.
- **SRS-ND-AUTH-FR-002:** The system shall deny authentication when credentials are invalid or the account is disabled or suspended, without disclosing whether an identity exists in another portal.
- **SRS-ND-AUTH-FR-003:** A newly created account shall require an initial password change before the Driver can use protected app functions. The successful initial change shall set `must_change_password` to false.
- **SRS-ND-AUTH-FR-004:** The Driver shall be able to recover account access by verifying a one-time code sent to the registered email address or mobile number, then setting and confirming a replacement password.
- **SRS-ND-AUTH-FR-007:** The system shall send recovery codes to Philippine mobile numbers through the configured PhilSMS service and shall keep the provider token on the backend only.
- **SRS-ND-AUTH-FR-008:** The system shall enforce a 60-second resend cooldown and, after three sends, a three-minute cooldown. OTP entry failures remain unlimited during the current testing phase.
- **SRS-ND-AUTH-FR-005:** The system shall apply the configured password-strength validation and shall not return or store plaintext passwords or OTPs.
- **SRS-ND-AUTH-FR-006:** The system shall provide an authenticated logout that clears the app's locally stored access token.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** portal-specific login checks, generic role/credential failure text, disabled/suspended account rejection, protected-session role checks, initial-password enforcement, secure Driver token storage, email and SMS OTP password recovery, and 60-second/three-minute OTP-send throttling.
- **Partial:** the admin portal still uses the legacy `ticketing_officer` role, while the no-dispatch target has no final management-role design. The login endpoint has no three-failed-attempt lockout. PhilSMS delivery requires valid deployment secrets and sufficient provider balance; live delivery must be confirmed on the target deployment.
- **Policy mismatch:** the backend permits the authenticated password-change endpoint only for initial setup while `must_change_password` is true, but the Driver profile still exposes a Change Password screen/action. Routine changes should use the separate recovery policy or the product rule must be revised.
- **Pending:** settle management identity/role, implement the agreed login lockout, confirm SMS delivery from the deployed backend, and align the profile UI with the one-time password-change rule.

## 5. Constraints

- A password recovery operation shall clear the mobile app's stored session and return the Driver to login.
- The latest authoritative account flag shall determine whether initial password setup is required; stale navigation state shall not force the setup screen when the flag is false.
