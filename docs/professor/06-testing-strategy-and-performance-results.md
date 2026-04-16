# Testing Strategy and Performance Evaluation

## 1. Current testing posture

The repository has a mature performance-testing foundation (k6 scenarios, reusable clients/helpers, thresholds, and result archives), but limited evidence of broad automated unit/integration coverage for backend modules and frontend controller logic.

This indicates a common maturity profile: strong non-functional testing focus, but incomplete functional regression automation.

## 2. Recommended end-to-end testing strategy

A robust strategy should combine six layers.

### Layer 1: Unit tests (fast feedback)

Scope:

- Backend services with business transitions (incidents, checkpoints, reports moderation, route recommendation scoring).
- Utility and policy functions (duplicate detection, confidence score updates, payload mappers).

Tools:

- Jest + ts-jest for NestJS services.
- Mock repositories/providers with strict behavior assertions.

Target:

- >= 80% branch coverage for core domain services.

### Layer 2: Integration tests (data correctness)

Scope:

- Repository interactions and FK/unique constraint behavior.
- Transactional moderation/audit operations.
- Event-driven alert persistence after incident lifecycle changes.

Tools:

- Jest + Supertest + Testcontainers (ephemeral MySQL).

Target:

- Validate schema invariants and transaction rollback behavior.

### Layer 3: API contract tests

Scope:

- Versioned endpoint contracts, auth expectations, role restrictions, and status-code semantics.

Tools:

- Supertest against bootstrapped app instance.
- OpenAPI contract validation (schema drift detection in CI).

Target:

- Contract stability for all consumed frontend endpoints.

### Layer 4: Frontend interaction tests

Scope:

- Service and controller orchestration flows.
- Auth/session edge cases.
- Reporting and map workflows.

Tools:

- Vitest or Jest + jsdom for service/controller logic.
- Playwright for end-to-end role journeys.

Target:

- Protect high-value user journeys from regressions.

### Layer 5: Performance regression tests

Scope:

- Existing k6 scenarios (read, write, mixed, spike, soak).
- Threshold guardrails and scenario trend comparison over builds.

Tools:

- k6 in CI pipeline with environment-parametrized workloads.

Target:

- Fail builds on threshold regression; track latency trend deltas release-over-release.

### Layer 6: Security verification

Scope:

- JWT middleware bypass checks.
- Role guard policy tests.
- Validation hardening and injection probes.

Tools:

- API security test suites + static analysis + dependency auditing.

Target:

- Continuous verification of access-control guarantees.

## 3. k6 workload design summary

The performance suite is built around scenario-specific workload models:

- **Read-heavy**: ramping VUs with stricter latency thresholds (p95 < 800ms, p99 < 1500ms).
- **Write-heavy**: ramping VUs focused on report create/update/delete path.
- **Mixed**: constant arrival rate combining read and write flows.
- **Spike**: ramping arrival rate to high burst traffic.
- **Soak**: constant VUs over 20 minutes for endurance characteristics.

Global baseline thresholds:

- http_req_failed rate < 0.02
- http_req_duration p95 < 1200ms and p99 < 2500ms
- checks rate > 0.98

## 4. Extracted k6 results (from tests/performance/results)

| Scenario | Workload Profile | Requests | Iterations | Throughput (req/s) | HTTP Fail Rate | Checks Pass | Avg Latency | p95 | p99 | Threshold Outcome |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01-read-heavy | ramping-vus, max 20 VUs, 1m50s | 8,299 | 1,383 | 74.98 | 0.00% | 100.00% | 38.65ms | 181.98ms | 302.29ms | PASS |
| 02-write-heavy | ramping-vus, max 8 VUs, 1m50s | 1,877 | 658 | 16.94 | 0.00% | 100.00% | 10.71ms | 17.47ms | 21.90ms | PASS |
| 03-mixed | constant-arrival-rate, 8 it/s, 2m, max 24 VUs observed | 4,927 | 957 | 40.66 | 0.00% | 100.00% | 67.01ms | 315.10ms | 1.61s | PASS (with 4 dropped iterations) |
| 04-spike | ramping-arrival-rate burst, max 231 VUs configured | 10,945 | 3,648 | 109.34 | 0.00% | 100.00% | 322.25ms | 2.62s | 4.47s | FAIL (p95/p99 latency thresholds) |
| 05-soak | constant-vus, 6 VUs, 20m endurance | 29,790 | 5,371 | 24.80 | 0.02% (6 req) | 99.97% | 61.23ms | 270.70ms | 1.12s | PASS |

## 5. Interpretation of performance behavior

1. **Read and write paths are efficient under normal and moderate load.** Both scenarios comfortably pass latency and error thresholds.
2. **Mixed traffic remains acceptable but shows tail growth.** p99 at 1.61s is still compliant but indicates contention under blended operations.
3. **Spike resilience is the primary bottleneck.** The system preserves correctness (0% request failure) but violates latency objectives at burst peaks.
4. **Soak stability is generally strong.** Long-run behavior remains within thresholds, though a small number of route-estimation checks failed (6/29790).

## 6. Priority optimization roadmap from results

1. Add caching and precomputation for read-hot map/report endpoints.
2. Profile and optimize route-estimation call path under burst load (provider call parallelism, timeout budgets, queue/backpressure).
3. Introduce DB index tuning guided by slow-query telemetry in mixed/spike scenarios.
4. Add adaptive circuit-breaker and fallback policies for external provider latency spikes.
5. Enforce per-endpoint SLO monitoring (p95/p99) and auto-alert when spike thresholds regress.

## 7. Suggested implementation sequence (practical)

1. Establish baseline unit tests for reports, incidents, and routes services.
2. Add integration tests for moderation/audit and status-history persistence.
3. Wire k6 smoke profile into CI for every merge; full suite nightly.
4. Add Playwright critical journey tests for auth/report/map workflows.
5. Track latency/error trends over 4-week windows before and after optimizations.
