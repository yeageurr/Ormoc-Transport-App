# Software Requirements Specification (SRS): Security

**Document ID:** SRS-NFR-SEC  
**Version:** 1.0  
**Review date:** 2026-10-25

## 1. Purpose and scope

This document specifies security-related non-functional requirements for authentication and access to the Ormoc Transport App. It covers the Ticketing Officer web portal, Driver mobile app, and planned Dispatcher mobile app.

## 2. Security requirements

- **SRS-NFR-SEC-001 — Portal role matching:** At authentication, the system shall verify that the account role matches the portal requesting authentication: Ticketing Officer for the ticketing web portal, Driver for the driver app, and Dispatcher for the dispatcher app.
- **SRS-NFR-SEC-002 — Generic authentication failure:** A missing account, incorrect password, inactive account, or account-role mismatch shall produce the same generic authentication response. The response shall not disclose whether an account exists or identify its role. The current agreed response text is “Account doesn't exist.”
- **SRS-NFR-SEC-003 — No session on rejection:** The system shall not issue an access token or authenticated session cookie when authentication fails, including when the account role does not match the requested portal.
- **SRS-NFR-SEC-004 — Server-side authorization:** The backend shall authorize protected operations using the authenticated account role. Hiding pages or controls in a client application shall not be treated as access control.
- **SRS-NFR-SEC-005 — Session role consistency:** A session restored in a portal shall be rejected if its authenticated account role does not match that portal's required role.
- **SRS-NFR-SEC-006 — Credential protection:** Passwords shall be stored as password hashes and shall not be returned in API responses. Temporary credentials shall require a password change at first login.
- **SRS-NFR-SEC-007 — Login attempt protection:** The system shall limit login attempts to three failed attempts, as specified in the Authentication and Accounts requirements. The enforcement mechanism and recovery behavior must be consistent across portals.
- **SRS-NFR-SEC-008 — OTP sending protection:** OTP delivery shall use the agreed 60-second resend cooldown and three-send limit, followed by a three-minute cooldown. OTP entry failures remain unlimited during development, and SMS delivery remains pending selection of a provider.

## 3. Implementation status

- **Implemented:** The backend login request accepts a portal identifier and rejects role mismatches, bad credentials, and inactive accounts with the same generic response. Ticketing web clients identify as `ticketing_officer`; the driver app identifies as `driver`. Session restoration checks the expected portal role. Backend endpoints also enforce role permissions.
- **Pending:** The Dispatcher mobile app has not been created. When implemented, it must identify as `dispatcher` for login and session restoration.
- **Partial:** The three-attempt login limit and OTP sending cooldown/limit are agreed requirements, but shared enforcement across all relevant flows remains pending. OTP attempt limits are intentionally disabled for development.

## 4. Security design note

The portal identifier supplied by a client selects the role expected for that login attempt; it does not prove the identity or integrity of the client application. Authorization of sensitive data and operations therefore remains enforced by backend role checks on protected endpoints.

## 5. Related requirements

- [Authentication and Accounts](../Functional%20Requirements/Authentication%20and%20Accounts.md)
- [Ticketing Officer Portal](../Functional%20Requirements/Ticketing%20Officer%20Portal.md)
- [Dispatcher Assignments](../Functional%20Requirements/Dispatcher%20Assignments.md)
