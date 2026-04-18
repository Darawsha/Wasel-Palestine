# Database and Entities

The backend uses TypeORM with MySQL. Entity classes are located inside feature modules under `Backend/src/modules`.

## TypeORM Configuration

The application configures TypeORM through:

```text
Backend/src/core/database/typeorm.config.ts
```

Verified behavior from the app configuration:

- Database type: MySQL.
- Entities are auto-loaded with `autoLoadEntities: true`.
- Environment variables provide connection settings.
- TypeORM synchronization defaults to enabled unless `DB_SYNCHRONIZE=false`.

No migration files were found during repository inspection.

## User Entity

File:

```text
Backend/src/modules/users/entities/user.entity.ts
```

Table:

```text
user
```

Important fields:

- `id`
- `firstname`
- `lastname`
- `email`
- `password_hash`
- `role`
- `phone`
- `address`
- `language`
- `createdAt`
- `updatedAt`
- `votes`
- `googleId`
- `linkedinId`
- `provider`
- `profileImage`
- `profileImageUpdatedAt`
- `isVerified`
- `lastAlertsViewedAt`

Role values:

```text
admin
citizen
```

Language values:

```text
English
Arabic
```

## Checkpoint Entity

File:

```text
Backend/src/modules/checkpoints/entities/checkpoint.entity.ts
```

Table:

```text
checkpoint
```

Important fields:

- `id`
- `name`
- `latitude`
- `longitude`
- `location`
- `description`
- `currentStatus`
- `moderationStatus`
- `pendingChanges`
- `createdByUserId`
- `updatedByUserId`
- `approvedByUserId`
- `approvedAt`
- `rejectedByUserId`
- `rejectedAt`
- `rejectionReason`
- `createdAt`
- `updatedAt`

Checkpoint status values:

```text
OPEN
DELAYED
CLOSED
RESTRICTED
```

Relations:

- One checkpoint has many checkpoint status history rows.
- One checkpoint can have many incident rows.

## Checkpoint Status History Entity

File:

```text
Backend/src/modules/checkpoints/entities/status-history.entity.ts
```

Table:

```text
checkpoint_status_history
```

Important fields:

- `id`
- `checkpointId`
- `oldStatus`
- `newStatus`
- `changedByUserId`
- `changedAt`

Relations:

- Many status history rows belong to one checkpoint.
- Status history can reference the user who changed status.

## Incident Entity

File:

```text
Backend/src/modules/incidents/entities/incident.entity.ts
```

Table:

```text
incidents
```

Important fields:

- `id`
- `isVerified`
- `title`
- `description`
- `latitude`
- `longitude`
- `location`
- `type`
- `severity`
- `status`
- `moderationStatus`
- `pendingChanges`
- `impactStatus`
- `checkpointId`
- `verifiedByUserId`
- `verifiedAt`
- `closedByUserId`
- `closedAt`
- workflow fields for created/updated/approved/rejected behavior
- timestamps

Incident type values:

```text
CLOSURE
DELAY
ACCIDENT
WEATHER_HAZARD
```

Incident severity values:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Incident status values:

```text
ACTIVE
CLOSED
```

Relations:

- An incident may belong to a checkpoint.
- An incident has many incident status history rows.

## Incident Status History Entity

File:

```text
Backend/src/modules/incidents/entities/status-history.entity.ts
```

Table:

```text
incident_status_history
```

Important fields:

- `id`
- `incidentId`
- `oldStatus`
- `newStatus`
- `changedByUserId`
- `changedAt`

Relations:

- Many status history rows belong to one incident.
- Status history can reference the user who changed status.

## Report Entity

File:

```text
Backend/src/modules/reports/entities/report.entity.ts
```

Table:

```text
report
```

The entity uses `@Entity()` without an explicit name, so the table name is generated from the class name by TypeORM naming behavior.

Important fields:

- `reportId`
- `latitude`
- `longitude`
- `location`
- `category`
- `description`
- `status`
- `submittedByUserId`
- `duplicateOf`
- `confidenceScore`
- `createdAt`
- `updatedAt`

Report category values:

```text
checkpoint_issue
road_closure
delay
accident
hazard
other
```

Report status values:

```text
pending
under_review
approved
rejected
resolved
```

Relations:

- A report belongs to the submitting user.
- A report can have many votes.
- A report can have confirmations.
- A report may reference another report as `duplicateOf`.

## Report Vote Entity

File:

```text
Backend/src/modules/reports/entities/vote.entity.ts
```

Table:

```text
report_vote
```

Important fields:

- `id`
- `reportId`
- `userId`
- `type`
- timestamps

Vote type values:

```text
UP
DOWN
```

Constraint:

- The entity defines a unique combination of `userId` and `reportId`.

## Report Confirmation Entity

File:

```text
Backend/src/modules/reports/entities/report-confirmation.entity.ts
```

Table:

```text
report_confirmation
```

Important fields:

- `id`
- `reportId`
- `userId`
- timestamps

Constraint:

- The entity defines a unique combination of `reportId` and `userId`.

## Report Moderation Audit Entity

File:

```text
Backend/src/modules/reports/entities/report-moderation-audit.entity.ts
```

Table:

```text
report_moderation_audit
```

Important fields:

- `id`
- `reportId`
- `performedByUserId`
- `action`
- `notes`
- `createdAt`

Moderation actions:

```text
UNDER_REVIEW
APPROVED
REJECTED
RESOLVED
```

## Alert Preference Entity

File:

```text
Backend/src/modules/alerts/entities/alert-preference.entity.ts
```

Table:

```text
alert_preferences
```

Important fields:

- `id`
- `user_id`
- `geographic_area`
- `incident_category`
- `is_active`
- timestamps

Relations:

- Many preferences belong to one user.

## Alert Message Entity

File:

```text
Backend/src/modules/alerts/entities/alert-message.entity.ts
```

Table:

```text
alert_messages
```

Important fields:

- `id`
- `incident_id`
- `message_body`
- `title`
- `summary`
- `senderName`
- `createdAt`

Relations:

- One alert message can have many alert records.

## Alert Record Entity

File:

```text
Backend/src/modules/alerts/entities/alert-record.entity.ts
```

Table:

```text
alert_records
```

Important fields:

- `id`
- `user_id`
- `status`
- `createdAt`
- message relation

Alert record status defaults to `PENDING`.

## Audit Log Entity

File:

```text
Backend/src/modules/audit-log/entities/audit-log.entity.ts
```

Table:

```text
audit_log
```

Important fields:

- `id`
- `action`
- `targetType`
- `targetId`
- `performedByUserId`
- `details`
- `metadata`
- `createdAt`

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

## System Settings Entity

File:

```text
Backend/src/modules/system-settings/entities/system-settings.entity.ts
```

Table:

```text
system_settings
```

Important fields:

- `id`
- `platformName`
- `primaryLanguage`
- `createdAt`
- `updatedAt`

The service treats this as a singleton row and creates it lazily if missing.

## Route Entity

File:

```text
Backend/src/modules/route/entities/route.entity.ts
```

Table:

```text
route
```

Important note:

- The route entity exists, but the inspected route service does not currently persist route estimate results.

## Persistence Caveats

- No migrations were found.
- TypeORM synchronization appears to be used for schema creation/update.
- Hard deletes are used for incidents and checkpoints.
- Some moderation workflow fields exist on incidents/checkpoints, but not all related workflows are exposed through controllers.
- Some tables use explicit names while the report entity relies on TypeORM default naming.

