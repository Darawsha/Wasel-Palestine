import { Injectable } from '@nestjs/common';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteComplianceSummary } from '../interfaces/route-compliance-summary.interface';
import { RouteFactor } from '../interfaces/route-factor.interface';

@Injectable()
export class RouteMetadataService {
  build(params: {
    method: RouteEstimationMethod;
    appliedConstraints: RouteConstraintType[];
    factors: RouteFactor[];
    compliance: RouteComplianceSummary;
    warnings?: string[];
  }) {
    return {
      method: params.method,
      appliedConstraints: this.removeDuplicateConstraints(
        params.appliedConstraints,
      ),
      factors: params.factors,
      compliance: params.compliance,
      warnings: this.removeDuplicateStrings(params.warnings ?? []),
    };
  }

  private removeDuplicateConstraints(
    constraints: RouteConstraintType[],
  ): RouteConstraintType[] {
    return [...new Set(constraints)];
  }

  private removeDuplicateStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
