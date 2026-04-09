import { RouteEstimationResult } from './route-estimation-result.interface';
import { RouteAvoidanceZone } from './route-avoidance-zone.interface';

export interface RoutingProviderRequest {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  avoidanceZones?: RouteAvoidanceZone[];
}

export interface RoutingProvider {
  getRoute(
    request: RoutingProviderRequest,
  ): Promise<RouteEstimationResult>;
}