# Route Planner

The route planner estimates a route between two coordinate points and can attempt to avoid checkpoints and incidents.

## Backend Location

```text
Backend/src/modules/route
```

Main files:

- `route.controller.ts`
- `route.service.ts`
- `dto/estimate-route.dto.ts`
- `dto/route-estimate-response.dto.ts`
- `providers/openroute-routing.provider.ts`
- `providers/locationiq-routing.provider.ts`
- `strategies/checkpoint-avoidance.strategy.ts`
- `strategies/incident-avoidance.strategy.ts`
- `services/route-metadata.service.ts`
- `services/route-recommendation.service.ts`
- route utility files under `utils`
- route interfaces under `interfaces`

## Frontend Location

```text
Frontend/features/citizen/route-planner
Frontend/Services/route-planner.service.js
```

Frontend files include:

- `RoutePlannerPage.html`
- `RoutePlannerPage.js`
- `RoutePlannerPage.lifecycle.js`
- `RoutePlannerPage.css`

## API Endpoint

```text
POST /api/v1/routes/estimate
```

This route is listed as public in the custom global auth middleware.

## Request Data

The route estimate DTO accepts:

- `startLatitude`
- `startLongitude`
- `endLatitude`
- `endLongitude`
- `avoidCheckpoints`
- `avoidIncidents`

The avoidance flags are optional booleans.

## Provider Strategy

The route service uses provider fallback:

1. OpenRouteService.
2. LocationIQ.

OpenRoute provider file:

```text
Backend/src/modules/route/providers/openroute-routing.provider.ts
```

LocationIQ provider file:

```text
Backend/src/modules/route/providers/locationiq-routing.provider.ts
```

## External Configuration

OpenRouteService keys may be read from several environment variable names:

```text
OPENROUTE_API_KEY
OPENROUTESERVICE_API_KEY
OPEN_ROUTE_API_KEY
OpenRoute_API_KEY
OpenRouteService_API_KEY
```

LocationIQ keys:

```text
LOCATIONIQ_API_KEY
LOCATIONAL_API_KEY
```

## Route Estimation Flow

```text
Client submits coordinates and avoidance flags
  |
  v
RouteController
  |
  v
RouteService
  |
  | request default route
  v
Routing provider
  |
  | load avoidance context if requested
  v
Checkpoint and incident strategies
  |
  | create avoidance zones
  v
Provider avoided route request
  |
  v
Recommendation/compliance response
```

## Avoidance Strategies

### Checkpoint Avoidance

File:

```text
Backend/src/modules/route/strategies/checkpoint-avoidance.strategy.ts
```

The strategy loads checkpoint data and creates avoidance factors/zones. The current implementation uses checkpoint service data and profiles behavior by checkpoint status.

Important note:

- The strategy uses checkpoint service filtering. Review whether it should include all visible checkpoints or only delayed/closed/restricted checkpoints for the intended product behavior.

### Incident Avoidance

File:

```text
Backend/src/modules/route/strategies/incident-avoidance.strategy.ts
```

The strategy uses active incident data with coordinates and creates avoidance factors/zones.

## Avoidance Zones and Compliance

The route module contains utilities for:

- Haversine distance.
- Geometry calculations.
- Route corridor calculations.
- Avoidance zone generation.
- Route compliance checks.
- Route detour calculations.

The service can compare default and avoided routes and return recommendation metadata.

## Frontend Behavior

The route planner page:

- Initializes a Leaflet-backed route planner map.
- Lets users choose route endpoints.
- Calls `/routes/estimate`.
- Displays default and alternative routes.
- Shows distance and duration summaries.
- Supports selected avoidance preferences.
- Uses route context data from map endpoints.

`Frontend/Services/route-planner.service.js` also contains:

- Request timeout handling.
- Short cache/deduplication behavior.
- Weather and map context calls.

## Persistence

A `Route` entity exists:

```text
Backend/src/modules/route/entities/route.entity.ts
```

However, the inspected route service does not persist route estimates. The route planner currently behaves as a calculation service, not a route history service.

## Known Limitations

- Route estimates are not stored.
- Routing depends on external API keys and provider availability.
- Avoidance route quality depends on provider support for avoid polygons and alternatives.
- Checkpoint avoidance inclusion rules should be reviewed against expected product behavior.
- No dedicated route history or saved-route API was found.

