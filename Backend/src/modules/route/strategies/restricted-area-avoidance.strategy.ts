import { Injectable } from '@nestjs/common';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteFactorType } from '../enums/route-factor-type.enum';
import { RouteAdjustmentContext } from '../interfaces/route-adjustment-context.interface';
import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';
import { RouteFactor } from '../interfaces/route-factor.interface';
import { buildCircularAvoidanceZone } from '../utils/route-zone.util';

export interface RestrictedAreaAvoidanceBuildResult {
  zones: RouteAvoidanceZone[];
  appliedConstraints: RouteConstraintType[];
  factors: RouteFactor[];
}

@Injectable()
export class RestrictedAreaAvoidanceStrategy {
  async build(
    context: RouteAdjustmentContext,
  ): Promise<RestrictedAreaAvoidanceBuildResult> {
    if (!context.avoidAreas || context.avoidAreas.length === 0) {
      return {
        zones: [],
        appliedConstraints: [],
        factors: [],
      };
    }

    const zones = context.avoidAreas.map((area) =>
      buildCircularAvoidanceZone(
        area.centerLatitude,
        area.centerLongitude,
        area.radiusMeters,
      ),
    );

    return {
      zones,
      appliedConstraints: [RouteConstraintType.AVOID_AREAS],
      factors: [
        {
          type: RouteFactorType.AREA_AVOIDANCE,
          description: `Avoided ${zones.length} restricted area(s) provided in the request.`,
        },
      ],
    };
  }
}