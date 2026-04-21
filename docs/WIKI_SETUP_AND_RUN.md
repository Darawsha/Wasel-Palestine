# Setup and Run

This page explains how to install and run the current project based on the root package scripts and configuration files.

## Prerequisites

Install:

- Node.js compatible with the project dependencies.
- npm.
- MySQL.

The repository uses a single root `package.json` for the NestJS application.

## Install Dependencies

From the repository root:

```bash
npm install
```

## Environment Files

The backend loads `.env` from the project/workspace root through `ConfigModule`.

Backend environment variable names found in the root `.env`:

```env
DB_HOST=
DB_PORT=
PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
JWT_SECRET=
JWT_EXPIRES_IN=
LOCATIONIQ_API_KEY=
LOCATIONAL_API_KEY=
OpenRoute_API_KEY=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_CALLBACK_URL=
```

Frontend `.env` variable names found:

```env
WEATHER_API_KEY=
WEATHER_FALLBACK_COORDS=
OpenRoute_API_KEY=
LOCATIONAL_API_KEY=
```

Additional route provider environment names are supported in route provider code:

```env
OPENROUTE_API_KEY=
OPENROUTESERVICE_API_KEY=
OPEN_ROUTE_API_KEY=
OpenRoute_API_KEY=
OpenRouteService_API_KEY=
LOCATIONIQ_API_KEY=
LOCATIONAL_API_KEY=
```

Do not commit real secrets.

## Database Setup

1. Create a MySQL database.
2. Configure the database variables in `.env`.
3. Start the NestJS app.

TypeORM configuration notes:

- `autoLoadEntities` is enabled.
- No migration files were found.
- Synchronization defaults to enabled unless `DB_SYNCHRONIZE=false`.

For production, use migrations instead of relying on automatic synchronization.

## Run in Development

```bash
npm run start:dev
```

Default server port:

```text
3000
```

If `PORT` is set, that value is used.

## Production Build and Start

```bash
npm run build
npm run start:prod
```

Build output goes to:

```text
dist
```

## Useful Local URLs

```text
Application:  http://localhost:3000
API base:     http://localhost:3000/api/v1
Swagger docs: http://localhost:3000/api/docs
```

Adjust the port if `PORT` is configured differently.

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

## Frontend Runtime

The frontend is served by the backend from:

```text
Frontend
```

There is no separate frontend build command in the inspected repository.

The default frontend API base is:

```text
window.location.origin + "/api/v1"
```

This is configured in:

```text
Frontend/core/config/constants.js
```

## Swagger

Swagger is configured in `Backend/src/main.ts`.

Open after starting the server:

```text
http://localhost:3000/api/docs
```

Swagger includes bearer auth configuration and inferred example values.

## Running Tests

Unit tests:

```bash
npm run test
```

E2E tests:

```bash
npm run test:e2e
```

Coverage:

```bash
npm run test:cov
```

Performance test materials also exist under:

```text
tests/performance
```

## Common Setup Issues

### Port Already in Use

The bootstrap code catches `EADDRINUSE` and logs a message. Set another `PORT` or stop the process using the configured port.

### Database Connection Failure

Check:

- MySQL server is running.
- Database exists.
- Credentials are correct.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` are configured.

### External Routes Fail

Check:

- OpenRouteService API key.
- LocationIQ API key.
- Provider rate limits.
- Network access.

### Weather Fails

Check:

- `WEATHER_API_KEY`, if using WeatherAPI.com.
- Open-Meteo fallback availability.
- Valid latitude/longitude query parameters.

### Auth Fails

Check:

- `JWT_SECRET`.
- `JWT_EXPIRES_IN`.
- Stored frontend token key.
- User role.
- Guard and middleware behavior.

