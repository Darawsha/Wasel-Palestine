# Backend Modules

The backend is a NestJS application rooted at `Backend/src`. Feature code is organized under `Backend/src/modules`. Each module generally contains a Nest module file, controller files, service files, DTOs, enums, and TypeORM entities.

The main module `Backend/src/app.module.ts` imports:

- `UsersModule`
- `AuthModule`
- `CheckpointsModule`
- `IncidentsModule`
- `MapModule`
- `RouteModule`
- `ReportsModule`
- `AuditLogModule`
- `WeatherModule`
- `SystemSettingsModule`
- `AlertsModule`

It also configures TypeORM, static frontend serving, event emitters, and a global custom auth middleware.

## Auth Module

Location:

```text
Backend/src/modules/auth
```

Main files:

- `auth.controller.ts`
- `auth.service.ts`
- `auth.module.ts`
- `strategies/jwt.strategy.ts`
- `strategies/linkedin.strategy.ts`
- DTO files for signin, signup, Google login, LinkedIn login, profile update, and auth response

Responsibilities:

- Email/password signin.
- Email/password signup.
- JWT generation.
- JWT validation.
- Google access-token login.
- LinkedIn OAuth redirect and callback handling.
- Current profile retrieval.
- Current profile update.

Implementation notes:

- Passwords are compared through `PasswordService` using bcrypt.
- JWT payload contains `sub`, `email`, and `role`.
- Social users can be created without a password hash.
- LinkedIn state is signed as a short-lived JWT.

## Users Module

Location:

```text
Backend/src/modules/users
```

Main files:

- `users.controller.ts`
- `users.service.ts`
- `users.module.ts`
- `entities/user.entity.ts`
- DTOs for create, update, query, and response

Responsibilities:

- Create users.
- Manage user accounts.
- List users and citizens.
- Search users by email.
- Return current user data.
- Provide dashboard metrics such as counts and registration trends.
- Store profile details.

Important entity fields:

- `firstname`
- `lastname`
- `email`
- `password_hash`
- `role`
- `phone`
- `address`
- `language`
- `profileImage`
- `googleId`
- `linkedinId`
- `provider`
- `isVerified`
- `lastAlertsViewedAt`

Roles:

- `admin`
- `citizen`

Implementation notes:

- Email is normalized before user creation.
- Password users require a password hash.
- Social users may have a null password hash.
- A `UsersRepository` file exists, but it appears inconsistent with the main `User` entity table naming and does not appear to be the primary access path.

## Incidents Module

Location:

```text
Backend/src/modules/incidents
```

Main files:

- `incidents.controller.ts`
- `incidents.service.ts`
- `incidents.module.ts`
- `entities/incident.entity.ts`
- `entities/status-history.entity.ts`
- `sync/incident-checkpoint-sync.service.ts`
- `observers/incident-created.observer.ts`
- strategy and lifecycle services

Responsibilities:

- Create incidents.
- Update incidents.
- Verify incidents.
- Close incidents.
- Delete incidents.
- Store status history.
- Filter incidents.
- Provide dashboard counts and timeline data.
- Synchronize linked checkpoint status.
- Emit alert-related incident events.

Important enums:

```text
IncidentType:
  CLOSURE
  DELAY
  ACCIDENT
  WEATHER_HAZARD

IncidentSeverity:
  LOW
  MEDIUM
  HIGH
  CRITICAL

IncidentStatus:
  ACTIVE
  CLOSED
```

Checkpoint linkage behavior:

- Incidents can optionally link to a checkpoint.
- Linked incidents can carry an `impactStatus`.
- Verified active linked incidents can update checkpoint status.
- Closing, removing, or unlinking a linked incident can reset the checkpoint.
- The sync service prevents more than one active incident per checkpoint.

Implementation notes:

- Incidents use `isVerified` separately from `status`.
- Service-level moderation fields and approve/reject methods exist, but matching controller endpoints were not found.
- Deletion is implemented as hard deletion.

## Checkpoints Module

Location:

```text
Backend/src/modules/checkpoints
```

Main files:

- `checkpoints.controller.ts`
- `checkpoints.service.ts`
- `checkpoints.module.ts`
- `entities/checkpoint.entity.ts`
- `entities/status-history.entity.ts`
- DTOs for create, update, status update, query, and response

Responsibilities:

- Create checkpoints.
- Update checkpoints.
- Update checkpoint status.
- Delete checkpoints.
- List and filter checkpoints.
- Provide status history.
- Provide dashboard counts.

Checkpoint statuses:

```text
OPEN
DELAYED
CLOSED
RESTRICTED
```

Implementation notes:

- Checkpoint creation checks for duplicate name and nearby duplicate coordinates.
- Status history records are created when status changes.
- If an active linked incident exists, direct status update may be blocked.
- Service-level moderation workflow methods exist, but controller endpoints for approval/rejection were not found.
- Deletion is implemented as hard deletion.

## Reports Module

Location:

```text
Backend/src/modules/reports
```

Main files:

- `reports.module.ts`
- `controllers/reports.controller.ts`
- `controllers/report-interactions.controller.ts`
- `controllers/report-moderation.controller.ts`
- `services/reports.service.ts`
- `services/report-validation.service.ts`
- `services/report-credibility.service.ts`
- `services/report-moderation.service.ts`
- report, vote, confirmation, and moderation audit entities

Responsibilities:

- Citizen report submission.
- Own report management.
- Community report listing.
- Admin report listing and updates.
- Voting.
- Confirmation.
- Moderation transitions.
- Duplicate detection.
- Submission rate limiting.

Report categories:

```text
checkpoint_issue
road_closure
delay
accident
hazard
other
```

Report statuses:

```text
pending
under_review
approved
rejected
resolved
```

Implementation notes:

- The service limits report creation to 3 reports per 5 minutes per user.
- Duplicate reports are stored with a `duplicateOf` reference instead of being rejected.
- Confidence score is based on up/down votes.
- Report moderation records are stored in `report_moderation_audit`.
- Moderation does not currently create or promote an incident record.
- Own-report voting/confirmation restriction appears incomplete in backend enforcement.

## Alerts Module

Location:

```text
Backend/src/modules/alerts
```

Main files:

- `alerts.controller.ts`
- `alerts.service.ts`
- `services/alert-preferences.service.ts`
- `services/alert-notification.service.ts`
- `services/alert-records.service.ts`
- `services/alert-matches.service.ts`
- `listeners/incident-created.observer.ts`
- `entities/alert-preference.entity.ts`
- `entities/alert-message.entity.ts`
- `entities/alert-record.entity.ts`

Responsibilities:

- Manage alert preferences.
- Build subscription overviews.
- Count unread alerts.
- Store alert messages and records.
- Match users to incident events.
- Store user alert inbox entries.

Implementation notes:

- Preferences are based on geographic area text and incident category.
- Matching is exact/normalized text matching, not a geospatial radius implementation.
- Alert records are generated from verified or resolved incidents.

## Map Module

Location:

```text
Backend/src/modules/map
```

Main files:

- `map.controller.ts`
- `map.module.ts`
- DTOs for filters and map response

Responsibilities:

- Expose public map incidents.
- Expose public map checkpoints.
- Expose public map reports.

Endpoints:

```text
GET /api/v1/map/incidents
GET /api/v1/map/checkpoints
GET /api/v1/map/reports
```

Implementation notes:

- The map controller delegates to incident, checkpoint, and report services.
- Filtering supports types, severity, and date range behavior.

## Route Module

Location:

```text
Backend/src/modules/route
```

Main files:

- `route.controller.ts`
- `route.service.ts`
- `providers/openroute-routing.provider.ts`
- `providers/locationiq-routing.provider.ts`
- `strategies/checkpoint-avoidance.strategy.ts`
- `strategies/incident-avoidance.strategy.ts`
- `services/route-metadata.service.ts`
- `services/route-recommendation.service.ts`
- route utility and interface files

Responsibilities:

- Estimate default route.
- Estimate avoided route.
- Use OpenRouteService and LocationIQ.
- Build avoidance zones.
- Evaluate route compliance.
- Return route recommendation metadata.

Implementation notes:

- The endpoint is public according to the global auth middleware.
- The `Route` entity exists, but route estimates are not persisted by the current route service.
- The checkpoint avoidance strategy uses checkpoint data from the checkpoint service.

## Weather Module

Location:

```text
Backend/src/modules/weather
```

Main files:

- `weather.controller.ts`
- `weather.service.ts`
- DTOs for query and response

Responsibilities:

- Return current weather by coordinates.
- Use WeatherAPI.com when configured.
- Fall back to Open-Meteo.

Implementation notes:

- No weather caching was found.
- If both providers fail, the service returns an unavailable error.

## Audit Log Module

Location:

```text
Backend/src/modules/audit-log
```

Main files:

- `audit-log.controller.ts`
- `audit-log.service.ts`
- `entities/audit-log.entity.ts`
- audit action and target type enums

Responsibilities:

- Record audit actions.
- List audit records for admins.
- Provide actor filter data.

Audit target types:

```text
CHECKPOINT
INCIDENT
REPORT
```

Audit actions:

```text
CREATED
UPDATED
DELETED
APPROVED
REJECTED
```

## System Settings Module

Location:

```text
Backend/src/modules/system-settings
```

Main files:

- `system-settings.controller.ts`
- `system-settings.service.ts`
- `entities/system-settings.entity.ts`
- `enums/primary-language.enum.ts`

Responsibilities:

- Store singleton platform settings.
- Return current platform settings.
- Update platform name and primary language.

Implementation notes:

- The service lazily creates the settings row if missing.
- The update DTO requires both platform name and primary language.

