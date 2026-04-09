import { Injectable } from '@nestjs/common';
import { CheckpointsService } from '../../checkpoints/checkpoints.service';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteFactorType } from '../enums/route-factor-type.enum';
import { RouteAdjustmentContext } from '../interfaces/route-adjustment-context.interface';
import { RouteAvoidanceZone } from '../interfaces/route-avoidance-zone.interface';
import { RouteFactor } from '../interfaces/route-factor.interface';
import { buildCircularAvoidanceZone } from '../utils/route-zone.util';

export interface CheckpointAvoidanceBuildResult {
  zones: RouteAvoidanceZone[];
  appliedConstraints: RouteConstraintType[];
  factors: RouteFactor[];
}

@Injectable()
export class CheckpointAvoidanceStrategy {
  private readonly checkpointAvoidanceRadiusMeters = 300;

  constructor(private readonly checkpointsService: CheckpointsService) {}

  async build(
    context: RouteAdjustmentContext,
  ): Promise<CheckpointAvoidanceBuildResult> {
    if (!context.avoidCheckpoints) {
      return {
        zones: [],
        appliedConstraints: [],
        factors: [],
      };
    }

    const checkpoints =
      await this.checkpointsService.findActiveForRouteEstimation();

    if (!checkpoints.length) {
      return {
        zones: [],
        appliedConstraints: [],
        factors: [],
      };
    }

    const zones = checkpoints
      .filter(
        (checkpoint) =>
          typeof checkpoint.latitude === 'number' &&
          typeof checkpoint.longitude === 'number',
      )
      .map((checkpoint) =>
        buildCircularAvoidanceZone(
          checkpoint.latitude,
          checkpoint.longitude,
          this.checkpointAvoidanceRadiusMeters,
        ),
      );

    if (!zones.length) {
      return {
        zones: [],
        appliedConstraints: [],
        factors: [],
      };
    }

    return {
      zones,
      appliedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
      factors: [
        {
          type: RouteFactorType.CHECKPOINT_AVOIDANCE,
          description: `Avoided ${zones.length} active checkpoint(s) by creating exclusion zones around them.`,
        },
      ],
    };
  }
}