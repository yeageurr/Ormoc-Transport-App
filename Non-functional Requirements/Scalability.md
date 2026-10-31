# Software Requirements Specification (SRS): Non-functional Requirements — Scalability

**Document ID:** SRS-NFR-SCALE
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines how the API, database, live map, passenger queue, and WebSocket services shall accommodate growth in Drivers, commuters, trips, and location samples.

## 2. Requirements

### 2.1 API and database

- **SRS-NFR-SCALE-API-001:** Collection endpoints shall support pagination, date/route filtering, or another bounded retrieval strategy before record volume can make full-table responses impractical.
- **SRS-NFR-SCALE-DB-001:** Query patterns for active queue counts, Driver trip history, route trips, and latest vehicle locations shall have appropriate indexes verified against representative query plans.
- **SRS-NFR-SCALE-DB-002:** High-volume GPS history shall support retention/archive decisions without slowing account, route, and active-trip operations beyond their performance targets.

### 2.2 Live location and queue

- **SRS-NFR-SCALE-REALTIME-001:** The real-time delivery layer shall support multiple API workers/instances without losing or duplicating targeted queue-count updates; shared pub/sub or an equivalent cross-worker mechanism shall be used when horizontally scaled.
- **SRS-NFR-SCALE-MAP-001:** Commuter and Admin maps shall request only the live vehicle data needed for the visible region/route when the number of active vehicles makes full refreshes inefficient.
- **SRS-NFR-SCALE-QUEUE-001:** Queue-count calculation shall remain route-scoped and use database-side aggregation rather than loading individual commuter sessions into application memory.

### 2.3 Client applications

- **SRS-NFR-SCALE-CLIENT-001:** Driver and Commuter apps shall handle increasing trip/notification history through bounded pages or date filters and shall not retain an unbounded history in memory.

## 3. Current implementation notes

- Passenger queue counts use database aggregation and have a composite route/active/last-seen index.
- Driver WebSocket connections are held in a process-local dictionary; cross-worker pub/sub is not implemented.
- GPS/trip history and some Admin collection endpoints require review for pagination and indexes as data grows. No capacity/load target or horizontal-scale test result is currently documented.
