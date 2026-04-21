import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { AlertMatchesService } from './services/alert-matches.service';
import { AlertPreferencesService } from './services/alert-preferences.service';
import { AlertRecordsService } from './services/alert-records.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertMatchesService: {
    getUnreadMatchesCount: jest.Mock;
    markAllMatchesViewed: jest.Mock;
  };
  let alertRecordsService: {
    getUnreadRecordsForUser: jest.Mock;
    markAllAsReadForUser: jest.Mock;
  };

  beforeEach(async () => {
    alertMatchesService = {
      getUnreadMatchesCount: jest.fn(),
      markAllMatchesViewed: jest.fn(),
    };
    alertRecordsService = {
      getUnreadRecordsForUser: jest.fn(),
      markAllAsReadForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: AlertPreferencesService,
          useValue: {},
        },
        {
          provide: AlertMatchesService,
          useValue: alertMatchesService,
        },
        {
          provide: AlertRecordsService,
          useValue: alertRecordsService,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('combines current alert matches with unread inbox records without double-counting the same incident', async () => {
    const lastAlertsViewedAt = new Date('2026-04-13T08:00:00.000Z');
    alertMatchesService.getUnreadMatchesCount.mockResolvedValue({
      unreadCount: 1,
      lastAlertsViewedAt,
      unreadMatchIds: ['incident:44'],
    });
    alertRecordsService.getUnreadRecordsForUser.mockResolvedValue([
      {
        id: 'record-1',
        message: {
          incidentId: '44',
        },
      },
      {
        id: 'record-2',
        message: {
          incidentId: 'manual',
        },
      },
    ]);

    await expect(service.getUnreadMatchesCount(7)).resolves.toEqual({
      unreadCount: 2,
      lastAlertsViewedAt,
      unreadMatchIds: ['incident:44'],
    });
  });

  it('marks both current matches and inbox records as viewed', async () => {
    const lastAlertsViewedAt = new Date('2026-04-13T09:00:00.000Z');
    alertMatchesService.markAllMatchesViewed.mockResolvedValue({
      unreadCount: 0,
      lastAlertsViewedAt,
    });
    alertRecordsService.markAllAsReadForUser.mockResolvedValue(3);

    await expect(service.markAllMatchesViewed(7)).resolves.toEqual({
      unreadCount: 0,
      lastAlertsViewedAt,
    });
    expect(alertRecordsService.markAllAsReadForUser).toHaveBeenCalledWith(7);
  });
});
