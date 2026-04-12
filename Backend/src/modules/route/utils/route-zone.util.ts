import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';
import { RouteAdjustmentContext } from '../interfaces/route-adjustment-context.interface';
import { metersToLatitudeDegrees, metersToLongitudeDegrees } from './geometry.util';

export type RouteCorridorAxis = 'horizontal' | 'vertical';

type CoordinatePair = [longitude: number, latitude: number];
export type ZoneBoundingBox = {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
};

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

export function buildApproximateCircularAvoidanceZone(
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters: number,
  segmentCount = 16,
): RouteAvoidanceZone {
  const normalizedSegments = Math.max(8, Math.round(segmentCount));
  const ring: CoordinatePair[] = [];

  for (let index = 0; index < normalizedSegments; index += 1) {
    const angle = (index / normalizedSegments) * Math.PI * 2;
    const latitude =
      centerLatitude +
      metersToLatitudeDegrees(radiusMeters * Math.sin(angle));
    const longitude =
      centerLongitude +
      metersToLongitudeDegrees(
        radiusMeters * Math.cos(angle),
        centerLatitude,
      );

    ring.push([longitude, latitude]);
  }

  if (ring.length > 0) {
    ring.push(ring[0]);
  }

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

export function buildRectangularAvoidanceZone(
  centerLatitude: number,
  centerLongitude: number,
  halfHeightMeters: number,
  halfWidthMeters: number,
): RouteAvoidanceZone {
  const latDelta = metersToLatitudeDegrees(halfHeightMeters);
  const lngDelta = metersToLongitudeDegrees(halfWidthMeters, centerLatitude);

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

export function buildCorridorAvoidanceZone(
  centerLatitude: number,
  centerLongitude: number,
  axis: RouteCorridorAxis,
  halfLengthMeters: number,
  halfWidthMeters: number,
): RouteAvoidanceZone {
  if (axis === 'horizontal') {
    return buildRectangularAvoidanceZone(
      centerLatitude,
      centerLongitude,
      halfWidthMeters,
      halfLengthMeters,
    );
  }

  return buildRectangularAvoidanceZone(
    centerLatitude,
    centerLongitude,
    halfLengthMeters,
    halfWidthMeters,
  );
}

export function getRouteCorridorAxis(
  context: RouteAdjustmentContext,
): RouteCorridorAxis {
  const averageLatitude =
    (context.startLatitude + context.endLatitude) / 2;
  const latitudeDistanceMeters =
    Math.abs(context.endLatitude - context.startLatitude) * 111320;
  const longitudeDistanceMeters =
    Math.abs(context.endLongitude - context.startLongitude) *
    111320 *
    Math.cos((averageLatitude * Math.PI) / 180);

  return longitudeDistanceMeters >= latitudeDistanceMeters
    ? 'horizontal'
    : 'vertical';
}

export function mergeAvoidanceZones(
  zones: RouteAvoidanceZone[],
): RouteAvoidanceZone[] {
  const normalizedZones = zones.filter(
    (zone) =>
      zone &&
      zone.type === 'Polygon' &&
      Array.isArray(zone.coordinates) &&
      zone.coordinates.length > 0,
  );

  return normalizedZones.filter((zone, zoneIndex) => {
    const boundingBox = getAvoidanceZoneBoundingBox(zone);

    if (!boundingBox) {
      return false;
    }

    return !normalizedZones.some((candidate, candidateIndex) => {
      if (candidateIndex === zoneIndex) {
        return false;
      }

      const candidateBoundingBox = getAvoidanceZoneBoundingBox(candidate);

      return (
        candidateBoundingBox !== null &&
        isBoundingBoxContainedWithin(boundingBox, candidateBoundingBox)
      );
    });
  });
}

export function getAvoidanceZoneBoundingBox(
  zone: RouteAvoidanceZone,
): ZoneBoundingBox | null {
  return buildZoneBoundingBox(zone);
}

export function estimateAvoidanceZoneArea(
  zone: RouteAvoidanceZone,
): number {
  const boundingBox = getAvoidanceZoneBoundingBox(zone);

  if (!boundingBox) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    (boundingBox.maxLongitude - boundingBox.minLongitude) *
    (boundingBox.maxLatitude - boundingBox.minLatitude)
  );
}

export function selectPrimaryAvoidanceZone(
  zones: RouteAvoidanceZone[],
): RouteAvoidanceZone | null {
  const normalizedZones = mergeAvoidanceZones(zones);

  if (normalizedZones.length === 0) {
    return null;
  }

  return normalizedZones.reduce((selectedZone, zone) =>
    estimateAvoidanceZoneArea(zone) < estimateAvoidanceZoneArea(selectedZone)
      ? zone
      : selectedZone,
  );
}

export function expandAvoidanceZone(
  zone: RouteAvoidanceZone,
  paddingMeters: number,
): RouteAvoidanceZone {
  if (!Number.isFinite(paddingMeters) || paddingMeters <= 0) {
    return zone;
  }

  const boundingBox = buildZoneBoundingBox(zone);

  if (!boundingBox) {
    return zone;
  }

  const centerLatitude =
    (boundingBox.minLatitude + boundingBox.maxLatitude) / 2;
  const latitudePadding = metersToLatitudeDegrees(paddingMeters);
  const longitudePadding = metersToLongitudeDegrees(
    paddingMeters,
    centerLatitude,
  );

  return {
    type: 'Polygon',
    coordinates: [[
      [
        boundingBox.minLongitude - longitudePadding,
        boundingBox.minLatitude - latitudePadding,
      ],
      [
        boundingBox.maxLongitude + longitudePadding,
        boundingBox.minLatitude - latitudePadding,
      ],
      [
        boundingBox.maxLongitude + longitudePadding,
        boundingBox.maxLatitude + latitudePadding,
      ],
      [
        boundingBox.minLongitude - longitudePadding,
        boundingBox.maxLatitude + latitudePadding,
      ],
      [
        boundingBox.minLongitude - longitudePadding,
        boundingBox.minLatitude - latitudePadding,
      ],
    ]],
  };
}

function buildZoneBoundingBox(zone: RouteAvoidanceZone): ZoneBoundingBox | null {
  const ring = Array.isArray(zone?.coordinates) ? zone.coordinates[0] : null;

  if (!Array.isArray(ring) || ring.length === 0) {
    return null;
  }

  const coordinates = ring.filter(isCoordinatePair);

  if (coordinates.length === 0) {
    return null;
  }

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);

  return {
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
  };
}

function isBoundingBoxContainedWithin(
  inner: ZoneBoundingBox,
  outer: ZoneBoundingBox,
): boolean {
  return (
    inner.minLongitude >= outer.minLongitude &&
    inner.maxLongitude <= outer.maxLongitude &&
    inner.minLatitude >= outer.minLatitude &&
    inner.maxLatitude <= outer.maxLatitude
  );
}

function isCoordinatePair(value: unknown): value is CoordinatePair {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  );
}
