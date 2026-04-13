/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserRole } from '../../../common/enums/user-role.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { User } from '../../users/entities/user.entity';
import { AlertPreference } from '../entities/alert-preference.entity';
import { AlertPreferencesService } from './alert-preferences.service';
import { AlertRecordsService } from './alert-records.service';
import { AlertsValidationService } from './alerts-validation.service';

describe('AlertPreferencesService', () => {
  let service: AlertPreferencesService;
  let preferenceRepository: {
    manager: {
      transaction: jest.Mock;
    };
  };
  let alertsValidationService: {
    ensureValidUserId: jest.Mock;
  };
  let alertRecordsService: {
    createPendingRecordsForSubscribers: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };
  let transactionPreferenceRepository: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let transactionUserRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    transactionPreferenceRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };

    transactionUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const transactionManager = {
      getRepository: jest.fn((entity) => {
        if (entity === AlertPreference) {
          return transactionPreferenceRepository;
        }

        if (entity === User) {
          return transactionUserRepository;
        }

        throw new Error('Unexpected repository request');
      }),
    };

    preferenceRepository = {
      manager: {
        transaction: jest.fn(async (callback) => callback(transactionManager)),
      },
    };

    alertsValidationService = {
      ensureValidUserId: jest.fn((userId) => userId),
    };

    alertRecordsService = {
      createPendingRecordsForSubscribers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertPreferencesService,
        {
          provide: getRepositoryToken(AlertPreference),
          useValue: preferenceRepository,
        },
        {
          provide: AlertsValidationService,
          useValue: alertsValidationService,
        },
        {
          provide: AlertRecordsService,
          useValue: alertRecordsService,
        },
      ],
    }).compile();

    service = module.get<AlertPreferencesService>(AlertPreferencesService);
  });

  it('creates admin notifications after saving a single preference', async () => {
    const savedPreference = {
      id: 'pref-123',
      userId: 7,
      geographicArea: 'Nablus',
      incidentCategory: IncidentType.CLOSURE,
    } as AlertPreference;

    queryBuilder.getMany.mockResolvedValue([]);
    transactionPreferenceRepository.save.mockResolvedValue(savedPreference);
    transactionUserRepository.findOne.mockResolvedValue({
      id: 7,
      firstname: 'Mohammad',
      lastname: 'Khaled',
    });
    transactionUserRepository.find.mockResolvedValue([
      { id: 1, role: UserRole.ADMIN },
      { id: 2, role: UserRole.ADMIN },
    ]);
    alertRecordsService.createPendingRecordsForSubscribers.mockResolvedValue(2);

    const result = await service.subscribeToArea(7, {
      geographicArea: 'Nablus',
      incidentCategory: IncidentType.CLOSURE,
    });

    expect(result).toBe(savedPreference);
    expect(transactionPreferenceRepository.save).toHaveBeenCalledWith({
      userId: 7,
      geographicArea: 'Nablus',
      incidentCategory: IncidentType.CLOSURE,
    });
    expect(
      alertRecordsService.createPendingRecordsForSubscribers,
    ).toHaveBeenCalledWith(
      [1, 2],
      'subscription:pref-123',
      'Mohammad Khaled added an alert subscription for Road Closure in Nablus.',
      expect.objectContaining({
        title: 'New Alert Subscription',
        summary:
          'Mohammad Khaled added an alert subscription for Road Closure in Nablus.',
        senderName: 'Mohammad Khaled',
      }),
      expect.any(Object),
    );
  });

  it('creates one aggregated admin notification for batched categories', async () => {
    const savedPreferences = [
      {
        id: 'pref-123',
        userId: 7,
        geographicArea: 'Ramallah',
        incidentCategory: IncidentType.DELAY,
      },
      {
        id: 'pref-456',
        userId: 7,
        geographicArea: 'Ramallah',
        incidentCategory: IncidentType.CLOSURE,
      },
    ] as AlertPreference[];

    queryBuilder.getMany.mockResolvedValue([]);
    transactionPreferenceRepository.save.mockResolvedValue(savedPreferences);
    transactionUserRepository.findOne.mockResolvedValue({
      id: 7,
      firstname: 'Mohammad',
      lastname: 'Khaled',
    });
    transactionUserRepository.find.mockResolvedValue([
      { id: 1, role: UserRole.ADMIN },
    ]);
    alertRecordsService.createPendingRecordsForSubscribers.mockResolvedValue(1);

    const result = await service.subscribeToAreas(7, {
      geographicArea: 'Ramallah',
      incidentCategories: [IncidentType.DELAY, IncidentType.CLOSURE],
    });

    expect(result).toEqual(savedPreferences);
    expect(
      alertRecordsService.createPendingRecordsForSubscribers,
    ).toHaveBeenCalledWith(
      [1],
      'subscription:pref-123',
      'Mohammad Khaled added an alert subscription for Delay, Road Closure in Ramallah.',
      expect.objectContaining({
        title: 'New Alert Subscription',
        summary:
          'Mohammad Khaled added an alert subscription for Delay, Road Closure in Ramallah.',
        senderName: 'Mohammad Khaled',
      }),
      expect.any(Object),
    );
  });

  it('does not create admin notifications when a duplicate subscription exists', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 'existing-pref',
      },
    ]);

    await expect(
      service.subscribeToArea(7, {
        geographicArea: 'Nablus',
        incidentCategory: IncidentType.CLOSURE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transactionPreferenceRepository.save).not.toHaveBeenCalled();
    expect(
      alertRecordsService.createPendingRecordsForSubscribers,
    ).not.toHaveBeenCalled();
  });
});
