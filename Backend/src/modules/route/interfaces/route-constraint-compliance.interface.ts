import { RouteConstraintType } from '../enums/route-constraint-type.enum';

export interface RouteConstraintCompliance {
  constraint: RouteConstraintType;
  requested: boolean;
  satisfied: boolean;
  intersectedGroupCount: number;
  intersectedZoneCount: number;
  intersectedSegmentCount: number;
  pointsInsideZoneCount: number;
}
