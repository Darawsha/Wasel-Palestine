import { RouteOptionKind } from '../enums/route-option-kind.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteFactor } from './route-factor.interface';
import { RouteComplianceSummary } from './route-compliance-summary.interface';

export interface ResolvedRouteOption {
  kind: RouteOptionKind;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  metadata: {
    method: RouteEstimationMethod;
    appliedConstraints: RouteConstraintType[];
    factors: RouteFactor[];
    compliance: RouteComplianceSummary;
    warnings: string[];
  };
}
