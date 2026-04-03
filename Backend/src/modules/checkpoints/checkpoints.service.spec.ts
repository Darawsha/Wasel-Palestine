/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Incident } from '../incidents/entities/incident.entity';
import { IncidentStatus } from '../incidents/enums/incident-status.enum';
import { Checkpoint } from './entities/checkpoint.entity';
import { CheckpointStatusHistory } from './entities/status-history.entity';
import { CheckpointStatus } from './enums/checkpoint-status.enum';
import { CheckpointsService } from './checkpoints.service';

describe('CheckpointsService', () => {
  let service: CheckpointsService;
  let checkpointStore: Map<number, Checkpoint>;
  let incidentStore: Incident[];
  let checkpointsRepository: {
    findOne: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
  };
  let checkpointStatusHistoryRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const checkpoint = {
    id: 7,
    name: 'Qalandiya',
    location: 'Qalandiya Checkpoint',
    latitude: 31.8571,
    longitude: 35.2177,
    currentStatus: CheckpointStatus.ACTIVE,
  } as Checkpoint;

  beforeEach(async () => {
    checkpointStore = new Map([[checkpoint.id, { ...checkpoint }]]);
    incidentStore = [];

    const checkpointTransactionRepository = {
      findOne: jest.fn(async ({ where: { id } }) => {
        const storedCheckpoint = checkpointStore.get(id);
        return storedCheckpoint ? ({ ...storedCheckpoint } as Checkpoint) : null;
      }),
      save: jest.fn(async (entity: Checkpoint) => {
        checkpointStore.set(entity.id, { ...entity });
        return entity;
      }),
    };

    const incidentTransactionRepository = {
      createQueryBuilder: jest.fn(() => {
        let checkpointId: number | undefined;
        let status: IncidentStatus | undefined;
        let orderByField = 'incident.id';
        let orderDirection: 'ASC' | 'DESC' = 'ASC';

        const builder = {
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
            return builder;
          }),
          orderBy: jest.fn((field, direction) => {
            orderByField = field;
            orderDirection = direction;
            return builder;
          }),
          getOne: jest.fn(async () => {
            const matched = incidentStore
              .filter((incident) => {
                const linkedCheckpointId =
                  incident.checkpoint?.id ?? incident.checkpointId;
                if (
                  checkpointId !== undefined &&
                  linkedCheckpointId !== checkpointId
                ) {
                  return false;
                }

                if (status !== undefined && incident.status !== status) {
                  return false;
                }

                return true;
              })
              .sort((left, right) =>
                orderDirection === 'ASC' ? left.id - right.id : right.id - left.id,
              );

            return matched[0] ? ({ ...matched[0] } as Incident) : null;
          }),
          getMany: jest.fn(async () =>
            incidentStore
              .filter((incident) => {
                const linkedCheckpointId =
                  incident.checkpoint?.id ?? incident.checkpointId;
                if (
                  checkpointId !== undefined &&
                  linkedCheckpointId !== checkpointId
                ) {
                  return false;
                }

                if (status !== undefined && incident.status !== status) {
                  return false;
                }

                return true;
              })
              .map((incident) => ({ ...incident } as Incident)),
          ),
        };

        return builder;
      }),
      save: jest.fn(async (entities: Incident | Incident[]) => {
        const incidents = Array.isArray(entities) ? entities : [entities];
        incidents.forEach((incident) => {
          const index = incidentStore.findIndex(
            (storedIncident) => storedIncident.id === incident.id,
          );
          if (index >= 0) {
            incidentStore[index] = { ...incident };
          } else {
            incidentStore.push({ ...incident });
          }
        });

        return entities;
      }),
    };

    checkpointStatusHistoryRepository = {
      find: jest.fn(async () => []),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Checkpoint) {
          return checkpointTransactionRepository;
        }

        if (entity === Incident) {
          return incidentTransactionRepository;
        }

        if (entity === CheckpointStatusHistory) {
          return checkpointStatusHistoryRepository;
        }

        throw new Error(`Unexpected repository request: ${entity?.name}`);
      }),
    } as unknown as EntityManager;

    checkpointsRepository = {
      findOne: jest.fn(async ({ where: { id } }) => {
        const storedCheckpoint = checkpointStore.get(id);
        return storedCheckpoint ? ({ ...storedCheckpoint } as Checkpoint) : null;
      }),
      count: jest.fn(async () => checkpointStore.size),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn(async (callback) => callback(manager)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckpointsService,
        {
          provide: getRepositoryToken(Checkpoint),
          useValue: checkpointsRepository,
        },
        {
          provide: getRepositoryToken(CheckpointStatusHistory),
          useValue: checkpointStatusHistoryRepository,
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CheckpointsService>(CheckpointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('forbids manual status changes while an active incident is linked', async () => {
    incidentStore.push({
      id: 88,
      checkpointId: checkpoint.id,
      status: IncidentStatus.ACTIVE,
      title: 'Linked incident',
      description: 'Active incident linked to checkpoint',
      isVerified: true,
    } as Incident);

    await expect(
      service.update(
        checkpoint.id,
        {
          currentStatus: CheckpointStatus.CLOSED,
        },
        10,
      ),
    ).rejects.toThrow('Status is locked by an active incident');
  });

  it('forbids a currentStatus payload even when it matches the locked checkpoint status', async () => {
    incidentStore.push({
      id: 89,
      checkpointId: checkpoint.id,
      status: IncidentStatus.ACTIVE,
      title: 'Linked incident',
      description: 'Active incident linked to checkpoint',
      isVerified: true,
    } as Incident);

    await expect(
      service.update(
        checkpoint.id,
        {
          currentStatus: CheckpointStatus.ACTIVE,
        },
        11,
      ),
    ).rejects.toThrow('Status is locked by an active incident');
  });

  it('cascades location updates to linked active incidents only', async () => {
    incidentStore.push(
      {
        id: 91,
        checkpointId: checkpoint.id,
        status: IncidentStatus.ACTIVE,
        title: 'Active linked incident',
        description: 'Active incident linked to checkpoint',
        isVerified: true,
        location: checkpoint.location,
        latitude: checkpoint.latitude,
        longitude: checkpoint.longitude,
      } as Incident,
      {
        id: 92,
        checkpointId: checkpoint.id,
        status: IncidentStatus.CLOSED,
        title: 'Closed linked incident',
        description: 'Closed incident linked to checkpoint',
        isVerified: true,
        location: 'Historical checkpoint location',
        latitude: 31.6,
        longitude: 35.1,
      } as Incident,
    );

    const updatedCheckpoint = await service.update(
      checkpoint.id,
      {
        location: 'Updated checkpoint location',
        latitude: 31.9,
        longitude: 35.3,
      },
      12,
    );

    expect(updatedCheckpoint).toEqual(
      expect.objectContaining({
        location: 'Updated checkpoint location',
        latitude: 31.9,
        longitude: 35.3,
      }),
    );
    expect(
      incidentStore.find((incident) => incident.id === 91),
    ).toEqual(
      expect.objectContaining({
        location: 'Updated checkpoint location',
        latitude: 31.9,
        longitude: 35.3,
      }),
    );
    expect(
      incidentStore.find((incident) => incident.id === 92),
    ).toEqual(
      expect.objectContaining({
        location: 'Historical checkpoint location',
        latitude: 31.6,
        longitude: 35.1,
      }),
    );
  });
});
