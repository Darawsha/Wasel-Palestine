# Project Overview

## What Wasel Palestine Is

Wasel Palestine is a full-stack web platform for road awareness, civic reporting, route assistance, and administrative traffic operations. It combines citizen-submitted information with administrator-managed operational data such as incidents and checkpoints.

The project is implemented as a NestJS backend with a static HTML/CSS/JavaScript frontend. The backend serves API endpoints under `/api/v1` and also serves the frontend files from the `Frontend` directory.

## Core Purpose

The platform helps users understand current road conditions and supports administrative workflows for maintaining reliable road-related information.

The main problem areas addressed by the codebase are:

- Checkpoint visibility and status tracking.
- Incident tracking for closures, delays, accidents, and hazards.
- Community report submission and moderation.
- Alert subscription and notification records.
- Route estimation with optional checkpoint and incident avoidance.
- Admin dashboard and operational management.

## Target Users

### Citizens

Citizens use the public/citizen-facing side of the platform. They can:

- Sign up and sign in.
- Browse map data.
- View incidents and checkpoints.
- Submit reports.
- View community reports.
- Vote on or confirm reports.
- Subscribe to alert preferences.
- Plan routes.
- Manage profile and language preference.

### Administrators

Administrators use the admin dashboard. They can:

- Manage users.
- Manage incidents.
- Manage checkpoints.
- Moderate reports.
- View audit logs.
- View analytics and performance pages.
- Manage system settings.
- Preview selected citizen views.

## Major Capabilities

### Traffic and Incident Awareness

The incidents module stores road events with type, severity, status, verification state, optional checkpoint linkage, and history. Verified active incidents can trigger alert records and can synchronize checkpoint status.

### Checkpoint Management

Checkpoints store a name, coordinates, location text, description, current status, moderation-related fields, and status history. Admin users can create and update checkpoints, including status changes.

### Community Reports

Citizens can submit reports for road closures, delays, accidents, hazards, checkpoint issues, and other issues. The backend applies rate limiting, spam checks, and duplicate detection. Reports can be moderated by admins and interacted with by citizens through votes and confirmations.

### Alerts

Citizens can create preferences for a geographic area and incident category. When verified or resolved incident events occur, alert messages and per-user alert records can be created for matching subscribers.

### Route Planner

The route planner estimates a route between start and destination coordinates. It can request routes from OpenRouteService and fall back to LocationIQ. It can also attempt to avoid checkpoints and incidents using generated avoidance zones.

### Admin Dashboard

The admin dashboard consumes backend counts and summaries for users, incidents, checkpoints, reports, and trends. The frontend also contains performance reports, API monitor, audit log, moderation queue, and system settings views.

## Current Project State

The implementation is functional in structure and has many real modules, controllers, services, entities, and frontend screens. It is not just a starter project.

However, several areas need cleanup or verification:

- The root `README.md` is still the default NestJS starter README.
- No migration files were found.
- Some backend service methods are not exposed through controllers.
- Some frontend API calls do not match backend endpoints.
- A few frontend configuration patterns should be reviewed before production.

