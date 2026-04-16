# Wasel Palestine Platform: System Overview and Implementation Logic

## 1. System overview and engineering rationale

Wasel Palestine is implemented as a two-tier web system that optimizes movement planning and situational awareness in a constrained transportation context. The architecture deliberately separates:

- A client-facing application layer (Frontend) for map visualization, dashboards, reporting workflows, and role-specific interactions.
- A domain-centric service layer (NestJS Backend) that centralizes validation, authorization, workflow orchestration, and integration with third-party providers.

This split is intentional for three reasons:

1. **Security centralization**: critical access controls, moderation transitions, and policy checks are enforced server-side.
2. **Operational resilience**: external API fallback logic remains in the backend so clients are not coupled to provider failures.
3. **Evolution velocity**: domain modules (incidents, reports, alerts, routing, checkpoints) can evolve independently of UI structure.

The backend uses modular NestJS boundaries and TypeORM entities as the canonical domain model. The frontend follows a lightweight Controller + Service pattern in vanilla JavaScript, reducing framework overhead while preserving separation of concerns.

## 2. Runtime architecture and request lifecycle

A typical request lifecycle is:

1. Frontend service calls API through a shared API client configured by runtime base URL.
2. Backend global middleware verifies JWT requirements on non-public routes.
3. Guards enforce authentication and roles where required (e.g., admin-only operations).
4. Validation pipeline transforms and validates DTO input.
5. Domain service executes business logic and persistence operations via TypeORM repositories.
6. Cross-domain notifications are emitted through an event bus where applicable.
7. Controller returns structured response payloads for frontend consumption.

This lifecycle prioritizes deterministic policy enforcement before domain mutation.

## 3. Implementation logic by functional domain

### 3.1 Identity and access control

Authentication combines credential-based sign-in with social providers. JWT tokens are issued by backend services and consumed by frontend API calls via bearer headers. Authorization is layered:

- Role labels (admin, citizen) attached to users.
- Route-level role guards for administrative endpoints.
- Middleware-level token enforcement for protected routes.

Rationale: role/guard checks remain explicit at endpoint boundaries while middleware ensures broad baseline coverage.

### 3.2 Checkpoint and incident coupling

Incidents and checkpoints are semantically linked. Incident creation/update logic includes:

- Duplicate prevention by title and geographic proximity constraints.
- Status lifecycle (active, resolved) with verification and closure metadata.
- Optional checkpoint impact state propagation.

Checkpoint services enforce state coherence, including status history trails and constraints that prevent inconsistent transitions when active incidents are linked.

Rationale: this model preserves operational correctness by preventing contradictory checkpoint states.

### 3.3 Reports, moderation, and confidence scoring

Citizen reports pass through moderation-aware workflows:

- Submission validation with rate limits and spam/duplicate heuristics.
- Moderation actions recorded in dedicated audit tables.
- Community interactions (votes and confirmations) update confidence signals.

The implementation balances openness (citizen-generated reports) with trust safeguards (moderation states + confidence scoring).

### 3.4 Event-driven alerts

Alerts are not hard-coded to synchronous request responses. Instead, incident lifecycle events trigger alert notification workflows:

- Incident transition emits domain events.
- Alert observers react to events and create notification records.
- User alert preferences constrain delivery scope.

Rationale: event-driven decomposition decouples incident mutation from notification fan-out and improves maintainability.

### 3.5 Route planning and policy-aware optimization

Route planning is not a simple shortest-path call. The routing service:

- Requests baseline routes from external providers.
- Builds avoidance constraints from incidents/checkpoints.
- Computes compliance scores and recommendation metadata.
- Falls back between providers to preserve availability.

Rationale: route quality is defined by safety/compliance, not only distance/time.

### 3.6 Weather enrichment

Weather data is integrated through a provider chain:

- Primary provider for richer weather context.
- Secondary provider fallback when primary fails.

Rationale: weather is a situational feature; degraded service is preferable to hard failure.

## 4. Frontend implementation logic

The frontend is organized around modular responsibilities:

- **Services**: API interaction and payload adaptation.
- **Controllers**: page/workflow orchestration, form handling, and state transitions.
- **Feature views**: role-focused screens (admin, citizen, public).
- **Core utilities**: auth/session utilities, routing helpers, config, and map abstractions.

This architecture keeps domain logic in backend services while preserving testable interaction boundaries in the UI.

## 5. Data consistency and transaction strategy

Consistency mechanisms are implemented through a mix of:

- Database constraints (unique indexes, foreign keys where modeled).
- Service-layer validation and transition checks.
- Explicit transactional boundaries in moderation and workflow-heavy updates.
- Status history tables for checkpoint and incident lifecycle traceability.

Rationale: not all business constraints are naturally expressible as SQL constraints, so service-level invariants complement schema-level guarantees.

## 6. Major design trade-offs

1. **Hybrid endpoint naming**: both REST-style and compatibility-style endpoint names exist; this supports legacy frontend paths but reduces uniformity.
2. **Partially explicit relational mapping**: some user-related identifiers are stored as scalar IDs without strict FK relations; this increases flexibility but weakens database-enforced integrity.
3. **Open CORS posture in development-style configuration**: accelerates integration but should be tightened for production deployment.

## 7. Summary

The implementation is a pragmatic, modular, policy-driven architecture designed for reliability under uncertain external conditions. The strongest architectural motifs are:

- domain modularity,
- policy-first backend control,
- event-driven side-effect handling,
- and resilience through provider fallback strategies.
