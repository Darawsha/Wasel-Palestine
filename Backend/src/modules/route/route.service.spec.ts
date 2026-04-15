import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RouteService } from './route.service';
import { OpenRouteRoutingProvider } from './providers/openroute-routing.provider';
import { LocationIqRoutingProvider } from './providers/locationiq-routing.provider';
import { CheckpointAvoidanceStrategy } from './strategies/checkpoint-avoidance.strategy';
import { IncidentAvoidanceStrategy } from './strategies/incident-avoidance.strategy';
import { RouteMetadataService } from './services/route-metadata.service';
import { RouteRecommendationService } from './services/route-recommendation.service';
import { RouteConstraintType } from './enums/route-constraint-type.enum';
import { RouteEstimationMethod } from './enums/route-estimation-method.enum';
import { RouteRecommendationReason } from './enums/route-recommendation-reason.enum';
import { RouteEstimationResult } from './interfaces/route-estimation-result.interface';
import { buildCircularAvoidanceZone } from './utils/route-zone.util';

describe('RouteService', () => {
  let service: RouteService;
  let openRouteRoutingProvider: { getRoute: jest.Mock };
  let locationIqRoutingProvider: { getRoute: jest.Mock };
  let checkpointAvoidanceStrategy: { build: jest.Mock };
  let incidentAvoidanceStrategy: { build: jest.Mock };

  const defaultRouteCoordinates = [
    [35, 32],
    [35.01, 32.01],
  ];
  const avoidedRouteCoordinates = [
    [35.03, 32.03],
    [35.04, 32.04],
  ];

  function createRouteResult(coordinates: number[][]) {
    return createRouteResultWithMetrics(coordinates, {
      method: RouteEstimationMethod.LOCATIONIQ_ROUTING,
    });
  }

  function createRouteResultWithMetrics(
    coordinates: number[][],
    overrides: {
      method?: RouteEstimationMethod;
      estimatedDistanceKm?: number;
      estimatedDurationMinutes?: number;
      alternativeRoutes?: Array<{
        coordinates: number[][];
        estimatedDistanceKm?: number;
        estimatedDurationMinutes?: number;
      }>;
    } = {},
  ) {
    const result = createRouteResultWithMethod(
      coordinates,
      overrides.method ?? RouteEstimationMethod.LOCATIONIQ_ROUTING,
      overrides.estimatedDistanceKm,
      overrides.estimatedDurationMinutes,
    );

    result.alternativeRoutes = (overrides.alternativeRoutes ?? []).map(
      (alternative) =>
        createRouteResultWithMethod(
          alternative.coordinates,
          overrides.method ?? RouteEstimationMethod.LOCATIONIQ_ROUTING,
          alternative.estimatedDistanceKm,
          alternative.estimatedDurationMinutes,
        ),
    );

    return result;
  }

  function createRouteResultWithMethod(
    coordinates: number[][],
    method: RouteEstimationMethod,
    estimatedDistanceKm = 10.3,
    estimatedDurationMinutes = 25,
  ): RouteEstimationResult {
    return {
      estimatedDistanceKm,
      estimatedDurationMinutes,
      geometry: {
        type: 'LineString',
        coordinates,
      },
      method,
      appliedConstraints: [],
      factors: [],
      warnings: [],
    };
  }

  function createEmptyAvoidanceResult(
    constraint: RouteConstraintType,
  ) {
    return {
      constraint,
      groups: [],
      factors: [],
    };
  }

  function createIncidentAvoidanceResult() {
    return {
      constraint: RouteConstraintType.AVOID_INCIDENTS,
      groups: [
        {
          constraint: RouteConstraintType.AVOID_INCIDENTS,
          sourceKey: 'incident:1',
          sourceLabel: 'Incident 1',
          zones: [buildCircularAvoidanceZone(32, 35, 800)],
          escalationPaddingMeters: 160,
        },
      ],
      factors: [],
    };
  }

  function createCheckpointAvoidanceResult() {
    return {
      constraint: RouteConstraintType.AVOID_CHECKPOINTS,
      groups: [
        {
          constraint: RouteConstraintType.AVOID_CHECKPOINTS,
          sourceKey: 'checkpoint:1',
          sourceLabel: 'Checkpoint 1',
          zones: [buildCircularAvoidanceZone(32, 35, 800)],
          escalationPaddingMeters: 160,
        },
      ],
      factors: [],
    };
  }

  beforeEach(async () => {
    openRouteRoutingProvider = {
      getRoute: jest.fn(),
    };
    locationIqRoutingProvider = {
      getRoute: jest.fn(),
    };
    checkpointAvoidanceStrategy = {
      build: jest.fn(async (context: { avoidCheckpoints?: boolean }) =>
        context.avoidCheckpoints
          ? createCheckpointAvoidanceResult()
          : createEmptyAvoidanceResult(RouteConstraintType.AVOID_CHECKPOINTS),
      ),
    };
    incidentAvoidanceStrategy = {
      build: jest.fn(async (context: { avoidIncidents?: boolean }) =>
        context.avoidIncidents
          ? createIncidentAvoidanceResult()
          : createEmptyAvoidanceResult(RouteConstraintType.AVOID_INCIDENTS),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        {
          provide: OpenRouteRoutingProvider,
          useValue: openRouteRoutingProvider,
        },
        {
          provide: LocationIqRoutingProvider,
          useValue: locationIqRoutingProvider,
        },
        {
          provide: CheckpointAvoidanceStrategy,
          useValue: checkpointAvoidanceStrategy,
        },
        {
          provide: IncidentAvoidanceStrategy,
          useValue: incidentAvoidanceStrategy,
        },
        RouteMetadataService,
        RouteRecommendationService,
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the normal route when incident avoidance is not requested', async () => {
    openRouteRoutingProvider.getRoute.mockResolvedValue(
      createRouteResult(defaultRouteCoordinates),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: false,
    });

    expect(result.primaryRoute.kind).toBe('DEFAULT');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      defaultRouteCoordinates,
    );
  });

  it('returns a no-fully-compliant state when incident avoidance is requested but no incident-free route exists', async () => {
    openRouteRoutingProvider.getRoute.mockResolvedValue(
      createRouteResult(defaultRouteCoordinates),
    );

      const result = await service.estimateRoute({
        startLatitude: 32,
        startLongitude: 35,
        endLatitude: 32.02,
        endLongitude: 35.02,
        avoidCheckpoints: false,
        avoidIncidents: true,
      });
  
      expect((result.avoidedRoute as any)?.metadata.compliance.isFullyCompliant).toBe(false);
      expect(result.recommendation.requiresUserApproval).toBe(false);
      expect(result.recommendation.autoApplied).toBe(false);
      expect(result.recommendation.reason).toBe(
        RouteRecommendationReason.NO_FULLY_COMPLIANT_ROUTE,
      );
    });
  
    it('returns a no-fully-compliant state when checkpoint avoidance is requested but no checkpoint-free route exists', async () => {
      openRouteRoutingProvider.getRoute.mockResolvedValue(
        createRouteResult(defaultRouteCoordinates),
      );
  
      const result = await service.estimateRoute({
        startLatitude: 32,
        startLongitude: 35,
        endLatitude: 32.02,
        endLongitude: 35.02,
        avoidCheckpoints: true,
        avoidIncidents: false,
      }) as any;

    expect(result.primaryRoute.kind).toBe('DEFAULT');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      defaultRouteCoordinates,
    );
    expect((result.avoidedRoute as any)?.metadata.compliance.isFullyCompliant).toBe(false);
    expect(result.recommendation.requiresUserApproval).toBe(false);
    expect(result.recommendation.autoApplied).toBe(false);
    expect(result.recommendation.reason).toBe(
      RouteRecommendationReason.NO_FULLY_COMPLIANT_ROUTE,
    );
  });

  it('returns a no-fully-compliant state when checkpoint avoidance is requested but no checkpoint-free route exists', async () => {
    openRouteRoutingProvider.getRoute.mockResolvedValue(
      createRouteResult(defaultRouteCoordinates),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: true,
      avoidIncidents: false,
    });

    expect(result.primaryRoute.kind).toBe('DEFAULT');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      defaultRouteCoordinates,
    );
    expect((result.avoidedRoute as any)?.metadata.compliance.isFullyCompliant).toBe(false);
    expect(result.recommendation.requiresUserApproval).toBe(false);
    expect(result.recommendation.autoApplied).toBe(false);
    expect(result.recommendation.reason).toBe(
      RouteRecommendationReason.NO_FULLY_COMPLIANT_ROUTE,
    );
  });

  it('returns an avoided route when a fully incident-free route exists', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(defaultRouteCoordinates))
      .mockResolvedValueOnce(createRouteResult(avoidedRouteCoordinates));

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      avoidedRouteCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
  });

  it('only applies incident avoidance when the user selects restricted-area avoidance', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(defaultRouteCoordinates))
      .mockResolvedValueOnce(createRouteResult(avoidedRouteCoordinates));

    await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(checkpointAvoidanceStrategy.build).toHaveBeenCalledWith(
      expect.objectContaining({
        avoidCheckpoints: false,
        avoidIncidents: true,
      }),
    );
    expect(incidentAvoidanceStrategy.build).toHaveBeenCalledWith(
      expect.objectContaining({
        avoidCheckpoints: false,
        avoidIncidents: true,
      }),
    );
  });

  it('returns an avoided route when a fully checkpoint-free route exists', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(defaultRouteCoordinates))
      .mockResolvedValueOnce(createRouteResult(avoidedRouteCoordinates));

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: true,
      avoidIncidents: false,
    });

    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      avoidedRouteCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
  });

  it('normalizes provider geometry to GeoJSON [longitude, latitude] order before returning it', async () => {
    const reversedAvoidedRouteCoordinates = [
      [32.03, 35.03],
      [32.04, 35.04],
    ];

    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(defaultRouteCoordinates))
      .mockResolvedValueOnce(createRouteResult(reversedAvoidedRouteCoordinates));

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: true,
      avoidIncidents: false,
    });

    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      avoidedRouteCoordinates,
    );
  });

  it('only applies checkpoint avoidance when the user selects checkpoint avoidance', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(defaultRouteCoordinates))
      .mockResolvedValueOnce(createRouteResult(avoidedRouteCoordinates));

    await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: true,
      avoidIncidents: false,
    });

    expect(checkpointAvoidanceStrategy.build).toHaveBeenCalledWith(
      expect.objectContaining({
        avoidCheckpoints: true,
        avoidIncidents: false,
      }),
    );
    expect(incidentAvoidanceStrategy.build).toHaveBeenCalledWith(
      expect.objectContaining({
        avoidCheckpoints: true,
        avoidIncidents: false,
      }),
    );
  });

  it('chooses a compliant provider-returned alternative before starting detour retries', async () => {
    const blockedAvoidedCoordinates = [
      [35, 32],
      [35.004, 32.004],
    ];
    const compliantAlternativeCoordinates = [
      [35.03, 32.03],
      [35.05, 32.05],
    ];

    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(defaultRouteCoordinates))
      .mockResolvedValueOnce(
        createRouteResultWithMetrics(blockedAvoidedCoordinates, {
          method: RouteEstimationMethod.OPENROUTE_ROUTING,
          alternativeRoutes: [
            {
              coordinates: compliantAlternativeCoordinates,
              estimatedDistanceKm: 12.2,
              estimatedDurationMinutes: 30,
            },
          ],
        }),
      );
    locationIqRoutingProvider.getRoute.mockRejectedValueOnce(
      new Error('Skip fallback comparison'),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      compliantAlternativeCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
    expect(openRouteRoutingProvider.getRoute).toHaveBeenCalledTimes(2);
  });

  it('keeps the default route when it already satisfies the selected avoidance rule', async () => {
    const alreadyCompliantCoordinates = [
      [36, 33],
      [36.02, 33.02],
    ];

    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(createRouteResult(alreadyCompliantCoordinates))
      .mockResolvedValueOnce(createRouteResult(avoidedRouteCoordinates));

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(result.primaryRoute.kind).toBe('DEFAULT');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      alreadyCompliantCoordinates,
    );
    expect(result.recommendation.requiresUserApproval).toBe(false);
  });

  it('keeps expanding incident avoidance before failing and returns a later compliant route', async () => {
    const intersectingRouteCoordinates = [
      [35, 32],
      [35.004, 32.004],
    ];
    const compliantRouteCoordinates = [
      [35.03, 32.03],
      [35.05, 32.05],
    ];

    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          defaultRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          intersectingRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          intersectingRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          intersectingRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          compliantRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(openRouteRoutingProvider.getRoute).toHaveBeenCalledTimes(5);
    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      compliantRouteCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
  });

  it('asks the fallback provider for more alternatives when incident avoidance is enabled', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          defaultRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockRejectedValueOnce(new Error('ORS unavailable for avoided route'));
    locationIqRoutingProvider.getRoute.mockResolvedValue(
      createRouteResult(avoidedRouteCoordinates),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(locationIqRoutingProvider.getRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        alternativeRouteCount: 8,
        requestedConstraints: [RouteConstraintType.AVOID_INCIDENTS],
      }),
    );
    expect(result.primaryRoute.kind).toBe('AVOIDED');
  });

  it('continues refining the avoided route even when the first avoided candidate comes from the fallback provider', async () => {
    const intersectingRouteCoordinates = [
      [35, 32],
      [35.004, 32.004],
    ];

    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          defaultRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockRejectedValueOnce(new Error('ORS temporarily unavailable'))
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          avoidedRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      );
    locationIqRoutingProvider.getRoute.mockResolvedValueOnce(
      createRouteResult(intersectingRouteCoordinates),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(locationIqRoutingProvider.getRoute).toHaveBeenCalled();
    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      avoidedRouteCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
  });

  it('keeps the OpenRouteService route when LocationIQ rate-limits the comparison request', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          defaultRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMethod(
          avoidedRouteCoordinates,
          RouteEstimationMethod.OPENROUTE_ROUTING,
        ),
      );
    locationIqRoutingProvider.getRoute.mockRejectedValue(
      new HttpException(
        'Route calculation is temporarily busy. Please try again in a moment.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(locationIqRoutingProvider.getRoute).toHaveBeenCalledTimes(1);
    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      avoidedRouteCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
  });

  it('prefers the fastest compliant alternative even when it is longer in distance', async () => {
    const openRouteAlternativeCoordinates = [
      [35.03, 32.03],
      [35.05, 32.05],
    ];
    const fasterFallbackCoordinates = [
      [35.06, 32.06],
      [35.08, 32.08],
    ];

    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(
        createRouteResultWithMetrics(defaultRouteCoordinates, {
          method: RouteEstimationMethod.OPENROUTE_ROUTING,
          estimatedDistanceKm: 10.3,
          estimatedDurationMinutes: 25,
        }),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMetrics(openRouteAlternativeCoordinates, {
          method: RouteEstimationMethod.OPENROUTE_ROUTING,
          estimatedDistanceKm: 9.5,
          estimatedDurationMinutes: 42,
        }),
      );
    locationIqRoutingProvider.getRoute.mockResolvedValueOnce(
      createRouteResultWithMetrics(fasterFallbackCoordinates, {
        method: RouteEstimationMethod.LOCATIONIQ_ROUTING,
        estimatedDistanceKm: 12.4,
        estimatedDurationMinutes: 31,
      }),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(result.primaryRoute.geometry.coordinates).toEqual(
      fasterFallbackCoordinates,
    );
    expect(result.primaryRoute.estimatedDurationMinutes).toBe(31);
  });

  it('uses a controlled detour attempt when provider candidates remain blocked', async () => {
    const detourRouteCoordinates = [
      [35.08, 32.08],
      [35.1, 32.1],
    ];

    openRouteRoutingProvider.getRoute.mockImplementation(
      async (request: {
        requestedConstraints?: RouteConstraintType[];
        viaPoints?: Array<{ latitude: number; longitude: number }>;
      }) => {
        if (!request.requestedConstraints?.length) {
          return createRouteResultWithMetrics(defaultRouteCoordinates, {
            method: RouteEstimationMethod.OPENROUTE_ROUTING,
            estimatedDistanceKm: 10.3,
            estimatedDurationMinutes: 25,
          });
        }

        if (Array.isArray(request.viaPoints) && request.viaPoints.length > 0) {
          return createRouteResultWithMetrics(detourRouteCoordinates, {
            method: RouteEstimationMethod.OPENROUTE_ROUTING,
            estimatedDistanceKm: 13.6,
            estimatedDurationMinutes: 34,
          });
        }

        return createRouteResultWithMetrics(defaultRouteCoordinates, {
          method: RouteEstimationMethod.OPENROUTE_ROUTING,
          estimatedDistanceKm: 10.3,
          estimatedDurationMinutes: 25,
        });
      },
    );
    locationIqRoutingProvider.getRoute.mockRejectedValue(
      new Error('Skip fallback comparison'),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(openRouteRoutingProvider.getRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        viaPoints: expect.arrayContaining([
          expect.objectContaining({
            latitude: expect.any(Number),
            longitude: expect.any(Number),
          }),
        ]),
      }),
    );
    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      detourRouteCoordinates,
    );
    expect(result.primaryRoute.metadata.compliance.isFullyCompliant).toBe(true);
  });

  it('auto-applies a compliant avoided route even when it adds significant travel time', async () => {
    openRouteRoutingProvider.getRoute
      .mockResolvedValueOnce(
        createRouteResultWithMetrics(defaultRouteCoordinates, {
          method: RouteEstimationMethod.OPENROUTE_ROUTING,
          estimatedDistanceKm: 10.3,
          estimatedDurationMinutes: 25,
        }),
      )
      .mockResolvedValueOnce(
        createRouteResultWithMetrics(avoidedRouteCoordinates, {
          method: RouteEstimationMethod.OPENROUTE_ROUTING,
          estimatedDistanceKm: 18.9,
          estimatedDurationMinutes: 92,
        }),
      );
    locationIqRoutingProvider.getRoute.mockRejectedValueOnce(
      new Error('Skip comparison'),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: false,
      avoidIncidents: true,
    });

    expect(result.primaryRoute.kind).toBe('AVOIDED');
    expect(result.primaryRoute.geometry.coordinates).toEqual(
      avoidedRouteCoordinates,
    );
    expect(result.suggestedRoute).toBeNull();
    expect(result.recommendation.requiresUserApproval).toBe(false);
    expect(result.recommendation.autoApplied).toBe(true);
  });

  it('returns a no-fully-compliant state without auto-applying a fallback when both preferences are enabled and no route satisfies both', async () => {
    openRouteRoutingProvider.getRoute.mockResolvedValue(
      createRouteResult(defaultRouteCoordinates),
    );

    const result = await service.estimateRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: true,
      avoidIncidents: true,
    });

    expect(result.primaryRoute.geometry.coordinates).toEqual(
      defaultRouteCoordinates,
    );
    expect(result.primaryRoute.kind).toBe('DEFAULT');
    expect(result.recommendation.requiresUserApproval).toBe(false);
    expect(result.recommendation.autoApplied).toBe(false);
    expect(result.recommendation.reason).toBe(
      RouteRecommendationReason.NO_FULLY_COMPLIANT_ROUTE,
    );
  });
});
