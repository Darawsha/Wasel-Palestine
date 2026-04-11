import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteAvoidanceZone } from './route-avoidance-zone.interface';

export interface RouteAvoidanceZoneGroup {
  constraint: RouteConstraintType;
  sourceKey: string;
  sourceLabel: string;
  latitude?: number;
  longitude?: number;
  zones: RouteAvoidanceZone[];
  escalationPaddingMeters?: number;
}
