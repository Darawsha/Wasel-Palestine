# Wasel Palestine

Wasel Palestine is a full-stack traffic awareness, civic reporting, and route-assistance platform. It combines a NestJS backend, a MySQL database, and a static HTML/CSS/JavaScript frontend to support citizen-facing road information and an administrative operations dashboard.

This document is a project-specific README draft generated from the current repository structure and implementation. The existing root `README.md` is still the default NestJS starter README, so this file is intended as a replacement draft for later review.

## Problem Statement

Road movement can be affected by checkpoints, closures, delays, accidents, hazards, and changing weather. Wasel Palestine gives citizens a central place to view current road information, submit community reports, subscribe to alerts, and estimate routes. It gives administrators tools to manage incidents, checkpoints, users, report moderation, audit history, and system settings.

## Primary Users

### Citizens

Citizens can:

- Sign up and sign in.
- View incidents, checkpoints, and reports on maps.
- Submit road-condition reports.
- View community reports.
- Vote on and confirm reports.
- Subscribe to alert preferences.
- Use the route planner.
- Manage profile details and language preference.

### Administrators

Administrators can:

- Manage users.
- Manage checkpoints.
- Create, update, verify, close, and delete incidents.
- Moderate citizen reports.
- Review audit logs.
- View dashboard and performance pages.
- Configure system settings.
- Preview some citizen-facing views.

## Tech Stack

### Backend

- NestJS 11
- TypeScript
- TypeORM
- MySQL through `mysql2`
- `@nestjs/config`
- JWT authentication through `@nestjs/jwt`
- Passport JWT strategy
- bcrypt password hashing
- `class-validator` and `class-transformer`
- Swagger/OpenAPI through `@nestjs/swagger`
- `@nestjs/event-emitter`
- `@nestjs/serve-static`
- Axios for external HTTP calls

### Frontend

- Static HTML/CSS/JavaScript
- Hash-based routing
- Fetch/Axios API access
- localStorage session handling
- Leaflet map widgets
- SweetAlert2-based UI flows
- Manual English/Arabic i18n helpers
- Google Identity login integration
- LinkedIn OAuth callback handling

### External Services

- OpenRouteService for primary routing.
- LocationIQ for routing fallback.
- WeatherAPI.com for current weather when configured.
- Open-Meteo as weather fallback.
- Google OAuth.
- LinkedIn OAuth.

## High-Level Architecture

The project is a single NestJS application that serves both API routes and the static frontend.

```text
Client browser
  |
  | Static pages, feature fragments, JS services
  v
NestJS application
  |
  | /api/v1 REST endpoints
  v
Feature modules and TypeORM repositories
  |
  v
MySQL database

External provider calls:
  - WeatherAPI.com / Open-Meteo
  - OpenRouteService / LocationIQ
  - Google / LinkedIn auth APIs
```

Backend bootstrapping happens in `Backend/src/main.ts`.

Verified runtime behavior:

- Global API prefix: `/api`
- URI API versioning: default version `1`
- Main API base: `/api/v1`
- Swagger documentation: `/api/docs`
- CORS: open origin configuration
- Global `ValidationPipe`
- Global `ClassSerializerInterceptor`
- Global `GlobalExceptionFilter`
- Static frontend served from `Frontend`

The main Nest module is `Backend/src/app.module.ts`. It imports all feature modules, configures TypeORM, serves the frontend, enables event handling, and applies a custom global auth middleware.

## Repository Structure

```text
.
├── Backend/
│   └── src/
│       ├── app.module.ts
│       ├── main.ts
│       ├── common/
│       ├── core/
│       └── modules/
│           ├── alerts/
│           ├── audit-log/
│           ├── auth/
│           ├── checkpoints/
│           ├── incidents/
│           ├── map/
│           ├── reports/
│           ├── route/
│           ├── system-settings/
│           ├── users/
│           └── weather/
├── Frontend/
│   ├── Services/
│   ├── core/
│   ├── features/
│   │   ├── admin/
│   │   ├── citizen/
│   │   └── public/
│   └── views/
│       ├── admin/
│       └── citizen/
├── docs/
├── tests/
├── package.json
├── nest-cli.json
└── tsconfig.json
```

## Backend Modules

### Auth Module

Location: `Backend/src/modules/auth`

Responsibilities:

- Email/password signin.
- Email/password signup.
- JWT creation.
- JWT validation.
- Google login.
- LinkedIn OAuth login.
- Current profile retrieval.
- Current profile update.

Main endpoints:

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

### Users Module

Location: `Backend/src/modules/users`

Responsibilities:

- User creation.
- Admin user management.
- Citizen listing.
- Current user lookup.
- Registration metrics.
- Profile-related persistence fields.

Main endpoints:

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

### Incidents Module

Location: `Backend/src/modules/incidents`

Responsibilities:

- Incident CRUD.
- Incident verification.
- Incident closing.
- Incident status history.
- Filtering and dashboard metrics.
- Synchronizing linked checkpoint status.
- Emitting incident events for alerts.

Incident types:

- `CLOSURE`
- `DELAY`
- `ACCIDENT`
- `WEATHER_HAZARD`

Incident severities:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

Incident statuses:

- `ACTIVE`
- `CLOSED`

Main endpoints:

```text
POST   /api/v1/incidents
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

### Checkpoints Module

Location: `Backend/src/modules/checkpoints`

Responsibilities:

- Checkpoint CRUD.
- Checkpoint status changes.
- Checkpoint status history.
- Dashboard counts.
- Route and map data support.

Checkpoint statuses:

- `OPEN`
- `DELAYED`
- `CLOSED`
- `RESTRICTED`

Main endpoints:

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

### Reports Module

Location: `Backend/src/modules/reports`

Responsibilities:

- Citizen report submission.
- Own report management.
- Community report feed.
- Duplicate detection.
- Submission rate limiting.
- Voting.
- Confirmation.
- Admin moderation.
- Report moderation audit records.

Report categories:

- `checkpoint_issue`
- `road_closure`
- `delay`
- `accident`
- `hazard`
- `other`

Report statuses:

- `pending`
- `under_review`
- `approved`
- `rejected`
- `resolved`

Main endpoints:

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
POST   /api/v1/reports/:id/vote
POST   /api/v1/reports/:id/confirm
PATCH  /api/v1/reports/:id/review
PATCH  /api/v1/reports/:id/approve
PATCH  /api/v1/reports/:id/reject
PATCH  /api/v1/reports/:id/resolve
```

### Alerts Module

Location: `Backend/src/modules/alerts`

Responsibilities:

- Alert preference creation.
- Batch alert preference creation.
- Alert preference listing.
- Alert matching overview.
- Unread count.
- Alert inbox.
- Marking alerts viewed/read.
- Creating alert records from verified/resolved incident events.

Main endpoints:

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

### Map Module

Location: `Backend/src/modules/map`

Responsibilities:

- Public incident map feed.
- Public checkpoint map feed.
- Public report map feed.

Main endpoints:

```text
GET /api/v1/map/incidents
GET /api/v1/map/checkpoints
GET /api/v1/map/reports
```

### Route Module

Location: `Backend/src/modules/route`

Responsibilities:

- Route estimation.
- External provider fallback.
- Checkpoint avoidance strategy.
- Incident avoidance strategy.
- Route comparison and recommendation metadata.

Main endpoint:

```text
POST /api/v1/routes/estimate
```

### Weather Module

Location: `Backend/src/modules/weather`

Responsibilities:

- Current weather lookup for coordinates.
- WeatherAPI.com provider support.
- Open-Meteo fallback.

Main endpoint:

```text
GET /api/v1/weather/current
```

### Audit Log Module

Location: `Backend/src/modules/audit-log`

Responsibilities:

- Admin audit log search.
- Audit actor list.
- Tracking actions for incidents, checkpoints, and reports.

Main endpoints:

```text
GET /api/v1/audit-log
GET /api/v1/audit-log/actors
```

### System Settings Module

Location: `Backend/src/modules/system-settings`

Responsibilities:

- Platform settings singleton.
- Platform name.
- Primary language.

Main endpoints:

```text
GET   /api/v1/system-settings
PATCH /api/v1/system-settings
```

## Frontend Overview

The frontend is a static application in `Frontend`.

Important areas:

```text
Frontend/core
Frontend/Services
Frontend/features/admin
Frontend/features/citizen
Frontend/features/public
Frontend/views/admin
Frontend/views/citizen
```

### Admin Area

Admin shell:

```text
Frontend/views/admin/header/header.html
```

Admin routes are defined in:

```text
Frontend/core/routing/admin/routing.config.js
```

Admin pages include:

- Dashboard
- Incidents
- Performance reports
- Audit log
- Checkpoint management
- Moderation queue
- User management
- System settings
- API monitor

### Citizen Area

Citizen shell:

```text
Frontend/views/citizen/header/header.html
```

Citizen routes are defined in:

```text
Frontend/core/routing/citizen/routing.config.js
```

Citizen pages include:

- Home map
- Incidents
- Route planner
- My reports
- Alerts
- Profile
- 404 page

### Public Auth Area

Public auth files are under:

```text
Frontend/features/public/auth
```

The UI supports signin, signup, Google login, and LinkedIn login callback handling.

## Data Model Summary

Main entities:

- `User`
- `Incident`
- `IncidentStatusHistory`
- `Checkpoint`
- `CheckpointStatusHistory`
- `Report`
- `ReportVote`
- `ReportConfirmation`
- `ReportModerationAudit`
- `AlertPreference`
- `AlertMessage`
- `AlertRecord`
- `AuditLog`
- `SystemSettings`
- `Route`

Important relationships:

- Users submit reports.
- Users vote on and confirm reports.
- Incidents may link to checkpoints.
- Linked verified active incidents can update checkpoint status.
- Checkpoints and incidents keep status history.
- Alert preferences and records belong to users.
- Report moderation actions are stored in report moderation audit records.
- Audit log records reference operational actions and optionally the performing user.

## Authentication and Roles

The backend uses JWT bearer authentication. The application role enum contains:

- `admin`
- `citizen`

The JWT payload contains:

```text
sub
email
role
```

Authorization is enforced by:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(...)`
- a custom global `AuthMiddleware`

The middleware marks selected routes public, including signin/signup/social auth, map feeds, route estimate, and current weather. Controllers still use guards for role-specific behavior.

## API Overview

The main API base is:

```text
/api/v1
```

Swagger is available at:

```text
/api/docs
```

Major API groups:

```text
/auth
/users
/incidents
/checkpoints
/reports
/alerts
/map
/routes
/weather
/audit-log
/system-settings
```

## Environment Variables

The following variable names are used by the codebase. Values are intentionally not documented here.

```env
PORT=

DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SYNCHRONIZE=

JWT_SECRET=
JWT_EXPIRES_IN=

WEATHER_API_KEY=
WEATHER_FALLBACK_COORDS=

OPENROUTE_API_KEY=
OPENROUTESERVICE_API_KEY=
OPEN_ROUTE_API_KEY=
OpenRoute_API_KEY=
OpenRouteService_API_KEY=

LOCATIONIQ_API_KEY=
LOCATIONAL_API_KEY=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_CALLBACK_URL=
```

Google authentication also requires the frontend Google client ID configuration used by the public auth page.

## Installation

Install dependencies from the repository root:

```bash
npm install
```

## Database Setup

Create a MySQL database and configure the database environment variables.

The TypeORM configuration uses `autoLoadEntities: true`. No migration files were found during inspection. TypeORM synchronization defaults to enabled unless `DB_SYNCHRONIZE=false` is set.

For production deployments, review database synchronization and replace it with migrations.

## Running Locally

Start the development server:

```bash
npm run start:dev
```

The server defaults to port `3000` if `PORT` is not set.

Useful local URLs:

```text
Application:  http://localhost:3000
API base:     http://localhost:3000/api/v1
Swagger:      http://localhost:3000/api/docs
```

## Available Scripts

```bash
npm run build
npm run format
npm run start
npm run start:dev
npm run start:debug
npm run start:prod
npm run lint
npm run test
npm run test:watch
npm run test:cov
npm run test:debug
npm run test:e2e
```

## Known Limitations and Implementation Notes

These items are visible in the current codebase:

- The root `README.md` is still the default NestJS starter README.
- No migration files were found.
- TypeORM synchronization appears to be the current schema setup mechanism.
- The frontend dashboard references `/subscriptions`, but the backend alert subscription API is under `/alerts/preferences`.
- Report moderation changes report status but does not create incident records.
- Report own-vote or own-confirm restrictions appear incomplete in backend enforcement.
- Incident and checkpoint service approval/rejection methods exist, but matching controller endpoints were not found.
- Incident and checkpoint deletion is implemented as hard deletion.
- A `Route` entity exists, but route estimates are not currently persisted by the route service.
- Weather has provider fallback, but no caching was found.
- The frontend has legacy token storage code using `jwtToken`, while the active session service uses `token`.
- The frontend system settings service attempts to fetch `/.env` and contains a hardcoded weather fallback key. Review this before production.
- A global custom auth middleware overlaps with Nest guards. Static frontend, Swagger, and public route behavior should be tested carefully.

## Future Improvements

The following improvements are justified by the current codebase:

- Replace TypeORM synchronization with migrations.
- Align frontend dashboard subscription calls with backend alert endpoints.
- Decide whether moderated reports should create incidents and implement that explicitly if required.
- Enforce own-report voting and confirmation restrictions in the backend.
- Expose or remove unused checkpoint/incident approval workflow methods.
- Convert destructive incident/checkpoint deletion to soft-delete or moderated delete if auditability is required.
- Persist route estimates if historical route tracking is intended.
- Remove frontend `.env` fetching and hardcoded fallback API keys.
- Consolidate token storage keys.
- Add explicit tests for auth middleware and public/static route behavior.

