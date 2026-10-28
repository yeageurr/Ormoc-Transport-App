# Software Requirements Specification (SRS): Security

**Document ID:** SRS-NFR-SEC  
**Version:** 1.0  
**Review date:** 2026-10-28

> **Implementation baseline (reviewed 2026-10-28):** The current product direction is no-dispatch, while the repository still retains legacy Dispatcher and Ticketing Officer roles and routes. The implementation notes below describe source code, not a verified production deployment.

## 1. Purpose and scope

This document specifies security-related non-functional requirements for authentication and access to the Ormoc Transport App. It covers the Ticketing Officer web portal, Driver mobile app, and planned Dispatcher mobile app.

## 2. Security requirements

- **SRS-NFR-SEC-001 — Portal role matching:** At authentication, the system shall verify that the account role matches the portal requesting authentication: Ticketing Officer for the ticketing web portal, Driver for the driver app, and Dispatcher for the dispatcher app.
- **SRS-NFR-SEC-002 — Generic authentication failure:** A missing account, incorrect password, inactive account, or account-role mismatch shall produce the same generic authentication response. The response shall not disclose whether an account exists or identify its role. The current agreed response text is “Account doesn't exist.”
- **SRS-NFR-SEC-003 — No session on rejection:** The system shall not issue an access token or authenticated session cookie when authentication fails, including when the account role does not match the requested portal.
- **SRS-NFR-SEC-004 — Server-side authorization:** The backend shall authorize protected operations using the authenticated account role. Hiding pages or controls in a client application shall not be treated as access control.
- **SRS-NFR-SEC-005 — Session role consistency:** A session restored in a portal shall be rejected if its authenticated account role does not match that portal's required role.
- **SRS-NFR-SEC-006 — Credential protection:** Passwords shall be stored as password hashes and shall not be returned in API responses. Temporary credentials shall require a password change at first login.
- **SRS-NFR-SEC-009 — First-login access gate:** An account with `must_change_password = true` shall be limited to authentication status, logout, password setup, and password-recovery operations. The backend shall deny other protected REST and WebSocket operations until the initial password change succeeds.
- **SRS-NFR-SEC-010 — One-time setup password change:** The authenticated password-change endpoint shall accept requests only while `must_change_password = true`. It shall set the flag to `false` only after validating and saving a new password. It shall reject routine subsequent password changes; the separate forgotten-password recovery flow remains available.
- **SRS-NFR-SEC-007 — Login attempt protection:** The system shall limit login attempts to three failed attempts, as specified in the Authentication and Accounts requirements. The enforcement mechanism and recovery behavior must be consistent across portals.
- **SRS-NFR-SEC-008 — OTP sending protection:** OTP delivery shall use the agreed 60-second resend cooldown and three-send limit, followed by a three-minute cooldown. OTP entry failures remain unlimited during development, and SMS delivery remains pending selection of a provider.

## 3. Implementation status

- **Implemented in source:** `/auth/login` checks the requested portal role and returns the same generic response for missing/invalid credentials, role mismatch, and inactive accounts. `/auth/me` validates portal-role consistency. Protected REST endpoints and WebSockets enforce account status and the initial-password gate. Passwords are hashed, OTP values are stored hashed, and native clients store their bearer token in secure storage.
- **Partial:** the Dispatcher app does not exist. The no-dispatch management portal still authenticates using `ticketing_officer`. The driver WebSocket now accepts bearer authorization; its server-side connection registry is in-process and is not shared across multiple workers/instances.
- **Not implemented:** three-failed-login throttling and the complete OTP send policy (three sends, then a three-minute cooldown). A 60-second resend cooldown exists. OTP verification attempts are limited in some flows (for example, email-change verification), so “unlimited OTP failures” is not accurate as a global statement. SMS OTP/provider is absent.
- **Deployment caveat:** source inspection does not confirm deployed CORS, secrets, rate limiting at an edge proxy, TLS configuration, or database revision. Verify those in the target hosting environment.

## 4. Security design note

The portal identifier supplied by a client selects the role expected for that login attempt; it does not prove the identity or integrity of the client application. Authorization of sensitive data and operations therefore remains enforced by backend role checks on protected endpoints.

## 5. Related requirements

- [Current no-dispatch Authentication and Accounts](../Functional%20Requirements/No%20Dispatch%20Ticketing/Authentication%20and%20Accounts.md)
- [Prior dispatch-ticketing Authentication and Accounts](../Functional%20Requirements/With%20Dispatch%20Ticketing%20Feature/Authentication%20and%20Accounts.md)
- [Prior Ticketing Officer Portal](../Functional%20Requirements/With%20Dispatch%20Ticketing%20Feature/Ticketing%20Officer%20Portal.md)
- [Prior Dispatcher Assignments](../Functional%20Requirements/With%20Dispatch%20Ticketing%20Feature/Dispatcher%20Assignments.md)
