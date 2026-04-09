import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';
import { metersToLatitudeDegrees, metersToLongitudeDegrees } from './geometry.util';

export function buildCircularAvoidanceZone(
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters: number,
): RouteAvoidanceZone {
  const latDelta = metersToLatitudeDegrees(radiusMeters);
  const lngDelta = metersToLongitudeDegrees(radiusMeters, centerLatitude);

  return {
    type: 'Polygon',
    coordinates: [[
      [centerLongitude - lngDelta, centerLatitude - latDelta],
      [centerLongitude + lngDelta, centerLatitude - latDelta],
      [centerLongitude + lngDelta, centerLatitude + latDelta],
      [centerLongitude - lngDelta, centerLatitude + latDelta],
      [centerLongitude - lngDelta, centerLatitude - latDelta],
    ]],
  };
}

export function mergeAvoidanceZones(
  zones: RouteAvoidanceZone[],
): RouteAvoidanceZone[] {
  return zones.filter(
    (zone) =>
      zone &&
      zone.type === 'Polygon' &&
      Array.isArray(zone.coordinates) &&
      zone.coordinates.length > 0,
  );
}