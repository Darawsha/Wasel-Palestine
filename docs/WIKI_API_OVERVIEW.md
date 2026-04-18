# API Overview

The backend exposes a REST API under:

```text
/api/v1
```

Swagger/OpenAPI documentation is configured at:

```text
/api/docs
```

This page summarizes the current endpoint groups discovered in the backend controllers.

## Auth API

```text
POST  /api/v1/auth/signin
POST  /api/v1/auth/signup
GET   /api/v1/auth/profile
PATCH /api/v1/auth/profile
POST  /api/v1/auth/google
GET   /api/v1/auth/linkedin
GET   /api/v1/auth/linkedin/callback
POST  /api/v1/auth/linkedin
```

Purpose:

- Signin.
- Signup.
- Profile retrieval/update.
- Google login.
- LinkedIn OAuth login.

## Users API

```text
POST   /api/v1/users
POST   /api/v1/users/create
GET    /api/v1/users
GET    /api/v1/users/citizens
GET    /api/v1/users/me
GET    /api/v1/users/counts
GET    /api/v1/users/registration-trend
GET    /api/v1/users/registration-buckets
GET    /api/v1/users/search/email
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

Purpose:

- User CRUD.
- Current user lookup.
- Citizen listing.
- Dashboard metrics.

Primary audience:

- Admins for most endpoints.
- Current user endpoint for authenticated users.

## Incidents API

```text
POST   /api/v1/incidents
PATCH  /api/v1/incidents/:id/verify-legacy
POST   /api/v1/incidents/create
GET    /api/v1/incidents
GET    /api/v1/incidents/findAll
GET    /api/v1/incidents/getAll
GET    /api/v1/incidents/counts
GET    /api/v1/incidents/active-count
GET    /api/v1/incidents/today-count
GET    /api/v1/incidents/timeline
GET    /api/v1/incidents/:id/history
GET    /api/v1/incidents/:id
PATCH  /api/v1/incidents/:id
PATCH  /api/v1/incidents/:id/verify
PATCH  /api/v1/incidents/:id/close
DELETE /api/v1/incidents/:id
```

Purpose:

- Incident management.
- Verification.
- Closing.
- Status history.
- Dashboard counts and timeline.

Notes:

- `verify-legacy` exists and appears to be a legacy/internal path.
- Admin role is required for create/update/verify/close/delete paths.

## Checkpoints API

```text
POST   /api/v1/checkpoints
POST   /api/v1/checkpoints/create
GET    /api/v1/checkpoints
GET    /api/v1/checkpoints/counts
GET    /api/v1/checkpoints/active-count
GET    /api/v1/checkpoints/:id/history
GET    /api/v1/checkpoints/:id
PATCH  /api/v1/checkpoints/:id
PATCH  /api/v1/checkpoints/:id/status
DELETE /api/v1/checkpoints/:id
```

Purpose:

- Checkpoint management.
- Checkpoint status updates.
- Checkpoint history and counts.

## Reports API

```text
POST   /api/v1/reports/create
GET    /api/v1/reports/my
GET    /api/v1/reports/community
GET    /api/v1/reports/category-summary
GET    /api/v1/reports
GET    /api/v1/reports/:id
PATCH  /api/v1/reports/my/:id
DELETE /api/v1/reports/my/:id
PATCH  /api/v1/reports/:id
PATCH  /api/v1/reports/:id/review
PATCH  /api/v1/reports/:id/approve
PATCH  /api/v1/reports/:id/reject
PATCH  /api/v1/reports/:id/resolve
POST   /api/v1/reports/:id/vote
POST   /api/v1/reports/:id/confirm
```

Purpose:

- Citizen reports.
- Community reports.
- Report interactions.
- Admin moderation.

## Alerts API

```text
POST   /api/v1/alerts/preferences
POST   /api/v1/alerts/preferences/batch
GET    /api/v1/alerts/preferences
GET    /api/v1/alerts/preferences/overview
GET    /api/v1/alerts/unread-count
PATCH  /api/v1/alerts/viewed
DELETE /api/v1/alerts/preferences/:id
GET    /api/v1/alerts/inbox
PATCH  /api/v1/alerts/inbox/:id/read
```

Purpose:

- Alert subscriptions.
- Alert overview.
- Inbox records.
- Read/viewed status.

## Map API

```text
GET /api/v1/map/incidents
GET /api/v1/map/checkpoints
GET /api/v1/map/reports
```

Purpose:

- Public map data for frontend maps.

## Route API

```text
POST /api/v1/routes/estimate
```

Purpose:

- Estimate a route.
- Optionally avoid checkpoints.
- Optionally avoid incidents.

## Weather API

```text
GET /api/v1/weather/current
```

Purpose:

- Return current weather for coordinates.

## Audit Log API

```text
GET /api/v1/audit-log
GET /api/v1/audit-log/actors
```

Purpose:

- Admin audit search and actor filter data.

## System Settings API

```text
GET   /api/v1/system-settings
PATCH /api/v1/system-settings
```

Purpose:

- Retrieve and update platform settings.

## Response and Validation Behavior

Global backend behavior:

- DTO validation uses whitelist mode.
- Unknown DTO fields are rejected.
- Transform is enabled.
- Global exception filter returns consistent error responses.
- Swagger examples are inferred and enriched during bootstrap.

## Endpoint Mismatch Notes

Known frontend/backend mismatch:

- Some frontend dashboard code references `/subscriptions`, but the backend exposes alert subscriptions under `/alerts/preferences`.

Needs verification:

- Any API documented here should be validated against Swagger after starting the app because guards and middleware may affect access behavior.

