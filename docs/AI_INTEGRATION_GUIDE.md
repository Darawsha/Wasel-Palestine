# Frontend to Backend Integration Guide

## AI Execution Rules

When modifying this project, follow these rules strictly:

1. Do not change the project architecture.
2. Do not move files unless absolutely necessary.
3. Always follow the existing service → controller → UI pattern.
4. Reuse existing services before creating new ones.
5. Never hardcode values in the frontend.
6. Always read the backend module before implementing frontend logic.
7. If unsure, copy the pattern already used in the Admin Dashboard.

## Architecture Contract

The architecture of this project must remain unchanged.

The layers are:

Backend
- Controller
- Service
- Entity
- DTO

Frontend
- Service (API communication)
- Controller (bridge layer)
- Feature UI files (DOM updates)

This separation must always be respected.

## Purpose

This document explains how to connect the frontend to the backend in this project without breaking the existing structure.

The goal is to replace hardcoded UI values with real API data while preserving:

- the current architecture
- Separation of Concerns
- consistent naming and file organization
- the patterns already used in the Admin Dashboard

This project already has a working integration pattern. Follow it. Do not invent a new structure for each feature.

## Project Structure

### Backend modules

The current backend modules under `Backend/src/modules` are:

- `auth`
- `users`
- `incidents`
- `checkpoints`

Each backend feature follows the NestJS pattern:

- `controller`: defines the HTTP endpoint
- `service`: contains the business logic
- `entity`: defines the database structure
- `dto`: validates request input

### Frontend structure

The current frontend folders relevant to integration are:

- `Frontend/Services`
- `Frontend/Controllers`
- `Frontend/features/admin/dashboard`

For the Admin Dashboard, the project currently uses:

- shared service file: `Frontend/Services/admin_dashboard.service.js`
- shared controller file: `Frontend/Controllers/admin_dashboard.controller.js`
- one small UI file per dashboard responsibility inside `Frontend/features/admin/dashboard`
- one import entry file: `Frontend/features/admin/dashboard/Dashboard.js`

### Existing dashboard pattern

The dashboard does not put all logic in one large file. It separates responsibilities:

- `userCount.js`: renders the citizens count
- `userRegistrationTrend.js`: renders the citizens percentage trend
- `incidentsCount.js`: renders the active incidents count
- `incidentsToday.js`: renders the incidents "today" value
- `checkpointsCount.js`: renders the checkpoints count
- `Dashboard.js`: imports the dashboard feature files so they run when the page loads

This is the pattern to follow for new dashboard integrations.

## Core Integration Rule

Before changing anything:

1. Read the backend module.
2. Read the existing frontend service/controller flow.
3. Read the dashboard HTML and identify the exact UI element to update.
4. Follow the same pattern already used by users, incidents, and checkpoints.

Do not:

- hardcode numbers
- fetch directly inside random files when a shared service already exists
- create a new frontend service/controller file for every dashboard card
- target cards using fragile selectors such as `nth-child`

Do:

- reuse `Frontend/Services/admin_dashboard.service.js`
- reuse `Frontend/Controllers/admin_dashboard.controller.js`
- create a focused dashboard UI file only for DOM rendering
- use stable selectors such as `data-stat-number` or `data-stat-card`

## Required Flow

When connecting a frontend feature to the backend, follow this exact sequence.

### 1. Understand the data source

Check the backend entity and service first.

Examples:

- users count and registration trend come from `users`
- active incidents and incidents created today come from `incidents`
- active checkpoints come from `checkpoints`

Do not guess the data model. Read the entity and service to confirm:

- column names
- filter conditions
- status values
- date fields such as `createdAt`

### 2. Add or confirm the backend endpoint

If the endpoint does not exist:

- add the endpoint in the correct backend controller
- implement the logic in the correct backend service

Rules:

- business logic belongs in the service
- controller should stay thin
- count endpoints should return an object such as `{ count: 10 }`
- trend/statistics endpoints can return structured objects with explicit fields

Example response shapes used in this project:

```json
{ "count": 10 }
```

```json
{
  "percentageChange": 12,
  "currentPeriodCount": 8,
  "previousPeriodCount": 7,
  "periodDays": 7
}
```

### 3. Put static backend routes before `:id`

In NestJS controllers, static routes must be declared before parameter routes such as `@Get(':id')`.

Correct:

- `@Get('counts')`
- `@Get('active-count')`
- `@Get('today-count')`
- `@Get(':id')`

Why this matters:

- if `:id` is above a static route, a request like `/incidents/counts` may be treated as `id = "counts"`
- this causes wrong behavior or errors
- the frontend may then fall back to `0`

This already mattered in:

- `incidents.controller.ts`
- `checkpoints.controller.ts`

### 4. Add the frontend service function

Add the API call to:

- `Frontend/Services/admin_dashboard.service.js`

Rules:

- use `apiGet` from `Frontend/Services/api-client.js`
- do not hardcode the full URL
- do not use raw `fetch` in dashboard files
- return safe fallback values when the request fails

Examples:

```js
export async function getCitizensCount() {
  try {
    const response = await apiGet('users/counts');
    return response.count || 0;
  } catch (err) {
    console.error('Failed to fetch citizens count', err);
    return 0;
  }
}
```

```js
export async function getCitizensRegistrationTrend(days = 7) {
  try {
    return await apiGet('users/registration-trend', {
      params: { days },
    });
  } catch (err) {
    console.error('Failed to fetch citizens registration trend', err);
    return {
      percentageChange: 0,
      currentPeriodCount: 0,
      previousPeriodCount: 0,
      periodDays: days,
    };
  }
}
```

### 5. Add the frontend controller function

Add the matching function to:

- `Frontend/Controllers/admin_dashboard.controller.js`

This file acts as the bridge between the UI file and the shared service file.

Rules:

- keep it thin
- call the shared service
- return the result
- do not put DOM logic here

### 6. Add or update the dashboard UI file

In `Frontend/features/admin/dashboard`, each file should own one responsibility only.

Examples:

- count value
- trend value
- today value

Rules:

- do not mix unrelated card concerns in one file
- each file should only hydrate one visual field or one card concern
- if one card needs two values, separate them if the project already does that

Current examples:

- citizens card:
  - `userCount.js`
  - `userRegistrationTrend.js`
- incidents card:
  - `incidentsCount.js`
  - `incidentsToday.js`

### 7. Import the UI file in `Dashboard.js`

After creating a dashboard feature file, import it in:

- `Frontend/features/admin/dashboard/Dashboard.js`

If it is not imported there, the logic will not run.

## DOM Binding Rules

The dashboard content is mounted dynamically. Because of that:

- do not assume the HTML already exists when the script file loads
- use the same observer-based mounting pattern already used in the project

Preferred selectors:

- `data-stat-number="citizens"`
- `data-stat-number="incidents"`
- `data-stat-number="checkpoints"`
- `data-stat-card="citizens"`

Avoid:

- `.stat-card:nth-child(1)`
- selectors that depend on card order

The correct approach is to bind to stable data attributes in `Dashboard.html`.

## Authentication Rule

Most dashboard endpoints are protected.

The frontend should go through:

- `Frontend/Services/api-client.js`

That file automatically:

- reads the token from `localStorage`
- sends `Authorization: Bearer <token>`
- uses the configured API base URL

Do not duplicate token logic in dashboard files.

If Postman or the frontend gets:

```json
{
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

the problem is authentication, not the dashboard rendering.

## Real Endpoints Already Used in This Project

### Users

- `GET /api/v1/users/counts`
- `GET /api/v1/users/registration-trend`

### Incidents

- `GET /api/v1/incidents/counts`
- `GET /api/v1/incidents/active-count`
- `GET /api/v1/incidents/today-count`
- `GET /api/v1/incidents/:id/history`

### Checkpoints

- `GET /api/v1/checkpoints/counts`
- `GET /api/v1/checkpoints/active-count`
- `GET /api/v1/checkpoints/:id/history`

## Existing Statistics Logic

Use the same ideas when adding new dashboard values.

### Citizens count

- backend service counts only users with role `CITIZEN`
- backend controller returns `{ count }`
- frontend service reads `response.count`
- `userCount.js` renders the number

### Citizens registration trend

- backend service uses the users `createdAt` field
- current implementation compares the last 7 days against the 7 days before that
- formula:

```text
Percentage Change = ((New - Old) / Old) * 100
```

- if old is `0` and new is greater than `0`, the service returns `100`
- `userRegistrationTrend.js` renders only the trend text and class

### Active incidents count

- backend service counts incidents with status `ACTIVE`
- `incidentsCount.js` renders only the big number

### Incidents created today

- backend service counts incidents where `createdAt` is between the start of today and the start of tomorrow
- `incidentsToday.js` renders only the `+N today` text

### Active checkpoints count

- backend service counts checkpoints where `currentStatus` is `ACTIVE`
- `checkpointsCount.js` renders only the number

## Separation of Concerns in This Project

This project already shows the intended separation:

- backend service = query and calculation logic
- backend controller = HTTP contract
- frontend service = API call
- frontend controller = UI-facing bridge
- dashboard feature file = DOM update
- `Dashboard.js` = imports and activates the dashboard feature files

Follow this separation exactly.

## Rules for New Dashboard Features

When adding a new dashboard statistic:

1. Check whether the backend already has the endpoint.
2. If not, add it to the correct backend module.
3. Keep the response shape explicit and stable.
4. Add the shared frontend service function.
5. Add the shared frontend controller function.
6. Create a small dashboard UI file for the specific visual responsibility.
7. Import that file in `Dashboard.js`.
8. Bind using stable `data-*` selectors.
9. Return safe fallback values on API failure.
10. Do not break existing cards while adding new ones.

## Rules for Admin Pages Beyond the Dashboard

When you move to other Admin pages, keep the same mindset:

- start from the existing page structure
- inspect the related backend module first
- reuse shared frontend service/controller files when the project already has them
- keep UI files focused on rendering and event handling
- make tables consume real backend pagination, sorting, and filtering where the backend already supports them

Do not convert the project into a new architecture while integrating one page.

## Common Mistakes to Avoid

- returning a raw number from the backend when the frontend expects `{ count }`
- placing `@Get(':id')` before static routes such as `counts` or `active-count`
- creating dashboard-specific frontend service/controller files when the project already uses shared `admin_dashboard` files
- updating the wrong card because of `nth-child`
- mixing count logic and trend logic in one file when the project already separates them
- bypassing `api-client.js`
- forgetting to import the new dashboard file in `Dashboard.js`

## Working Principle for AI

When an AI works on this project, it should think like this:

1. Read the existing implementation first.
2. Extend the current pattern instead of inventing a new one.
3. Keep backend logic in services.
4. Keep frontend API calls in shared services.
5. Keep dashboard DOM logic in small focused files.
6. Preserve compatibility with existing pages and cards.
7. Prefer safe, minimal changes that match the repository's current style.

## Short Summary

For Admin Dashboard integration in this project, the correct path is:

1. backend module controller
2. backend module service
3. `Frontend/Services/admin_dashboard.service.js`
4. `Frontend/Controllers/admin_dashboard.controller.js`
5. dedicated file inside `Frontend/features/admin/dashboard`
6. import from `Frontend/features/admin/dashboard/Dashboard.js`

That is the project pattern. Follow it consistently.
