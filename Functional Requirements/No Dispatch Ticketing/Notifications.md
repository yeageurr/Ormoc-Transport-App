# Software Requirements Specification (SRS): Notifications

**Document ID:** SRS-ND-NOTIF  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** persisted account-targeted notifications, list/read APIs, backend WebSocket delivery hooks, and selected account-security emails. Driver notification center refreshes by foreground polling.
- **Partial:** the Driver WebSocket listener currently handles passenger-count events, not notification events; inbox changes therefore are not instantly reflected by that listener. No OS push provider or durable delivery retry is configured. SMTP delivery depends on deployment configuration, and send-failure behavior varies by flow.
- **Legacy:** reservation/dispatch and incident notification types and routes remain in source.
- **Pending:** add a Driver notification WebSocket listener or formally retain polling, implement retry/observability, and configure any required push/email providers.

