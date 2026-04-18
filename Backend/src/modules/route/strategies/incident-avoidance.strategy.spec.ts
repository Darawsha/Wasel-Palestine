import { IncidentAvoidanceStrategy } from './incident-avoidance.strategy';
import { IncidentSeverity } from '../../incidents/enums/incident-severity.enum';
import { IncidentStatus } from '../../incidents/enums/incident-status.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { ReportCategory } from '../../reports/enums/report-category.enum';

describe('IncidentAvoidanceStrategy', () => {
  it('builds avoidance groups for active incidents only', async () => {
    const incidentsService = {
      getFilteredIncidents: jest.fn().mockResolvedValue([
        {
          id: 1,
          latitude: 32,
          longitude: 35,
          type: IncidentType.CLOSURE,
          severity: IncidentSeverity.HIGH,
          status: IncidentStatus.ACTIVE,
          title: 'Active incident',
        },
        {
          id: 2,
          latitude: 32.001,
          longitude: 35.001,
          type: IncidentType.CLOSURE,
          severity: IncidentSeverity.HIGH,
          status: IncidentStatus.CLOSED,
          title: 'Closed incident',
        },
      ]),
    };
    const strategy = new IncidentAvoidanceStrategy(incidentsService as never);

    const result = await strategy.build({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidIncidents: true,
    });

    expect(incidentsService.getFilteredIncidents).toHaveBeenCalledWith({});
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].sourceKey).toBe('incident:1');
  });

  it('keeps active incidents eligible for avoidance even when they sit outside the straight-line corridor', async () => {
    const incidentsService = {
      getFilteredIncidents: jest.fn().mockResolvedValue([
        {
          id: 1,
          latitude: 32,
          longitude: 35,
          type: IncidentType.CLOSURE,
          severity: IncidentSeverity.HIGH,
          status: IncidentStatus.ACTIVE,
          title: 'Near corridor incident',
        },
        {
          id: 2,
          latitude: 32.28,
          longitude: 35.31,
          type: IncidentType.ACCIDENT,
          severity: IncidentSeverity.MEDIUM,
          status: IncidentStatus.ACTIVE,
          title: 'Detour incident',
        },
      ]),
    };
    const strategy = new IncidentAvoidanceStrategy(incidentsService as never);

    const result = await strategy.build({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidIncidents: true,
    });

    expect(result.groups).toHaveLength(2);
    expect(result.groups.map((group) => group.sourceKey)).toEqual([
      'incident:1',
      'incident:2',
    ]);
  });

  it('treats approved incident reports as incident avoidance groups', async () => {
    const incidentsService = {
      getFilteredIncidents: jest.fn().mockResolvedValue([]),
    };
    const reportsService = {
      getApprovedReportsByCategories: jest.fn().mockResolvedValue([
        {
          reportId: 9,
          latitude: 32.1,
          longitude: 35.1,
          category: ReportCategory.ROAD_CLOSURE,
          location: 'Reported closure',
        },
      ]),
    };
    const strategy = new IncidentAvoidanceStrategy(
      incidentsService as never,
      reportsService as never,
    );

    const result = await strategy.build({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidIncidents: true,
    });

    expect(reportsService.getApprovedReportsByCategories).toHaveBeenCalledWith([
      ReportCategory.ROAD_CLOSURE,
      ReportCategory.DELAY,
      ReportCategory.ACCIDENT,
      ReportCategory.HAZARD,
    ]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].sourceKey).toBe('incident-report:9');
    expect(result.groups[0].constraint).toBe('AVOID_INCIDENTS');
  });
});
