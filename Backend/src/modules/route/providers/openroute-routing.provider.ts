import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  RoutingProvider,
  RoutingProviderRequest,
} from '../interfaces/routing-provider.interface';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import {
  RouteEstimationCandidate,
  RouteEstimationResult,
} from '../interfaces/route-estimation-result.interface';
import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';

@Injectable()
export class OpenRouteRoutingProvider implements RoutingProvider {
  private readonly baseUrl =
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
  private readonly requestTimeoutMs = 12000;
  private readonly maxAlternativeRouteCount = 3;

  async getRoute(
    request: RoutingProviderRequest,
  ): Promise<RouteEstimationResult> {
    const apiKey = this.resolveApiKey();

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTE_API_KEY, OPENROUTESERVICE_API_KEY, or OpenRoute_API_KEY is not configured',
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    let response: Response;

    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildRequestBody(request)),
        signal: controller.signal,
      });
    } catch (error) {
      if (this.isAbortError(error)) {
        throw new InternalServerErrorException(
          'OpenRouteService request timed out',
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `OpenRouteService request failed: ${errorText}`,
      );
    }

    const data = await response.json();
    const candidates = this.extractRouteCandidates(data);

    if (candidates.length === 0) {
      throw new InternalServerErrorException(
        'Invalid route response received from OpenRouteService',
      );
    }

    const [primaryRoute, ...alternativeRoutes] = candidates;

    return {
      ...primaryRoute,
      alternativeRoutes,
    };
  }

  private buildRequestBody(
    request: RoutingProviderRequest,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      coordinates: this.buildCoordinates(request),
    };

    if (request.avoidanceZones && request.avoidanceZones.length > 0) {
      body.options = {
        avoid_polygons: this.buildAvoidPolygons(request.avoidanceZones),
      };
    }

    const alternativeRouteCount = this.resolveAlternativeRouteCount(request);

    if (alternativeRouteCount > 1) {
      body.alternative_routes = {
        target_count: alternativeRouteCount,
        share_factor: 0.6,
        weight_factor: 1.8,
      };
    }

    return body;
  }

  private buildCoordinates(
    request: RoutingProviderRequest,
  ): number[][] {
    return [
      [request.startLongitude, request.startLatitude],
      ...(Array.isArray(request.viaPoints)
        ? request.viaPoints
            .filter(
              (point) =>
                Number.isFinite(Number(point?.latitude)) &&
                Number.isFinite(Number(point?.longitude)),
            )
            .map((point) => [Number(point.longitude), Number(point.latitude)])
        : []),
      [request.endLongitude, request.endLatitude],
    ];
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

  private extractRouteCandidates(data: unknown): RouteEstimationCandidate[] {
    const features = Array.isArray((data as { features?: unknown[] })?.features)
      ? (data as { features: unknown[] }).features
      : [];

    return features
      .map((feature) => this.normalizeRouteCandidate(feature))
      .filter(
        (candidate): candidate is RouteEstimationCandidate => candidate !== null,
      );
  }

  private normalizeRouteCandidate(
    feature: unknown,
  ): RouteEstimationCandidate | null {
    const summary = (feature as { properties?: { summary?: unknown } })?.properties
      ?.summary as { distance?: unknown; duration?: unknown } | undefined;
    const geometry = (feature as { geometry?: unknown })?.geometry as
      | { type?: unknown; coordinates?: unknown }
      | undefined;
    const distance = Number(summary?.distance);
    const duration = Number(summary?.duration);
    const coordinates = Array.isArray(geometry?.coordinates)
      ? geometry.coordinates
      : null;

    if (
      !Number.isFinite(distance) ||
      !Number.isFinite(duration) ||
      typeof geometry?.type !== 'string' ||
      !Array.isArray(coordinates)
    ) {
      return null;
    }

    return {
      estimatedDistanceKm: Number((distance / 1000).toFixed(2)),
      estimatedDurationMinutes: Math.round(duration / 60),
      geometry: {
        type: geometry.type,
        coordinates: coordinates as number[][],
      },
      method: RouteEstimationMethod.OPENROUTE_ROUTING,
      appliedConstraints: [],
      factors: [],
      warnings: [],
    };
  }

  private resolveAlternativeRouteCount(
    request: RoutingProviderRequest,
  ): number {
    const requestedAlternativeCount = Math.round(
      Number(request.alternativeRouteCount),
    );

    if (!Number.isFinite(requestedAlternativeCount)) {
      return 1;
    }

    return Math.max(
      1,
      Math.min(requestedAlternativeCount, this.maxAlternativeRouteCount),
    );
  }

  private resolveApiKey(): string | undefined {
    return [
      process.env.OPENROUTE_API_KEY,
      process.env.OPENROUTESERVICE_API_KEY,
      process.env.OPEN_ROUTE_API_KEY,
      process.env.OpenRoute_API_KEY,
      process.env.OpenRouteService_API_KEY,
    ]
      .map((value) => value?.trim())
      .find((value) => Boolean(value));
  }

  private isAbortError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    );
  }
}
