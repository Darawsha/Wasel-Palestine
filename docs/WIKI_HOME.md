# Wasel Palestine Wiki

Welcome to the Wasel Palestine project wiki draft.

Wasel Palestine is a full-stack traffic awareness and civic reporting platform. It provides citizen-facing tools for viewing road information, submitting reports, subscribing to alerts, and planning routes, while also providing an admin dashboard for incidents, checkpoints, report moderation, users, audit logs, and system settings.

This wiki draft is based on the current repository implementation. Items that are incomplete, inconsistent, or unclear in code are documented explicitly.

## Quick Navigation

- [[Project Overview]]
- [[Architecture]]
- [[Backend Modules]]
- [[Frontend Structure]]
- [[Database and Entities]]
- [[Auth and Roles]]
- [[API Overview]]
- [[Alerts System]]
- [[Route Planner]]
- [[Reports and Moderation]]
- [[Settings and Localization]]
- [[Setup and Run]]
- [[Known Issues]]

## Page Summaries

### [[Project Overview]]

Explains the platform purpose, target users, primary goals, and major capabilities.

### [[Architecture]]

Describes the NestJS backend, static frontend, API request flow, role separation, public routes, and major data flows.

### [[Backend Modules]]

Documents the real backend modules found under `Backend/src/modules`, including controllers, services, entities, and responsibilities.

### [[Frontend Structure]]

Explains the static frontend folder structure, admin shell, citizen shell, public auth area, services, routing, localStorage session behavior, and frontend runtime configuration.

### [[Database and Entities]]

Summarizes TypeORM entities, relations, enums, status fields, persistence behavior, and database caveats.

### [[Auth and Roles]]

Documents signin/signup, JWT behavior, Google login, LinkedIn login, guards, middleware, and admin/citizen permissions.

### [[API Overview]]

Provides a readable grouped endpoint reference for the current REST API.

### [[Alerts System]]

Explains alert preferences, event listeners, incident alert creation, inbox records, unread counts, and matching limitations.

### [[Route Planner]]

Documents route estimation, external providers, avoidance strategies, response behavior, and current persistence limitations.

### [[Reports and Moderation]]

Explains citizen reports, community feed, voting, confirmation, admin moderation, duplicate detection, and known moderation gaps.

### [[Settings and Localization]]

Documents system settings, platform name, primary language, user language preferences, and frontend translation behavior.

### [[Setup and Run]]

Gives installation, environment, database, runtime, Swagger, and testing instructions.

### [[Known Issues]]

Lists real limitations and inconsistencies observed in the current repository.

## Recommended Reading Order

1. [[Project Overview]]
2. [[Architecture]]
3. [[Setup and Run]]
4. [[Auth and Roles]]
5. [[Backend Modules]]
6. [[Frontend Structure]]
7. Feature-specific pages
8. [[Known Issues]]

