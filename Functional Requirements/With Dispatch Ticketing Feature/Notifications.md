# Software Requirements Specification (SRS): Notifications

**Document ID:** SRS-NOTIF  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** persisted notifications, read/list APIs and WebSocket hooks; reservation submission/approval notifications; selected account activity emails. Driver notification center polls while active.
- **Partial:** Driver's WebSocket handler currently processes queue counts, not notification events. No Dispatcher UI, OS push service, outbox/retry mechanism, or guaranteed delivery is configured. SMTP configuration is deployment-dependent.
- **Pending:** Dispatcher UI, notification socket handling or an explicit polling SLA, delivery monitoring/retry, and any SMS/OS push provider.

