import { Injectable } from '@nestjs/common';
import { EstimateRouteDto } from './dto/estimate-route.dto';
import { RouteEstimateResponseDto } from './dto/route-estimate-response.dto';
import { RouteAdjustmentContext } from './interfaces/route-adjustment-context.interface';
import { RouteConstraintAvoidanceResult } from './interfaces/route-constraint-avoidance-result.interface';
import { RouteAvoidanceZone } from './interfaces/route-avoidance-zone.interface';
import { RouteAvoidanceZoneGroup } from './interfaces/route-avoidance-zone-group.interface';
import { ResolvedRouteOption } from './interfaces/resolved-route-option.interface';
import {
  RouteEstimationCandidate,
  RouteEstimationResult,
} from './interfaces/route-estimation-result.interface';
import { RouteFactor } from './interfaces/route-factor.interface';
import {
  RoutingProviderRequest,
  RoutingWaypoint,
} from './interfaces/routing-provider.interface';
import { RouteConstraintType } from './enums/route-constraint-type.enum';
import { RouteOptionKind } from './enums/route-option-kind.enum';
import { RouteEstimationMethod } from './enums/route-estimation-method.enum';
import { OpenRouteRoutingProvider } from './providers/openroute-routing.provider';
import { LocationIqRoutingProvider } from './providers/locationiq-routing.provider';
import { CheckpointAvoidanceStrategy } from './strategies/checkpoint-avoidance.strategy';
import { IncidentAvoidanceStrategy } from './strategies/incident-avoidance.strategy';
import { RouteMetadataService } from './services/route-metadata.service';
import { RouteRecommendationService } from './services/route-recommendation.service';
import {
  buildRouteComplianceSummary,
  collectIntersectedRouteAvoidanceGroups,
  compareRouteComplianceSummaries,
} from './utils/route-compliance.util';
import { distancePointToRouteCorridorMeters } from './utils/route-corridor.util';
import { buildProgressiveDetourWaypoints } from './utils/route-detour.util';
import {
  estimateAvoidanceZoneArea,
  expandAvoidanceZone,
  mergeAvoidanceZones,
  selectPrimaryAvoidanceZone,
} from './utils/route-zone.util';

type ZoneGroupsByConstraint = Partial<
  Record<RouteConstraintType, RouteAvoidanceZoneGroup[]>
>;

@Injectable()
export class RouteService {
  private readonly avoidanceAlternativeRouteCount = 8;
  private readonly maxInitialAvoidanceGroups = 16;
  private readonly maxDetourStages = 4;
  private readonly maxDetourWaypoints = 2;
  private readonly maxDetourBlockingGroups = 3;
  private readonly detourExpansionMultipliers = [0.45, 0.9, 1.45, 2.1];

  constructor(
    private readonly openRouteRoutingProvider: OpenRouteRoutingProvider,
    private readonly locationIqRoutingProvider: LocationIqRoutingProvider,
    private readonly checkpointAvoidanceStrategy: CheckpointAvoidanceStrategy,
    private readonly incidentAvoidanceStrategy: IncidentAvoidanceStrategy,
    private readonly routeMetadataService: RouteMetadataService,
    private readonly routeRecommendationService: RouteRecommendationService,
  ) {}

  async estimateRoute(
    estimateRouteDto: EstimateRouteDto,
  ): Promise<RouteEstimateResponseDto> {
    const context = this.buildContext(estimateRouteDto);
    const requestedConstraints = this.resolveRequestedConstraints(context);
    const defaultRouteResult = await this.resolveRoute({
      startLatitude: context.startLatitude,
      startLongitude: context.startLongitude,
      endLatitude: context.endLatitude,
      endLongitude: context.endLongitude,
    });
    const avoidanceContext: RouteAdjustmentContext = {
      ...context,
      referenceRouteCoordinates: defaultRouteResult.geometry.coordinates,
    };
    const avoidanceResults = await this.buildAvoidanceResults(avoidanceContext);
    const zoneGroupsByConstraint =
      this.buildZoneGroupsByConstraint(avoidanceResults);
    const avoidanceZones = this.collectAvoidanceZones(avoidanceResults);

    const defaultRoute = this.buildResolvedRouteOption(
      RouteOptionKind.DEFAULT,
      defaultRouteResult,
      requestedConstraints,
      zoneGroupsByConstraint,
    );

    const avoidedRoute =
      requestedConstraints.length > 0 && avoidanceZones.length > 0
        ? await this.resolveAvoidedRoute(
            avoidanceContext,
            requestedConstraints,
            zoneGroupsByConstraint,
            avoidanceZones,
            avoidanceResults,
          )
        : null;

    const recommendation = this.routeRecommendationService.recommend({
      requestedConstraints,
      defaultRoute,
      avoidedRoute,
      warnings: this.mergeWarnings(
        defaultRoute.metadata.warnings,
        avoidedRoute?.metadata.warnings ?? [],
      ),
    });

    const primaryRoute =
      recommendation.primaryRouteKind === RouteOptionKind.AVOIDED &&
      avoidedRoute
        ? avoidedRoute
        : defaultRoute;

    const suggestedRoute =
      recommendation.suggestedRouteKind === RouteOptionKind.AVOIDED &&
      avoidedRoute
        ? avoidedRoute
        : null;

    return {
      estimatedDistanceKm: primaryRoute.estimatedDistanceKm,
      estimatedDurationMinutes: primaryRoute.estimatedDurationMinutes,
      geometry: primaryRoute.geometry,
      metadata: primaryRoute.metadata,
      defaultRoute,
      avoidedRoute,
      primaryRoute,
      suggestedRoute,
      recommendation,
    };
  }

  private async buildAvoidanceResults(
    context: RouteAdjustmentContext,
  ): Promise<RouteConstraintAvoidanceResult[]> {
    const [checkpointResult, incidentResult] = await Promise.all([
      this.checkpointAvoidanceStrategy.build(context),
      this.incidentAvoidanceStrategy.build(context),
    ]);

    return [checkpointResult, incidentResult];
  }

  private buildZoneGroupsByConstraint(
    results: RouteConstraintAvoidanceResult[],
  ): ZoneGroupsByConstraint {
    return results.reduce<ZoneGroupsByConstraint>((accumulator, result) => {
      accumulator[result.constraint] = result.groups;
      return accumulator;
    }, {});
  }

  private collectAvoidanceZones(
    results: RouteConstraintAvoidanceResult[],
  ): RouteAvoidanceZone[] {
    return mergeAvoidanceZones(
      results.flatMap((result) =>
        result.groups.flatMap((group) => group.zones),
      ),
    );
  }

  private async resolveAvoidedRoute(
    context: RouteAdjustmentContext,
    requestedConstraints: RouteConstraintType[],
    zoneGroupsByConstraint: ZoneGroupsByConstraint,
    avoidanceZones: RouteAvoidanceZone[],
    avoidanceResults: RouteConstraintAvoidanceResult[],
  ): Promise<ResolvedRouteOption> {
    const baseFactors = avoidanceResults.flatMap((result) => result.factors);
    const request: RoutingProviderRequest = {
      startLatitude: context.startLatitude,
      startLongitude: context.startLongitude,
      endLatitude: context.endLatitude,
      endLongitude: context.endLongitude,
      avoidanceZones: this.buildInitialAvoidanceZones(
        context,
        requestedConstraints,
        zoneGroupsByConstraint,
        avoidanceZones,
      ),
      requestedConstraints,
      alternativeRouteCount: this.resolveAlternativeRouteCount(
        requestedConstraints,
      ),
    };

    let bestRequest = request;
    let bestRoute = await this.resolveBestRouteOption(
      RouteOptionKind.AVOIDED,
      request,
      requestedConstraints,
      zoneGroupsByConstraint,
      baseFactors,
    );

    if (bestRoute.metadata.method === RouteEstimationMethod.OPENROUTE_ROUTING) {
      try {
        const locationIqRoute = await this.resolveBestRouteOption(
          RouteOptionKind.AVOIDED,
          bestRequest,
          requestedConstraints,
          zoneGroupsByConstraint,
          baseFactors,
          this.locationIqRoutingProvider,
        );

        if (this.isPreferredRouteOption(locationIqRoute, bestRoute)) {
          bestRoute = locationIqRoute;
        }
      } catch {
        // Ignore fallback comparison failures and keep the best route already found.
      }
    }

    if (!bestRoute.metadata.compliance.isFullyCompliant) {
      const detourResult = await this.resolveDetourRoute(
        context,
        bestRequest,
        bestRoute,
        requestedConstraints,
        zoneGroupsByConstraint,
        baseFactors,
      );

      bestRequest = detourResult.bestRequest;
      bestRoute = detourResult.bestRoute;
    }

    return bestRoute;
  }

  private buildInitialAvoidanceZones(
    context: RouteAdjustmentContext,
    requestedConstraints: RouteConstraintType[],
    zoneGroupsByConstraint: ZoneGroupsByConstraint,
    avoidanceZones: RouteAvoidanceZone[],
  ): RouteAvoidanceZone[] {
    const compactZones = requestedConstraints
      .flatMap((constraint) => zoneGroupsByConstraint[constraint] ?? [])
      .map((group) => {
        const zone = selectPrimaryAvoidanceZone(group.zones);

        return {
          zone,
          corridorDistanceMeters: distancePointToRouteCorridorMeters(
            Number(group.latitude),
            Number(group.longitude),
            context,
          ),
          zoneArea: estimateAvoidanceZoneArea(
            zone ?? {
              type: 'Polygon',
              coordinates: [],
            },
          ),
          sourceLabel: group.sourceLabel,
        };
      })
      .filter(
        (entry): entry is {
          zone: RouteAvoidanceZone;
          corridorDistanceMeters: number;
          zoneArea: number;
          sourceLabel: string;
        } => entry.zone !== null,
      )
      .sort((left, right) => {
        if (left.corridorDistanceMeters !== right.corridorDistanceMeters) {
          return left.corridorDistanceMeters - right.corridorDistanceMeters;
        }

        if (left.zoneArea !== right.zoneArea) {
          return left.zoneArea - right.zoneArea;
        }

        return left.sourceLabel.localeCompare(right.sourceLabel);
      })
      .slice(0, this.maxInitialAvoidanceGroups)
      .map((entry) => entry.zone);

    if (compactZones.length > 0) {
      return mergeAvoidanceZones(compactZones);
    }

    return mergeAvoidanceZones(avoidanceZones);
  }

  private async resolveRoute(
    request: RoutingProviderRequest,
  ): Promise<RouteEstimationResult> {
    try {
      return await this.openRouteRoutingProvider.getRoute(request);
    } catch {
      return this.locationIqRoutingProvider.getRoute(request);
    }
  }

  private async resolveBestRouteOption(
    kind: RouteOptionKind,
    request: RoutingProviderRequest,
    requestedConstraints: RouteConstraintType[],
    zoneGroupsByConstraint: ZoneGroupsByConstraint,
    baseFactors: RouteFactor[] = [],
    provider?: {
      getRoute(request: RoutingProviderRequest): Promise<RouteEstimationResult>;
    },
  ): Promise<ResolvedRouteOption> {
    const routeResult = provider
      ? await provider.getRoute(request)
      : await this.resolveRoute(request);
    const candidates = this.collectRouteCandidates(routeResult);

    return candidates
      .map((candidate) =>
        this.buildResolvedRouteOption(
          kind,
          candidate,
          requestedConstraints,
          zoneGroupsByConstraint,
          baseFactors,
        ),
      )
      .reduce((bestRoute, candidate) =>
        this.isPreferredRouteOption(candidate, bestRoute)
          ? candidate
          : bestRoute,
      );
  }

  private async resolveDetourRoute(
    context: RouteAdjustmentContext,
    initialRequest: RoutingProviderRequest,
    initialRoute: ResolvedRouteOption,
    requestedConstraints: RouteConstraintType[],
    zoneGroupsByConstraint: ZoneGroupsByConstraint,
    baseFactors: RouteFactor[],
  ): Promise<{
    bestRequest: RoutingProviderRequest;
    bestRoute: ResolvedRouteOption;
  }> {
    let bestRequest = initialRequest;
    let bestRoute = initialRoute;

    for (let stage = 0; stage < this.maxDetourStages; stage += 1) {
      const blockingGroups = collectIntersectedRouteAvoidanceGroups(
        bestRoute.geometry.coordinates,
        requestedConstraints,
        zoneGroupsByConstraint,
      ).slice(0, this.maxDetourBlockingGroups);

      if (blockingGroups.length === 0) {
        break;
      }

      const expandedAvoidanceZones = this.buildDetourAvoidanceZones(
        bestRequest.avoidanceZones ?? [],
        blockingGroups,
        stage,
      );

      if (
        !this.areSameAvoidanceZoneSets(
          expandedAvoidanceZones,
          bestRequest.avoidanceZones ?? [],
        )
      ) {
        try {
          const expandedZoneRequest: RoutingProviderRequest = {
            ...bestRequest,
            avoidanceZones: expandedAvoidanceZones,
          };
          const expandedZoneRoute = await this.resolveBestRouteOption(
            RouteOptionKind.AVOIDED,
            expandedZoneRequest,
            requestedConstraints,
            zoneGroupsByConstraint,
            baseFactors,
          );

          if (this.isPreferredRouteOption(expandedZoneRoute, bestRoute)) {
            bestRequest = expandedZoneRequest;
            bestRoute = expandedZoneRoute;
          }
        } catch {
          // Ignore failed widening-only attempts and continue with waypoint detours.
        }
      }

      for (const blockingGroup of blockingGroups) {
        const detourWaypoints = buildProgressiveDetourWaypoints(
          context,
          blockingGroup.group,
          stage,
        );

        for (const detourWaypoint of detourWaypoints) {
          const viaPoints = this.buildDetourViaPoints(
            bestRequest.viaPoints ?? [],
            detourWaypoint,
          );

          if (this.areSameWaypointSets(viaPoints, bestRequest.viaPoints ?? [])) {
            continue;
          }

          const detourRequest: RoutingProviderRequest = {
            ...bestRequest,
            viaPoints,
            avoidanceZones: expandedAvoidanceZones,
          };

          try {
            const detourRoute = await this.resolveBestRouteOption(
              RouteOptionKind.AVOIDED,
              detourRequest,
              requestedConstraints,
              zoneGroupsByConstraint,
              baseFactors,
            );

            if (this.isPreferredRouteOption(detourRoute, bestRoute)) {
              bestRequest = detourRequest;
              bestRoute = detourRoute;

              if (bestRoute.metadata.compliance.isFullyCompliant) {
                return {
                  bestRequest,
                  bestRoute,
                };
              }
            }
          } catch {
            // Ignore failed detour attempts and continue with the next candidate.
          }
        }
      }
    }

    return {
      bestRequest,
      bestRoute,
    };
  }

  private collectRouteCandidates(
    routeResult: RouteEstimationResult,
  ): RouteEstimationCandidate[] {
    const seen = new Set<string>();
    const candidates = [
      this.asRouteCandidate(routeResult),
      ...(Array.isArray(routeResult.alternativeRoutes)
        ? routeResult.alternativeRoutes
        : []),
    ];

    return candidates.filter((candidate) => {
      const key = this.buildRouteCandidateKey(candidate);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private asRouteCandidate(
    routeResult: RouteEstimationResult,
  ): RouteEstimationCandidate {
    return {
      estimatedDistanceKm: routeResult.estimatedDistanceKm,
      estimatedDurationMinutes: routeResult.estimatedDurationMinutes,
      geometry: routeResult.geometry,
      method: routeResult.method,
      appliedConstraints: routeResult.appliedConstraints,
      factors: routeResult.factors,
      warnings: routeResult.warnings,
    };
  }

  private buildRouteCandidateKey(
    candidate: RouteEstimationCandidate,
  ): string {
    const coordinates = Array.isArray(candidate.geometry?.coordinates)
      ? candidate.geometry.coordinates
      : [];

    return JSON.stringify({
      method: candidate.method,
      duration: candidate.estimatedDurationMinutes,
      distance: candidate.estimatedDistanceKm,
      coordinates: coordinates.map((coordinate) => [
        Number(Number(coordinate?.[0]).toFixed(6)),
        Number(Number(coordinate?.[1]).toFixed(6)),
      ]),
    });
  }

  private buildResolvedRouteOption(
    kind: RouteOptionKind,
    routeResult: RouteEstimationCandidate,
    requestedConstraints: RouteConstraintType[],
    zoneGroupsByConstraint: ZoneGroupsByConstraint,
    baseFactors: RouteFactor[] = [],
  ): ResolvedRouteOption {
    const compliance = buildRouteComplianceSummary(
      routeResult.geometry.coordinates,
      requestedConstraints,
      zoneGroupsByConstraint,
    );
    const warnings = this.mergeWarnings(
      routeResult.warnings,
      this.buildComplianceWarnings(compliance),
    );
    const appliedConstraints =
      kind === RouteOptionKind.AVOIDED
        ? compliance.satisfiedConstraints
        : routeResult.appliedConstraints;

    return {
      kind,
      estimatedDistanceKm: routeResult.estimatedDistanceKm,
      estimatedDurationMinutes: routeResult.estimatedDurationMinutes,
      geometry: routeResult.geometry,
      metadata: this.routeMetadataService.build({
        method: routeResult.method,
        appliedConstraints,
        factors: [...baseFactors, ...routeResult.factors],
        compliance,
        warnings,
      }),
    };
  }

  private buildDetourAvoidanceZones(
    baseZones: RouteAvoidanceZone[],
    blockingGroups: ReturnType<typeof collectIntersectedRouteAvoidanceGroups>,
    stage: number,
  ): RouteAvoidanceZone[] {
    const normalizedStage = Math.max(
      0,
      Math.min(stage, this.detourExpansionMultipliers.length - 1),
    );
    const multiplier = this.detourExpansionMultipliers[normalizedStage];

    return mergeAvoidanceZones([
      ...baseZones,
      ...blockingGroups.flatMap(({ group }) =>
        group.zones.map((zone) =>
          expandAvoidanceZone(
            zone,
            Math.max(Number(group.escalationPaddingMeters) || 0, 110) *
              multiplier,
          ),
        ),
      ),
    ]);
  }

  private buildComplianceWarnings(
    compliance: ResolvedRouteOption['metadata']['compliance'],
  ): string[] {
    if (compliance.isFullyCompliant) {
      return [];
    }

    const warnings = compliance.constraintResults
      .filter((result) => !result.satisfied)
      .map((result) => {
        const label =
          result.constraint === RouteConstraintType.AVOID_INCIDENTS
            ? 'incident'
            : 'checkpoint';
        const suffix = result.intersectedGroupCount === 1 ? 'zone' : 'zones';

        return (
          `Returned route still intersects ${result.intersectedGroupCount} ` +
          `selected ${label} ${suffix}.`
        );
      });

    warnings.push('No fully compliant route could be found.');

    return warnings;
  }

  private isPreferredRouteOption(
    nextRoute: ResolvedRouteOption,
    currentRoute: ResolvedRouteOption,
  ): boolean {
    const complianceComparison = compareRouteComplianceSummaries(
      nextRoute.metadata.compliance,
      currentRoute.metadata.compliance,
    );

    if (complianceComparison !== 0) {
      return complianceComparison < 0;
    }

    if (
      nextRoute.estimatedDurationMinutes !==
      currentRoute.estimatedDurationMinutes
    ) {
      return (
        nextRoute.estimatedDurationMinutes <
        currentRoute.estimatedDurationMinutes
      );
    }

    if (nextRoute.estimatedDistanceKm !== currentRoute.estimatedDistanceKm) {
      return nextRoute.estimatedDistanceKm < currentRoute.estimatedDistanceKm;
    }

    return false;
  }

  private buildDetourViaPoints(
    existingWaypoints: RoutingWaypoint[],
    nextWaypoint: RoutingWaypoint,
  ): RoutingWaypoint[] {
    const normalizedExistingWaypoints = Array.isArray(existingWaypoints)
      ? existingWaypoints.filter(
          (waypoint) =>
            Number.isFinite(Number(waypoint?.latitude)) &&
            Number.isFinite(Number(waypoint?.longitude)),
        )
      : [];

    if (
      normalizedExistingWaypoints.some((waypoint) =>
        this.areSameWaypoints(waypoint, nextWaypoint),
      )
    ) {
      return normalizedExistingWaypoints;
    }

    return [
      ...normalizedExistingWaypoints.slice(0, this.maxDetourWaypoints - 1),
      nextWaypoint,
    ];
  }

  private areSameWaypointSets(
    left: RoutingWaypoint[],
    right: RoutingWaypoint[],
  ): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((waypoint, index) =>
      this.areSameWaypoints(waypoint, right[index]),
    );
  }

  private areSameWaypoints(
    left?: RoutingWaypoint,
    right?: RoutingWaypoint,
  ): boolean {
    return (
      this.normalizeWaypointCoordinate(left?.latitude) ===
        this.normalizeWaypointCoordinate(right?.latitude) &&
      this.normalizeWaypointCoordinate(left?.longitude) ===
        this.normalizeWaypointCoordinate(right?.longitude)
    );
  }

  private normalizeWaypointCoordinate(value?: number): number | null {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return Number(numericValue.toFixed(6));
  }

  private areSameAvoidanceZoneSets(
    left: RouteAvoidanceZone[],
    right: RouteAvoidanceZone[],
  ): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every(
      (zone, index) =>
        JSON.stringify(zone) === JSON.stringify(right[index]),
    );
  }

  private resolveRequestedConstraints(
    context: RouteAdjustmentContext,
  ): RouteConstraintType[] {
    const constraints: RouteConstraintType[] = [];

    if (context.avoidCheckpoints) {
      constraints.push(RouteConstraintType.AVOID_CHECKPOINTS);
    }

    if (context.avoidIncidents) {
      constraints.push(RouteConstraintType.AVOID_INCIDENTS);
    }

    return constraints;
  }

  private resolveAlternativeRouteCount(
    requestedConstraints: RouteConstraintType[],
  ): number | undefined {
    if (requestedConstraints.length > 0) {
      return this.avoidanceAlternativeRouteCount;
    }

    return undefined;
  }

  private mergeWarnings(...warningGroups: string[][]): string[] {
    return [...new Set(warningGroups.flat().filter(Boolean))];
  }

  private buildContext(
    estimateRouteDto: EstimateRouteDto,
  ): RouteAdjustmentContext {
    return {
      startLatitude: estimateRouteDto.startLatitude,
      startLongitude: estimateRouteDto.startLongitude,
      endLatitude: estimateRouteDto.endLatitude,
      endLongitude: estimateRouteDto.endLongitude,
      avoidCheckpoints: estimateRouteDto.avoidCheckpoints,
      avoidIncidents: estimateRouteDto.avoidIncidents,
    };
  }
}
