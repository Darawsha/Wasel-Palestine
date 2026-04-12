import { RouteOptionKind } from '../enums/route-option-kind.enum';
import { RouteRecommendationReason } from '../enums/route-recommendation-reason.enum';
import { RouteComparisonSummary } from './route-comparison-summary.interface';

export interface RoutePlanDecision {
  primaryRouteKind: RouteOptionKind;
  suggestedRouteKind: RouteOptionKind | null;
  requiresUserApproval: boolean;
  autoApplied: boolean;
  reason: RouteRecommendationReason;
  message: string;
  comparison: RouteComparisonSummary | null;
  warnings: string[];
}
