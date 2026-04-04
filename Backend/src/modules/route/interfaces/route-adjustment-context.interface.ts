import { AvoidAreaInput } from './avoid-area-input.interface';

export interface RouteAdjustmentContext {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  avoidCheckpoints?: boolean;
  avoidAreas?: AvoidAreaInput[];
}