import { RouteAdjustmentContext } from '../interfaces/route-adjustment-context.interface';
import { RouteAvoidanceZoneGroup } from '../interfaces/route-avoidance-zone-group.interface';
import { RoutingWaypoint } from '../interfaces/routing-provider.interface';
import {
  metersToLatitudeDegrees,
  metersToLongitudeDegrees,
} from './geometry.util';

type Vector2 = {
  x: number;
  y: number;
};

const DETOUR_OFFSET_MULTIPLIERS = [1.15, 1.8, 2.6, 3.5];
const DETOUR_FORWARD_MULTIPLIERS = [0, 0.55, 1.05, 1.45];

export function buildProgressiveDetourWaypoints(
  context: RouteAdjustmentContext,
  group: RouteAvoidanceZoneGroup,
  wideningStage: number,
): RoutingWaypoint[] {
  const center = resolveGroupCenter(group);
  const latitude = Number(center?.latitude);
  const longitude = Number(center?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [];
  }

  const normalizedStage = Math.max(
    0,
    Math.min(
      Math.round(wideningStage),
      DETOUR_OFFSET_MULTIPLIERS.length - 1,
    ),
  );
  const basePaddingMeters = Math.max(
    Number(group.escalationPaddingMeters) || 0,
    120,
  );
  const lateralOffsetMeters =
    basePaddingMeters * DETOUR_OFFSET_MULTIPLIERS[normalizedStage];
  const forwardOffsetMeters =
    basePaddingMeters * DETOUR_FORWARD_MULTIPLIERS[normalizedStage];
  const direction = buildDirectionVector(context);
  const perpendicular = buildPerpendicularVector(direction);
  const waypoints: RoutingWaypoint[] = [];

  [1, -1].forEach((side) => {
    waypoints.push(
      translateWaypoint(
        latitude,
        longitude,
        direction,
        perpendicular,
        lateralOffsetMeters * side,
        0,
      ),
    );

    if (forwardOffsetMeters > 0) {
      waypoints.push(
        translateWaypoint(
          latitude,
          longitude,
          direction,
          perpendicular,
          lateralOffsetMeters * side,
          forwardOffsetMeters,
        ),
      );
      waypoints.push(
        translateWaypoint(
          latitude,
          longitude,
          direction,
          perpendicular,
          lateralOffsetMeters * side,
          -forwardOffsetMeters,
        ),
      );
    }
  });

  return dedupeWaypoints(waypoints);
}

function resolveGroupCenter(
  group: RouteAvoidanceZoneGroup,
): RoutingWaypoint | null {
  const latitude = Number(group.latitude);
  const longitude = Number(group.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  const ring = Array.isArray(group.zones?.[0]?.coordinates)
    ? group.zones[0].coordinates[0]
    : null;

  if (!Array.isArray(ring) || ring.length === 0) {
    return null;
  }

  const validCoordinates = ring.filter(
    (coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      Number.isFinite(Number(coordinate[0])) &&
      Number.isFinite(Number(coordinate[1])),
  );

  if (validCoordinates.length === 0) {
    return null;
  }

  const longitudes = validCoordinates.map(([candidateLongitude]) =>
    Number(candidateLongitude),
  );
  const latitudes = validCoordinates.map(([, candidateLatitude]) =>
    Number(candidateLatitude),
  );

  return {
    latitude:
      (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude:
      (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

function buildDirectionVector(
  context: RouteAdjustmentContext,
): Vector2 {
  const averageLatitude =
    (context.startLatitude + context.endLatitude) / 2;
  const metersPerLatitudeDegree = 111320;
  const metersPerLongitudeDegree =
    111320 * Math.cos((averageLatitude * Math.PI) / 180);
  const x =
    (context.endLongitude - context.startLongitude) * metersPerLongitudeDegree;
  const y =
    (context.endLatitude - context.startLatitude) * metersPerLatitudeDegree;
  const magnitude = Math.hypot(x, y);

  if (magnitude === 0) {
    return { x: 1, y: 0 };
  }

  return {
    x: x / magnitude,
    y: y / magnitude,
  };
}

function buildPerpendicularVector(direction: Vector2): Vector2 {
  return {
    x: -direction.y,
    y: direction.x,
  };
}

function translateWaypoint(
  centerLatitude: number,
  centerLongitude: number,
  direction: Vector2,
  perpendicular: Vector2,
  lateralOffsetMeters: number,
  forwardOffsetMeters: number,
): RoutingWaypoint {
  const longitudeOffsetMeters =
    perpendicular.x * lateralOffsetMeters + direction.x * forwardOffsetMeters;
  const latitudeOffsetMeters =
    perpendicular.y * lateralOffsetMeters + direction.y * forwardOffsetMeters;

  return {
    latitude:
      centerLatitude + metersToLatitudeDegrees(latitudeOffsetMeters),
    longitude:
      centerLongitude +
      metersToLongitudeDegrees(longitudeOffsetMeters, centerLatitude),
  };
}

function dedupeWaypoints(waypoints: RoutingWaypoint[]): RoutingWaypoint[] {
  const seen = new Set<string>();

  return waypoints.filter((waypoint) => {
    const key =
      `${Number(waypoint.latitude).toFixed(6)}:` +
      `${Number(waypoint.longitude).toFixed(6)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
