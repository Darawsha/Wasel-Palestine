import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteFactor } from './route-factor.interface';
import { RouteAvoidanceZoneGroup } from './route-avoidance-zone-group.interface';

export interface RouteConstraintAvoidanceResult {
  constraint: RouteConstraintType;
  groups: RouteAvoidanceZoneGroup[];
  factors: RouteFactor[];
}
