# API layer

- `http.js`: shared fetch client, bearer token header, cookies, and normalized API errors.
- `auth.api.js`: login, session lookup, logout, and password change.
- `drivers.api.js`: driver account endpoints.
- `vehicles.api.js`: vehicle CRUD endpoints.
- `routes.api.js`: active route lookup.
- `dispatcherAssignments.api.js`: assignment create and close endpoints.

Backend contract gaps identified before page implementation: dispatcher account list/create, dispatcher-assignment list/open, and transactional driver-plus-vehicle creation are not exposed as suitable combined APIs yet. Add those backend routes before wiring UI flows that depend on them.

Authentication now supports ticketing-officer login by email or phone/username. Forgot-password uses the backend email OTP request, resend, verify, and complete endpoints; this requires the ticketing officer account to have a deliverable email configured. Phone/SMS recovery is intentionally not included while the SMS provider remains undecided.
