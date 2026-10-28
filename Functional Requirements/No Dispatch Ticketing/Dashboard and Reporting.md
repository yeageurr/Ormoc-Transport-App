# Software Requirements Specification (SRS): Dashboard and Reporting

**Document ID:** SRS-ND-REPORT  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Implementation baseline (reviewed 2026-10-28):** This is the intended no-dispatch product scope. The repository is transitional; status statements below distinguish implemented source behavior from legacy code and unverified deployment/database state.

## 1. Introduction

### 1.1 Purpose

This document specifies Driver daily dashboard values and account-management operational summaries in the no-dispatch-ticketing system.

### 1.2 Scope

Driver trip metrics and account/audit visibility. Dispatch, reservation, ticket, and incident reporting are excluded.

## 2. Overall description

**Actors:** Driver and authorized account-management operator.

## 3. Specific requirements

- **SRS-ND-REPORT-FR-001:** The Driver dashboard shall calculate completed one-way trips for the current Asia/Manila date; outgoing and returning legs count as separate trips.
- **SRS-ND-REPORT-FR-002:** The Driver dashboard shall calculate distance and average speed from completed trip records and display zero or an empty state when valid measurements are absent.
- **SRS-ND-REPORT-FR-003:** The Driver dashboard shall show recent trips completed today and provide access to full trip history.
- **SRS-ND-REPORT-FR-004:** Account-management reporting shall show audit information relevant to driver/account actions, not dispatch-operation summaries.
- **SRS-ND-REPORT-FR-005:** The system shall distinguish unavailable data from a measured value of zero and shall not fabricate ETA or passenger counts.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** Driver Home derives current Manila-day completed-trip count, measured distance, and average speed from trip records; it shows today's trip list and passenger count. Admin dashboard and reporting APIs/pages remain in the repository.
- **Present:** passenger count changes are pushed to the Driver dashboard over WebSocket when commuters join or leave the active geofence queue; the existing 15-second REST refresh remains a recovery/freshness fallback.
- **Partial:** the count's route is still selected from the Driver's latest dispatch log for the current Manila day, so this feature is not fully dispatch-independent. GPS distance reflects accepted samples and may be incomplete after upload failure.
- **Pending/out of scope:** define final no-dispatch management reports, remove dispatch/incident metrics from the current product surface where appropriate, and train/validate the learned ETA model. The current Driver ETA is a transparent distance/speed baseline, not an ML prediction. The WebSocket manager is in-process; multiple backend workers/instances would need shared pub/sub.

