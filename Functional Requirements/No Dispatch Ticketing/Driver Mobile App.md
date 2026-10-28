# Software Requirements Specification (SRS): Driver Mobile App

**Document ID:** SRS-ND-DRIVER  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

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

## 4. Implementation status (source review: 2026-10-28)

- **Present:** Driver authentication/recovery, initial-password gate, dashboard, route/direction trip selection, trip completion/summary, trip logs with GPS-path overlay, profile editing, notifications, and foreground trip tracking.
- **Present:** trip screen records pause/resume markers while GPS sampling continues. Home receives passenger-count WebSocket events and retains a 15-second REST refresh fallback.
- **Present:** the collapsed active-trip card requests an ETA endpoint and can display a labeled distance/speed baseline. It shows `--` if no recent trip GPS fix or usable route geometry is available; this is not trained ML.
- **Partial:** passenger count still depends on a legacy dispatch-log route. GPS samples are attempted about every five seconds while the trip screen is active, but failed uploads are dropped; background/offline replay is absent. The profile still exposes a Change Password action although the backend restricts that endpoint to initial setup.
- **Legacy UI:** reservation/My Tickets and incident screens/code remain in the source despite being outside the intended no-dispatch scope.
- **Pending:** resolve route source and password-screen mismatch, implement durable/background GPS, and remove or formally retain legacy screens.

