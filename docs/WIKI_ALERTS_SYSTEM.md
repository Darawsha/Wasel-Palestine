# Alerts System

The alerts system lets citizens subscribe to incident categories for geographic areas and receive generated alert records when matching incidents are verified or resolved.

## Backend Location

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
- `services/alerts-validation.service.ts`
- `listeners/incident-created.observer.ts`
- `providers/database-notification.provider.ts`
- `entities/alert-preference.entity.ts`
- `entities/alert-message.entity.ts`
- `entities/alert-record.entity.ts`

## Frontend Location

```text
Frontend/features/citizen/alerts
Frontend/Services/alerts.service.js
```

Citizen alerts UI files include:

- `AlertsPage.html`
- `Alerts.js`
- `AddSubscription.html`
- `AddSubscription.js`
- `DeleteSubscription.html`

## Main Concepts

### Alert Preference

An alert preference stores a citizen subscription.

Important fields:

- `user_id`
- `geographic_area`
- `incident_category`
- `is_active`

The service normalizes area/category values and checks for duplicate active subscriptions.

### Alert Message

An alert message is generated when an alert-worthy event occurs.

Important fields:

- `incident_id`
- `message_body`
- `title`
- `summary`
- `senderName`
- `createdAt`

### Alert Record

An alert record connects an alert message to a specific user.

Important fields:

- `user_id`
- `status`
- `createdAt`
- message relation

Status defaults to `PENDING`.

## API Endpoints

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

All alert endpoints are protected by JWT auth.

## Preference Creation Flow

```text
Citizen submits area/category
  |
  v
AlertsController
  |
  v
AlertPreferencesService
  |
  | normalize and validate
  | check duplicate active subscription
  v
AlertPreference row
```

Batch creation is also supported. The single preference path can return an existing duplicate preference, while the batch path is stricter about duplicate input.

## Incident Notification Flow

Verified or resolved incidents are connected to alerts through event-based services.

```text
Incident verified or resolved
  |
  v
Incident alert observer/listener
  |
  v
AlertNotificationService
  |
  | match active preferences by area/category
  v
AlertMessage row
  |
  v
AlertRecord rows for matching users
```

The notification service creates one message and one alert record per matching subscriber.

## Matching Behavior

Matching is based on:

- Normalized geographic area text.
- Normalized incident category.
- Incident verification and status.

The code does not implement precise geospatial radius matching for alert preferences. Area matching is text-based.

## Alert Overview

The `preferences/overview` endpoint builds an overview of subscriptions and matching current items. The matching service can reference:

- Verified active incidents.
- Checkpoints in relevant statuses.
- Approved/public reports.

## Unread Count and Viewed State

Unread count behavior uses user alert viewed state, including `lastAlertsViewedAt` on the user entity.

Endpoint:

```text
GET /api/v1/alerts/unread-count
```

Mark viewed endpoint:

```text
PATCH /api/v1/alerts/viewed
```

## Inbox

Inbox endpoint:

```text
GET /api/v1/alerts/inbox
```

Mark read endpoint:

```text
PATCH /api/v1/alerts/inbox/:id/read
```

Implementation note:

- The alert record service contains fallback behavior that can mark the latest record or create a fallback acknowledgement if the requested record is not found. This should be reviewed because it may hide invalid record IDs.

## Frontend Behavior

The citizen alerts page uses:

```text
Frontend/Services/alerts.service.js
```

The service supports:

- Creating preferences.
- Creating batch preferences.
- Listing preferences.
- Getting overview.
- Getting unread count.
- Marking viewed.
- Deleting preferences.
- Reading inbox records.
- Marking inbox records read.

Citizen preview mode includes local behavior for some alert interactions.

## Known Limitations

- Matching is text/category-based, not geospatial.
- There is no real push notification provider visible in the code; notifications are stored in the database.
- Dashboard code references `/subscriptions`, but backend alert endpoints are under `/alerts/preferences`.
- Fallback behavior in `markAsRead` should be reviewed.

