# Reports and Moderation

The reports system lets citizens submit road-condition reports and lets admins moderate those reports.

## Backend Location

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
- `entities/report.entity.ts`
- `entities/vote.entity.ts`
- `entities/report-confirmation.entity.ts`
- `entities/report-moderation-audit.entity.ts`

## Frontend Location

Citizen:

```text
Frontend/features/citizen/my-reports
Frontend/Services/reports.service.js
```

Admin:

```text
Frontend/features/admin/moderation-queue
Frontend/Services/moderation-queue.service.js
```

## Report Categories

```text
checkpoint_issue
road_closure
delay
accident
hazard
other
```

## Report Statuses

```text
pending
under_review
approved
rejected
resolved
```

Public/community report statuses include pending, under review, and approved.

## Citizen Report Flow

```text
Citizen submits report
  |
  v
ReportsController
  |
  v
ReportsService.create
  |
  | rate-limit check
  | spam check
  | duplicate detection
  v
Report row
```

The create service checks:

- Maximum 3 reports per 5 minutes per user.
- Similar report by same user/category/location in a recent time window.
- Duplicate reports of the same category within nearby distance and recent time.

Duplicate behavior:

- Duplicates are not rejected outright.
- The new report can be stored with `duplicateOf` pointing to another report.

## Own Report Management

Citizen endpoints:

```text
GET    /api/v1/reports/my
PATCH  /api/v1/reports/my/:id
DELETE /api/v1/reports/my/:id
```

Behavior:

- Users can view their own reports.
- Users can update or remove their own reports only while status rules allow it.
- Reports that are approved or resolved are protected from own-update/delete behavior.

## Community Reports

Endpoint:

```text
GET /api/v1/reports/community
```

Behavior:

- Shows reports from other users.
- Filters to public community statuses.
- Supports filtering and pagination through query DTO/service logic.

## Voting

Endpoint:

```text
POST /api/v1/reports/:id/vote
```

Vote types:

```text
UP
DOWN
```

Behavior:

- One vote per user/report is enforced by the `report_vote` unique constraint.
- Confidence score is recalculated based on up/down votes.

Important caveat:

- The service exposes interaction metadata such as whether a user can vote, but backend enforcement against voting on one's own report appears incomplete.

## Confirmation

Endpoint:

```text
POST /api/v1/reports/:id/confirm
```

Behavior:

- Creates one confirmation per user/report.
- Uses a unique constraint on report/user.
- Recalculates or affects report credibility behavior through the credibility service.

Important caveat:

- Backend enforcement against confirming one's own report appears incomplete.

## Admin Moderation

Moderation endpoints:

```text
PATCH /api/v1/reports/:id/review
PATCH /api/v1/reports/:id/approve
PATCH /api/v1/reports/:id/reject
PATCH /api/v1/reports/:id/resolve
```

Moderation actions:

```text
UNDER_REVIEW
APPROVED
REJECTED
RESOLVED
```

Moderation behavior:

- Validates allowed status transitions.
- Updates report status.
- Writes report moderation audit rows.
- Records global audit log entries for some moderation actions.

Observed limitation:

- Moderation does not create or promote a report into an incident record.

## Admin Report Listing

Admin endpoints:

```text
GET   /api/v1/reports
GET   /api/v1/reports/category-summary
PATCH /api/v1/reports/:id
```

`GET /reports` supports filters such as:

- submitted user
- excluded submitted user
- category
- location
- status
- search
- confidence
- duplicates
- radius from coordinates
- sort
- pagination

## Audit Relationships

Report moderation writes:

- `report_moderation_audit` rows.
- global `audit_log` rows for approved/rejected behavior where implemented.

## Frontend Behavior

Citizen report UI:

- Report submission modal/page.
- Own reports.
- Community reports.
- Voting and confirmation actions.
- Citizen preview local data behavior.

Admin moderation UI:

- Moderation queue.
- Review/approve/reject/resolve actions.
- Queue state and UI renderer scripts.

## Known Limitations

- Approved reports do not automatically create incidents.
- Own-report voting/confirmation should be enforced in backend service logic.
- Duplicate handling stores duplicates rather than rejecting them.
- Report confidence appears vote-based and does not update a user-level credibility score.
- Some expected workflows in product docs may not match current code behavior.

