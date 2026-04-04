import { RouteEstimationResult } from './route-estimation-result.interface';
import { RouteAdjustmentContext } from './route-adjustment-context.interface';

export interface RouteAdjustmentStrategy {
  supports(context: RouteAdjustmentContext): boolean;

  apply(
    context: RouteAdjustmentContext,
    currentResult: RouteEstimationResult,
  ): Promise<RouteEstimationResult> | RouteEstimationResult;
}