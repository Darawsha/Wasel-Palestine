import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  RoutingProvider,
  RoutingProviderRequest,
} from '../interfaces/routing-provider.interface';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import {
  RouteEstimationCandidate,
  RouteEstimationResult,
} from '../interfaces/route-estimation-result.interface';
import {
  buildRouteAvoidanceScore,
  RouteAvoidanceScore,
} from '../utils/route-avoidance-evaluator.util';
import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';

type LocationIqRouteCandidate = {
  distance: number;
  duration: number;
  geometry: {
    type: string;
    coordinates: number[][];
  };
};

type SelectedLocationIqRoute = LocationIqRouteCandidate & {
  avoidanceScore: RouteAvoidanceScore;
};

@Injectable()
export class LocationIqRoutingProvider implements RoutingProvider {
  private readonly baseUrl = 'https://eu1.locationiq.com/v1/directions/driving';
  private readonly defaultAlternativeRouteCount = 3;
  private readonly routeDataCacheTtlMs = 1500;
  private readonly routeRequestTimeoutMs = 12000;
  private readonly inflightRouteDataRequests = new Map<
    string,
    Promise<{ routes?: unknown }>
  >();
  private readonly recentRouteDataResponses = new Map<
    string,
    { data: { routes?: unknown }; expiresAt: number }
  >();

  async getRoute(
    request: RoutingProviderRequest,
  ): Promise<RouteEstimationResult> {
    const apiKey = this.normalizeAccessToken(
      process.env.LOCATIONIQ_API_KEY || process.env.LOCATIONAL_API_KEY,
    );

    if (!apiKey) {
      throw new InternalServerErrorException(
        'LOCATIONIQ_API_KEY or LOCATIONAL_API_KEY is not configured',
      );
    }

    const coordinates = this.buildCoordinates(request);

    const data = (await this.requestRouteData(
      coordinates,
      apiKey,
      request,
    )) as {
      routes?: unknown;
    };

    const rankedRoutes = this.rankRoutes(data?.routes, request.avoidanceZones);

    if (rankedRoutes.length === 0) {
      throw new InternalServerErrorException(
        'Invalid route response received from LocationIQ',
      );
    }

    const [selectedRoute, ...alternativeRoutes] = rankedRoutes;

    return {
      ...this.toRouteCandidate(selectedRoute, request),
      alternativeRoutes: alternativeRoutes.map((route) =>
        this.toRouteCandidate(route, request),
      ),
      warnings: this.buildAvoidanceWarnings(
        request.avoidanceZones,
        selectedRoute.avoidanceScore,
      ),
    };
  }

  private toRouteCandidate(
    route: SelectedLocationIqRoute,
    request: RoutingProviderRequest,
  ): RouteEstimationCandidate {
    return {
      estimatedDistanceKm: Number((route.distance / 1000).toFixed(2)),
      estimatedDurationMinutes: Math.round(route.duration / 60),
      geometry: {
        type: route.geometry.type,
        coordinates: route.geometry.coordinates,
      },
      method: RouteEstimationMethod.LOCATIONIQ_ROUTING,
      appliedConstraints:
        request.avoidanceZones?.length &&
        route.avoidanceScore.intersectedZoneCount === 0
          ? request.requestedConstraints ?? []
          : [],
      factors: [],
      warnings: [],
    };
  }

  private async requestRouteData(
    coordinates: string,
    apiKey: string,
    request: RoutingProviderRequest,
  ): Promise<{ routes?: unknown }> {
    const attemptedAlternativeCounts = [
      this.resolveAlternativeRouteCount(request),
      this.defaultAlternativeRouteCount,
      1,
    ].filter(
      (count, index, values) =>
        Number.isFinite(count) && count >= 1 && values.indexOf(count) === index,
    );

    let lastError: unknown = new InternalServerErrorException(
      'Unknown LocationIQ routing error',
    );

    for (let index = 0; index < attemptedAlternativeCounts.length; index += 1) {
      try {
        return await this.fetchRouteDataWithCache(
          this.buildDirectionsUrl(
            coordinates,
            apiKey,
            attemptedAlternativeCounts[index],
          ),
        );
      } catch (error) {
        lastError = error;

        if (
          !this.isTooBigRoutingError(error) ||
          index === attemptedAlternativeCounts.length - 1
        ) {
          break;
        }
      }
    }

    throw lastError;
  }

  private buildDirectionsUrl(
    coordinates: string,
    apiKey: string,
    alternativeRouteCount: number,
  ): string {
    return (
      `${this.baseUrl}/${coordinates}` +
      `?key=${apiKey}` +
      `&alternatives=${alternativeRouteCount}` +
      `&overview=full` +
      `&geometries=geojson` +
      `&steps=true`
    );
  }

  private buildCoordinates(request: RoutingProviderRequest): string {
    const coordinates = [
      `${request.startLongitude},${request.startLatitude}`,
      ...(Array.isArray(request.viaPoints)
        ? request.viaPoints
            .filter(
              (point) =>
                Number.isFinite(Number(point?.latitude)) &&
                Number.isFinite(Number(point?.longitude)),
            )
            .map(
              (point) => `${Number(point.longitude)},${Number(point.latitude)}`,
            )
        : []),
      `${request.endLongitude},${request.endLatitude}`,
    ];

    return coordinates.join(';');
  }

  private resolveAlternativeRouteCount(
    request: RoutingProviderRequest,
  ): number {
    const alternativeRouteCount = Math.round(
      Number(request.alternativeRouteCount),
    );

    if (!Number.isFinite(alternativeRouteCount) || alternativeRouteCount < 1) {
      return this.defaultAlternativeRouteCount;
    }

    return alternativeRouteCount;
  }

  private async fetchRouteDataWithCache(
    url: string,
  ): Promise<{ routes?: unknown }> {
    const now = Date.now();

    this.clearExpiredRouteDataResponses(now);

    const cachedResponse = this.recentRouteDataResponses.get(url);
    if (cachedResponse && cachedResponse.expiresAt > now) {
      return cachedResponse.data;
    }

    const inflightRequest = this.inflightRouteDataRequests.get(url);
    if (inflightRequest) {
      return inflightRequest;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.routeRequestTimeoutMs,
    );

    const requestPromise = fetch(url, { method: 'GET', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();

          if (this.isRateLimitedError(errorText)) {
            throw new HttpException(
              'Route calculation is temporarily busy. Please try again in a moment.',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }

          throw new InternalServerErrorException(
            `LocationIQ request failed: ${errorText}`,
          );
        }

        const data = (await response.json()) as { routes?: unknown };
        this.recentRouteDataResponses.set(url, {
          data,
          expiresAt: Date.now() + this.routeDataCacheTtlMs,
        });
        return data;
      })
      .catch((error) => {
        if (this.isAbortError(error)) {
          throw new HttpException(
            'Route calculation timed out. Please try again.',
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }

        throw error;
      })
      .finally(() => {
        clearTimeout(timeoutId);

        if (this.inflightRouteDataRequests.get(url) === requestPromise) {
          this.inflightRouteDataRequests.delete(url);
        }
      });

    this.inflightRouteDataRequests.set(url, requestPromise);
    return requestPromise;
  }

  private isTooBigError(errorText: string): boolean {
    return /toobig|too big/i.test(String(errorText || ''));
  }

  private isTooBigRoutingError(error: unknown): boolean {
    return this.isTooBigError(this.getErrorMessage(error));
  }

  private isRateLimitedError(errorText: string): boolean {
    return /rate limited/i.test(String(errorText || ''));
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return '';
  }

  private isAbortError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    );
  }

  private clearExpiredRouteDataResponses(now = Date.now()): void {
    this.recentRouteDataResponses.forEach((entry, key) => {
      if (!entry || entry.expiresAt <= now) {
        this.recentRouteDataResponses.delete(key);
      }
    });
  }

  private rankRoutes(
    routes: unknown,
    avoidanceZones: RouteAvoidanceZone[] = [],
  ): SelectedLocationIqRoute[] {
    if (!Array.isArray(routes) || routes.length === 0) {
      return [];
    }

    const candidates = routes
      .filter(
        (route): route is LocationIqRouteCandidate =>
          typeof route?.distance === 'number' &&
          typeof route?.duration === 'number' &&
          typeof route?.geometry?.type === 'string' &&
          Array.isArray(route?.geometry?.coordinates),
      )
      .map((route) => ({
        ...route,
        avoidanceScore: buildRouteAvoidanceScore(
          route.geometry.coordinates,
          avoidanceZones,
        ),
      }));

    if (!candidates.length) {
      return [];
    }

    return candidates.sort((left, right) => {
      const avoidanceComparison = this.compareAvoidanceScores(
        left.avoidanceScore,
        right.avoidanceScore,
      );

      if (avoidanceComparison !== 0) {
        return avoidanceComparison;
      }

      if (left.duration !== right.duration) {
        return left.duration - right.duration;
      }

      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }

      return 0;
    });
  }

  private compareAvoidanceScores(
    left: RouteAvoidanceScore,
    right: RouteAvoidanceScore,
  ): number {
    if (left.intersectedZoneCount !== right.intersectedZoneCount) {
      return left.intersectedZoneCount - right.intersectedZoneCount;
    }

    if (left.intersectedSegmentCount !== right.intersectedSegmentCount) {
      return left.intersectedSegmentCount - right.intersectedSegmentCount;
    }

    if (left.pointsInsideZoneCount !== right.pointsInsideZoneCount) {
      return left.pointsInsideZoneCount - right.pointsInsideZoneCount;
    }

    return 0;
  }

  private buildAvoidanceWarnings(
    avoidanceZones: RouteAvoidanceZone[] = [],
    avoidanceScore: RouteAvoidanceScore,
  ): string[] {
    if (avoidanceZones.length === 0) {
      return [];
    }

    if (avoidanceScore.intersectedZoneCount === 0) {
      return [
        'LocationIQ fallback selected the safest available alternative route.',
      ];
    }

    return [
      'LocationIQ fallback returned the least-conflicting route available, but no fully compliant fallback route was found.',
    ];
  }

  private normalizeAccessToken(token?: string): string | undefined {
    const normalized = token?.trim();

    if (!normalized) {
      return undefined;
    }

    if (normalized.startsWith('pk.') || normalized.startsWith('sk.')) {
      return normalized;
    }

    if (/^[a-z0-9]{32,}$/i.test(normalized)) {
      return `pk.${normalized}`;
    }

    return normalized;
  }
}
