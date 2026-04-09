import { Injectable } from '@nestjs/common';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteFactor } from '../interfaces/route-factor.interface';

@Injectable()
export class RouteMetadataService {
  build(params: {
    method: RouteEstimationMethod;
    appliedConstraints: RouteConstraintType[];
    factors: RouteFactor[];
    warnings?: string[];
  }) {
    return {
      method: params.method,
      appliedConstraints: this.removeDuplicateConstraints(
        params.appliedConstraints,
      ),
      factors: params.factors,
      warnings: params.warnings ?? [],
    };
  }

  private removeDuplicateConstraints(
    constraints: RouteConstraintType[],
  ): RouteConstraintType[] {
    return [...new Set(constraints)];
  }
}