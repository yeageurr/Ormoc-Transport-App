# Software Requirements Specification (SRS): Authentication and Accounts

**Document ID:** SRS-ND-AUTH  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

## 1. Introduction

### 1.1 Purpose

This document specifies authentication, account status, initial password setup, and password recovery for the no-dispatch-ticketing system.

### 1.2 Scope

Driver authentication and account access used by the driver mobile app and the account-management web portal. Dispatcher and ticketing workflows are outside this system scope.

## 2. Overall description

**Actors:** Driver and Admin operating the management web portal.

## 3. Specific requirements

- **SRS-ND-AUTH-FR-001:** The system shall authenticate a Driver using the Driver's phone-based username and password through the Driver portal.
- **SRS-ND-AUTH-FR-002:** The system shall deny authentication when credentials are invalid or the account is disabled or suspended, without disclosing whether an identity exists in another portal.
- **SRS-ND-AUTH-FR-003:** A newly created account shall require an initial password change before the Driver can use protected app functions. The successful initial change shall set `must_change_password` to false.
- **SRS-ND-AUTH-FR-004:** The Driver shall be able to recover account access by verifying a one-time code sent to the registered email address or mobile number, then setting and confirming a replacement password.
- **SRS-ND-AUTH-FR-007:** The system shall send recovery codes to Philippine mobile numbers through the configured PhilSMS service and shall keep the provider token on the backend only.
- **SRS-ND-AUTH-FR-008:** The system shall enforce a 60-second resend cooldown and, after three sends, a three-minute cooldown. Password-reset OTP verification attempts are not currently capped; this is a known security limitation.
- **SRS-ND-AUTH-FR-005:** The system shall apply the configured password-strength validation and shall not return or store plaintext passwords or OTPs.
- **SRS-ND-AUTH-FR-006:** The system shall provide an authenticated logout that clears the app's locally stored access token.

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** account roles are `admin` and `driver`. Login checks portal-role compatibility; invalid credentials, inactive accounts, and role mismatch use a generic failure. Initial-password setup is enforced by the backend and Driver app. Password recovery supports email and phone OTP; the backend has resend cooldown handling (60 seconds between sends and a three-minute cooldown after the third send). Email changes use OTP verification. Driver access tokens are stored with Expo SecureStore.
- **Not implemented:** three-failed-login throttling and a cap on OTP verification failures. Do not describe these as active controls.
- **Deployment-dependent:** SMS recovery requires valid PhilSMS credentials and sender configuration on the deployed backend; email requires configured SMTP. Their live delivery has to be verified per environment.
- **Policy caveat:** the backend password-change endpoint is restricted to accounts that still require initial password setup; recovery is the path for later password replacement. The Driver profile still exposes a change-password screen, so the intended user-facing policy and endpoint behavior should be reconciled.
- **Environment caveat:** the source Alembic head is `5a8d2c4f7b91`; the local/cloud database revision has not been verified in this documentation update.
