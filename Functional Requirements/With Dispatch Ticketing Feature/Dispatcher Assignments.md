# Software Requirements Specification (SRS): Dispatcher Assignments and Shift Closure

**Document ID:** SRS-ASGN  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for daily Dispatcher-to-route assignments, manual closure, automatic closure, and closure effects.

### 1.2 Scope

Daily Dispatcher-to-route assignments, manual closure, automatic closure, and closure effects.

## 2. Overall description

**Actors:** Ticketing Officer creates assignments; Dispatcher operates an assigned route and shift.

## 3. Specific requirements

- **SRS-ASGN-FR-001:** The system shall ensure that a Ticketing Officer assigns a dispatcher to one route for an operating date. A dispatcher may not control multiple routes for the same operating shift/date.
- **SRS-ASGN-FR-002:** The system shall ensure that assignment and day-boundary decisions use Asia/Manila time.
- **SRS-ASGN-FR-003:** The system shall ensure that the assigned dispatcher can manage only their assigned route/shift's queue and ticketing activity.
- **SRS-ASGN-FR-004:** The system shall ensure that manual shift closure is available from 21:00 on the assignment's operating date.
- **SRS-ASGN-FR-005:** The system shall ensure that if left open, an assignment automatically closes after 24 hours. Closure expires still-pending or queued reservations and their unused tickets, records lifecycle timestamps, and releases queue numbers.
- **SRS-ASGN-FR-006:** The system shall ensure that dispatch/assignment history is audit data; completed records should not be silently rewritten.

## 4. Implementation status (source review: 2026-10-28)

- **Present in source:** create/list/history/close APIs, constraints, Manila-time manual-close eligibility, closure service, and scheduled automatic closure after the 24-hour shift window.
- **Partial:** no Dispatcher mobile client or complete route-scoped ticket/queue UI exists. Deployed worker startup, timezone behavior, assignment closure side effects, and endpoint scoping need verification.
- **Pending:** verify deployed 21:00/24-hour rules, audit and ticket/reservation lifecycle on close, and build/test Dispatcher workflows.

