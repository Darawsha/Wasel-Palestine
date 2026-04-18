import { Injectable, Optional } from '@nestjs/common';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { IncidentsService } from '../../incidents/incidents.service';
import { IncidentSeverity } from '../../incidents/enums/incident-severity.enum';
import { IncidentStatus } from '../../incidents/enums/incident-status.enum';
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
export class IncidentAvoidanceStrategy {
  constructor(
    private readonly incidentsService: IncidentsService,
    @Optional() private readonly reportsService?: ReportsService,
  ) {}

  async build(
    context: RouteAdjustmentContext,
  ): Promise<RouteConstraintAvoidanceResult> {
    if (!context.avoidIncidents) {
      return {
        constraint: RouteConstraintType.AVOID_INCIDENTS,
        groups: [],
        factors: [],
      };
    }

    const [incidents, incidentReports] = await Promise.all([
      this.incidentsService.getFilteredIncidents({}),
      this.reportsService?.getApprovedReportsByCategories([
        ReportCategory.ROAD_CLOSURE,
        ReportCategory.DELAY,
        ReportCategory.ACCIDENT,
        ReportCategory.HAZARD,
      ]) ?? Promise.resolve([]),
    ]);
    const routeRelevantIncidents = incidents.filter(
      (incident) =>
        incident.status === IncidentStatus.ACTIVE &&
        Number.isFinite(Number(incident?.latitude)) &&
        Number.isFinite(Number(incident?.longitude)),
    );
    const routeRelevantReports = incidentReports.filter(
      (report) =>
        Number.isFinite(Number(report?.latitude)) &&
        Number.isFinite(Number(report?.longitude)),
    );

    if (!routeRelevantIncidents.length && !routeRelevantReports.length) {
      return {
        constraint: RouteConstraintType.AVOID_INCIDENTS,
        groups: [],
        factors: [],
      };
    }

    const axis = getRouteCorridorAxis(context);
    const incidentGroups = routeRelevantIncidents
      .map((incident) => {
        const latitude = Number(incident.latitude);
        const longitude = Number(incident.longitude);
        const profile = this.resolveProfile(incident.type, incident.severity);
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
          constraint: RouteConstraintType.AVOID_INCIDENTS,
          sourceKey: `incident:${incident.id}`,
          sourceLabel:
            incident.location || incident.title || `incident ${incident.id}`,
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
        const reportProfile = this.resolveReportProfile(report.category);
        const profile = this.resolveProfile(
          reportProfile.type,
          reportProfile.severity,
        );
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
          constraint: RouteConstraintType.AVOID_INCIDENTS,
          sourceKey: `incident-report:${report.reportId}`,
          sourceLabel: report.location || report.description || 'incident report',
          latitude,
          longitude,
          zones,
          escalationPaddingMeters: profile.escalationPaddingMeters,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
    const groups = [...incidentGroups, ...reportGroups];

    if (!groups.length) {
      return {
        constraint: RouteConstraintType.AVOID_INCIDENTS,
        groups: [],
        factors: [],
      };
    }

    return {
      constraint: RouteConstraintType.AVOID_INCIDENTS,
      groups,
      factors: [
        {
          type: RouteFactorType.INCIDENT_AVOIDANCE,
          description:
            `Built ${groups.length} narrow incident road-avoidance corridor(s) ` +
            `for ${routeRelevantIncidents.length} active incident(s) and ` +
            `${routeRelevantReports.length} approved incident report(s).`,
        },
      ],
    };
  }

  private resolveProfile(
    type?: IncidentType,
    severity?: IncidentSeverity,
  ) {
    const baseProfile = this.resolveSeverityProfile(severity);
    const adjustments = this.resolveTypeAdjustments(type);

    return {
      halfLengthMeters: Math.round(
        baseProfile.halfLengthMeters * adjustments.length,
      ),
      halfWidthMeters: Math.round(
        baseProfile.halfWidthMeters * adjustments.width,
      ),
      escalationPaddingMeters: Math.round(
        baseProfile.escalationPaddingMeters * adjustments.escalationPadding,
      ),
    };
  }

  private resolveReportProfile(category?: ReportCategory): {
    type: IncidentType;
    severity: IncidentSeverity;
  } {
    switch (category) {
      case ReportCategory.ROAD_CLOSURE:
        return {
          type: IncidentType.CLOSURE,
          severity: IncidentSeverity.HIGH,
        };
      case ReportCategory.DELAY:
        return {
          type: IncidentType.DELAY,
          severity: IncidentSeverity.MEDIUM,
        };
      case ReportCategory.ACCIDENT:
        return {
          type: IncidentType.ACCIDENT,
          severity: IncidentSeverity.HIGH,
        };
      case ReportCategory.HAZARD:
        return {
          type: IncidentType.WEATHER_HAZARD,
          severity: IncidentSeverity.MEDIUM,
        };
      default:
        return {
          type: IncidentType.ACCIDENT,
          severity: IncidentSeverity.MEDIUM,
        };
    }
  }

  private resolveSeverityProfile(severity?: IncidentSeverity) {
    switch (severity) {
      case IncidentSeverity.CRITICAL:
        return {
          halfLengthMeters: 260,
          halfWidthMeters: 30,
          escalationPaddingMeters: 92,
        };
      case IncidentSeverity.HIGH:
        return {
          halfLengthMeters: 220,
          halfWidthMeters: 28,
          escalationPaddingMeters: 82,
        };
      case IncidentSeverity.MEDIUM:
        return {
          halfLengthMeters: 180,
          halfWidthMeters: 25,
          escalationPaddingMeters: 72,
        };
      default:
        return {
          halfLengthMeters: 145,
          halfWidthMeters: 22,
          escalationPaddingMeters: 62,
        };
    }
  }

  private resolveTypeAdjustments(type?: IncidentType) {
    switch (type) {
      case IncidentType.CLOSURE:
        return {
          length: 1.15,
          width: 1.12,
          escalationPadding: 1.12,
        };
      case IncidentType.ACCIDENT:
        return {
          length: 1,
          width: 1,
          escalationPadding: 1.04,
        };
      case IncidentType.WEATHER_HAZARD:
        return {
          length: 1.08,
          width: 1.05,
          escalationPadding: 1.06,
        };
      case IncidentType.DELAY:
        return {
          length: 0.82,
          width: 0.9,
          escalationPadding: 0.92,
        };
      default:
        return {
          length: 1,
          width: 1,
          escalationPadding: 1,
        };
    }
  }
}
