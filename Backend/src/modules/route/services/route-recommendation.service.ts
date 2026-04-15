import { Injectable } from '@nestjs/common';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteOptionKind } from '../enums/route-option-kind.enum';
import { RouteRecommendationReason } from '../enums/route-recommendation-reason.enum';
import { RouteComplianceSummary } from '../interfaces/route-compliance-summary.interface';
import { ResolvedRouteOption } from '../interfaces/resolved-route-option.interface';
import { RouteComparisonSummary } from '../interfaces/route-comparison-summary.interface';
import { RoutePlanDecision } from '../interfaces/route-plan-decision.interface';

type RecommendationParams = {
  requestedConstraints: RouteConstraintType[];
  defaultRoute: ResolvedRouteOption;
  avoidedRoute?: ResolvedRouteOption | null;
  warnings?: string[];
};

@Injectable()
export class RouteRecommendationService {
  recommend(params: RecommendationParams): RoutePlanDecision {
    const warnings = params.warnings ?? [];
    const requestedConstraints = [...new Set(params.requestedConstraints)];
    const defaultRouteIsCompliant =
      params.defaultRoute.metadata.compliance.isFullyCompliant;

    if (requestedConstraints.length === 0) {
      return {
        primaryRouteKind: RouteOptionKind.DEFAULT,
        suggestedRouteKind: null,
        requiresUserApproval: false,
        autoApplied: false,
        reason: RouteRecommendationReason.NO_AVOIDANCE_REQUESTED,
        message: 'No avoidance preferences were selected, so the default route remains active.',
        comparison: null,
        warnings,
      };
    }

    if (!params.avoidedRoute) {
      if (defaultRouteIsCompliant) {
        return {
          primaryRouteKind: RouteOptionKind.DEFAULT,
          suggestedRouteKind: null,
          requiresUserApproval: false,
          autoApplied: false,
          reason: RouteRecommendationReason.NO_VALID_AVOIDED_ROUTE,
          message:
            'The current route already avoids ' +
            this.formatConstraintList(requestedConstraints) +
            ', so no alternative route was needed.',
          comparison: null,
          warnings,
        };
      }

      return {
        primaryRouteKind: RouteOptionKind.DEFAULT,
        suggestedRouteKind: null,
        requiresUserApproval: false,
        autoApplied: false,
        reason: RouteRecommendationReason.NO_FULLY_COMPLIANT_ROUTE,
        message:
          'No fully compliant route could be found for ' +
          this.formatConstraintList(requestedConstraints) +
          ', so the current route remains active.',
        comparison: null,
        warnings,
      };
    }

    if (defaultRouteIsCompliant) {
      const comparison = this.buildComparisonSummary(
        params.defaultRoute,
        params.avoidedRoute,
      );

      return {
        primaryRouteKind: RouteOptionKind.DEFAULT,
        suggestedRouteKind: RouteOptionKind.AVOIDED,
        requiresUserApproval: true,
        autoApplied: false,
        reason: RouteRecommendationReason.AVOIDED_ROUTE_REQUIRES_CONFIRMATION,
        message: this.buildConfirmationMessage(comparison, requestedConstraints),
        comparison,
        warnings,
      };
    }

    const comparison = this.buildComparisonSummary(
      params.defaultRoute,
      params.avoidedRoute,
    );
    const compliance = params.avoidedRoute.metadata.compliance;

    if (!compliance.isFullyCompliant) {
      return {
        primaryRouteKind: RouteOptionKind.DEFAULT,
        suggestedRouteKind: null,
        requiresUserApproval: false,
        autoApplied: false,
        reason: RouteRecommendationReason.NO_FULLY_COMPLIANT_ROUTE,
        message: this.buildNoCompliantRouteMessage(
          comparison,
          compliance,
          requestedConstraints,
        ),
        comparison,
        warnings,
      };
    }

    return {
      primaryRouteKind: RouteOptionKind.AVOIDED,
      suggestedRouteKind: null,
      requiresUserApproval: false,
      autoApplied: true,
      reason: RouteRecommendationReason.AVOIDED_ROUTE_AUTO_APPLIED,
      message: this.buildAutoAppliedMessage(comparison, requestedConstraints),
      comparison,
      warnings,
    };
  }

  private buildConfirmationMessage(
    comparison: RouteComparisonSummary,
    requestedConstraints: RouteConstraintType[],
  ): string {
    return (
      'An avoided route is available for ' +
      this.formatConstraintList(requestedConstraints) +
      '. It adds ' +
      comparison.distanceIncreaseKm.toFixed(2) +
      ' km and ' +
      comparison.durationIncreaseMinutes +
      ' min compared with the default route. Review it on the map and confirm if you want to switch.'
    );
  }

  private buildComparisonSummary(
    defaultRoute: ResolvedRouteOption,
    avoidedRoute: ResolvedRouteOption,
  ): RouteComparisonSummary {
    const distanceIncreaseKm = this.roundMetric(
      Math.max(
        avoidedRoute.estimatedDistanceKm - defaultRoute.estimatedDistanceKm,
        0,
      ),
    );
    const durationIncreaseMinutes = Math.max(
      avoidedRoute.estimatedDurationMinutes -
        defaultRoute.estimatedDurationMinutes,
      0,
    );
    const distanceIncreasePercent = this.roundPercentage(
      distanceIncreaseKm,
      defaultRoute.estimatedDistanceKm,
    );
    const durationIncreasePercent = this.roundPercentage(
      durationIncreaseMinutes,
      defaultRoute.estimatedDurationMinutes,
    );

    return {
      distanceIncreaseKm,
      distanceIncreasePercent,
      durationIncreaseMinutes,
      durationIncreasePercent,
      isWithinAutoApplyThresholds: true,
    };
  }

  private buildAutoAppliedMessage(
    comparison: RouteComparisonSummary,
    requestedConstraints: RouteConstraintType[],
  ): string {
    if (
      comparison.distanceIncreaseKm === 0 &&
      comparison.durationIncreaseMinutes === 0
    ) {
      return (
        'The route that avoids ' +
        this.formatConstraintList(requestedConstraints) +
        ' was selected automatically because it is effectively the same as the default route.'
      );
    }

    return (
      'The route that avoids ' +
      this.formatConstraintList(requestedConstraints) +
      ' was selected automatically. It adds ' +
      comparison.distanceIncreaseKm.toFixed(2) +
      ' km and ' +
      comparison.durationIncreaseMinutes +
      ' min compared with the default route.'
    );
  }

  private buildNoCompliantRouteMessage(
    comparison: RouteComparisonSummary,
    compliance: RouteComplianceSummary,
    requestedConstraints: RouteConstraintType[],
  ): string {
    const unsatisfiedSummary = compliance.constraintResults
      .filter((result) => !result.satisfied)
      .map((result) => {
        const label = this.formatSingleConstraint(result.constraint);
        const count = result.intersectedGroupCount;
        const suffix = count === 1 ? 'corridor' : 'corridors';

        return `${count} ${label} ${suffix}`;
      })
      .join(', ');

    return (
      'No fully compliant route could be found for ' +
      this.formatConstraintList(requestedConstraints) +
      '. The best available alternative still intersects ' +
      unsatisfiedSummary +
      ', so no avoided route was applied. It would add ' +
      comparison.distanceIncreaseKm.toFixed(2) +
      ' km and ' +
      comparison.durationIncreaseMinutes +
      ' min compared with the default route.'
    );
  }

  private roundMetric(value: number): number {
    return Number(value.toFixed(2));
  }

  private roundPercentage(
    increaseValue: number,
    baseValue: number,
  ): number {
    if (baseValue <= 0) {
      return 0;
    }

    return Number(((increaseValue / baseValue) * 100).toFixed(1));
  }

  private formatConstraintList(
    constraints: RouteConstraintType[],
  ): string {
    if (constraints.length === 1) {
      return this.formatSingleConstraint(constraints[0]);
    }

    if (constraints.length === 2) {
      return (
        this.formatSingleConstraint(constraints[0]) +
        ' and ' +
        this.formatSingleConstraint(constraints[1])
      );
    }

    return constraints.map((constraint) => this.formatSingleConstraint(constraint)).join(', ');
  }

  private formatSingleConstraint(
    constraint: RouteConstraintType,
  ): string {
    if (constraint === RouteConstraintType.AVOID_CHECKPOINTS) {
      return 'checkpoint-affected roads';
    }

    if (constraint === RouteConstraintType.AVOID_INCIDENTS) {
      return 'incident-affected roads';
    }

    return String(constraint || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ');
  }
}
