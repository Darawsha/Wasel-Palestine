import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteFactor } from './route-factor.interface';

export interface RouteEstimationResult {
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  method: RouteEstimationMethod;
  appliedConstraints: RouteConstraintType[];
  factors: RouteFactor[];
  warnings: string[];
}