# Software Requirements Specification (SRS): Dashboard and Reporting

**Document ID:** SRS-ND-REPORT  
**Version:** 1.0  
**Review date:** 2026-10-31


> **Current source baseline (reviewed 2026-10-31):** This folder describes the current no-dispatch application source on `main`. Status notes refer to repository code and UI; they do not establish that local or hosted databases, secrets, or deployments are current.

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

## 4. Implementation status (source review: 2026-10-31)

- **Present in source:** Driver Home calculates today's completed one-way trip count, measured distance, average speed from trip records with speed data, recent trips, and a passenger queue count where available. Admin web includes dashboard metrics/charts, live map, and trip-history pages.
- **Present with limits:** passenger-count changes can be pushed to connected Drivers over WebSocket, with REST polling as a fallback. Route selection for this count is derived from the Driver's latest trip for the current Manila day; a Driver without a qualifying trip may have no associated current route.
- **Partial:** measured distance depends on successfully uploaded GPS samples and may be incomplete. The ETA endpoint provides a labeled distance/speed baseline, not a trained ML prediction. Dashboard availability and comparison periods depend on the returned backend data.
- **Not implemented:** trained ETA model serving and a dedicated downloadable reporting/export workflow for the current Admin portal.
