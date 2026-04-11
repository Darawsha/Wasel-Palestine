import { RouteEstimationResult } from './route-estimation-result.interface';
import { RouteAvoidanceZone } from './route-avoidance-zone.interface';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';

export interface RoutingWaypoint {
  latitude: number;
  longitude: number;
}

export interface RoutingProviderRequest {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  viaPoints?: RoutingWaypoint[];
  avoidanceZones?: RouteAvoidanceZone[];
  requestedConstraints?: RouteConstraintType[];
  alternativeRouteCount?: number;
}

export interface RoutingProvider {
  getRoute(
    request: RoutingProviderRequest,
  ): Promise<RouteEstimationResult>;
}
