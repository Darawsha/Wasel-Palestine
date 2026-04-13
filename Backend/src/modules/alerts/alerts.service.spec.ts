import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { AlertMatchesService } from './services/alert-matches.service';
import { AlertPreferencesService } from './services/alert-preferences.service';
import { AlertRecordsService } from './services/alert-records.service';

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: AlertPreferencesService,
          useValue: {},
        },
        {
          provide: AlertMatchesService,
          useValue: {},
        },
        {
          provide: AlertRecordsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
