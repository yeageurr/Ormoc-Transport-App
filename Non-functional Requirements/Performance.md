# Software Requirements Specification (SRS): Non-functional Requirements — Performance

**Document ID:** SRS-NFR-PERF
**Version:** 1.0
**Review date:** 2026-10-31

> Targets below are proposed acceptance criteria for the current project scale. They have not been benchmarked against the deployed service. Measure server processing separately from mobile-network delay, map-tile delivery, and third-party email/SMS provider time.

## 1. Purpose and scope

This document defines response-time and interaction-performance requirements for the Admin web portal, Driver app, Commuter app, and API modules.

## 2. Requirements

### 2.1 Backend API and database

- **SRS-NFR-PERF-API-001:** Under a representative load of 25 concurrent client sessions, 95% of ordinary authenticated read/write API requests shall complete server-side within 2 seconds, excluding external provider calls and client network transit.
- **SRS-NFR-PERF-API-002:** A successful trip GPS sample write and passenger-queue join/heartbeat shall complete server-side within 2 seconds at the 95th percentile under the same workload.
- **SRS-NFR-PERF-API-003:** Collection endpoints used by dashboards, logs, users, and vehicles shall use bounded result sets or pagination as data volume grows; one request shall not require loading an unbounded history into the client.

### 2.2 Admin web portal

- **SRS-NFR-PERF-ADMIN-001:** Dashboard, user, vehicle, audit, and trip-history pages shall show a loading or progress state while requests are pending and shall render the first usable result within 3 seconds at the 95th percentile on the project test network and representative data volume.
- **SRS-NFR-PERF-ADMIN-002:** Updating a filter or changing pages shall not trigger duplicate requests or block unrelated page controls while data is loading.

### 2.3 Driver mobile app

- **SRS-NFR-PERF-DRIVER-001:** Local navigation and ordinary screen interactions shall respond within 300 milliseconds at the 95th percentile on the minimum supported test device, excluding server-dependent work.
- **SRS-NFR-PERF-DRIVER-002:** During an active trip, location capture shall request a fix approximately every five seconds when permitted by the operating system; network upload latency shall not block the UI or subsequent fix capture.
- **SRS-NFR-PERF-DRIVER-003:** Trip start/end, profile, and queue-count actions shall expose progress feedback while awaiting a server response and prevent duplicate submissions for the same in-flight action.

### 2.4 Commuter mobile app and live map

- **SRS-NFR-PERF-COMM-001:** The app shall refresh live vehicle positions and delay notices at the configured polling interval (currently about 10 seconds) without blocking map gestures or route selection.
- **SRS-NFR-PERF-COMM-002:** Route discovery and geofence prompt decisions shall use the latest successfully retrieved route/geofence data; the app shall expose a loading or unavailable state rather than freezing while requests are pending.

### 2.5 Real-time queue updates

- **SRS-NFR-PERF-QUEUE-001:** When a Driver and backend share a working WebSocket instance and network, a committed passenger-count change should reach the connected Driver within 3 seconds at the 95th percentile. REST polling shall remain a recovery path.

## 3. Current implementation notes

- The Commuter app polls live vehicles and delay notices at about 10-second intervals; Driver Home has queue-count polling fallback and also receives WebSocket updates.
- The Driver app requests active-trip GPS fixes at about five-second intervals in the foreground.
- No workload benchmark or latency SLO measurement was found in the source review. Results depend on the host, database, network, device, and map provider.
- Backend WebSocket connections are stored in process memory; multi-worker delivery may not meet the real-time target without shared pub/sub.
