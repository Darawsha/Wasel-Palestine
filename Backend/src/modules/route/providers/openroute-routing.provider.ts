import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  RoutingProvider,
  RoutingProviderRequest,
} from '../interfaces/routing-provider.interface';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteEstimationResult } from '../interfaces/route-estimation-result.interface';
import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';

@Injectable()
export class OpenRouteRoutingProvider implements RoutingProvider {
  private readonly baseUrl =
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

  async getRoute(
    request: RoutingProviderRequest,
  ): Promise<RouteEstimationResult> {
    const apiKey = process.env.OPENROUTE_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTE_API_KEY is not configured',
      );
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.buildRequestBody(request)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `OpenRouteService request failed: ${errorText}`,
      );
    }

    const data = await response.json();

    const feature = data?.features?.[0];
    const summary = feature?.properties?.summary;
    const geometry = feature?.geometry;

    if (!feature || !summary || !geometry) {
      throw new InternalServerErrorException(
        'Invalid route response received from OpenRouteService',
      );
    }

    return {
      estimatedDistanceKm: Number((summary.distance / 1000).toFixed(2)),
      estimatedDurationMinutes: Math.round(summary.duration / 60),
      geometry: {
        type: geometry.type,
        coordinates: geometry.coordinates,
      },
      method: RouteEstimationMethod.OPENROUTE_ROUTING,
      appliedConstraints: [],
      factors: [],
      warnings: [],
    };
  }

  private buildRequestBody(
    request: RoutingProviderRequest,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      coordinates: [
        [request.startLongitude, request.startLatitude],
        [request.endLongitude, request.endLatitude],
      ],
    };

    if (request.avoidanceZones && request.avoidanceZones.length > 0) {
      body.options = {
        avoid_polygons: this.buildAvoidPolygons(request.avoidanceZones),
      };
    }

    return body;
  }

  private buildAvoidPolygons(
    zones: RouteAvoidanceZone[],
  ): Record<string, unknown> {
    if (zones.length === 1) {
      return {
        type: 'Polygon',
        coordinates: zones[0].coordinates,
      };
    }

    return {
      type: 'MultiPolygon',
      coordinates: zones.map((zone) => zone.coordinates),
    };
  }
}