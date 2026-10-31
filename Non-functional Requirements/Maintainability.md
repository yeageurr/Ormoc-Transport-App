# Software Requirements Specification (SRS): Non-functional Requirements — Maintainability

**Document ID:** SRS-NFR-MAINT
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines requirements that keep backend, database, mobile applications, and Admin web portal understandable and safe to modify.

## 2. Requirements

### 2.1 Backend and API

- **SRS-NFR-MAINT-API-001:** Business responsibilities shall remain separated into routers, schemas, models, and service modules; response/request contracts shall be documented in FastAPI OpenAPI output.
- **SRS-NFR-MAINT-API-002:** Authentication, role authorization, and ownership checks shall be centralized or consistently reused rather than independently reimplemented in each feature endpoint.
- **SRS-NFR-MAINT-API-003:** Logs shall provide enough request/error context to diagnose failures without recording passwords, raw OTPs, access tokens, or unnecessary personal data.

### 2.2 Database and migrations

- **SRS-NFR-MAINT-DB-001:** Database schema changes shall be made through Alembic revisions; runtime startup shall not silently mutate production schema.
- **SRS-NFR-MAINT-DB-002:** Migrations shall declare dependencies, upgrade behavior, and downgrade/data-retention limitations, and shall be reviewed against a backup before destructive deployment.

### 2.3 Mobile and web clients

- **SRS-NFR-MAINT-CLIENT-001:** API access and shared domain types shall be organized in reusable client modules rather than duplicated endpoint logic inside unrelated screens/pages.
- **SRS-NFR-MAINT-CLIENT-002:** Environment-specific URLs, tokens, and map/provider credentials shall be configured outside committed source and documented through safe example files.
- **SRS-NFR-MAINT-CLIENT-003:** Critical flows—login, first password setup/recovery, trip start/end, queue join/leave, and Admin driver/vehicle actions—shall have repeatable automated or documented acceptance checks.

### 2.4 Requirements and traceability

- **SRS-NFR-MAINT-DOC-001:** Functional and non-functional requirements shall identify their module scope, stable requirement IDs, implementation status, and known limitations.
- **SRS-NFR-MAINT-DOC-002:** When system scope changes, superseded requirements shall be clearly marked historical and linked to the current baseline.

## 3. Current implementation notes

- Backend source is organized into FastAPI routers, Pydantic schemas, SQLAlchemy models, services, and Alembic migrations. Mobile and web clients have API modules and screen/page modules.
- Backend tests exist for authentication, geofence, and trips; complete automated coverage across the web and both mobile clients is not established by this review.
- Requirements are separated by module and quality area; the With Dispatch Ticketing set is marked historical and superseded.
- Configuration is environment-based. Hosted variables and deployed versions must be maintained separately from local `.env` files.
