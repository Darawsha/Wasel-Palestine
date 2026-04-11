import { RouteAdjustmentContext } from '../interfaces/route-adjustment-context.interface';

type RouteRelevantPoint = {
  latitude?: number | null;
  longitude?: number | null;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

export function filterPointsNearRouteCorridor<T extends RouteRelevantPoint>(
  points: T[],
  context: RouteAdjustmentContext,
  corridorRadiusKm = 12,
): T[] {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const corridorRadiusMeters = Math.max(corridorRadiusKm, 1) * 1000;

  return points.filter((point) => {
    const latitude = Number(point?.latitude);
    const longitude = Number(point?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

    return (
      distancePointToRouteCorridorMeters(latitude, longitude, context) <=
      corridorRadiusMeters
    );
  });
}

export function distancePointToRouteCorridorMeters(
  latitude: number,
  longitude: number,
  context: RouteAdjustmentContext,
): number {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Number.POSITIVE_INFINITY;
  }

  if (Array.isArray(context.referenceRouteCoordinates)) {
    const routeDistance = distancePointToPolylineMeters(
      latitude,
      longitude,
      context.referenceRouteCoordinates,
    );

    if (Number.isFinite(routeDistance)) {
      return routeDistance;
    }
  }

  const averageLatitude =
    (context.startLatitude + context.endLatitude) / 2;
  const start = projectToMeters(
    context.startLatitude,
    context.startLongitude,
    averageLatitude,
  );
  const end = projectToMeters(
    context.endLatitude,
    context.endLongitude,
    averageLatitude,
  );
  const candidate = projectToMeters(latitude, longitude, averageLatitude);

  return distanceToSegmentMeters(candidate, start, end);
}

function distancePointToPolylineMeters(
  latitude: number,
  longitude: number,
  coordinates: number[][],
): number {
  const routePoints = coordinates.filter(
    (coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      Number.isFinite(Number(coordinate[0])) &&
      Number.isFinite(Number(coordinate[1])),
  );

  if (routePoints.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const referenceLatitude =
    routePoints.reduce(
      (total, coordinate) => total + Number(coordinate[1]),
      0,
    ) / routePoints.length;
  const projectedPoint = projectToMeters(latitude, longitude, referenceLatitude);

  if (routePoints.length === 1) {
    const onlyPoint = projectToMeters(
      Number(routePoints[0][1]),
      Number(routePoints[0][0]),
      referenceLatitude,
    );

    return Math.hypot(
      projectedPoint.x - onlyPoint.x,
      projectedPoint.y - onlyPoint.y,
    );
  }

  let shortestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = projectToMeters(
      Number(routePoints[index][1]),
      Number(routePoints[index][0]),
      referenceLatitude,
    );
    const end = projectToMeters(
      Number(routePoints[index + 1][1]),
      Number(routePoints[index + 1][0]),
      referenceLatitude,
    );
    const distance = distanceToSegmentMeters(projectedPoint, start, end);

    if (distance < shortestDistance) {
      shortestDistance = distance;
    }
  }

  return shortestDistance;
}

function projectToMeters(
  latitude: number,
  longitude: number,
  referenceLatitude: number,
): ProjectedPoint {
  const metersPerLatitudeDegree = 111320;
  const metersPerLongitudeDegree =
    111320 * Math.cos((referenceLatitude * Math.PI) / 180);

  return {
    x: longitude * metersPerLongitudeDegree,
    y: latitude * metersPerLatitudeDegree,
  };
}

function distanceToSegmentMeters(
  point: ProjectedPoint,
  start: ProjectedPoint,
  end: ProjectedPoint,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
        segmentLengthSquared,
    ),
  );
  const projectedX = start.x + projection * segmentX;
  const projectedY = start.y + projection * segmentY;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}
