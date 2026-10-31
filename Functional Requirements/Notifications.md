# Software Requirements Specification (SRS): Notifications

**Document ID:** SRS-ND-NOTIF  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

## 1. Introduction

### 1.1 Purpose

This document specifies account-targeted in-app notifications and account-security email notices in the no-dispatch-ticketing system.

### 1.2 Scope

Notifications related to account status/security and app operation. Reservation, dispatch-ticket, and dispatcher assignment notifications are excluded.

## 2. Overall description

**Actors:** Driver and authorized account-management operator.

## 3. Specific requirements

- **SRS-ND-NOTIF-FR-001:** A Driver shall be able to retrieve account-targeted notifications and mark an owned notification as read.
- **SRS-ND-NOTIF-FR-002:** The system shall persist notifications before attempting live WebSocket delivery so reconnecting clients can retrieve them.
- **SRS-ND-NOTIF-FR-003:** The system shall send configured account-security emails for supported account/profile/password events, including event date/time and performer address when available.
- **SRS-ND-NOTIF-FR-004:** Notification delivery failure shall not silently change account, vehicle, queue, or trip state.
- **SRS-ND-NOTIF-FR-005:** When the Driver chooses to broadcast a trip-pause notice, the system shall expose its route, reason, optional details, pause time, and resume state to the Commuter live map while the notice remains active or recently resumed.

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** persisted account-targeted notifications have list/read APIs and a Driver notification center. Selected account/security emails are sent when SMTP is configured. Drivers can broadcast pause reasons as delay notices; the Commuter live map polls and displays relevant active/recent notices.
- **Partial:** delay notices and live vehicle positions use polling in the Commuter app; this is not OS push delivery. The Driver notification center refreshes through its current app behavior rather than a guaranteed push channel. Email/SMS delivery depends on backend provider configuration, network access, and provider availability; durable retry/outbox guarantees are not implemented.
- **Removed from current source:** reservation approval, dispatch-ticket, and dispatcher notifications.
- **Environment caveat:** verify SMTP and PhilSMS credentials on the deployed backend; local `.env` values do not configure hosted services.
