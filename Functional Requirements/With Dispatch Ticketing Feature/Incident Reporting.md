# Software Requirements Specification (SRS): Incident Reporting

**Document ID:** SRS-INC  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for driver incident-report submission, retention, and authorized staff review.

### 1.2 Scope

Driver incident-report submission, retention, and authorized staff review.

## 2. Overall description

**Actors:** Driver submits; authorized staff reviews.

## 3. Specific requirements

- **SRS-INC-FR-001:** The system shall ensure that a driver can submit an incident with its relevant description, time, location, and trip/vehicle context when available.
- **SRS-INC-FR-002:** The system shall ensure that submitted reports are retained and available to authorized staff for review and audit.
- **SRS-INC-FR-003:** The system shall ensure that incident records must retain their original reporter and creation time; later review actions should be traceable.

## 4. Implementation status (source review: 2026-10-28)

- **Present in source:** incident model, API, Driver report screen, and admin incident-log page remain in the repository.
- **Product status:** incident reporting is excluded from the current no-dispatch functional scope; this file is retained as part of the earlier dispatch-ticketing requirements baseline.
- **Pending:** decide whether to retain historical incident data/API or remove/hide the workflow in a future branch. If retained, verify permissions, lifecycle, and audit coverage.

