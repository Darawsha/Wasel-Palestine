import { RouteFactorType } from '../enums/route-factor-type.enum';

export interface RouteFactor {
  type: RouteFactorType;
  description: string;
  impactDistanceKm?: number;
  impactDurationMinutes?: number;
}