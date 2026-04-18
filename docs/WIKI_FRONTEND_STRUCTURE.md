# Frontend Structure

The frontend is a static HTML/CSS/JavaScript application under `Frontend`. There is no separate frontend package manifest or build tool in the inspected repository. The NestJS backend serves these files through `ServeStaticModule`.

## Top-Level Frontend Folders

```text
Frontend/
├── Services/
├── core/
├── features/
│   ├── admin/
│   ├── citizen/
│   └── public/
└── views/
    ├── admin/
    └── citizen/
```

## Core Runtime

Location:

```text
Frontend/core
```

Important areas:

- `config/constants.js`
- `auth/authGuard.js`
- `auth/citizen-preview.js`
- `auth/storage/storeJWTtoken.js`
- `routing/admin`
- `routing/citizen`
- `i18n/user-language.js`
- `map`
- `api`
- `helpers`
- `validation`

### Runtime API Base

The default API base is configured in:

```text
Frontend/core/config/constants.js
```

Default value:

```text
window.location.origin + "/api/v1"
```

The value may be overridden by runtime settings stored in localStorage.

### Auth Guard

`Frontend/core/auth/authGuard.js` validates that a user and token exist in localStorage and verifies the profile with the backend. If the session is invalid, the guard redirects to the public auth page.

### Citizen Preview

`Frontend/core/auth/citizen-preview.js` supports a preview mode for admin users viewing selected citizen-facing pages. In preview mode, personal pages such as saved routes or account-specific data may be disabled or replaced with a preview message.

## Services

Location:

```text
Frontend/Services
```

Service files wrap backend API calls and frontend state behavior.

Important services include:

- `api-client.js`
- `session.service.js`
- `auth.service.js`
- `profile.service.js`
- `incidents.service.js`
- `incidentActions.service.js`
- `checkpoint-management.service.js`
- `reports.service.js`
- `alerts.service.js`
- `route-planner.service.js`
- `map.service.js`
- `audit-log.service.js`
- `moderation-queue.service.js`
- `userManagement.service.js`
- `userActions.service.js`
- `admin_dashboard.service.js`
- `performance-reports.service.js`
- `system-settings.service.js`
- `api-monitor.service.js`

### API Client

`api-client.js` uses `window.AppConfig.API_BASE_URL` and adds the bearer token from localStorage unless auth is disabled for the request.

### Session Service

`session.service.js` stores:

- `user`
- `token`
- user language preference

It redirects users by role:

- admin: `/views/admin/header/header.html#admin-dashboard`
- citizen/user: `/views/citizen/header/header.html#home`

## Public Auth Area

Location:

```text
Frontend/features/public/auth
```

Files include:

- `signin_signup.html`
- `signin_signup.css`
- `signInHandler.js`
- `signUpHandler.js`
- `socialAuthService.js`
- `socialAuthHandler.js`
- `linkedin-callback.html`
- `linkedinCallbackHandler.js`

Behavior:

- Email/password signin calls `/api/v1/auth/signin`.
- Signup calls `/api/v1/auth/signup`.
- Google login posts to `/api/v1/auth/google`.
- LinkedIn login redirects to `/api/v1/auth/linkedin`.
- LinkedIn callback exchanges code/state with `/api/v1/auth/linkedin`.

Observed note:

- The backend returns a token on signup, but the frontend signup flow appears to show success and ask the user to sign in instead of storing the returned token.

## Admin Area

Admin shell:

```text
Frontend/views/admin/header/header.html
```

Admin route configuration:

```text
Frontend/core/routing/admin/routing.config.js
```

Configured admin routes:

```text
admin-dashboard      -> /features/admin/dashboard/Dashboard.html
admin-incidents      -> /features/admin/incidents/Incidents.html
admin-performance    -> /features/admin/performance-reports/PerformanceReports.html
admin-audit          -> /features/admin/audit-log/AuditLog.html
admin-checkpoints    -> /features/admin/checkpoint-management/CheckpointManagement.html
admin-moderation     -> /features/admin/moderation-queue/ModerationQueue.html
admin-users          -> /features/admin/user-management/UserManagement.html
admin-settings       -> /features/admin/system-settings/SystemSettings.html
admin-apimonitor     -> /features/admin/api-monitor/APIMonitor.html
```

### Admin Features

#### Dashboard

Location:

```text
Frontend/features/admin/dashboard
```

Consumes dashboard metrics for users, incidents, checkpoints, reports, trends, and category summaries.

Observed mismatch:

- Some dashboard code calls `/subscriptions`, but the backend alert subscription endpoints are under `/alerts/preferences`.

#### Incidents

Location:

```text
Frontend/features/admin/incidents
```

Supports listing, filtering, creation, editing, deletion, and history modal behavior.

#### Checkpoint Management

Location:

```text
Frontend/features/admin/checkpoint-management
```

Supports checkpoint listing, filtering, create/edit/delete flows, and checkpoint history.

#### Moderation Queue

Location:

```text
Frontend/features/admin/moderation-queue
```

Consumes report moderation APIs such as review, approve, reject, and resolve.

#### User Management

Location:

```text
Frontend/features/admin/user-management
```

Supports admin user listing, create/edit/delete flows, validation, and pagination.

#### Audit Log

Location:

```text
Frontend/features/admin/audit-log
```

Consumes `/audit-log` and `/audit-log/actors`.

#### System Settings

Location:

```text
Frontend/features/admin/system-settings
```

Provides UI for platform name, language, API base URL, and external configuration display.

Important concern:

- `Frontend/Services/system-settings.service.js` attempts to fetch `/.env` and contains a hardcoded weather fallback key. This should be reviewed before production.

## Citizen Area

Citizen shell:

```text
Frontend/views/citizen/header/header.html
```

Citizen route configuration:

```text
Frontend/core/routing/citizen/routing.config.js
```

Configured citizen routes:

```text
home           -> /features/citizen/home/HomePage.html
incidents      -> /features/citizen/incidents/IncidentsPage.html
route-planner  -> /features/citizen/route-planner/RoutePlannerPage.html
my-reports     -> /features/citizen/my-reports/MyReportPage.html
alerts         -> /features/citizen/alerts/AlertsPage.html
404            -> /features/citizen/404/404.html
```

### Citizen Features

#### Home

Location:

```text
Frontend/features/citizen/home
```

Uses map widgets and map services to show road information.

#### Incidents

Location:

```text
Frontend/features/citizen/incidents
```

Supports incident listing, filtering, pagination, and incident detail view.

#### Route Planner

Location:

```text
Frontend/features/citizen/route-planner
```

Uses route planner service, map widgets, endpoint markers, alternative route display, and route confirmation UI.

#### My Reports

Location:

```text
Frontend/features/citizen/my-reports
```

Supports report submission, report list state, community feed, voting, confirmation, and local preview behavior.

#### Alerts

Location:

```text
Frontend/features/citizen/alerts
```

Supports adding and deleting alert subscriptions, viewing alert information, and interacting with alert service APIs.

#### Profile

Location:

```text
Frontend/features/citizen/profile
```

Supports user profile editing, avatar upload, language preference, and password changes.

## Localization

The frontend contains manual localization support in:

```text
Frontend/core/i18n/user-language.js
Frontend/views/admin/header/admin-settings-runtime.js
```

Observed behavior:

- User language is read from the user profile or localStorage.
- English and Arabic text mappings are handled manually.
- Citizen pages keep LTR layout even when Arabic text is applied.
- Language changes are text-level translation, not a full locale framework.

## Frontend Caveats

- Static frontend files are served directly by the backend.
- The frontend does not appear to use a bundler.
- Token storage has both current `token` usage and legacy `jwtToken` helper code.
- Some services contain preview/local fallback behavior for citizen preview mode.
- Some API references should be reconciled with backend endpoints before release.

