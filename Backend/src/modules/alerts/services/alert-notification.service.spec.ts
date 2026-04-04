/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import {
  IncidentAlertEvent,
  IncidentAlertTrigger,
} from '../../../common/events/incident-created.event';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { IncidentSeverity } from '../../incidents/enums/incident-severity.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { AlertPreferencesService } from './alert-preferences.service';
import { AlertRecordsService } from './alert-records.service';
import { AlertNotificationService } from './alert-notification.service';

describe('AlertNotificationService', () => {
  let service: AlertNotificationService;
  let alertPreferencesService: {
    findActiveSubscribers: jest.Mock;
  };
  let alertRecordsService: {
    createPendingRecordsForSubscribers: jest.Mock;
  };

  beforeEach(async () => {
    alertPreferencesService = {
      findActiveSubscribers: jest.fn(),
    };

    alertRecordsService = {
      createPendingRecordsForSubscribers: jest.fn(async () => 1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertNotificationService,
        {
          provide: AlertPreferencesService,
          useValue: alertPreferencesService,
        },
        {
          provide: AlertRecordsService,
          useValue: alertRecordsService,
        },
      ],
    }).compile();

    service = module.get<AlertNotificationService>(AlertNotificationService);
  });

  it('creates a rich verified alert message with checkpoint impact', async () => {
    const event: IncidentAlertEvent = {
      incidentId: '42',
      trigger: IncidentAlertTrigger.VERIFIED_ACTIVE,
      incidentType: IncidentType.CLOSURE,
      severity: IncidentSeverity.CRITICAL,
      geographicArea: 'Qalandia',
      description: 'Checkpoint closed in both directions.',
      checkpointName: 'Qalandia Checkpoint',
      impactStatus: CheckpointStatus.CLOSED,
    };

    alertPreferencesService.findActiveSubscribers.mockResolvedValue([
      { userId: 5 },
    ]);

    await service.processIncidentVerified(event);

    expect(alertPreferencesService.findActiveSubscribers).toHaveBeenCalledWith(
      'Qalandia',
      IncidentType.CLOSURE,
    );
    expect(
      alertRecordsService.createPendingRecordsForSubscribers,
    ).toHaveBeenCalledWith(
      [5],
      '42',
      expect.stringContaining(
        'A Critical Closure incident has caused Qalandia Checkpoint to be Closed.',
      ),
    );
  });

  it('creates a resolution alert that marks the checkpoint as open', async () => {
    const event: IncidentAlertEvent = {
      incidentId: '43',
      trigger: IncidentAlertTrigger.RESOLVED,
      incidentType: IncidentType.DELAY,
      severity: IncidentSeverity.HIGH,
      geographicArea: 'Container',
      description: 'Traffic is back to normal.',
      checkpointName: 'Container Checkpoint',
      impactStatus: CheckpointStatus.DELAYED,
    };

    alertPreferencesService.findActiveSubscribers.mockResolvedValue([
      { userId: 8 },
    ]);

    await service.processIncidentResolved(event);

    expect(
      alertRecordsService.createPendingRecordsForSubscribers,
    ).toHaveBeenCalledWith(
      [8],
      '43',
      expect.stringContaining(
        'Resolved: The Delay incident affecting Container Checkpoint has been resolved. The checkpoint is now Open.',
      ),
    );
  });
});
