import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';

type CoordinatePair = [longitude: number, latitude: number];

type BoundingBox = {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
};

type PreparedZone = {
  ring: CoordinatePair[];
  boundingBox: BoundingBox;
};

export type RouteAvoidanceScore = {
  intersectedZoneCount: number;
  intersectedSegmentCount: number;
  pointsInsideZoneCount: number;
};

const EPSILON = 1e-10;

export function buildRouteAvoidanceScore(
  coordinates: number[][],
  avoidanceZones: RouteAvoidanceZone[],
): RouteAvoidanceScore {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return emptyScore();
  }

  const zones = avoidanceZones
    .map((zone) => prepareZone(zone))
    .filter((value): value is PreparedZone => value !== null);

  if (zones.length === 0) {
    return emptyScore();
  }

  const routePoints = coordinates.filter(isCoordinatePair);

  if (routePoints.length === 0) {
    return emptyScore();
  }

  const intersectedZoneIndexes = new Set<number>();
  let pointsInsideZoneCount = 0;
  let intersectedSegmentCount = 0;

  routePoints.forEach((point) => {
    zones.forEach((zone, zoneIndex) => {
      if (isPointInsidePolygon(point, zone)) {
        intersectedZoneIndexes.add(zoneIndex);
        pointsInsideZoneCount += 1;
      }
    });
  });

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index];
    const end = routePoints[index + 1];

    zones.forEach((zone, zoneIndex) => {
      if (doesSegmentIntersectPolygon(start, end, zone)) {
        intersectedZoneIndexes.add(zoneIndex);
        intersectedSegmentCount += 1;
      }
    });
  }

  return {
    intersectedZoneCount: intersectedZoneIndexes.size,
    intersectedSegmentCount,
    pointsInsideZoneCount,
  };
}

function emptyScore(): RouteAvoidanceScore {
  return {
    intersectedZoneCount: 0,
    intersectedSegmentCount: 0,
    pointsInsideZoneCount: 0,
  };
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

function prepareZone(zone: RouteAvoidanceZone): PreparedZone | null {
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
    ring: coordinates,
    boundingBox: {
      minLongitude: Math.min(...longitudes),
      maxLongitude: Math.max(...longitudes),
      minLatitude: Math.min(...latitudes),
      maxLatitude: Math.max(...latitudes),
    },
  };
}

function isPointInsideBoundingBox(
  point: CoordinatePair,
  box: BoundingBox,
): boolean {
  const [longitude, latitude] = point;

  return (
    longitude >= box.minLongitude - EPSILON &&
    longitude <= box.maxLongitude + EPSILON &&
    latitude >= box.minLatitude - EPSILON &&
    latitude <= box.maxLatitude + EPSILON
  );
}

function isPointInsidePolygon(
  point: CoordinatePair,
  zone: PreparedZone,
): boolean {
  if (!isPointInsideBoundingBox(point, zone.boundingBox)) {
    return false;
  }

  const [pointLongitude, pointLatitude] = point;
  let inside = false;

  for (let index = 0; index < zone.ring.length - 1; index += 1) {
    const start = zone.ring[index];
    const end = zone.ring[index + 1];

    if (isPointOnSegment(start, point, end)) {
      return true;
    }

    const intersects =
      start[1] > pointLatitude !== end[1] > pointLatitude &&
      pointLongitude <
        ((end[0] - start[0]) * (pointLatitude - start[1])) /
          (end[1] - start[1]) +
          start[0];

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function doesSegmentIntersectPolygon(
  start: CoordinatePair,
  end: CoordinatePair,
  zone: PreparedZone,
): boolean {
  if (
    !doBoundingBoxesIntersect(
      buildSegmentBoundingBox(start, end),
      zone.boundingBox,
    )
  ) {
    return false;
  }

  if (isPointInsidePolygon(start, zone) || isPointInsidePolygon(end, zone)) {
    return true;
  }

  for (let index = 0; index < zone.ring.length - 1; index += 1) {
    if (
      doLineSegmentsIntersect(start, end, zone.ring[index], zone.ring[index + 1])
    ) {
      return true;
    }
  }

  return false;
}

function buildSegmentBoundingBox(
  start: CoordinatePair,
  end: CoordinatePair,
): BoundingBox {
  return {
    minLongitude: Math.min(start[0], end[0]),
    maxLongitude: Math.max(start[0], end[0]),
    minLatitude: Math.min(start[1], end[1]),
    maxLatitude: Math.max(start[1], end[1]),
  };
}

function doBoundingBoxesIntersect(
  left: BoundingBox,
  right: BoundingBox,
): boolean {
  return !(
    left.maxLongitude < right.minLongitude - EPSILON ||
    left.minLongitude > right.maxLongitude + EPSILON ||
    left.maxLatitude < right.minLatitude - EPSILON ||
    left.minLatitude > right.maxLatitude + EPSILON
  );
}

function doLineSegmentsIntersect(
  startA: CoordinatePair,
  endA: CoordinatePair,
  startB: CoordinatePair,
  endB: CoordinatePair,
): boolean {
  const orientation1 = getOrientation(startA, endA, startB);
  const orientation2 = getOrientation(startA, endA, endB);
  const orientation3 = getOrientation(startB, endB, startA);
  const orientation4 = getOrientation(startB, endB, endA);

  if (orientation1 !== orientation2 && orientation3 !== orientation4) {
    return true;
  }

  if (orientation1 === 0 && isPointOnSegment(startA, startB, endA)) {
    return true;
  }

  if (orientation2 === 0 && isPointOnSegment(startA, endB, endA)) {
    return true;
  }

  if (orientation3 === 0 && isPointOnSegment(startB, startA, endB)) {
    return true;
  }

  if (orientation4 === 0 && isPointOnSegment(startB, endA, endB)) {
    return true;
  }

  return false;
}

function getOrientation(
  start: CoordinatePair,
  middle: CoordinatePair,
  end: CoordinatePair,
): number {
  const value =
    (middle[1] - start[1]) * (end[0] - middle[0]) -
    (middle[0] - start[0]) * (end[1] - middle[1]);

  if (Math.abs(value) <= EPSILON) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function isPointOnSegment(
  start: CoordinatePair,
  point: CoordinatePair,
  end: CoordinatePair,
): boolean {
  const areaTwice = Math.abs(
    (point[0] - start[0]) * (end[1] - start[1]) -
      (point[1] - start[1]) * (end[0] - start[0]),
  );
  const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1]);

  if (
    (segmentLength === 0 &&
      Math.hypot(point[0] - start[0], point[1] - start[1]) > EPSILON) ||
    (segmentLength > 0 && areaTwice > EPSILON * segmentLength * 10)
  ) {
    return false;
  }

  return (
    point[0] <= Math.max(start[0], end[0]) + EPSILON &&
    point[0] >= Math.min(start[0], end[0]) - EPSILON &&
    point[1] <= Math.max(start[1], end[1]) + EPSILON &&
    point[1] >= Math.min(start[1], end[1]) - EPSILON
  );
}
