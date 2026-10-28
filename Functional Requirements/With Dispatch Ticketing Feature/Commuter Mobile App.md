# Software Requirements Specification (SRS): Commuter Mobile App

**Document ID:** SRS-COMM  
**Version:** 1.1  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies public route discovery, live vehicle viewing, and terminal passenger-queue participation in the commuter mobile application.

### 1.2 Scope

The commuter application provides route and vehicle information and lets a commuter join a route's passenger queue while physically present inside the terminal geofence. Commuter queue entries are separate from driver dispatch reservations and dispatch tickets.

## 2. Overall description

**Actors:** Commuter using public, unauthenticated application functions.

## 3. Specific requirements

- **SRS-COMM-FR-001:** The system shall provide entrance and introduction screens and public route information without requiring driver or staff credentials.
- **SRS-COMM-FR-002:** The system shall display active routes and live vehicle positions using public route and vehicle APIs.
- **SRS-COMM-FR-003:** The system shall display the commuter's current human-readable location and shall keep commuter screens distinct from driver/staff dispatch operations.
- **SRS-COMM-FR-004:** The system shall show the “Going somewhere?” route prompt only while the commuter device is inside the configured terminal geofence. The Commuter shall be able to select “No thanks” to dismiss the prompt for the current terminal visit.
- **SRS-COMM-FR-005:** After the Commuter selects a route and continues, the system shall validate terminal presence, create a passenger queue entry for that route, show queue processing and success states, and return the Commuter to the live map.
- **SRS-COMM-FR-006:** A passenger queue entry shall remain active while the Commuter device reports presence inside the terminal geofence. The system shall close the entry after the device leaves the geofence and shall exclude entries without a heartbeat for two minutes from the active count.
- **SRS-COMM-FR-007:** The system shall associate no personally identifying account data with anonymous passenger queue entries. Each device queue session represents one commuter entry.
- **SRS-COMM-FR-008:** The system shall not treat commuter passenger queue entries as driver reservation requests or dispatch tickets. Commuter QR ticketing and payment are outside this flow.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** commuter route/vehicle map, terminal prompt, anonymous passenger queue, foreground presence heartbeat, and Driver queue count. Count-changing queue events now push the authoritative count to the assigned Driver over WebSocket; REST polling remains a fallback.
- **Partial:** this is a separate anonymous passenger-presence count, not the Driver numbered reservation/ticket queue. Push requires a live in-process WebSocket and the current dispatch-log route mapping. Background/offline presence and OS push notifications are absent.
- **Not implemented:** ETA prediction remains a placeholder.

