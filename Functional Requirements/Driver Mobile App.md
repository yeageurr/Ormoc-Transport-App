# Software Requirements Specification (SRS): Driver Mobile App

**Document ID:** SRS-ND-DRIVER  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

## 1. Introduction

### 1.1 Purpose

This document specifies the Driver mobile application's account, trip, location, history, and passenger-queue display functions without dispatch ticketing.

### 1.2 Scope

Driver sign-in and password setup, home dashboard, route-based trip start/end, trip history and route trace, profile, notifications, and passenger queue count display.

## 2. Overall description

**Actor:** Driver using an Android mobile application.

## 3. Specific requirements

- **SRS-ND-DRIVER-FR-001:** The Driver shall be able to sign in, complete required initial password setup, recover a password by email OTP, and view/update permitted profile details.
- **SRS-ND-DRIVER-FR-002:** The home screen shall display current-day completed-trip metrics, recent trips, GPS readiness, and the passenger-queue count when available.
- **SRS-ND-DRIVER-FR-003:** The Driver shall select an active route and trip direction before starting a trip. Starting a trip shall not require a dispatch ticket or dispatch ID.
- **SRS-ND-DRIVER-FR-004:** The Driver shall be able to end an active trip and review the resulting trip summary.
- **SRS-ND-DRIVER-FR-005:** Trip Logs shall list the Driver's own trips, support date filtering, and open a trip detail overlay with the recorded GPS path when samples exist.
- **SRS-ND-DRIVER-FR-006:** The app shall refresh relevant profile, trip, notification, and queue data when screens are revisited or refreshed, and communicate unavailable data without presenting it as valid zero data.
- **SRS-ND-DRIVER-FR-007:** The Driver shall be able to view in-app notifications and mark them as read.
- **SRS-ND-DRIVER-FR-008:** During an active trip, the Driver shall be able to pause and resume the trip. Before pausing, the Driver may select a delay reason, provide details for “Others,” and choose whether to broadcast a delay notice to commuters; GPS tracking shall continue during the pause when the app can obtain location fixes.

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** Driver entrance/login, password recovery and mandatory initial password setup, Home metrics, route/direction trip start, trip pause/resume and completion, trip-history list/detail map, profile editing, notifications, and passenger-count display. No dispatch-ticket scan, My Tickets, reservation, or incident-reporting workflow is part of the current app.
- **Present with limits:** active trips request and upload GPS fixes about every five seconds while the trip screen is foregrounded. Pause events can store a reason and broadcast a delay notice to commuters; GPS sampling continues during pauses. Trip summary and route trace depend on the data returned by the backend.
- **Partial:** failed GPS uploads are not durably queued; background/screen-off capture and offline replay are not implemented. Passenger count depends on route activity inferred from trip records and is unavailable if no matching route activity exists.
- **ETA status:** the displayed estimate is a route/distance-speed baseline when recent GPS and route geometry are available; it is not a trained ML result.
- **Policy caveat:** the regular profile change-password entry conflicts with the backend's one-time initial-password endpoint policy; password recovery handles subsequent replacement.
