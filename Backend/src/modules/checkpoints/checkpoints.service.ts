import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Checkpoint } from './entities/checkpoint.entity';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { CheckpointStatus } from './enums/checkpoint-status.enum';
import { CheckpointStatusHistory } from './entities/status-history.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CheckpointQueryDto } from './dto/checkpoint-query.dto';
import { CheckpointSortBy } from './enums/CheckpointSortBy.enums';
import { SortOrder } from './enums/SortOrder.enums';
import { Incident } from '../incidents/entities/incident.entity';
import { IncidentStatus } from '../incidents/enums/incident-status.enum';
import { getHaversineDistanceSql } from '../../common/utils/geo.util';
import { MapFilterQueryDto } from '../map/dto/map-filter-query.dto';
import {
  ModerationStatus,
  PUBLIC_MODERATION_STATUSES,
} from '../../common/enums/moderation-status.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditTargetType } from '../audit-log/enums/audit-target-type.enum';

type CheckpointChangeSet = Partial<{
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string | null;
  currentStatus: CheckpointStatus;
}>;

@Injectable()
export class CheckpointsService {
  constructor(
    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,

    @InjectRepository(CheckpointStatusHistory)
    private readonly checkpointStatusHistoryRepository: Repository<CheckpointStatusHistory>,

    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,

    private readonly auditLogService: AuditLogService,
  ) {}



  async create(
    createCheckpointDto: CreateCheckpointDto,
    createdByUserId?: number,
  ): Promise<Checkpoint> {

    const existingCheckpoint = await this.checkpointsRepository.findOne({
      where: { name: createCheckpointDto.name },
    });

    if (existingCheckpoint) {
      return existingCheckpoint;
    }

    if (
      createCheckpointDto.latitude !== undefined &&
      createCheckpointDto.longitude !== undefined &&
      createCheckpointDto.latitude !== null &&
      createCheckpointDto.longitude !== null
    ) {
      const distanceThreshold = 50;

      const existingByLocation = await this.checkpointsRepository
        .createQueryBuilder('checkpoint')
        .where(`${getHaversineDistanceSql('checkpoint')} < :distance`, {
          distance: distanceThreshold,
        })
        .setParameters({
          lat: createCheckpointDto.latitude,
          lng: createCheckpointDto.longitude,
        })
        .getOne();

      if (existingByLocation) {
        return existingByLocation;
      }
    }

    const checkpoint = this.checkpointsRepository.create({
      name: createCheckpointDto.name,
      location: createCheckpointDto.location,
      latitude: createCheckpointDto.latitude ?? 0.0,
      longitude: createCheckpointDto.longitude ?? 0.0,
      description: createCheckpointDto.notes || createCheckpointDto.description,
      currentStatus:
        createCheckpointDto.status ||
        createCheckpointDto.currentStatus ||
        CheckpointStatus.OPEN,
      moderationStatus: ModerationStatus.APPROVED,
      createdByUserId: createdByUserId ?? null,
      pendingChanges: null,
      approvedByUserId: createdByUserId ?? null,
      approvedAt: new Date(),
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
    });

    const savedCheckpoint = await this.checkpointsRepository.save(checkpoint);
    await this.auditLogService.record({
      action: AuditAction.CREATED,
      targetType: AuditTargetType.CHECKPOINT,
      targetId: savedCheckpoint.id,
      performedByUserId: createdByUserId ?? null,
      details: this.buildCheckpointCreateDetails(
        savedCheckpoint,
        createdByUserId,
      ),
      metadata: {
        workflow: ModerationStatus.APPROVED,
        status: savedCheckpoint.currentStatus,
      },
    });

    return savedCheckpoint;
  }

  async findAll(
    checkpointQueryDto: CheckpointQueryDto,
    options: { includeUnpublished?: boolean } = {},
  ) {
    const {
      currentStatus,
      sortBy = CheckpointSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 10,
    } = checkpointQueryDto;

    const queryBuilder =
      this.checkpointsRepository.createQueryBuilder('checkpoint');

    queryBuilder.andWhere('checkpoint.moderationStatus != :pendingDelete', {
      pendingDelete: ModerationStatus.PENDING_DELETE,
    });

    if (currentStatus) {
      queryBuilder.andWhere('checkpoint.currentStatus = :currentStatus', {
        currentStatus,
      });
    }

    if (!options.includeUnpublished) {
      queryBuilder.andWhere(
        'checkpoint.moderationStatus IN (:...publicModerationStatuses)',
        {
          publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
        },
      );
    }

    queryBuilder.orderBy(`checkpoint.${sortBy}`, sortOrder);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: options.includeUnpublished
        ? data
        : data.map((checkpoint) =>
            this.applyCheckpointPendingChangesForPublicRead(checkpoint),
          ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFilteredCheckpoints(
    filterDto: MapFilterQueryDto,
  ): Promise<Checkpoint[]> {
    const { startDate, endDate } = filterDto;
    this.assertValidMapDateRange(startDate, endDate);

    const hasDateRange = Boolean(startDate && endDate);

    if (hasDateRange) {
      const historyRows = await this.checkpointStatusHistoryRepository
        .createQueryBuilder('checkpointHistory')
        .innerJoinAndSelect('checkpointHistory.checkpoint', 'checkpoint')
        .where('checkpointHistory.changedAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .andWhere(
          'checkpoint.moderationStatus IN (:...publicModerationStatuses)',
          {
            publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
          },
        )
        .orderBy('checkpointHistory.changedAt', 'DESC')
        .addOrderBy('checkpointHistory.id', 'DESC')
        .getMany();

      const checkpointsById = new Map<number, Checkpoint>();

      historyRows.forEach((historyRecord) => {
        const checkpoint = historyRecord.checkpoint;
        if (!checkpoint || checkpointsById.has(checkpoint.id)) {
          return;
        }

        checkpoint.currentStatus = historyRecord.newStatus;
        checkpointsById.set(checkpoint.id, checkpoint);
      });

      return Array.from(checkpointsById.values()).map((checkpoint) =>
        this.applyCheckpointPendingChangesForPublicRead(checkpoint),
      );
    }

    const checkpoints = await this.checkpointsRepository
      .createQueryBuilder('checkpoint')
      .where('checkpoint.moderationStatus IN (:...publicModerationStatuses)', {
        publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
      })
      .orderBy('checkpoint.updatedAt', 'DESC')
      .getMany();

    return checkpoints.map((checkpoint) =>
      this.applyCheckpointPendingChangesForPublicRead(checkpoint),
    );
  }

  async findOne(
    id: number,
    options: { includeUnpublished?: boolean } = { includeUnpublished: true },
  ): Promise<Checkpoint> {
    const checkpoint = await this.checkpointsRepository.findOne({
      where: { id },
    });

    if (
      !checkpoint ||
      (!options.includeUnpublished &&
        !this.isPubliclyVisibleModerationStatus(checkpoint.moderationStatus))
    ) {
      throw new NotFoundException(`Checkpoint with id ${id} not found`);
    }

    return options.includeUnpublished
      ? checkpoint
      : this.applyCheckpointPendingChangesForPublicRead(checkpoint);
  }

  async update(
    id: number,
    updateCheckpointDto: UpdateCheckpointDto,
    changedByUserId?: number,
  ): Promise<Checkpoint> {
    const result = await this.checkpointsRepository.manager.transaction(async (manager) => {
      const checkpoint = await this.findCheckpointInTransaction(manager, id);
      const activeLinkedIncident = await this.findActiveLinkedIncident(
        manager,
        id,
      );
      const requestedStatus =
        updateCheckpointDto.status ?? updateCheckpointDto.currentStatus;

      if (checkpoint.moderationStatus === ModerationStatus.PENDING_DELETE) {
        throw new BadRequestException(
          'Checkpoint has a pending delete workflow decision',
        );
      }

      if (requestedStatus !== undefined && activeLinkedIncident) {
        throw new ForbiddenException('Status is locked by an active incident');
      }

      const submittedChanges = this.extractCheckpointChanges(
        checkpoint,
        updateCheckpointDto,
      );

      if (Object.keys(submittedChanges).length === 0) {
        return {
          checkpoint,
          changes: submittedChanges,
          previousValues: this.snapshotCheckpointFields(checkpoint),
        };
      }

      const changesToApply =
        checkpoint.moderationStatus === ModerationStatus.PENDING_UPDATE
          ? this.mergeCheckpointPendingChanges(checkpoint, submittedChanges)
          : submittedChanges;
      const previousStatus = checkpoint.currentStatus;
      const previousValues = this.snapshotCheckpointFields(checkpoint);

      Object.assign(checkpoint, changesToApply);
      checkpoint.pendingChanges = null;
      checkpoint.moderationStatus = ModerationStatus.APPROVED;
      checkpoint.updatedByUserId = changedByUserId ?? null;
      checkpoint.approvedByUserId = changedByUserId ?? null;
      checkpoint.approvedAt = new Date();
      checkpoint.rejectedByUserId = null;
      checkpoint.rejectedAt = null;
      checkpoint.rejectionReason = null;

      const savedCheckpoint = await this.saveCheckpointWithHistoryInTransaction(
        manager,
        checkpoint,
        previousStatus,
        changedByUserId,
      );

      if (this.shouldCascadeIncidentMasterData(changesToApply)) {
        await this.syncActiveIncidentLocationsForCheckpoint(
          manager,
          savedCheckpoint,
        );
      }

      return {
        checkpoint: savedCheckpoint,
        changes: changesToApply,
        previousValues,
      };
    });

    if (Object.keys(result.changes).length > 0) {
      await this.auditLogService.record({
        action: AuditAction.UPDATED,
        targetType: AuditTargetType.CHECKPOINT,
        targetId: result.checkpoint.id,
        performedByUserId: changedByUserId ?? null,
        details: this.buildCheckpointUpdateDetails(
          result.checkpoint,
          result.changes,
          changedByUserId,
          'applied',
          result.previousValues,
        ),
        metadata: {
          workflow: ModerationStatus.APPROVED,
          changes: result.changes,
        },
      });
    }

    return result.checkpoint;
  }
  async remove(
    id: number,
    changedByUserId?: number,
  ): Promise<Checkpoint | void> {
    const deletedCheckpoint = await this.checkpointsRepository.manager.transaction(
      async (manager) => {
        const checkpointRepository = manager.getRepository(Checkpoint);
        const checkpoint = await checkpointRepository.findOne({
          where: { id },
        });

        if (!checkpoint) {
          return null;
        }

        const deletedCheckpoint = { ...checkpoint } as Checkpoint;
        await checkpointRepository.remove(checkpoint);

        return deletedCheckpoint;
      },
    );

    if (!deletedCheckpoint) {
      return;
    }

    await this.auditLogService.record({
      action: AuditAction.DELETED,
      targetType: AuditTargetType.CHECKPOINT,
      targetId: deletedCheckpoint.id,
      performedByUserId: changedByUserId ?? null,
      details: this.buildCheckpointDeleteDetails(
        deletedCheckpoint,
        changedByUserId,
        'deleted',
      ),
      metadata: {
        workflow: ModerationStatus.APPROVED,
        targetSnapshot: this.snapshotCheckpointFields(deletedCheckpoint),
      },
    });

    return deletedCheckpoint;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStatusDto,
    changedByUserId?: number,
  ): Promise<Checkpoint> {
    return this.update(
      id,
      { currentStatus: updateStatusDto.currentStatus },
      changedByUserId,
    );
  }

  async approve(id: number, approvedByUserId?: number): Promise<Checkpoint> {
    const result = await this.checkpointsRepository.manager.transaction(
      async (manager) => {
        const checkpoint = await this.findCheckpointInTransaction(manager, id);
        const previousModerationStatus = checkpoint.moderationStatus;
        const pendingChanges = this.getCheckpointPendingChanges(checkpoint);

        if (
          previousModerationStatus !== ModerationStatus.PENDING_CREATE &&
          previousModerationStatus !== ModerationStatus.PENDING_UPDATE &&
          previousModerationStatus !== ModerationStatus.PENDING_DELETE
        ) {
          throw new BadRequestException(
            'Checkpoint does not have a pending workflow decision',
          );
        }

        const previousStatus = checkpoint.currentStatus;
        const previousValues = this.snapshotCheckpointFields(checkpoint);

        if (previousModerationStatus === ModerationStatus.PENDING_UPDATE) {
          Object.assign(checkpoint, pendingChanges);
        }

        if (previousModerationStatus === ModerationStatus.PENDING_DELETE) {
          checkpoint.approvedByUserId = approvedByUserId ?? null;
          checkpoint.approvedAt = new Date();
          const deletedCheckpoint = { ...checkpoint } as Checkpoint;
          await manager.getRepository(Checkpoint).remove(checkpoint);

          return {
            checkpoint: deletedCheckpoint,
            previousModerationStatus,
            changes: pendingChanges,
            previousValues,
          };
        }

        checkpoint.moderationStatus = ModerationStatus.APPROVED;
        checkpoint.pendingChanges = null;
        checkpoint.approvedByUserId = approvedByUserId ?? null;
        checkpoint.approvedAt = new Date();
        checkpoint.rejectedByUserId = null;
        checkpoint.rejectedAt = null;
        checkpoint.rejectionReason = null;

        const savedCheckpoint = await this.saveCheckpointWithHistoryInTransaction(
          manager,
          checkpoint,
          previousStatus,
          approvedByUserId,
        );

        if (
          previousModerationStatus === ModerationStatus.PENDING_UPDATE &&
          this.shouldCascadeIncidentMasterData(pendingChanges)
        ) {
          await this.syncActiveIncidentLocationsForCheckpoint(
            manager,
            savedCheckpoint,
          );
        }

        return {
          checkpoint: savedCheckpoint,
          previousModerationStatus,
          changes: pendingChanges,
          previousValues,
        };
      },
    );

    await this.auditLogService.record({
      action: AuditAction.APPROVED,
      targetType: AuditTargetType.CHECKPOINT,
      targetId: result.checkpoint.id,
      performedByUserId: approvedByUserId ?? null,
      details: this.buildCheckpointApprovalDetails(
        result.checkpoint,
        result.previousModerationStatus,
        result.changes,
        approvedByUserId,
        result.previousValues,
      ),
      metadata: {
        workflow: result.previousModerationStatus,
        changes: result.changes,
      },
    });

    return result.checkpoint;
  }

  async reject(
    id: number,
    rejectedByUserId?: number,
    reason?: string,
  ): Promise<Checkpoint> {
    const result = await this.checkpointsRepository.manager.transaction(
      async (manager) => {
        const checkpoint = await this.findCheckpointInTransaction(manager, id);
        const previousModerationStatus = checkpoint.moderationStatus;
        const pendingChanges = this.getCheckpointPendingChanges(checkpoint);

        if (
          previousModerationStatus !== ModerationStatus.PENDING_CREATE &&
          previousModerationStatus !== ModerationStatus.PENDING_UPDATE &&
          previousModerationStatus !== ModerationStatus.PENDING_DELETE
        ) {
          throw new BadRequestException(
            'Checkpoint does not have a pending workflow decision',
          );
        }

        checkpoint.moderationStatus =
          previousModerationStatus === ModerationStatus.PENDING_CREATE
            ? ModerationStatus.REJECTED_CREATE
            : previousModerationStatus === ModerationStatus.PENDING_DELETE
              ? ModerationStatus.REJECTED_DELETE
              : ModerationStatus.REJECTED_UPDATE;
        checkpoint.pendingChanges = null;
        checkpoint.rejectedByUserId = rejectedByUserId ?? null;
        checkpoint.rejectedAt = new Date();
        checkpoint.rejectionReason = reason?.trim() || null;

        const savedCheckpoint = await manager
          .getRepository(Checkpoint)
          .save(checkpoint);

        return {
          checkpoint: savedCheckpoint,
          previousModerationStatus,
          changes: pendingChanges,
        };
      },
    );

    await this.auditLogService.record({
      action: AuditAction.REJECTED,
      targetType: AuditTargetType.CHECKPOINT,
      targetId: result.checkpoint.id,
      performedByUserId: rejectedByUserId ?? null,
      details: this.buildCheckpointRejectionDetails(
        result.checkpoint,
        result.previousModerationStatus,
        result.changes,
        rejectedByUserId,
        reason,
      ),
      metadata: {
        workflow: result.previousModerationStatus,
        changes: result.changes,
        reason: reason?.trim() || null,
      },
    });

    return result.checkpoint;
  }

  async getHistory(id: number) {
    const checkpoint = await this.findOne(id);

    const history = await this.checkpointStatusHistoryRepository.find({
      where: { checkpointId: id },
      order: { changedAt: 'DESC', id: 'DESC' },
    });

    return {
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      location: checkpoint.location,
      currentStatus: checkpoint.currentStatus,
      history: history.map((record) => ({
        id: record.id,
        checkpointId: record.checkpointId ?? checkpoint.id,
        oldStatus: record.oldStatus,
        newStatus: record.newStatus,
        changedByUserId: record.changedByUserId ?? null,
        changedAt: record.changedAt,
      })),
    };
  }

  async countCheckpoints(): Promise<number> {
    return this.checkpointsRepository.count();
  }

  async getActiveCheckpointsCount(): Promise<number> {
    return this.checkpointsRepository.count({
      where: {
        currentStatus: CheckpointStatus.OPEN,
        moderationStatus: In(PUBLIC_MODERATION_STATUSES),
      },
    });
  }

  private async findCheckpointInTransaction(
    manager: EntityManager,
    checkpointId: number,
  ): Promise<Checkpoint> {
    const checkpoint = await manager.getRepository(Checkpoint).findOne({
      where: { id: checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with id ${checkpointId} not found`);
    }

    return checkpoint;
  }

  private async findActiveLinkedIncident(
    manager: EntityManager,
    checkpointId: number,
  ): Promise<Incident | null> {
    return manager
      .getRepository(Incident)
      .createQueryBuilder('incident')
      .where('incident.checkpointId = :checkpointId', { checkpointId })
      .andWhere('incident.status = :status', {
        status: IncidentStatus.ACTIVE,
      })
      .orderBy('incident.id', 'ASC')
      .getOne();
  }

  private async syncActiveIncidentLocationsForCheckpoint(
    manager: EntityManager,
    checkpoint: Checkpoint,
  ): Promise<void> {
    const incidentRepository = manager.getRepository(Incident);
    const activeLinkedIncidents = await incidentRepository
      .createQueryBuilder('incident')
      .where('incident.checkpointId = :checkpointId', {
        checkpointId: checkpoint.id,
      })
      .andWhere('incident.status = :status', {
        status: IncidentStatus.ACTIVE,
      })
      .getMany();

    if (activeLinkedIncidents.length === 0) {
      return;
    }

    activeLinkedIncidents.forEach((incident) => {
      incident.location = checkpoint.location;
      incident.latitude = checkpoint.latitude;
      incident.longitude = checkpoint.longitude;
    });

    await incidentRepository.save(activeLinkedIncidents);
  }

  private async saveCheckpointWithHistoryInTransaction(
    manager: EntityManager,
    checkpoint: Checkpoint,
    previousStatus: CheckpointStatus,
    changedByUserId?: number,
  ): Promise<Checkpoint> {
    const hasStatusChange = previousStatus !== checkpoint.currentStatus;
    const checkpointRepository = manager.getRepository(Checkpoint);
    const savedCheckpoint = await checkpointRepository.save(checkpoint);

    if (!hasStatusChange) {
      return savedCheckpoint;
    }

    const checkpointStatusHistoryRepository = manager.getRepository(
      CheckpointStatusHistory,
    );

    const historyRecord = checkpointStatusHistoryRepository.create({
      checkpoint: savedCheckpoint,
      checkpointId: savedCheckpoint.id,
      oldStatus: previousStatus,
      newStatus: savedCheckpoint.currentStatus,
      changedByUserId,
    });

    await checkpointStatusHistoryRepository.save(historyRecord);
    return savedCheckpoint;
  }

  private extractCheckpointChanges(
    checkpoint: Checkpoint,
    updateCheckpointDto: UpdateCheckpointDto,
  ): CheckpointChangeSet {
    const requestedStatus =
      updateCheckpointDto.status ?? updateCheckpointDto.currentStatus;
    const candidateChanges: CheckpointChangeSet = {
      name: updateCheckpointDto.name,
      location: updateCheckpointDto.location,
      latitude: updateCheckpointDto.latitude,
      longitude: updateCheckpointDto.longitude,
      description:
        updateCheckpointDto.notes || updateCheckpointDto.description,
      currentStatus: requestedStatus,
    };

    const changes: CheckpointChangeSet = {};

    (Object.keys(candidateChanges) as (keyof CheckpointChangeSet)[]).forEach(
      (key) => {
        const nextValue = candidateChanges[key];
        if (nextValue === undefined) {
          return;
        }

        if (!this.valuesEqual(checkpoint[key], nextValue)) {
          changes[key] = nextValue as never;
        }
      },
    );

    return changes;
  }

  private mergeCheckpointPendingChanges(
    checkpoint: Checkpoint,
    submittedChanges: CheckpointChangeSet,
  ): CheckpointChangeSet {
    const existingPendingChanges =
      checkpoint.moderationStatus === ModerationStatus.PENDING_UPDATE
        ? this.getCheckpointPendingChanges(checkpoint)
        : {};
    const mergedChanges: CheckpointChangeSet = {
      ...existingPendingChanges,
      ...submittedChanges,
    };

    (Object.keys(mergedChanges) as (keyof CheckpointChangeSet)[]).forEach(
      (key) => {
        if (this.valuesEqual(checkpoint[key], mergedChanges[key])) {
          delete mergedChanges[key];
        }
      },
    );

    return mergedChanges;
  }

  private getCheckpointPendingChanges(
    checkpoint: Checkpoint,
  ): CheckpointChangeSet {
    return this.isRecord(checkpoint.pendingChanges)
      ? (checkpoint.pendingChanges as CheckpointChangeSet)
      : {};
  }

  private applyCheckpointPendingChangesForPublicRead(
    checkpoint: Checkpoint,
  ): Checkpoint {
    if (checkpoint.moderationStatus !== ModerationStatus.PENDING_UPDATE) {
      return checkpoint;
    }

    const pendingChanges = this.getCheckpointPendingChanges(checkpoint);
    if (Object.keys(pendingChanges).length === 0) {
      return checkpoint;
    }

    return Object.assign(checkpoint, pendingChanges, {
      moderationStatus: ModerationStatus.APPROVED,
      pendingChanges: null,
    });
  }

  private shouldCascadeIncidentMasterData(
    changes: CheckpointChangeSet,
  ): boolean {
    return (
      changes.name !== undefined ||
      changes.location !== undefined ||
      changes.latitude !== undefined ||
      changes.longitude !== undefined
    );
  }

  private isPubliclyVisibleModerationStatus(
    moderationStatus?: ModerationStatus,
  ): boolean {
    return PUBLIC_MODERATION_STATUSES.includes(
      moderationStatus ?? ModerationStatus.APPROVED,
    );
  }

  private buildCheckpointCreateDetails(
    checkpoint: Checkpoint,
    userId?: number,
  ): string {
    return `CHECKPOINT created by ${this.formatActor(userId)}; published immediately; name: ${checkpoint.name}; location: ${checkpoint.location}; initial status: ${checkpoint.currentStatus}`;
  }

  private buildCheckpointUpdateDetails(
    checkpoint: Checkpoint,
    changes: CheckpointChangeSet,
    userId: number | undefined,
    verb: 'submitted' | 'approved' | 'rejected' | 'applied',
    previousValues: CheckpointChangeSet | Checkpoint = checkpoint,
  ): string {
    const flow =
      checkpoint.moderationStatus === ModerationStatus.PENDING_CREATE
        ? 'create'
        : 'update';
    const changeDetails = this.formatCheckpointChanges(previousValues, changes);

    return `CHECKPOINT ${flow} ${verb} by ${this.formatActor(userId)}; ${changeDetails}`;
  }

  private buildCheckpointApprovalDetails(
    checkpoint: Checkpoint,
    previousModerationStatus: ModerationStatus,
    changes: CheckpointChangeSet,
    userId?: number,
    previousValues?: CheckpointChangeSet,
  ): string {
    if (previousModerationStatus === ModerationStatus.PENDING_CREATE) {
      return `CHECKPOINT approved by ${this.formatActor(userId)}; create flow published`;
    }

    if (previousModerationStatus === ModerationStatus.PENDING_DELETE) {
      return `CHECKPOINT delete approved by ${this.formatActor(userId)}; checkpoint removed from public view`;
    }

    return this.buildCheckpointUpdateDetails(
      checkpoint,
      changes,
      userId,
      'approved',
      previousValues,
    );
  }

  private buildCheckpointRejectionDetails(
    checkpoint: Checkpoint,
    previousModerationStatus: ModerationStatus,
    changes: CheckpointChangeSet,
    userId?: number,
    reason?: string,
  ): string {
    let base: string;

    if (previousModerationStatus === ModerationStatus.PENDING_CREATE) {
      base = `CHECKPOINT rejected by ${this.formatActor(userId)}; create flow remains unpublished`;
    } else if (previousModerationStatus === ModerationStatus.PENDING_DELETE) {
      base = `CHECKPOINT delete rejected by ${this.formatActor(userId)}; public version remains active`;
    } else {
      base = this.buildCheckpointUpdateDetails(
        checkpoint,
        changes,
        userId,
        'rejected',
      );
    }

    const normalizedReason = reason?.trim();

    return normalizedReason ? `${base}; reason: ${normalizedReason}` : base;
  }

  private buildCheckpointDeleteDetails(
    checkpoint: Checkpoint,
    userId: number | undefined,
    verb: 'submitted' | 'discarded' | 'deleted',
  ): string {
    if (verb === 'deleted') {
      return `CHECKPOINT deleted by ${this.formatActor(userId)}; removed from admin and citizen views: ${checkpoint.name}`;
    }

    if (verb === 'discarded') {
      return `CHECKPOINT delete requested by ${this.formatActor(userId)}; unpublished create discarded from public workflow: ${checkpoint.name}`;
    }

    return `CHECKPOINT delete submitted by ${this.formatActor(userId)}; pending approval (delete); public version remains active: ${checkpoint.name}`;
  }

  private formatCheckpointChanges(
    checkpoint: CheckpointChangeSet | Checkpoint,
    changes: CheckpointChangeSet,
  ): string {
    const entries = (Object.keys(changes) as (keyof CheckpointChangeSet)[]).map(
      (key) => {
        const oldValue = this.formatValue(checkpoint[key]);
        const newValue = this.formatValue(changes[key]);

        if (key === 'currentStatus') {
          return `status changed: ${oldValue} -> ${newValue}`;
        }

        return `${key} changed: ${oldValue} -> ${newValue}`;
      },
    );

    return entries.length > 0 ? entries.join('; ') : 'no field changes';
  }

  private formatActor(userId?: number): string {
    return userId ? `admin #${userId}` : 'admin';
  }

  private formatValue(value: unknown): string {
    if (value === undefined || value === null || value === '') {
      return 'empty';
    }

    return String(value);
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left) === Number(right);
    }

    return left === right;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private snapshotCheckpointFields(checkpoint: Checkpoint): CheckpointChangeSet {
    return {
      name: checkpoint.name,
      location: checkpoint.location,
      latitude: checkpoint.latitude,
      longitude: checkpoint.longitude,
      description: checkpoint.description ?? null,
      currentStatus: checkpoint.currentStatus,
    };
  }

  private assertValidMapDateRange(
    startDate?: Date,
    endDate?: Date,
  ): void {
    const hasStartDate = Boolean(startDate);
    const hasEndDate = Boolean(endDate);

    if (hasStartDate !== hasEndDate) {
      throw new BadRequestException(
        'startDate and endDate must be provided together.',
      );
    }

    if (!hasStartDate || !hasEndDate) {
      return;
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be before endDate.');
    }
  }

  async findActiveForRouteEstimation(): Promise<Checkpoint[]> {
    return this.checkpointsRepository.find({
      where: {
        currentStatus: CheckpointStatus.OPEN,
        moderationStatus: In(PUBLIC_MODERATION_STATUSES),
      },
    });
  }
}

