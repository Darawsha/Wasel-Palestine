/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Checkpoint } from '../checkpoints/entities/checkpoint.entity';
import { CheckpointStatusHistory } from '../checkpoints/entities/status-history.entity';
import { CheckpointStatus } from '../checkpoints/enums/checkpoint-status.enum';
import { Incident } from './entities/incident.entity';
import { IncidentStatusHistory } from './entities/status-history.entity';
import { IncidentSeverity } from './enums/incident-severity.enum';
import { IncidentStatus } from './enums/incident-status.enum';
import { IncidentType } from './enums/incident-type.enum';
import { IncidentAlertObserver } from './observers/incident-created.observer';
import { IncidentQueryStrategyService } from './services/incident-query-strategy.service';
import { IncidentStatusLifecycleService } from './services/incident-status-lifecycle.service';
import { IncidentUpdateStrategyService } from './services/incident-update-strategy.service';
import { IncidentsService } from './incidents.service';
import { IncidentCheckpointSyncService } from './sync/incident-checkpoint-sync.service';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let checkpointStore: Map<number, Checkpoint>;
  let incidentStore: Incident[];
  let incidentsRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
  };
  let incidentUpdateStrategyService: {
    apply: jest.Mock;
  };
  let incidentStatusLifecycleService: {
    applyStatusUpdate: jest.Mock;
    applyStatusSnapshot: jest.Mock;
  };
  let incidentStatusHistoryRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let checkpointStatusHistoryRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let incidentAlertObserver: {
    notifyIncidentVerified: jest.Mock;
    notifyIncidentResolved: jest.Mock;
  };
  let checkpointTransactionRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let incidentTransactionRepository: {
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const checkpointA = {
    id: 3,
    name: 'Qalandiya',
    location: 'Qalandiya Checkpoint',
    latitude: 31.8571,
    longitude: 35.2177,
    currentStatus: CheckpointStatus.ACTIVE,
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  } as Checkpoint;

  const checkpointB = {
    id: 4,
    name: 'Container',
    location: 'Container Checkpoint',
    latitude: 31.75,
    longitude: 35.29,
    currentStatus: CheckpointStatus.ACTIVE,
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  } as Checkpoint;

  beforeEach(async () => {
    checkpointStore = new Map([
      [checkpointA.id, { ...checkpointA }],
      [checkpointB.id, { ...checkpointB }],
    ]);
    incidentStore = [];

    incidentTransactionRepository = {
      save: jest.fn(async (entity: Incident) => {
        const savedIncident = entity as Incident;
        savedIncident.id = savedIncident.id ?? 101;
        savedIncident.checkpointId = savedIncident.checkpoint?.id ?? null;
        const existingIncidentIndex = incidentStore.findIndex(
          (storedIncident) => storedIncident.id === savedIncident.id,
        );
        if (existingIncidentIndex >= 0) {
          incidentStore[existingIncidentIndex] = { ...savedIncident };
        } else {
          incidentStore.push({ ...savedIncident });
        }
        return savedIncident;
      }),
      remove: jest.fn(async () => undefined),
      createQueryBuilder: jest.fn(() => {
        let checkpointId: number | undefined;
        let status: IncidentStatus | undefined;
        let excludedIncidentId: number | undefined;
        const builder = {
          setLock: jest.fn(() => builder),
          where: jest.fn((query, params) => {
            if (query.includes('checkpointId')) {
              checkpointId = params?.checkpointId;
            }
            if (query.includes('status')) {
              status = params?.status;
            }
            return builder;
          }),
          andWhere: jest.fn((query, params) => {
            if (query.includes('checkpointId')) {
              checkpointId = params?.checkpointId;
            }
            if (query.includes('status')) {
              status = params?.status;
            }
            if (query.includes('currentIncidentId')) {
              excludedIncidentId = params?.currentIncidentId;
            }
            return builder;
          }),
          getOne: jest.fn(async () => {
            const foundIncident = incidentStore.find((storedIncident) => {
              const storedCheckpointId =
                storedIncident.checkpoint?.id ?? storedIncident.checkpointId;
              if (
                checkpointId !== undefined &&
                storedCheckpointId !== checkpointId
              ) {
                return false;
              }

              if (status !== undefined && storedIncident.status !== status) {
                return false;
              }

              if (
                excludedIncidentId !== undefined &&
                storedIncident.id === excludedIncidentId
              ) {
                return false;
              }

              return true;
            });

            return foundIncident ? ({ ...foundIncident } as Incident) : null;
          }),
        };

        return builder;
      }),
    };

    incidentStatusHistoryRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
      find: jest.fn(async () => []),
    };

    checkpointStatusHistoryRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
    };

    incidentAlertObserver = {
      notifyIncidentVerified: jest.fn(),
      notifyIncidentResolved: jest.fn(),
    };

    checkpointTransactionRepository = {
      findOne: jest.fn(async ({ where: { id } }) => {
        const storedCheckpoint = checkpointStore.get(id);
        return storedCheckpoint
          ? ({ ...storedCheckpoint } as Checkpoint)
          : null;
      }),
      save: jest.fn(async (entity: Checkpoint) => {
        const savedCheckpoint = {
          ...entity,
          updatedAt: entity.updatedAt ?? new Date(),
        } as Checkpoint;
        checkpointStore.set(savedCheckpoint.id, savedCheckpoint);
        return savedCheckpoint;
      }),
      createQueryBuilder: jest.fn(() => {
        let checkpointId: number | undefined;
        const builder = {
          setLock: jest.fn(() => builder),
          where: jest.fn((query, params) => {
            checkpointId = params?.checkpointId;
            return builder;
          }),
          getOne: jest.fn(async () => {
            if (checkpointId === undefined) {
              return null;
            }

            const storedCheckpoint = checkpointStore.get(checkpointId);
            return storedCheckpoint
              ? ({ ...storedCheckpoint } as Checkpoint)
              : null;
          }),
        };

        return builder;
      }),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Incident) {
          return incidentTransactionRepository;
        }

        if (entity === IncidentStatusHistory) {
          return incidentStatusHistoryRepository;
        }

        if (entity === Checkpoint) {
          return checkpointTransactionRepository;
        }

        if (entity === CheckpointStatusHistory) {
          return checkpointStatusHistoryRepository;
        }

        throw new Error(`Unexpected repository request: ${entity?.name}`);
      }),
    } as unknown as EntityManager;

    incidentsRepository = {
      create: jest.fn((payload) => payload),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        let title: string | undefined;
        let status: IncidentStatus | undefined;
        let excludedIncidentId: number | undefined;
        let distance: number | undefined;
        let lat: number | undefined;
        let lng: number | undefined;
        const builder = {
          leftJoinAndSelect: jest.fn(() => builder),
          where: jest.fn((query, params) => {
            if (query.includes('incident.title')) {
              title = params?.title;
            }
            if (query.includes('incident.status')) {
              status = params?.status;
            }
            return builder;
          }),
          andWhere: jest.fn((query, params) => {
            if (query.includes('incident.title')) {
              title = params?.title;
            }
            if (query.includes('incident.status')) {
              status = params?.status;
            }
            if (query.includes('currentIncidentId')) {
              excludedIncidentId = params?.currentIncidentId;
            }
            if (query.includes(':distance')) {
              distance = params?.distance;
            }
            return builder;
          }),
          setParameters: jest.fn((params) => {
            lat = params?.lat;
            lng = params?.lng;
            return builder;
          }),
          orderBy: jest.fn(() => builder),
          skip: jest.fn(() => builder),
          take: jest.fn(() => builder),
          getOne: jest.fn(async () => {
            const foundIncident = incidentStore.find((storedIncident) => {
              if (title !== undefined && storedIncident.title !== title) {
                return false;
              }

              if (status !== undefined && storedIncident.status !== status) {
                return false;
              }

              if (
                excludedIncidentId !== undefined &&
                storedIncident.id === excludedIncidentId
              ) {
                return false;
              }

              if (
                distance !== undefined &&
                lat !== undefined &&
                lng !== undefined
              ) {
                if (
                  storedIncident.latitude === undefined ||
                  storedIncident.longitude === undefined
                ) {
                  return false;
                }

                const earthRadiusMeters = 6371000;
                const toRadians = (value: number) => (value * Math.PI) / 180;
                const incidentLatitude = Number(storedIncident.latitude);
                const incidentLongitude = Number(storedIncident.longitude);
                const deltaLat = toRadians(lat - incidentLatitude);
                const deltaLng = toRadians(lng - incidentLongitude);
                const startLat = toRadians(incidentLatitude);
                const endLat = toRadians(lat);
                const haversine =
                  Math.sin(deltaLat / 2) ** 2 +
                  Math.cos(startLat) *
                    Math.cos(endLat) *
                    Math.sin(deltaLng / 2) ** 2;
                const calculatedDistance =
                  2 *
                  earthRadiusMeters *
                  Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

                return calculatedDistance < distance;
              }

              return true;
            });

            return foundIncident ? ({ ...foundIncident } as Incident) : null;
          }),
          getManyAndCount: jest.fn(async () => [[], 0]),
        };

        return builder;
      }),
      manager: {
        transaction: jest.fn(async (callback) => callback(manager)),
      },
    };

    incidentUpdateStrategyService = {
      apply: jest.fn((incident, dto) => {
        if (dto.title !== undefined) {
          incident.title = dto.title;
        }

        if (dto.description !== undefined) {
          incident.description = dto.description;
        }

        if (dto.type !== undefined) {
          incident.type = dto.type;
        }

        if (dto.severity !== undefined) {
          incident.severity = dto.severity;
        }

        if (dto.impactStatus !== undefined) {
          incident.impactStatus = dto.impactStatus;
        }

        if (dto.location !== undefined) {
          incident.location = dto.location;
        }

        if (dto.latitude !== undefined || dto.longitude !== undefined) {
          incident.latitude = dto.latitude;
          incident.longitude = dto.longitude;
        }
      }),
    };

    incidentStatusLifecycleService = {
      applyStatusUpdate: jest.fn((incident, nextStatus, changedByUserId) => {
        if (nextStatus === undefined || nextStatus === incident.status) {
          return;
        }

        incident.status = nextStatus;

        if (nextStatus === IncidentStatus.ACTIVE) {
          incident.closedByUserId = undefined;
          incident.closedAt = undefined;
          return;
        }

        if (nextStatus === IncidentStatus.CLOSED) {
          incident.closedByUserId = changedByUserId;
          incident.closedAt = new Date();
        }
      }),
      applyStatusSnapshot: jest.fn((incident, nextStatus, changedByUserId) => {
        incident.status = nextStatus;
        incident.closedByUserId = changedByUserId;
        incident.closedAt = new Date();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        IncidentCheckpointSyncService,
        {
          provide: getRepositoryToken(Incident),
          useValue: incidentsRepository,
        },
        {
          provide: getRepositoryToken(IncidentStatusHistory),
          useValue: incidentStatusHistoryRepository,
        },
        {
          provide: IncidentQueryStrategyService,
          useValue: {},
        },
        {
          provide: IncidentUpdateStrategyService,
          useValue: incidentUpdateStrategyService,
        },
        {
          provide: IncidentStatusLifecycleService,
          useValue: incidentStatusLifecycleService,
        },
        {
          provide: IncidentAlertObserver,
          useValue: incidentAlertObserver,
        },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses the linked checkpoint location and syncs a verified closure to CLOSED', async () => {
    const result = await service.create(
      {
        title: 'Checkpoint closure',
        description: 'Heavy closure at the checkpoint entrance',
        type: IncidentType.CLOSURE,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.ACTIVE,
        isVerified: true,
        checkpointId: checkpointA.id,
        impactStatus: CheckpointStatus.CLOSED,
        location: 'Ignored frontend location',
        latitude: 12.34,
        longitude: 56.78,
      },
      15,
    );

    expect(result).toEqual(
      expect.objectContaining({
        isVerified: true,
        location: checkpointA.location,
        latitude: checkpointA.latitude,
        longitude: checkpointA.longitude,
      }),
    );
    expect(incidentStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: IncidentStatus.ACTIVE,
        newStatus: IncidentStatus.ACTIVE,
        changedByUserId: 15,
      }),
    );
    expect(checkpointStore.get(checkpointA.id)?.currentStatus).toBe(
      CheckpointStatus.CLOSED,
    );
    expect(checkpointStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: CheckpointStatus.ACTIVE,
        newStatus: CheckpointStatus.CLOSED,
        changedByUserId: 15,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.id,
        impactStatus: CheckpointStatus.CLOSED,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentResolved).not.toHaveBeenCalled();
  });

  it('accepts ACTIVE as a valid checkpoint impact override', async () => {
    const result = await service.create(
      {
        title: 'Verified incident with open impact',
        description: 'Active verified incident that keeps the checkpoint open',
        type: IncidentType.CLOSURE,
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.ACTIVE,
        isVerified: true,
        checkpointId: checkpointA.id,
        impactStatus: CheckpointStatus.ACTIVE,
      },
      16,
    );

    expect(result).toEqual(
      expect.objectContaining({
        impactStatus: CheckpointStatus.ACTIVE,
        checkpoint: expect.objectContaining({ id: checkpointA.id }),
      }),
    );
    expect(checkpointStore.get(checkpointA.id)?.currentStatus).toBe(
      CheckpointStatus.ACTIVE,
    );
    expect(incidentAlertObserver.notifyIncidentVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.id,
        impactStatus: CheckpointStatus.ACTIVE,
      }),
    );
  });

  it('transfers checkpoint ownership and re-syncs the new checkpoint inside the transaction', async () => {
    checkpointStore.set(checkpointA.id, {
      ...checkpointA,
      currentStatus: CheckpointStatus.CLOSED,
    } as Checkpoint);

    const incident = {
      id: 8,
      isVerified: true,
      status: IncidentStatus.ACTIVE,
      type: IncidentType.CLOSURE,
      severity: IncidentSeverity.HIGH,
      location: checkpointA.location,
      latitude: checkpointA.latitude,
      longitude: checkpointA.longitude,
      checkpoint: { ...checkpointA, currentStatus: CheckpointStatus.CLOSED },
    } as Incident;

    incidentsRepository.findOne.mockResolvedValue(incident);

    const result = await service.update(
      incident.id,
      {
        checkpointId: checkpointB.id,
        type: IncidentType.DELAY,
        impactStatus: CheckpointStatus.RESTRICTED,
      },
      19,
    );

    expect(result).toEqual(
      expect.objectContaining({
        checkpoint: expect.objectContaining({ id: checkpointB.id }),
        location: checkpointB.location,
        latitude: checkpointB.latitude,
        longitude: checkpointB.longitude,
        type: IncidentType.DELAY,
        impactStatus: CheckpointStatus.RESTRICTED,
      }),
    );
    expect(checkpointStore.get(checkpointA.id)?.currentStatus).toBe(
      CheckpointStatus.ACTIVE,
    );
    expect(checkpointStore.get(checkpointB.id)?.currentStatus).toBe(
      CheckpointStatus.RESTRICTED,
    );
    expect(incidentStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: IncidentStatus.ACTIVE,
        newStatus: IncidentStatus.ACTIVE,
        changedByUserId: 19,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentVerified).not.toHaveBeenCalled();
    expect(incidentAlertObserver.notifyIncidentResolved).not.toHaveBeenCalled();
  });

  it('logs a status snapshot when an incident is updated without changing status', async () => {
    const incident = {
      id: 12,
      isVerified: false,
      status: IncidentStatus.ACTIVE,
      type: IncidentType.DELAY,
      severity: IncidentSeverity.MEDIUM,
      title: 'Original title',
      description: 'Original description long enough',
      location: 'Jerusalem',
      latitude: 31.77,
      longitude: 35.21,
    } as Incident;

    incidentsRepository.findOne.mockResolvedValue(incident);

    const result = await service.update(
      incident.id,
      {
        title: 'Updated title',
      },
      66,
    );

    expect(result).toEqual(
      expect.objectContaining({
        title: 'Updated title',
        status: IncidentStatus.ACTIVE,
      }),
    );
    expect(incidentStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: IncidentStatus.ACTIVE,
        newStatus: IncidentStatus.ACTIVE,
        changedByUserId: 66,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentVerified).not.toHaveBeenCalled();
    expect(incidentAlertObserver.notifyIncidentResolved).not.toHaveBeenCalled();
  });

  it('allows reusing a title from a closed incident', async () => {
    incidentStore.push({
      id: 90,
      title: 'Test',
      description: 'Previously closed incident',
      type: IncidentType.ACCIDENT,
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.CLOSED,
      isVerified: false,
      location: 'Nablus',
      latitude: 32.2205316,
      longitude: 35.2569374,
    } as Incident);

    const result = await service.create(
      {
        title: 'Test',
        description: 'New active incident with recycled title',
        type: IncidentType.ACCIDENT,
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.ACTIVE,
      },
      16,
    );

    expect(result).toEqual(
      expect.objectContaining({
        title: 'Test',
        status: IncidentStatus.ACTIVE,
      }),
    );
  });

  it('rejects updating an active incident to a title used by another active incident', async () => {
    incidentStore.push({
      id: 404,
      title: 'Existing active incident',
      description: 'Existing active incident in the system',
      type: IncidentType.ACCIDENT,
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.ACTIVE,
      isVerified: false,
    } as Incident);

    const incident = {
      id: 12,
      isVerified: false,
      status: IncidentStatus.ACTIVE,
      type: IncidentType.DELAY,
      severity: IncidentSeverity.MEDIUM,
      title: 'Original title',
      description: 'Original description long enough',
      location: 'Jerusalem',
      latitude: 31.77,
      longitude: 35.21,
    } as Incident;

    incidentsRepository.findOne.mockResolvedValue(incident);

    await expect(
      service.update(
        incident.id,
        {
          title: 'Existing active incident',
        },
        66,
      ),
    ).rejects.toThrow(
      'Duplicate Alert: An active incident with this exact title already exists.',
    );
  });

  it('restores the linked checkpoint to ACTIVE when the incident is closed', async () => {
    checkpointStore.set(checkpointA.id, {
      ...checkpointA,
      currentStatus: CheckpointStatus.DELAYED,
    } as Checkpoint);

    const incident = {
      id: 9,
      isVerified: true,
      status: IncidentStatus.ACTIVE,
      type: IncidentType.DELAY,
      impactStatus: CheckpointStatus.DELAYED,
      location: checkpointA.location,
      latitude: checkpointA.latitude,
      longitude: checkpointA.longitude,
      checkpoint: { ...checkpointA, currentStatus: CheckpointStatus.DELAYED },
    } as Incident;

    incidentsRepository.findOne.mockResolvedValue(incident);

    const result = await service.close(incident.id, 77);

    expect(result.status).toBe(IncidentStatus.CLOSED);
    expect(checkpointStore.get(checkpointA.id)?.currentStatus).toBe(
      CheckpointStatus.ACTIVE,
    );
    expect(incidentStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: IncidentStatus.ACTIVE,
        newStatus: IncidentStatus.CLOSED,
        changedByUserId: 77,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: incident.id,
        checkpoint: expect.objectContaining({ id: checkpointA.id }),
      }),
    );
    expect(incidentAlertObserver.notifyIncidentVerified).not.toHaveBeenCalled();
  });

  it('logs a status-history row when verification changes without a status change', async () => {
    const incident = {
      id: 11,
      isVerified: false,
      status: IncidentStatus.ACTIVE,
      type: IncidentType.DELAY,
      severity: IncidentSeverity.MEDIUM,
      location: 'Jerusalem',
      latitude: 31.77,
      longitude: 35.21,
    } as Incident;

    incidentsRepository.findOne.mockResolvedValue(incident);

    const result = await service.verify(incident.id, 55);

    expect(result).toEqual(
      expect.objectContaining({
        isVerified: true,
        status: IncidentStatus.ACTIVE,
      }),
    );
    expect(incidentStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: IncidentStatus.ACTIVE,
        newStatus: IncidentStatus.ACTIVE,
        changedByUserId: 55,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        id: incident.id,
        status: IncidentStatus.ACTIVE,
        isVerified: true,
      }),
    );
    expect(incidentAlertObserver.notifyIncidentResolved).not.toHaveBeenCalled();
  });

  it('restores the linked checkpoint before hard deletion', async () => {
    checkpointStore.set(checkpointA.id, {
      ...checkpointA,
      currentStatus: CheckpointStatus.CLOSED,
    } as Checkpoint);

    const incident = {
      id: 10,
      isVerified: true,
      status: IncidentStatus.ACTIVE,
      type: IncidentType.CLOSURE,
      checkpoint: { ...checkpointA, currentStatus: CheckpointStatus.CLOSED },
      impactStatus: CheckpointStatus.CLOSED,
    } as Incident;

    incidentsRepository.findOne.mockResolvedValue(incident);

    await service.remove(incident.id, 33);

    expect(checkpointStore.get(checkpointA.id)?.currentStatus).toBe(
      CheckpointStatus.ACTIVE,
    );
    expect(incidentTransactionRepository.remove).toHaveBeenCalledWith(incident);
    expect(checkpointStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: CheckpointStatus.CLOSED,
        newStatus: CheckpointStatus.ACTIVE,
        changedByUserId: 33,
      }),
    );
  });

  it('rejects linking a checkpoint to a non-disruption incident type', async () => {
    await expect(
      service.create(
        {
          title: 'Accident near checkpoint',
          description: 'This should not be linkable to a checkpoint',
          type: IncidentType.WEATHER_HAZARD,
          severity: IncidentSeverity.MEDIUM,
          checkpointId: checkpointA.id,
          impactStatus: CheckpointStatus.CLOSED,
          status: IncidentStatus.ACTIVE,
          isVerified: true,
        },
        44,
      ),
    ).rejects.toThrow('Invalid incident type for checkpoint linking');

    expect(incidentsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects a second active incident for the same checkpoint', async () => {
    incidentStore.push({
      id: 404,
      checkpointId: checkpointA.id,
      status: IncidentStatus.ACTIVE,
      isVerified: false,
      type: IncidentType.CLOSURE,
      severity: IncidentSeverity.HIGH,
      title: 'Existing active incident',
      description: 'Existing active incident linked to checkpoint',
    } as Incident);

    await expect(
      service.create(
        {
          title: 'Second active incident',
          description:
            'Should conflict with existing active checkpoint incident',
          type: IncidentType.CLOSURE,
          severity: IncidentSeverity.HIGH,
          status: IncidentStatus.ACTIVE,
          checkpointId: checkpointA.id,
          impactStatus: CheckpointStatus.CLOSED,
        },
        71,
      ),
    ).rejects.toThrow('already linked to active incident');
  });
});
