import { Injectable } from '@nestjs/common';
import { EstimateRouteDto } from './dto/estimate-route.dto';
import { RouteEstimateResponseDto } from './dto/route-estimate-response.dto';
import { RouteAdjustmentContext } from './interfaces/route-adjustment-context.interface';
import { RouteAvoidanceZone } from './interfaces/route-avoidance-zone.interface';
import { OpenRouteRoutingProvider } from './providers/openroute-routing.provider';
import { CheckpointAvoidanceStrategy } from './strategies/checkpoint-avoidance.strategy';
import { RestrictedAreaAvoidanceStrategy } from './strategies/restricted-area-avoidance.strategy';
import { RouteMetadataService } from './services/route-metadata.service';

@Injectable()
export class RouteService {
  constructor(
    private readonly openRouteRoutingProvider: OpenRouteRoutingProvider,
    private readonly checkpointAvoidanceStrategy: CheckpointAvoidanceStrategy,
    private readonly restrictedAreaAvoidanceStrategy: RestrictedAreaAvoidanceStrategy,
    private readonly routeMetadataService: RouteMetadataService,
  ) {}

  async estimateRoute(
    estimateRouteDto: EstimateRouteDto,
  ): Promise<RouteEstimateResponseDto> {
    const context = this.buildContext(estimateRouteDto);

    const checkpointResult =
      await this.checkpointAvoidanceStrategy.build(context);

    const restrictedAreaResult =
      await this.restrictedAreaAvoidanceStrategy.build(context);

    const avoidanceZones: RouteAvoidanceZone[] = [
      ...checkpointResult.zones,
      ...restrictedAreaResult.zones,
    ];

    const routeResult = await this.openRouteRoutingProvider.getRoute({
      startLatitude: context.startLatitude,
      startLongitude: context.startLongitude,
      endLatitude: context.endLatitude,
      endLongitude: context.endLongitude,
      avoidanceZones,
    });

    const metadata = this.routeMetadataService.build({
      method: routeResult.method,
      appliedConstraints: [
        ...checkpointResult.appliedConstraints,
        ...restrictedAreaResult.appliedConstraints,
      ],
      factors: [
        ...checkpointResult.factors,
        ...restrictedAreaResult.factors,
        ...routeResult.factors,
      ],
      warnings: routeResult.warnings,
    });

    return {
      estimatedDistanceKm: routeResult.estimatedDistanceKm,
      estimatedDurationMinutes: routeResult.estimatedDurationMinutes,
      geometry: routeResult.geometry,
      metadata,
    };
  }

  private buildContext(estimateRouteDto: EstimateRouteDto): RouteAdjustmentContext {
    return {
      startLatitude: estimateRouteDto.startLatitude,
      startLongitude: estimateRouteDto.startLongitude,
      endLatitude: estimateRouteDto.endLatitude,
      endLongitude: estimateRouteDto.endLongitude,
      avoidCheckpoints: estimateRouteDto.avoidCheckpoints,
      avoidAreas: estimateRouteDto.avoidAreas,
    };
  }
}