import { Injectable, Optional } from '@nestjs/common';
import { CheckpointsService } from '../../checkpoints/checkpoints.service';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { ReportCategory } from '../../reports/enums/report-category.enum';
import { ReportsService } from '../../reports/services/reports.service';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteFactorType } from '../enums/route-factor-type.enum';
import { RouteAdjustmentContext } from '../interfaces/route-adjustment-context.interface';
import { RouteConstraintAvoidanceResult } from '../interfaces/route-constraint-avoidance-result.interface';
import {
  buildCorridorAvoidanceZone,
  getRouteCorridorAxis,
} from '../utils/route-zone.util';

@Injectable()
export class CheckpointAvoidanceStrategy {
  constructor(
    private readonly checkpointsService: CheckpointsService,
    @Optional() private readonly reportsService?: ReportsService,
  ) {}

  async build(
    context: RouteAdjustmentContext,
  ): Promise<RouteConstraintAvoidanceResult> {
    if (!context.avoidCheckpoints) {
      return {
        constraint: RouteConstraintType.AVOID_CHECKPOINTS,
        groups: [],
        factors: [],
      };
    }

    const [checkpoints, checkpointReports] = await Promise.all([
      this.checkpointsService.getFilteredCheckpoints({}),
      this.reportsService?.getApprovedReportsByCategories([
        ReportCategory.CHECKPOINT_ISSUE,
      ]) ?? Promise.resolve([]),
    ]);
    const routeRelevantCheckpoints = checkpoints.filter(
      (checkpoint) =>
        Number.isFinite(Number(checkpoint?.latitude)) &&
        Number.isFinite(Number(checkpoint?.longitude)),
    );
    const routeRelevantReports = checkpointReports.filter(
      (report) =>
        Number.isFinite(Number(report?.latitude)) &&
        Number.isFinite(Number(report?.longitude)),
    );

    if (!routeRelevantCheckpoints.length && !routeRelevantReports.length) {
      return {
        constraint: RouteConstraintType.AVOID_CHECKPOINTS,
        groups: [],
        factors: [],
      };
    }

    const axis = getRouteCorridorAxis(context);
    const checkpointGroups = routeRelevantCheckpoints
      .map((checkpoint) => {
        const latitude = Number(checkpoint.latitude);
        const longitude = Number(checkpoint.longitude);
        const profile = this.resolveProfile(checkpoint.currentStatus);
        const zones = [
          buildCorridorAvoidanceZone(
            latitude,
            longitude,
            axis,
            profile.halfLengthMeters,
            profile.halfWidthMeters,
          ),
        ];

        if (!zones.length) {
          return null;
        }

        return {
          constraint: RouteConstraintType.AVOID_CHECKPOINTS,
          sourceKey: `checkpoint:${checkpoint.id}`,
          sourceLabel: checkpoint.name || checkpoint.location || 'checkpoint',
          latitude,
          longitude,
          zones,
          escalationPaddingMeters: profile.escalationPaddingMeters,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
    const reportGroups = routeRelevantReports
      .map((report) => {
        const latitude = Number(report.latitude);
        const longitude = Number(report.longitude);
        const profile = this.resolveProfile(CheckpointStatus.RESTRICTED);
        const zones = [
          buildCorridorAvoidanceZone(
            latitude,
            longitude,
            axis,
            profile.halfLengthMeters,
            profile.halfWidthMeters,
          ),
        ];

        if (!zones.length) {
          return null;
        }

        return {
          constraint: RouteConstraintType.AVOID_CHECKPOINTS,
          sourceKey: `checkpoint-report:${report.reportId}`,
          sourceLabel:
            report.location || report.description || 'checkpoint report',
          latitude,
          longitude,
          zones,
          escalationPaddingMeters: profile.escalationPaddingMeters,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
    const groups = [...checkpointGroups, ...reportGroups];

    if (!groups.length) {
      return {
        constraint: RouteConstraintType.AVOID_CHECKPOINTS,
        groups: [],
        factors: [],
      };
    }

    return {
      constraint: RouteConstraintType.AVOID_CHECKPOINTS,
      groups,
      factors: [
        {
          type: RouteFactorType.CHECKPOINT_AVOIDANCE,
          description:
            `Built ${groups.length} narrow checkpoint road-avoidance corridor(s) ` +
            `for ${routeRelevantCheckpoints.length} checkpoint(s) and ` +
            `${routeRelevantReports.length} approved checkpoint report(s).`,
        },
      ],
    };
  }

  private resolveProfile(status?: CheckpointStatus) {
    switch (status) {
      case CheckpointStatus.CLOSED:
        return {
          halfLengthMeters: 210,
          halfWidthMeters: 28,
          escalationPaddingMeters: 90,
        };
      case CheckpointStatus.RESTRICTED:
        return {
          halfLengthMeters: 180,
          halfWidthMeters: 26,
          escalationPaddingMeters: 78,
        };
      case CheckpointStatus.DELAYED:
        return {
          halfLengthMeters: 150,
          halfWidthMeters: 24,
          escalationPaddingMeters: 66,
        };
      default:
        return {
          halfLengthMeters: 130,
          halfWidthMeters: 22,
          escalationPaddingMeters: 58,
        };
    }
  }
}
