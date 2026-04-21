# Architecture

## System Shape

Wasel Palestine is organized as one NestJS backend application and one static frontend application.

The backend:

- Starts from `Backend/src/main.ts`.
- Loads `AppModule` from `Backend/src/app.module.ts`.
- Exposes REST APIs under `/api/v1`.
- Serves Swagger at `/api/docs`.
- Serves the static frontend from `Frontend`.
- Connects to MySQL with TypeORM.
- Uses feature modules under `Backend/src/modules`.

The frontend:

- Lives under `Frontend`.
- Uses static HTML/CSS/JavaScript.
- Uses hash-based routing.
- Calls backend APIs through shared service modules.
- Stores session and runtime settings in localStorage.

## Backend Bootstrap

The backend configures:

- Global prefix: `/api`
- URI versioning with default version `1`
- Global validation pipe
- Global serializer interceptor
- Global exception filter
- Swagger/OpenAPI document generation
- CORS with open origin
- Static frontend serving

Important verified files:

- `Backend/src/main.ts`
- `Backend/src/app.module.ts`
- `Backend/src/core/database/typeorm.config.ts`
- `Backend/src/core/filters/global-exception.filter.ts`
- `Backend/src/core/middleware/authMiddleware.ts`

## Main Request Flow

Typical authenticated API flow:

```text
Browser page
  |
  | Frontend service adds Authorization: Bearer <token>
  v
/api/v1/<resource>
  |
  | Custom AuthMiddleware
  v
Controller
  |
  | JwtAuthGuard / RolesGuard where configured
  v
Service
  |
  | TypeORM repository
  v
MySQL
```

Typical public map/weather/route flow:

```text
Browser page
  |
  v
Public endpoint allowed by middleware
  |
  v
Controller
  |
  v
Service
  |
  v
Database and/or external provider
```

## Public, Citizen, and Admin Separation

### Public Area

Public frontend files include the signin/signup page and social auth callback pages.

Public backend paths include:

- `/auth/signin`
- `/auth/signup`
- `/auth/google`
- `/auth/linkedin`
- `/auth/linkedin/callback`
- `/map/incidents`
- `/map/checkpoints`
- `/map/reports`
- `/routes/estimate`
- `/weather/current`

These public paths are configured in the custom global auth middleware.

### Citizen Area

The citizen shell is:

```text
Frontend/views/citizen/header/header.html
```

Citizen route configuration is:

```text
Frontend/core/routing/citizen/routing.config.js
```

Citizen routes include:

- `home`
- `incidents`
- `route-planner`
- `my-reports`
- `alerts`
- `404`

Citizens interact with protected APIs through the stored JWT token.

### Admin Area

The admin shell is:

```text
Frontend/views/admin/header/header.html
```

Admin route configuration is:

```text
Frontend/core/routing/admin/routing.config.js
```

Admin routes include:

- `admin-dashboard`
- `admin-incidents`
- `admin-performance`
- `admin-audit`
- `admin-checkpoints`
- `admin-moderation`
- `admin-users`
- `admin-settings`
- `admin-apimonitor`

Admin APIs are protected by JWT guards and role guards.

## Frontend to Backend Interaction

The frontend API base is defined in:

```text
Frontend/core/config/constants.js
```

Default API base:

```text
window.location.origin + "/api/v1"
```

API calls are centralized through:

```text
Frontend/Services/api-client.js
```

Some legacy and feature-specific services also call Axios or Fetch directly.

## Database Architecture

The backend uses TypeORM. The TypeORM configuration:

- Uses MySQL.
- Reads database settings from environment variables.
- Uses `autoLoadEntities: true`.
- Defaults synchronization to enabled unless `DB_SYNCHRONIZE=false`.

No migration files were found in the current repository.

## Event-Based Behavior

The app imports `EventEmitterModule.forRoot()`. Incident-related events are used by the alerts system.

Verified event-style flow:

```text
Incident verified or resolved
  |
  v
Incident alert observer/listener
  |
  v
Alert notification service
  |
  v
AlertMessage + AlertRecord rows
```

## Important Architectural Notes

- The project is not split into separate backend and frontend package manifests. The root `package.json` drives the Nest application.
- The frontend is static and is served by the backend rather than built through a frontend bundler.
- API versioning is enabled, so documented endpoints should include `/api/v1`.
- The backend has both a custom auth middleware and Nest guards. This overlap should be tested carefully.
- The route planner uses external providers and fallback logic but does not currently persist route estimates.
- The reports moderation module stores moderation state but does not currently promote approved reports into incidents.

