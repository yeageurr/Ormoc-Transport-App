# Software Requirements Specification (SRS): Ticketing Officer Portal

**Document ID:** SRS-TO-PORTAL  
**Version:** 1.0  
**Review date:** 2026-10-28


> **Baseline note (reviewed 2026-10-28):** This folder documents the earlier/alternate dispatch-ticketing design. It is not the current no-dispatch product baseline. The status below describes repository source and known gaps; it does not imply deployed functionality.

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for ticketing Officer web workflows for account/vehicle setup, assignments, closure, and oversight.

### 1.2 Scope

Ticketing Officer web workflows for account/vehicle setup, assignments, closure, and oversight.

## 2. Overall description

**Actors:** Ticketing Officer.

## 3. Specific requirements

- **SRS-TO-PORTAL-FR-001:** The system shall ensure that the former Admin role is now Ticketing Officer; existing terminal/admin foreign-key references shall remain valid through role conversion.
- **SRS-TO-PORTAL-FR-002:** The system shall ensure that ticketing Officers create driver accounts with a new or borrowed vehicle, create dispatcher accounts, and assign dispatchers to routes and dates.
- **SRS-TO-PORTAL-FR-003:** The system shall ensure that they may edit only the agreed driver license and vehicle plate/registration-expiry fields, plus permitted shared vehicle-owner information. Drivers retain self-service control over contact/password/email and vehicle color/body number.
- **SRS-TO-PORTAL-FR-004:** The system shall ensure that they can manually close a dispatcher assignment from 21:00 Manila time, inspect operational logs, and manage/reactivate accounts within their permissions.
- **SRS-TO-PORTAL-FR-005:** The system shall ensure that the portal should not expose unrestricted legacy-admin capabilities that are unrelated to ticket booth operations.

## 4. Implementation status (source review: 2026-10-28)

- **Present:** separate OTA-Ticketing React portal includes login/recovery, dispatch operations, user creation/list/details, dispatcher assignment controls, audit and dispatch history, password confirmation, masterlist export, and print UI. Corresponding backend APIs exist.
- **Partial:** Dispatcher mobile client is absent; export/print data and deployment behavior need end-to-end verification. The broader admin web portal remains in the repository. This portal is not the current product focus.
- **Pending:** verify role scoping, exported/printed formats and data, automatic closure in deployment, and database migration state.

