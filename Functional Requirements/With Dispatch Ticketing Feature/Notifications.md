# Software Requirements Specification (SRS): Notifications

**Document ID:** SRS-NOTIF  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Historical baseline (reviewed 2026-10-31):** This document records the former dispatch-ticketing design for reference only. It is superseded by the current requirements in `../No Dispatch Ticketing/`; do not use its requirements as current application behavior.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for operational in-app/push notifications and account-security notices.

### 1.2 Scope

Operational in-app/push notifications and account-security notices.

## 2. Overall description

**Actors:** Driver, Dispatcher, and Ticketing Officer.

## 3. Specific requirements

- **SRS-NOTIF-FR-001:** The system shall ensure that drivers receive a notification when a reservation is approved or rejected/cancelled, and when an approved ticket is ready for scanning.
- **SRS-NOTIF-FR-002:** The system shall ensure that dispatchers receive a notification when a driver submits a reservation for their assigned route/date.
- **SRS-NOTIF-FR-003:** The system shall ensure that users can view and mark their notifications as read; notification delivery and read state should be associated with the intended account.
- **SRS-NOTIF-FR-004:** The system shall ensure that account security emails notify users of account creation or profile/password changes, include the local date/time and performer IP when available, and use the agreed greeting and Ormoc Transport App sign-off.
- **SRS-NOTIF-FR-005:** The system shall ensure that email address changes are not persisted until the new address is verified. Phone-based OTP recovery remains unavailable until an SMS provider and phone verification flow are configured.

## 4. Status in current source (reviewed 2026-10-31)

- **Superseded:** the requirements in Sections 1–3 describe the former dispatch-ticketing product direction and are not requirements of the current application baseline.
- **Current-source disposition:** dispatchers, ticketing officers, dispatch operations, reservations, QR dispatch tickets, and incident reporting were removed from current ORM registration, API routers, and account-role enum by migration `4e9f2b7c1d63` and the associated source cleanup.
- **Data/deployment caveat:** migration source head is `5a8d2c4f7b91`; this does not prove that any particular local or hosted database has applied the migration. Historical data removal/retention and downgrade behavior must be evaluated against the target database before use.
