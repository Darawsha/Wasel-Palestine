# Known Issues and Limitations

This page lists issues, limitations, inconsistencies, and incomplete areas observed in the current repository. These are based on code inspection and should be verified during testing.

## Documentation

### Root README Is Still the NestJS Starter

The current root `README.md` is the default NestJS starter README. It does not describe Wasel Palestine, the frontend, modules, entities, or setup requirements.

Resolution direction:

- Replace it later with `docs/README_FULL.md` after review.

## Database and Persistence

### No Migrations Found

No migration files were found in the inspected repository.

The app appears to rely on TypeORM synchronization, which defaults to enabled unless `DB_SYNCHRONIZE=false`.

Risk:

- Automatic schema synchronization is risky for production data.

### Hard Deletes for Incidents and Checkpoints

Incident and checkpoint delete behavior appears to remove records rather than soft-delete or moderation-delete them.

Risk:

- Operational history can be harder to preserve unless audit logs are complete.

### Route Entity Not Used for Persistence

A `Route` entity exists, but the route service does not currently persist route estimate results.

Needs verification:

- Whether route history/saved routes are intended.

## Backend Workflow Gaps

### Incident and Checkpoint Approval Methods Not Exposed

Service-level approval/rejection workflow methods exist for incidents/checkpoints, but matching controller routes were not found.

Risk:

- Moderation fields may be partially implemented or unused.

### Report Moderation Does Not Create Incidents

Report moderation changes report status and writes moderation audit records, but it does not create or promote approved reports into incident records.

Needs verification:

- Whether approved reports are expected to become incidents.

### Own-Report Voting and Confirmation Enforcement

The reports code exposes interaction metadata such as whether a user can interact, but backend enforcement against voting on or confirming one's own report appears incomplete.

Risk:

- Users may be able to influence their own reports.

## Frontend and Backend Endpoint Mismatches

### Dashboard Subscription Endpoint Mismatch

Some frontend dashboard code references:

```text
/subscriptions
```

The backend exposes alert subscription functionality under:

```text
/alerts/preferences
```

Risk:

- Dashboard subscription counts may fail unless a compatibility endpoint exists elsewhere or frontend code is updated.

## Configuration and Security Concerns

### Frontend Attempts to Fetch `.env`

`Frontend/Services/system-settings.service.js` attempts to fetch:

```text
/.env
```

Risk:

- If a deployed static server exposes frontend environment files, secrets or configuration values may leak.

### Hardcoded Weather Fallback Key

The frontend system settings service contains a hardcoded weather fallback key.

Risk:

- API key exposure and accidental misuse.

### Runtime API Base URL Override

The frontend can override `window.AppConfig.API_BASE_URL` from persisted localStorage settings.

Risk:

- Stale localStorage values can point users to the wrong API.
- Environment behavior can become hard to debug.

## Auth and Session Concerns

### Duplicate Auth Layers

The app uses both:

- custom global `AuthMiddleware`
- Nest `JwtAuthGuard` and `RolesGuard`

Risk:

- Public/static route behavior and guard behavior can diverge.

### Legacy Token Storage

Current session flow stores `token`, but a legacy helper uses `jwtToken`.

Risk:

- Older code paths may read/write the wrong token key.

### Signup Does Not Auto-Login in Frontend

The backend returns an auth response for signup. The frontend signup flow appears to show success and ask the user to sign in manually.

This may be intentional, but it should be documented or aligned.

## Alerts Limitations

### Text-Based Matching

Alert preferences match by normalized area/category text. No precise geospatial radius matching was found.

Risk:

- Alerts may miss nearby events or match only exact text areas.

### Mark-As-Read Fallback

The alert record service includes fallback behavior when a requested inbox record is not found.

Risk:

- Invalid IDs may not fail clearly.

## Route Planner Limitations

### External Provider Dependency

Routes depend on OpenRouteService and LocationIQ.

Risk:

- Missing keys, network issues, or rate limits can prevent route calculation.

### No Saved Routes API Found

Citizen preview code references personal route concepts, but no saved-route backend API was found during inspection.

Needs verification:

- Whether saved routes are planned but not implemented.

## Weather Limitations

### No Weather Cache Found

The weather service falls back between providers but does not appear to cache weather results.

Risk:

- More external calls than necessary.
- Rate-limit sensitivity.

## Localization Limitations

### Manual Translation Layer

Localization is handled through manual frontend dictionaries and DOM mutation observers.

Risk:

- Translation drift.
- Missing strings.
- Hard-to-test dynamic content.

### No RTL Layout for Citizen Arabic

Citizen localization comments indicate pages remain LTR while only text changes.

Needs verification:

- Whether this meets Arabic UX requirements.

## Testing and Verification Gaps

The repository contains unit specs for some services/controllers and performance test materials, but the following areas should be verified before release:

- Public route access.
- Static frontend access without token.
- Admin-only endpoint enforcement.
- Citizen report interaction restrictions.
- Incident-checkpoint synchronization.
- Alert generation for verified/resolved incidents.
- Route provider fallback.
- Weather provider fallback.
- Dashboard endpoint compatibility.

