# Non-functional Requirements

**System baseline:** Current no-dispatch source for the Admin web portal, Driver mobile app, and public Commuter mobile app.
**Review date:** 2026-10-31

These SRS documents are split by quality attribute. Each document scopes its requirements to the modules those quality needs affect. Statements under **Requirements** are acceptance criteria; **Current implementation notes** identify source behavior and gaps and do not claim that a hosted environment has passed validation.

| Quality area | Document | Main module coverage |
|---|---|---|
| Performance | [Performance](Performance.md) | API, Admin dashboard/tables, mobile maps, GPS, queue, notifications |
| Security | [Security](Security.md) | Authentication, Admin portal, Driver app, public Commuter endpoints |
| Reliability | [Reliability](Reliability.md) | Trips/GPS, commuter queue, notifications, authentication, database writes |
| Usability | [Usability](Usability.md) | Admin web, Driver app, Commuter app |
| Scalability | [Scalability](Scalability.md) | API, WebSocket, map/queue data, database |
| Data integrity | [Data Integrity](Data%20Integrity.md) | Accounts/vehicles, routes/trips, GPS, queue, audit and OTP records |
| Compatibility | [Compatibility](Compatibility.md) | Android clients, Admin web browsers, API contracts |
| Maintainability | [Maintainability](Maintainability.md) | Backend, migrations, mobile apps, web portal, operational configuration |
| Accuracy | [Accuracy](Accuracy.md) | GPS, trip metrics/ETA baseline, geofence, commuter queue and delay notice |

## Verification status

These documents define module-specific quality requirements. Source review is not a performance, security, usability, compatibility, or load-test result. Requirements that describe capabilities absent from source are identified as gaps in their respective documents. Validate each target database and hosted configuration independently.
