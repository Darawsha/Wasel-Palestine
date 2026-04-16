# External API Integration Architecture

## 1. Integration philosophy

External APIs are integrated behind backend service boundaries whenever they affect core domain behavior (routing, weather, authentication), while frontend integrations are limited to visualization and auxiliary geospatial UX.

This architecture ensures:

- controlled failure handling,
- provider abstraction and fallback,
- and reduced client-side coupling to third-party contracts.

## 2. Backend-side external services

| Service | Domain Use | Auth Model | Integration Pattern | Failure Strategy |
|---|---|---|---|---|
| OpenRouteService | Primary route estimation and path generation | API key in backend config | HTTP client call from route provider service | Fallback to LocationIQ provider |
| LocationIQ Directions API | Secondary route provider | API key in backend config | Alternate provider implementation selected on failure | Returns best-effort route when primary unavailable |
| WeatherAPI.com | Primary weather enrichment for map/location context | API key query parameter | Weather service requests current weather by coordinates | Fallback to Open-Meteo |
| Open-Meteo | Weather fallback provider | No key required (public endpoint model) | Invoked when WeatherAPI call fails | Graceful degradation with reduced payload richness |
| Google OAuth APIs | Social sign-in user identity retrieval | Bearer social token and provider client config | Auth service validates token-derived identity | Rejects authentication if token/userinfo invalid |
| LinkedIn OAuth APIs | Social login and profile acquisition | OAuth authorization + token exchange | Auth service exchanges code and fetches profile details | Explicit error handling for exchange/userinfo failures |

## 3. Frontend-side external services

| Service | Usage Location | Why frontend-side | Risk Profile |
|---|---|---|---|
| OpenStreetMap tile servers | Leaflet base map layers | Render map tiles directly in browser | Availability and rate-limit sensitivity |
| Nominatim geocoding/search | Location validation and geospatial lookup | User interaction needs immediate geocoding feedback | Usage-policy/rate constraints; should be cached where possible |

The frontend does not directly invoke critical routing or weather providers for core decisions; those decisions are backend-mediated.

## 4. Security and key management posture

The architecture keeps provider secrets in backend environment configuration and prevents direct key exposure in browser code for core providers.

Recommended hardening:

1. enforce mandatory env vars at boot (fail fast when absent),
2. rotate keys and segment per environment,
3. add outbound request circuit-breaking and retry budgets,
4. log provider latency and fallback frequency as first-class operational metrics.

## 5. Reliability and fallback analysis

The system currently demonstrates two explicit resilience patterns:

1. **Provider fallback chain** for route and weather services.
2. **Backend encapsulation** so client behavior remains stable despite provider changes.

This design reduces user-visible outage blast radius and is appropriate for mission-critical path estimation features.

## 6. Strategic recommendations

1. Add standardized provider adapters with uniform response contracts.
2. Persist short-lived route/weather cache for hot coordinates.
3. Track provider-level SLOs (success rate, p95 latency, fallback activation rate).
4. Add synthetic health checks for each provider in monitoring pipelines.
