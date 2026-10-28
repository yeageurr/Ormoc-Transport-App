# Software Requirements Specification (SRS): Reservations, Queue, and Dispatch Tickets

**Document ID:** SRS-TICKET  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for driver reservation requests, Dispatcher approval, queue allocation, QR ticket lifecycle, and ticket history.

### 1.2 Scope

Driver reservation requests, Dispatcher approval, queue allocation, QR ticket lifecycle, and ticket history.

## 2. Overall description

**Actors:** Driver, assigned Dispatcher, and Ticketing Officer.

## 3. Specific requirements

- **SRS-TICKET-FR-001:** The system shall allow a Driver to submit a reservation for a route/operating date with the required driver and vehicle details. Submission creates a pending request and notifies the assigned dispatcher.
- **SRS-TICKET-FR-002:** The system shall ensure that the dispatcher approves or rejects/cancels the request. Approval records the approving account and time, allocates the route/date queue number, and makes the ticket available. The driver is notified of the decision.
- **SRS-TICKET-FR-003:** The system shall limit each Driver to at most one active reservation, including a request awaiting approval. The system shall reject reservation creation while a trip is in progress. Once the reservation is consumed or expired, the Driver shall be allowed to create another.
- **SRS-TICKET-FR-004:** The system shall ensure that queue approval and queue progression are separate: approval is `pending`, `approved`, `cancelled`, or `expired`; queue progress is initially null and then `on_queue`, `loading`, or `departed` as applicable.
- **SRS-TICKET-FR-005:** The system shall ensure that queue numbers are route-prefixed display identifiers and shall not collide for the same route and operating date. Released numbers shall follow the agreed allocation/reissue policy.
- **SRS-TICKET-FR-006:** The system shall ensure that each generated QR ticket has a unique ticket identity and public reference. Its payload identifies the ticket, route, queue, driver, vehicle, and generation time using IDs where appropriate; the server remains authoritative for validation.
- **SRS-TICKET-FR-007:** The system shall ensure that a valid ticket becomes used only when the driver successfully begins the corresponding outgoing trip. Cancelled and expired tickets remain stored for history with their lifecycle timestamp. A ticket shall not be reusable.
- **SRS-TICKET-FR-008:** The system shall ensure that driver-facing ticket history shows a concise queue/reference row with a full-details view. Dispatcher views distinguish ticket records from departure/dispatch logs.

## 4. Implementation status (source review: 2026-10-28)

- **Present in source:** Driver make/current/history reservation APIs and UI; Dispatcher pending/confirm API; queue allocation; active-reservation safeguards; ticket UUID/reference and used/cancelled/expired fields; records, consume/cancel APIs, and notifications.
- **Partial:** no Dispatcher mobile client. Scanner is not atomically integrated with `/trips/start`; cancellation/expiry/renumbering and complete audit behavior need end-to-end verification. Commuter anonymous presence queue is separate from these dispatch reservations.
- **Pending:** production workflow verification, Dispatcher controls, atomic ticket-scan/trip-start, and final queue correction/reissue and retention rules. Database revision is environment-specific.

