/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import { Incident } from '../../incidents/entities/incident.entity';
import { IncidentStatus } from '../../incidents/enums/incident-status.enum';
import { IncidentSeverity } from '../../incidents/enums/incident-severity.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { Report } from '../../reports/entities/report.entity';
import { ReportCategory } from '../../reports/enums/report-category.enum';
import { ReportStatus } from '../../reports/enums/report-status.enum';
import { User } from '../../users/entities/user.entity';
import { AlertPreference } from '../entities/alert-preference.entity';
import { AlertMatchesService } from './alert-matches.service';
import { AlertsValidationService } from './alerts-validation.service';

describe('AlertMatchesService', () => {
  let service: AlertMatchesService;
  let preferenceRepository: { find: jest.Mock };
  let checkpointsRepository: { find: jest.Mock };
  let incidentsRepository: { find: jest.Mock };
  let reportsRepository: { find: jest.Mock };
  let usersRepository: { findOne: jest.Mock; save: jest.Mock };
  let alertsValidationService: { ensureValidUserId: jest.Mock };

  beforeEach(async () => {
    preferenceRepository = { find: jest.fn() };
    checkpointsRepository = { find: jest.fn() };
    incidentsRepository = { find: jest.fn() };
    reportsRepository = { find: jest.fn() };
    usersRepository = {
      findOne: jest.fn(),
      save: jest.fn((user) => Promise.resolve(user)),
    };
    alertsValidationService = {
      ensureValidUserId: jest.fn((userId) => userId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertMatchesService,
        {
          provide: getRepositoryToken(AlertPreference),
          useValue: preferenceRepository,
        },
        {
          provide: getRepositoryToken(Checkpoint),
          useValue: checkpointsRepository,
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: incidentsRepository,
        },
        {
          provide: getRepositoryToken(Report),
          useValue: reportsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: AlertsValidationService,
          useValue: alertsValidationService,
        },
      ],
    }).compile();

    service = module.get<AlertMatchesService>(AlertMatchesService);
  });

  it('returns grouped subscriptions with current matches from incident, checkpoint, and report sources', async () => {
    preferenceRepository.find.mockResolvedValue([
      {
        id: 'pref-1',
        userId: 7,
        geographicArea: 'Awarta checkpoint',
        incidentCategory: IncidentType.CLOSURE,
        createdAt: new Date('2026-04-13T08:00:00.000Z'),
      },
    ]);
    incidentsRepository.find.mockResolvedValue([
      {
        id: 15,
        title: 'Closure at Awarta',
        location: 'Awarta checkpoint',
        type: IncidentType.CLOSURE,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.ACTIVE,
        isVerified: true,
        updatedAt: new Date('2026-04-13T09:00:00.000Z'),
        checkpoint: {
          name: 'Awarta Checkpoint',
          location: 'Awarta checkpoint',
        },
      },
    ]);
    checkpointsRepository.find.mockResolvedValue([
      {
        id: 22,
        name: 'Awarta Checkpoint',
        location: 'Awarta checkpoint',
        currentStatus: CheckpointStatus.CLOSED,
        updatedAt: new Date('2026-04-13T07:30:00.000Z'),
      },
    ]);
    reportsRepository.find.mockResolvedValue([
      {
        reportId: 31,
        location: 'Awarta checkpoint',
        category: ReportCategory.ROAD_CLOSURE,
        status: ReportStatus.APPROVED,
        updatedAt: new Date('2026-04-13T06:00:00.000Z'),
      },
    ]);

    const result = await service.getUserAlertOverview(7);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        key: 'awarta checkpoint',
        location: 'Awarta checkpoint',
        preferenceIds: ['pref-1'],
        categories: [{ key: IncidentType.CLOSURE }],
        matchCount: 3,
      }),
    );
    expect(result[0].currentMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'incident:15',
          sourceRecordId: '15',
          sourceType: 'incident',
          categoryKey: IncidentType.CLOSURE,
          severityKey: 'HIGH',
          isVerified: true,
        }),
        expect.objectContaining({
          id: 'checkpoint:22',
          sourceRecordId: '22',
          sourceType: 'checkpoint',
          categoryKey: IncidentType.CLOSURE,
        }),
        expect.objectContaining({
          id: 'report:31',
          sourceRecordId: '31',
          sourceType: 'report',
          categoryKey: IncidentType.CLOSURE,
        }),
      ]),
    );
  });
});
