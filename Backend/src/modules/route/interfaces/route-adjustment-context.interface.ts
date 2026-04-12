export interface RouteAdjustmentContext {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  avoidCheckpoints?: boolean;
  avoidIncidents?: boolean;
  referenceRouteCoordinates?: number[][];
}
