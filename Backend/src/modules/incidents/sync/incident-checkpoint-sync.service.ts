import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import { CheckpointStatusHistory } from '../../checkpoints/entities/status-history.entity';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { Incident } from '../entities/incident.entity';
import { IncidentStatusHistory } from '../entities/status-history.entity';
import { IncidentStatus } from '../enums/incident-status.enum';
import { IncidentType } from '../enums/incident-type.enum';

export type IncidentCheckpointSnapshot = {
  checkpointId: number | null;
  isVerified: boolean;
  status: IncidentStatus;
};

type SaveIncidentWithCheckpointSyncOptions = {
  incident: Incident;
  previousSnapshot?: IncidentCheckpointSnapshot;
  previousStatus?: IncidentStatus;
  changedByUserId?: number;
};

@Injectable()
export class IncidentCheckpointSyncService {
  private static readonly LINKABLE_INCIDENT_TYPES = new Set<IncidentType>([
    IncidentType.CLOSURE,
    IncidentType.DELAY,
    IncidentType.ACCIDENT,
  ]);

  private static readonly IMPACT_STATUSES = new Set<CheckpointStatus>([
    CheckpointStatus.ACTIVE,
    CheckpointStatus.CLOSED,
    CheckpointStatus.RESTRICTED,
    CheckpointStatus.DELAYED,
  ]);

  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
  ) {}

  createCheckpointSnapshot(incident: Incident): IncidentCheckpointSnapshot {
    return {
      checkpointId: this.getIncidentCheckpointId(incident),
      isVerified: Boolean(incident.isVerified),
      status: incident.status,
    };
  }

  applyIncidentLocationSnapshot(
    incident: Incident,
    options: {
      location?: string;
      latitude?: number;
      longitude?: number;
    },
  ): void {
    if (options.location !== undefined) {
      incident.location = options.location ?? undefined;
    }

    if (options.latitude !== undefined || options.longitude !== undefined) {
      incident.latitude = options.latitude;
      incident.longitude = options.longitude;
    }
  }

  applyIncidentVerificationState(
    incident: Incident,
    isVerified: boolean | undefined,
    changedByUserId?: number,
    options: { defaultToFalse?: boolean } = {},
  ): void {
    if (isVerified === undefined) {
      if (options.defaultToFalse) {
        incident.isVerified = false;
      }
      return;
    }

    incident.isVerified = isVerified;

    if (isVerified) {
      incident.verifiedAt = incident.verifiedAt ?? new Date();

      if (changedByUserId !== undefined) {
        incident.verifiedByUserId = changedByUserId;
      }

      return;
    }

    incident.verifiedAt = undefined;
    incident.verifiedByUserId = undefined;
  }

  async saveIncident(
    options: SaveIncidentWithCheckpointSyncOptions,
  ): Promise<Incident> {
    const {
      incident,
      previousSnapshot,
      previousStatus,
      changedByUserId,
    } = options;

    this.assertValidCheckpointLink(
      incident.type,
      this.getIncidentCheckpointId(incident),
      incident.impactStatus,
    );

    return this.incidentsRepository.manager.transaction(async (manager) => {
      const incidentRepository = manager.getRepository(Incident);
      const incidentStatusHistoryRepository = manager.getRepository(
        IncidentStatusHistory,
      );

      const checkpoint = await this.resolveCheckpointInTransaction(
        manager,
        this.getIncidentCheckpointId(incident),
      );

      if (checkpoint) {
        if (incident.status === IncidentStatus.ACTIVE) {
          await this.assertNoOtherActiveIncidentForCheckpoint(
            manager,
            checkpoint.id,
            incident.id,
          );
        }

        incident.checkpoint = checkpoint;
        incident.location = checkpoint.location;
        incident.latitude = checkpoint.latitude as number;
        incident.longitude = checkpoint.longitude as number;
      } else {
        incident.checkpoint = undefined;
        incident.checkpointId = null;
        incident.impactStatus = null;
      }

      const savedIncident = await incidentRepository.save(incident);

      // Persist a status snapshot for every create/update operation.
      const shouldLogIncidentStatus = true;

      if (shouldLogIncidentStatus) {
        const historyRecord = incidentStatusHistoryRepository.create({
          incident: savedIncident,
          oldStatus: previousSnapshot?.status ?? savedIncident.status,
          newStatus: savedIncident.status,
          changedByUserId,
        });

        await incidentStatusHistoryRepository.save(historyRecord);
      }

      const syncedCheckpoint = await this.syncCheckpointStatusForIncident(
        manager,
        savedIncident,
        previousSnapshot,
        changedByUserId,
      );

      if (syncedCheckpoint && savedIncident.checkpoint) {
        savedIncident.checkpoint.currentStatus = syncedCheckpoint.currentStatus;
        savedIncident.checkpoint.updatedAt = syncedCheckpoint.updatedAt;
      }

      return savedIncident;
    });
  }

  async removeIncident(
    incident: Incident,
    changedByUserId?: number,
  ): Promise<void> {
    const checkpointId = this.getIncidentCheckpointId(incident);

    await this.incidentsRepository.manager.transaction(async (manager) => {
      if (checkpointId !== null) {
        await this.updateCheckpointStatusInTransaction(
          manager,
          checkpointId,
          CheckpointStatus.ACTIVE,
          changedByUserId,
        );
      }

      await manager.getRepository(Incident).remove(incident);
    });
  }

  private assertValidCheckpointLink(
    incidentType: IncidentType | undefined,
    checkpointId: number | null,
    impactStatus?: CheckpointStatus | null,
  ): void {
    if (checkpointId === null) {
      if (impactStatus !== undefined && impactStatus !== null) {
        throw new BadRequestException(
          'Impact status requires checkpoint linking',
        );
      }
      return;
    }

    if (
      incidentType === undefined ||
      !IncidentCheckpointSyncService.LINKABLE_INCIDENT_TYPES.has(incidentType)
    ) {
      throw new BadRequestException('Invalid incident type for checkpoint linking');
    }

    if (
      impactStatus === undefined ||
      impactStatus === null ||
      !IncidentCheckpointSyncService.IMPACT_STATUSES.has(impactStatus)
    ) {
      throw new BadRequestException('Invalid impact status for checkpoint linking');
    }
  }

  private async resolveCheckpointInTransaction(
    manager: EntityManager,
    checkpointId: number | null,
  ): Promise<Checkpoint | null> {
    if (checkpointId === null) {
      return null;
    }

    const checkpoint = await manager
      .getRepository(Checkpoint)
      .createQueryBuilder('checkpoint')
      .setLock('pessimistic_write')
      .where('checkpoint.id = :checkpointId', { checkpointId })
      .getOne();

    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with id ${checkpointId} not found`);
    }

    return checkpoint;
  }

  private async assertNoOtherActiveIncidentForCheckpoint(
    manager: EntityManager,
    checkpointId: number,
    currentIncidentId?: number,
  ): Promise<void> {
    const queryBuilder = manager
      .getRepository(Incident)
      .createQueryBuilder('incident')
      .setLock('pessimistic_write')
      .where('incident.checkpointId = :checkpointId', { checkpointId })
      .andWhere('incident.status = :status', {
        status: IncidentStatus.ACTIVE,
      });

    if (currentIncidentId !== undefined) {
      queryBuilder.andWhere('incident.id != :currentIncidentId', {
        currentIncidentId,
      });
    }

    const conflictingIncident = await queryBuilder.getOne();

    if (conflictingIncident) {
      throw new ConflictException(
        `Checkpoint ${checkpointId} is already linked to active incident #${conflictingIncident.id}`,
      );
    }
  }

  private async syncCheckpointStatusForIncident(
    manager: EntityManager,
    incident: Incident,
    previousSnapshot?: IncidentCheckpointSnapshot,
    changedByUserId?: number,
  ): Promise<Checkpoint | null> {
    const currentCheckpointId = this.getIncidentCheckpointId(incident);
    const previousCheckpointId = previousSnapshot?.checkpointId ?? null;

    if (
      previousCheckpointId !== null &&
      previousCheckpointId !== currentCheckpointId
    ) {
      await this.updateCheckpointStatusInTransaction(
        manager,
        previousCheckpointId,
        CheckpointStatus.ACTIVE,
        changedByUserId,
      );
    }

    if (currentCheckpointId === null) {
      return null;
    }

    const nextCheckpointStatus = this.resolveCheckpointStatusForIncident(
      incident,
      previousSnapshot,
    );

    if (nextCheckpointStatus === null) {
      return null;
    }

    return this.updateCheckpointStatusInTransaction(
      manager,
      currentCheckpointId,
      nextCheckpointStatus,
      changedByUserId,
    );
  }

  private resolveCheckpointStatusForIncident(
    incident: Incident,
    previousSnapshot?: IncidentCheckpointSnapshot,
  ): CheckpointStatus | null {
    const currentCheckpointId = this.getIncidentCheckpointId(incident);

    if (currentCheckpointId === null) {
      return null;
    }

    if (incident.status === IncidentStatus.CLOSED) {
      return CheckpointStatus.ACTIVE;
    }

    if (this.isIncidentDrivingCheckpoint(incident)) {
      return incident.impactStatus ?? null;
    }

    if (
      previousSnapshot?.checkpointId === currentCheckpointId &&
      this.isIncidentDrivingCheckpoint(previousSnapshot)
    ) {
      return CheckpointStatus.ACTIVE;
    }

    return null;
  }

  private async updateCheckpointStatusInTransaction(
    manager: EntityManager,
    checkpointId: number,
    nextStatus: CheckpointStatus,
    changedByUserId?: number,
  ): Promise<Checkpoint> {
    const checkpointRepository = manager.getRepository(Checkpoint);
    const checkpointStatusHistoryRepository = manager.getRepository(
      CheckpointStatusHistory,
    );

    const checkpoint = await checkpointRepository.findOne({
      where: { id: checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with id ${checkpointId} not found`);
    }

    const previousStatus = checkpoint.currentStatus;
    checkpoint.currentStatus = nextStatus;
    checkpoint.updatedAt = new Date();

    const savedCheckpoint = await checkpointRepository.save(checkpoint);

    if (previousStatus !== nextStatus) {
      const historyRecord = checkpointStatusHistoryRepository.create({
        checkpoint: savedCheckpoint,
        oldStatus: previousStatus,
        newStatus: nextStatus,
        changedByUserId,
      });

      await checkpointStatusHistoryRepository.save(historyRecord);
    }

    return savedCheckpoint;
  }

  private getIncidentCheckpointId(incident: {
    checkpoint?: Checkpoint;
    checkpointId?: number | null;
  }): number | null {
    if (incident.checkpoint?.id !== undefined) {
      return incident.checkpoint.id;
    }

    return incident.checkpointId ?? null;
  }

  private isIncidentDrivingCheckpoint(incident: {
    isVerified: boolean;
    status: IncidentStatus;
  }): boolean {
    return incident.isVerified && incident.status === IncidentStatus.ACTIVE;
  }
}
