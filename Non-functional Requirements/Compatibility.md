# Software Requirements Specification (SRS): Non-functional Requirements — Compatibility

**Document ID:** SRS-NFR-COMP
**Version:** 1.0
**Review date:** 2026-10-31

## 1. Purpose and scope

This document defines compatibility requirements for the Android Driver and Commuter apps, Admin web portal, and shared FastAPI JSON API.

## 2. Requirements

### 2.1 Mobile applications

- **SRS-NFR-COMP-MOBILE-001:** Driver and Commuter Android builds shall use the Android SDK minimum configured by the generated native project and shall be checked on at least one physical Android device before release.
- **SRS-NFR-COMP-MOBILE-002:** Location, secure storage, maps, and camera functions shall degrade with a clear user-facing explanation when a device permission or required native service is unavailable.
- **SRS-NFR-COMP-MOBILE-003:** Each EAS build profile shall use the correct app identity, API base URL, map credentials, and runtime/update configuration for that environment.

### 2.2 Admin web portal

- **SRS-NFR-COMP-WEB-001:** The Admin portal shall support current stable releases of Chromium-based browsers, Firefox, and Safari, or explicitly document a narrower supported-browser matrix before deployment.
- **SRS-NFR-COMP-WEB-002:** Responsive tables, maps, and forms shall remain usable at supported desktop and tablet viewport widths without clipping essential actions.

### 2.3 API contracts

- **SRS-NFR-COMP-API-001:** Mobile and web clients shall communicate with the backend through documented JSON schemas and explicit authentication rules; incompatible schema changes shall be coordinated with client releases or versioned.
- **SRS-NFR-COMP-API-002:** Date/time values shall include timezone information or a documented timezone convention; persisted event times shall be interpreted consistently across clients.

## 3. Current implementation notes

- Both mobile projects use Expo Router, React Native, Android package identifiers, and EAS project/runtime configuration. Android is the current target evidenced by project use; iOS configuration exists but its release compatibility is not confirmed here.
- The web portal uses React/Vite and browser APIs. A formal browser/viewport compatibility test matrix is not documented.
- API clients use JSON over HTTP(S); response contracts exist in Pydantic schemas and TypeScript/JavaScript API wrappers. No explicit API version prefix is currently used.
- Minimum Android SDK is controlled by Expo's generated native configuration; inspect the generated project/build configuration when the Expo SDK changes instead of relying on an assumed value.
