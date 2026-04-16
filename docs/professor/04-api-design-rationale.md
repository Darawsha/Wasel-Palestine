# API Design Rationale and Engineering Justification

## 1. Design principles

The backend API follows a pragmatic REST-oriented model with explicit versioning and role-aware governance. The design prioritizes:

1. **Predictable resource access** through module-scoped controllers.
2. **Backward compatibility** for existing frontend flows.
3. **Policy-first request handling** (auth/roles/validation before mutation).
4. **Operational observability** through clear status codes and structured error propagation.

## 2. Versioning strategy

API versioning is URI-based using version prefixing, resulting in endpoints under /api/v1. This choice makes version boundaries explicit and avoids ambiguity in clients and gateway routing.

Rationale:

- Easy coexistence of old/new versions during migration.
- Transparent URL-level contract for QA and performance testing.
- Reduced client negotiation complexity versus media-type or header-only versioning.

## 3. Endpoint structure and naming

The project exposes module-aligned endpoint groups:

- /auth
- /users
- /incidents
- /checkpoints
- /reports
- /alerts
- /map
- /routes
- /weather
- admin-focused domains (moderation, user management, system monitoring)

The naming pattern is intentionally hybrid:

- REST-like resource paths for many reads and updates.
- Compatibility-oriented action paths such as /create or /findAll in selected modules.

This hybrid approach is often seen in systems that evolved from feature delivery priorities while preserving frontend contracts.

## 4. Status code semantics

The API consistently uses HTTP semantics to encode processing outcomes:

- **200 OK** for successful retrieval and updates.
- **201 Created** for creation-like operations and route estimation POST flows.
- **204 No Content** for successful delete operations where no payload is needed.
- **400 Bad Request** for validation/business-rule violations (including explicit rate-limit and duplicate conditions in report workflows).
- **401 Unauthorized** for missing/invalid JWT.
- **403 Forbidden** for authenticated users without role permission.
- **404 Not Found** where requested entities are absent.

Rationale: status code fidelity reduces ambiguity for frontend handling and improves automated test assertions.

## 5. Security and policy enforcement architecture

Security is intentionally layered:

1. JWT issuance and verification for identity.
2. Middleware-level token checks on protected route patterns.
3. Route-level guards for role-sensitive operations.
4. DTO validation with whitelist/transform semantics.
5. Global exception filtering for normalized error surfaces.

This layered design minimizes single-point policy failure.

## 6. Input validation and error handling

Validation is centralized with DTOs and global validation pipes. The pipeline:

- strips unknown fields,
- enforces type conversion,
- and fails early on invalid payloads.

Domain services then apply business invariants beyond schema-level validation, such as moderation state transitions and incident/checkpoint consistency rules.

Rationale: structural validity and domain validity are handled in separate, explicit stages.

## 7. API documentation model

Swagger/OpenAPI generation is enabled and enhanced with custom metadata and security scheme declarations. This enables:

- stable API discoverability,
- consumer onboarding,
- and future contract-test automation.

## 8. Strengths and architectural risks

### Strengths

- Clear module decomposition and bounded API surfaces.
- Strong role and JWT enforcement model.
- Business-rule-rich service layer beyond simple CRUD.

### Risks

1. **Naming inconsistency debt** between strict REST and action-style routes.
2. **Partial FK enforcement** where some logical references are scalar-only IDs.
3. **Permissive CORS posture** should be restricted in production.
4. **Fallback secret defaults** should be removed in hardened environments.

## 9. Recommended API evolution roadmap

1. Normalize endpoint naming conventions per module while preserving v1 compatibility.
2. Add OpenAPI schema linting in CI for contract governance.
3. Introduce structured error codes (domain_code) alongside HTTP status.
4. Expand idempotency and retry semantics for moderation/write-heavy operations.
5. Tighten security defaults (CORS origin allowlist, mandatory secret env vars).
