import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Checkpoint } from '../checkpoints/entities/checkpoint.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { getHaversineDistanceSql } from '../../common/utils/geo.util';
import {
  IncidentQueryDto,
  IncidentSortBy,
  SortOrder,
} from './dto/incident-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { Incident } from './entities/incident.entity';
import { IncidentStatusHistory } from './entities/status-history.entity';
import { IncidentStatus } from './enums/incident-status.enum';
import { IncidentSeverity } from './enums/incident-severity.enum';
import { IncidentAlertObserver } from './observers/incident-created.observer';
import { IncidentQueryStrategyService } from './services/incident-query-strategy.service';
import { IncidentStatusLifecycleService } from './services/incident-status-lifecycle.service';
import { IncidentUpdateStrategyService } from './services/incident-update-strategy.service';
import { IncidentCheckpointSyncService } from './sync/incident-checkpoint-sync.service';
import { MapFilterQueryDto } from '../map/dto/map-filter-query.dto';
import {
  ModerationStatus,
  PUBLIC_MODERATION_STATUSES,
} from '../../common/enums/moderation-status.enum';
import { CheckpointStatus } from '../checkpoints/enums/checkpoint-status.enum';
import { IncidentType } from './enums/incident-type.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditTargetType } from '../audit-log/enums/audit-target-type.enum';

type IncidentAlertState = {
  isVerified: boolean;
  status: IncidentStatus;
};

type IncidentChangeSet = Partial<{
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  isVerified: boolean;
  checkpointId: number | null;
  impactStatus: CheckpointStatus | null;
}>;

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,

    @InjectRepository(IncidentStatusHistory)
    private readonly incidentStatusHistoryRepository: Repository<IncidentStatusHistory>,

    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,

    private readonly incidentQueryStrategyService: IncidentQueryStrategyService,
    private readonly incidentUpdateStrategyService: IncidentUpdateStrategyService,
    private readonly incidentStatusLifecycleService: IncidentStatusLifecycleService,
    private readonly incidentAlertObserver: IncidentAlertObserver,
    private readonly incidentCheckpointSyncService: IncidentCheckpointSyncService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async verifyIncident(id: number, userId?: number) {
    const incident = await this.findOne(id);

    if (incident.isVerified || incident.verifiedAt) {
      return { message: 'Incident is already verified' };
    }

    return this.verify(id, userId);
  }

  async create(
    createIncidentDto: CreateIncidentDto,
    changedByUserId?: number,
  ): Promise<Incident> {
    const nextStatus = createIncidentDto.status ?? IncidentStatus.ACTIVE;

    if (nextStatus === IncidentStatus.ACTIVE) {
      const duplicateByTitle = await this.findOtherActiveIncidentWithTitle(
        createIncidentDto.title,
      );

      if (duplicateByTitle) {
        return this.findOne(duplicateByTitle.id);
      }
    }

    if (
      createIncidentDto.latitude !== undefined &&
      createIncidentDto.longitude !== undefined &&
      createIncidentDto.latitude !== null &&
      createIncidentDto.longitude !== null
    ) {
      const distanceThreshold = 50;

      const existingByLocation = await this.incidentsRepository
        .createQueryBuilder('incident')
        .where('incident.status = :status', { status: IncidentStatus.ACTIVE })
        .andWhere(
          'incident.moderationStatus IN (:...publicModerationStatuses)',
          {
            publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
          },
        )
        .andWhere(`${getHaversineDistanceSql('incident')} < :distance`, {
          distance: distanceThreshold,
        })
        .setParameters({
          lat: createIncidentDto.latitude,
          lng: createIncidentDto.longitude,
        })
        .getOne();

      if (existingByLocation) {
        return this.findOne(existingByLocation.id);
      }
    }

    this.assertValidCheckpointLink(
      createIncidentDto.type,
      createIncidentDto.checkpointId ?? null,
      createIncidentDto.impactStatus,
    );

    const checkpoint = await this.resolveCheckpointForCreate(
      createIncidentDto.checkpointId ?? null,
    );

    const incident = this.incidentsRepository.create({
      title: createIncidentDto.title,
      description: createIncidentDto.description,
      type: createIncidentDto.type,
      severity: createIncidentDto.severity,
      status: nextStatus,
      impactStatus: checkpoint ? createIncidentDto.impactStatus : undefined,
      checkpoint: checkpoint ?? undefined,
      moderationStatus: ModerationStatus.APPROVED,
      pendingChanges: null,
      createdByUserId: changedByUserId ?? null,
      approvedByUserId: changedByUserId ?? null,
      approvedAt: new Date(),
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
    });

    if (checkpoint) {
      incident.location = checkpoint.location;
      incident.latitude = checkpoint.latitude;
      incident.longitude = checkpoint.longitude;
    } else {
      this.incidentCheckpointSyncService.applyIncidentLocationSnapshot(incident, {
        location: createIncidentDto.location,
        latitude: createIncidentDto.latitude,
        longitude: createIncidentDto.longitude,
      });
    }

    this.incidentCheckpointSyncService.applyIncidentVerificationState(
      incident,
      createIncidentDto.isVerified ?? false,
      changedByUserId,
      { defaultToFalse: true },
    );

    const savedIncident = await this.incidentCheckpointSyncService.saveIncident({
      incident,
      changedByUserId,
    });
    this.dispatchPostCommitAlerts(savedIncident);

    await this.auditLogService.record({
      action: AuditAction.CREATED,
      targetType: AuditTargetType.INCIDENT,
      targetId: savedIncident.id,
      performedByUserId: changedByUserId ?? null,
      details: this.buildIncidentCreateDetails(savedIncident, changedByUserId),
      metadata: {
        workflow: ModerationStatus.APPROVED,
        status: savedIncident.status,
        isVerified: savedIncident.isVerified,
      },
    });

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async findAll(
    incidentQueryDto: IncidentQueryDto,
    options: { includeUnpublished?: boolean } = {},
  ) {
    const {
      status,
      type,
      severity,
      checkpointId,
      sortBy = IncidentSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 10,
    } = incidentQueryDto;

    const queryBuilder = this.incidentsRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.checkpoint', 'checkpoint');

    queryBuilder.andWhere('incident.moderationStatus != :pendingDelete', {
      pendingDelete: ModerationStatus.PENDING_DELETE,
    });

    this.incidentQueryStrategyService.apply(queryBuilder, {
      status,
      type,
      severity,
      checkpointId,
      sortBy,
      sortOrder,
    });

    if (!options.includeUnpublished) {
      queryBuilder.andWhere(
        'incident.moderationStatus IN (:...publicModerationStatuses)',
        {
          publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
        },
      );
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const responseData = options.includeUnpublished
      ? data
      : data.map((incident) =>
          this.applyIncidentPendingChangesForPublicRead(incident),
        );

    return {
      data: this.normalizeIncidentsForResponse(responseData),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllPaginated(
    paginationQuery: PaginationQueryDto,
    options: { includeUnpublished?: boolean } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      severity,
      isVerified,
      checkpointId,
      search,
      startDate,
      endDate,
      sortBy = IncidentSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = paginationQuery;

    this.assertValidPaginationDateRange(startDate, endDate);

    const queryBuilder = this.incidentsRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.checkpoint', 'checkpoint');

    queryBuilder.andWhere('incident.moderationStatus != :pendingDelete', {
      pendingDelete: ModerationStatus.PENDING_DELETE,
    });

    if (status) {
      queryBuilder.andWhere('incident.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('incident.type = :type', { type });
    }

    if (severity) {
      queryBuilder.andWhere('incident.severity = :severity', { severity });
    }

    if (typeof isVerified === 'boolean') {
      queryBuilder.andWhere('incident.isVerified = :isVerified', {
        isVerified,
      });
    }

    if (checkpointId) {
      queryBuilder.andWhere('incident.checkpointId = :checkpointId', {
        checkpointId,
      });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      queryBuilder.andWhere(
        `(
          LOWER(incident.title) LIKE :search OR
          LOWER(incident.description) LIKE :search OR
          LOWER(COALESCE(incident.location, '')) LIKE :search
        )`,
        { search: normalizedSearch },
      );
    }

    if (!options.includeUnpublished) {
      queryBuilder.andWhere(
        'incident.moderationStatus IN (:...publicModerationStatuses)',
        {
          publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
        },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('incident.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('incident.createdAt <= :endDate', { endDate });
    }

    queryBuilder.orderBy(`incident.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const responseData = options.includeUnpublished
      ? data
      : data.map((incident) =>
          this.applyIncidentPendingChangesForPublicRead(incident),
        );

    return {
      data: this.normalizeIncidentsForResponse(responseData),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFilteredIncidents(
    filterDto: MapFilterQueryDto,
  ): Promise<Incident[]> {
    const { types, severity, startDate, endDate } = filterDto;
    this.assertValidMapDateRange(startDate, endDate);

    const hasDateRange = Boolean(startDate && endDate);

    if (hasDateRange) {
      const historyQueryBuilder = this.incidentStatusHistoryRepository
        .createQueryBuilder('incidentHistory')
        .innerJoin('incidentHistory.incident', 'incident')
        .where('incidentHistory.changedAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .andWhere(
          'incident.moderationStatus IN (:...publicModerationStatuses)',
          {
            publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
          },
        );

      if (types && types.length > 0) {
        historyQueryBuilder.andWhere('incident.type IN (:...types)', { types });
      }

      if (severity) {
        historyQueryBuilder.andWhere('incident.severity = :severity', {
          severity,
        });
      }

      const rawIncidentIds = await historyQueryBuilder
        .select('DISTINCT incident.id', 'id')
        .orderBy('incident.id', 'ASC')
        .getRawMany<{ id: number | string }>();

      const incidentIds = rawIncidentIds
        .map((row) => Number(row.id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (incidentIds.length === 0) {
        return [];
      }

      const incidents = await this.incidentsRepository
        .createQueryBuilder('incident')
        .leftJoinAndSelect('incident.checkpoint', 'checkpoint')
        .where('incident.id IN (:...incidentIds)', { incidentIds })
        .andWhere(
          'incident.moderationStatus IN (:...publicModerationStatuses)',
          {
            publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
          },
        )
        .orderBy('incident.updatedAt', 'DESC')
        .getMany();

      return this.normalizeIncidentsForResponse(
        incidents.map((incident) =>
          this.applyIncidentPendingChangesForPublicRead(incident),
        ),
      );
    }

    const queryBuilder = this.incidentsRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.checkpoint', 'checkpoint')
      .where('incident.status = :status', { status: IncidentStatus.ACTIVE })
      .andWhere(
        'incident.moderationStatus IN (:...publicModerationStatuses)',
        {
          publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
        },
      );

    if (types && types.length > 0) {
      queryBuilder.andWhere('incident.type IN (:...types)', { types });
    }

    if (severity) {
      queryBuilder.andWhere('incident.severity = :severity', { severity });
    }

    const incidents = await queryBuilder
      .orderBy('incident.updatedAt', 'DESC')
      .getMany();

    return this.normalizeIncidentsForResponse(
      incidents.map((incident) =>
        this.applyIncidentPendingChangesForPublicRead(incident),
      ),
    );
  }

  async findOne(
    id: number,
    options: { includeUnpublished?: boolean } = { includeUnpublished: true },
  ): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({
      where: { id },
      relations: ['checkpoint'],
    });

    if (
      !incident ||
      (!options.includeUnpublished &&
        !this.isPubliclyVisibleModerationStatus(incident.moderationStatus))
    ) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }

    return this.normalizeIncidentForResponse(
      options.includeUnpublished
        ? incident
        : this.applyIncidentPendingChangesForPublicRead(incident),
    );
  }

  async update(
    id: number,
    updateIncidentDto: UpdateIncidentDto,
    changedByUserId?: number,
  ): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.moderationStatus === ModerationStatus.PENDING_DELETE) {
      throw new BadRequestException(
        'Incident has a pending delete workflow decision',
      );
    }

    const submittedChanges = await this.extractIncidentChanges(
      incident,
      updateIncidentDto,
    );

    if (Object.keys(submittedChanges).length === 0) {
      return incident;
    }

    const candidateChanges =
      incident.moderationStatus === ModerationStatus.PENDING_UPDATE
        ? this.mergeIncidentPendingChanges(incident, submittedChanges)
        : submittedChanges;

    this.assertValidPendingIncidentChanges(incident, candidateChanges);

    const candidateStatus =
      (candidateChanges.status as IncidentStatus | undefined) ?? incident.status;
    const candidateTitle =
      (candidateChanges.title as string | undefined) ?? incident.title;

    if (candidateStatus === IncidentStatus.ACTIVE) {
      await this.ensureNoOtherActiveIncidentWithTitle(
        candidateTitle,
        incident.id,
      );
    }

    const previousAlertState = this.createIncidentAlertState(incident);
    const previousStatus = incident.status;
    const previousSnapshot =
      this.incidentCheckpointSyncService.createCheckpointSnapshot(incident);
    const previousValues = this.snapshotIncidentFields(incident);

    await this.applyIncidentChangeSet(incident, candidateChanges, {
      changedByUserId,
      applyStatusLifecycle: true,
    });
    incident.pendingChanges = null;
    incident.moderationStatus = ModerationStatus.APPROVED;
    incident.updatedByUserId = changedByUserId ?? null;
    incident.approvedByUserId = changedByUserId ?? null;
    incident.approvedAt = new Date();
    incident.rejectedByUserId = null;
    incident.rejectedAt = null;
    incident.rejectionReason = null;

    const savedIncident = await this.incidentCheckpointSyncService.saveIncident({
      incident,
      previousSnapshot,
      previousStatus,
      changedByUserId,
    });
    this.dispatchPostCommitAlerts(savedIncident, previousAlertState);

    await this.auditLogService.record({
      action: AuditAction.UPDATED,
      targetType: AuditTargetType.INCIDENT,
      targetId: savedIncident.id,
      performedByUserId: changedByUserId ?? null,
      details: this.buildIncidentUpdateDetails(
        incident,
        candidateChanges,
        changedByUserId,
        'applied',
        previousValues,
      ),
      metadata: {
        workflow: ModerationStatus.APPROVED,
        changes: candidateChanges,
      },
    });

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async approve(id: number, approvedByUserId?: number): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousModerationStatus = incident.moderationStatus;
    const pendingChanges = this.getIncidentPendingChanges(incident);

    if (
      previousModerationStatus !== ModerationStatus.PENDING_CREATE &&
      previousModerationStatus !== ModerationStatus.PENDING_UPDATE &&
      previousModerationStatus !== ModerationStatus.PENDING_DELETE
    ) {
      throw new BadRequestException(
        'Incident does not have a pending workflow decision',
      );
    }

    const previousAlertState =
      previousModerationStatus === ModerationStatus.PENDING_UPDATE
        ? this.createIncidentAlertState(incident)
        : undefined;
    const previousStatus = incident.status;
    const previousSnapshot =
      previousModerationStatus === ModerationStatus.PENDING_UPDATE
        ? this.incidentCheckpointSyncService.createCheckpointSnapshot(incident)
        : undefined;
    const previousValues = this.snapshotIncidentFields(incident);

    if (previousModerationStatus === ModerationStatus.PENDING_UPDATE) {
      await this.applyIncidentChangeSet(incident, pendingChanges, {
        changedByUserId: approvedByUserId,
        applyStatusLifecycle: true,
      });
    }

    if (previousModerationStatus === ModerationStatus.PENDING_DELETE) {
      incident.approvedByUserId = approvedByUserId ?? null;
      incident.approvedAt = new Date();
      const deletedIncident = { ...incident } as Incident;

      await this.incidentCheckpointSyncService.removeIncident(
        incident,
        approvedByUserId,
      );

      await this.auditLogService.record({
        action: AuditAction.APPROVED,
        targetType: AuditTargetType.INCIDENT,
        targetId: deletedIncident.id,
        performedByUserId: approvedByUserId ?? null,
        details: this.buildIncidentApprovalDetails(
          deletedIncident,
          previousModerationStatus,
          pendingChanges,
          approvedByUserId,
          previousValues,
        ),
        metadata: {
          workflow: previousModerationStatus,
          changes: pendingChanges,
        },
      });

      return this.normalizeIncidentForResponse(deletedIncident);
    }

    this.assertValidPendingIncidentChanges(incident, {});

    if (incident.status === IncidentStatus.ACTIVE) {
      await this.ensureNoOtherActiveIncidentWithTitle(incident.title, incident.id);
    }

    incident.moderationStatus = ModerationStatus.APPROVED;
    incident.pendingChanges = null;
    incident.approvedByUserId = approvedByUserId ?? null;
    incident.approvedAt = new Date();
    incident.rejectedByUserId = null;
    incident.rejectedAt = null;
    incident.rejectionReason = null;

    const savedIncident = await this.incidentCheckpointSyncService.saveIncident({
      incident,
      previousSnapshot,
      previousStatus,
      changedByUserId: approvedByUserId,
    });

    this.dispatchPostCommitAlerts(savedIncident, previousAlertState);

    await this.auditLogService.record({
      action: AuditAction.APPROVED,
      targetType: AuditTargetType.INCIDENT,
      targetId: savedIncident.id,
      performedByUserId: approvedByUserId ?? null,
      details: this.buildIncidentApprovalDetails(
        savedIncident,
        previousModerationStatus,
        pendingChanges,
        approvedByUserId,
        previousValues,
      ),
      metadata: {
        workflow: previousModerationStatus,
        changes: pendingChanges,
      },
    });

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async reject(
    id: number,
    rejectedByUserId?: number,
    reason?: string,
  ): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousModerationStatus = incident.moderationStatus;
    const pendingChanges = this.getIncidentPendingChanges(incident);

    if (
      previousModerationStatus !== ModerationStatus.PENDING_CREATE &&
      previousModerationStatus !== ModerationStatus.PENDING_UPDATE &&
      previousModerationStatus !== ModerationStatus.PENDING_DELETE
    ) {
      throw new BadRequestException(
        'Incident does not have a pending workflow decision',
      );
    }

    incident.moderationStatus =
      previousModerationStatus === ModerationStatus.PENDING_CREATE
        ? ModerationStatus.REJECTED_CREATE
        : previousModerationStatus === ModerationStatus.PENDING_DELETE
          ? ModerationStatus.REJECTED_DELETE
          : ModerationStatus.REJECTED_UPDATE;
    incident.pendingChanges = null;
    incident.rejectedByUserId = rejectedByUserId ?? null;
    incident.rejectedAt = new Date();
    incident.rejectionReason = reason?.trim() || null;

    const savedIncident = await this.incidentsRepository.save(incident);

    await this.auditLogService.record({
      action: AuditAction.REJECTED,
      targetType: AuditTargetType.INCIDENT,
      targetId: savedIncident.id,
      performedByUserId: rejectedByUserId ?? null,
      details: this.buildIncidentRejectionDetails(
        savedIncident,
        previousModerationStatus,
        pendingChanges,
        rejectedByUserId,
        reason,
      ),
      metadata: {
        workflow: previousModerationStatus,
        changes: pendingChanges,
        reason: reason?.trim() || null,
      },
    });

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async verify(id: number, userId?: number): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Closed incident cannot be verified');
    }

    if (incident.isVerified || incident.verifiedAt) {
      return incident;
    }

    return this.update(
      id,
      { isVerified: true },
      userId,
    );
  }

  async close(id: number, userId?: number): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.status === IncidentStatus.CLOSED) {
      return incident;
    }

    return this.update(
      id,
      { status: IncidentStatus.CLOSED },
      userId,
    );
  }

  async remove(
    id: number,
    changedByUserId?: number,
  ): Promise<Incident | void> {
    const incident = await this.findOne(id);
    const deletedIncident = { ...incident } as Incident;

    await this.incidentCheckpointSyncService.removeIncident(
      incident,
      changedByUserId,
    );

    await this.auditLogService.record({
      action: AuditAction.DELETED,
      targetType: AuditTargetType.INCIDENT,
      targetId: deletedIncident.id,
      performedByUserId: changedByUserId ?? null,
      details: this.buildIncidentDeleteDetails(
        deletedIncident,
        changedByUserId,
        'deleted',
      ),
      metadata: {
        workflow: ModerationStatus.APPROVED,
        targetSnapshot: this.snapshotIncidentFields(deletedIncident),
      },
    });

    return this.normalizeIncidentForResponse(deletedIncident);
  }

  async countIncidents(): Promise<number> {
    return this.incidentsRepository.count();
  }

  async getActiveIncidentsCount(): Promise<number> {
    return this.incidentsRepository.count({
      where: {
        status: IncidentStatus.ACTIVE,
        moderationStatus: In(PUBLIC_MODERATION_STATUSES),
      },
    });
  }

  async getIncidentsCreatedTodayCount(): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    return this.incidentsRepository
      .createQueryBuilder('incident')
      .where('incident.createdAt >= :startOfToday', { startOfToday })
      .andWhere('incident.createdAt < :startOfTomorrow', { startOfTomorrow })
      .getCount();
  }

  async getIncidentsTimeline(days = 30): Promise<{
    periodDays: number;
    points: { label: string; value: number }[];
  }> {
    const periodDays = Number.isInteger(days) && days > 0 ? days : 30;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (periodDays - 1));

    const formatDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatDateLabel = (date: Date) =>
      date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

    const rawCounts = await this.incidentsRepository
      .createQueryBuilder('incident')
      .select("DATE_FORMAT(incident.createdAt, '%Y-%m-%d')", 'bucketDate')
      .addSelect('COUNT(*)', 'count')
      .where('incident.createdAt >= :startDate', { startDate })
      .groupBy("DATE_FORMAT(incident.createdAt, '%Y-%m-%d')")
      .orderBy("DATE_FORMAT(incident.createdAt, '%Y-%m-%d')", 'ASC')
      .getRawMany<{ bucketDate: string; count: string }>();

    const countsByDate = new Map(
      rawCounts.map((row) => [row.bucketDate, Number(row.count) || 0]),
    );

    const points: { label: string; value: number }[] = [];

    for (let offset = 0; offset < periodDays; offset += 1) {
      const bucketDate = new Date(startDate);
      bucketDate.setDate(bucketDate.getDate() + offset);
      const bucketKey = formatDateKey(bucketDate);

      points.push({
        label: formatDateLabel(bucketDate),
        value: countsByDate.get(bucketKey) ?? 0,
      });
    }

    return {
      periodDays,
      points,
    };
  }

  async getHistory(id: number): Promise<IncidentStatusHistory[]> {
    await this.findOne(id);

    return this.incidentStatusHistoryRepository.find({
      where: {
        incident: {
          id,
        },
      },
      relations: ['incident'],
      order: { changedAt: 'DESC' },
    });
  }

  async findAllIncidents(
    incidentQueryDto: IncidentQueryDto,
    options: { includeUnpublished?: boolean } = {},
  ) {
    const result = await this.findAll(incidentQueryDto, options);
    return {
      data: result.data,
      meta: result.meta,
    };
  }

  private async extractIncidentChanges(
    incident: Incident,
    updateIncidentDto: UpdateIncidentDto,
  ): Promise<IncidentChangeSet> {
    const candidateChanges: IncidentChangeSet = {
      title: updateIncidentDto.title,
      description: updateIncidentDto.description,
      type: updateIncidentDto.type,
      severity: updateIncidentDto.severity,
      status: updateIncidentDto.status,
      isVerified: updateIncidentDto.isVerified,
      location: updateIncidentDto.location,
      latitude:
        updateIncidentDto.latitude !== undefined
          ? updateIncidentDto.latitude
          : undefined,
      longitude:
        updateIncidentDto.longitude !== undefined
          ? updateIncidentDto.longitude
          : undefined,
      checkpointId: updateIncidentDto.checkpointId,
      impactStatus: updateIncidentDto.impactStatus,
    };

    if (
      updateIncidentDto.checkpointId === null &&
      candidateChanges.impactStatus === undefined
    ) {
      candidateChanges.impactStatus = null;
    }

    if (
      updateIncidentDto.checkpointId !== undefined &&
      updateIncidentDto.checkpointId !== null
    ) {
      await this.resolveCheckpointForPendingIncident(
        updateIncidentDto.checkpointId,
      );
    }

    const changes: IncidentChangeSet = {};

    (Object.keys(candidateChanges) as (keyof IncidentChangeSet)[]).forEach(
      (key) => {
        const nextValue = candidateChanges[key];
        if (nextValue === undefined) {
          return;
        }

        const currentValue =
          key === 'checkpointId'
            ? this.getIncidentCheckpointId(incident)
            : incident[key];

        if (!this.valuesEqual(currentValue, nextValue)) {
          changes[key] = nextValue as never;
        }
      },
    );

    return changes;
  }

  private mergeIncidentPendingChanges(
    incident: Incident,
    submittedChanges: IncidentChangeSet,
  ): IncidentChangeSet {
    const mergedChanges: IncidentChangeSet = {
      ...this.getIncidentPendingChanges(incident),
      ...submittedChanges,
    };

    (Object.keys(mergedChanges) as (keyof IncidentChangeSet)[]).forEach(
      (key) => {
        const currentValue =
          key === 'checkpointId'
            ? this.getIncidentCheckpointId(incident)
            : incident[key];

        if (this.valuesEqual(currentValue, mergedChanges[key])) {
          delete mergedChanges[key];
        }
      },
    );

    return mergedChanges;
  }

  private async applyIncidentChangeSet(
    incident: Incident,
    changes: IncidentChangeSet,
    options: {
      changedByUserId?: number;
      applyStatusLifecycle?: boolean;
    } = {},
  ): Promise<void> {
    if (changes.checkpointId !== undefined) {
      if (changes.checkpointId === null) {
        incident.checkpoint = undefined;
        incident.checkpointId = null;
        incident.impactStatus = null;
      } else {
        const checkpoint = await this.resolveCheckpointForPendingIncident(
          changes.checkpointId,
        );
        incident.checkpoint = checkpoint ?? undefined;
      }
    }

    if (changes.title !== undefined) {
      incident.title = changes.title;
    }

    if (changes.description !== undefined) {
      incident.description = changes.description;
    }

    if (changes.type !== undefined) {
      incident.type = changes.type;
    }

    if (changes.severity !== undefined) {
      incident.severity = changes.severity;
    }

    if (changes.impactStatus !== undefined) {
      incident.impactStatus = changes.impactStatus;
    }

    this.incidentCheckpointSyncService.applyIncidentLocationSnapshot(incident, {
      location:
        changes.location !== undefined ? changes.location ?? undefined : undefined,
      latitude:
        changes.latitude !== undefined ? changes.latitude ?? undefined : undefined,
      longitude:
        changes.longitude !== undefined
          ? changes.longitude ?? undefined
          : undefined,
    });

    if (options.applyStatusLifecycle) {
      this.incidentStatusLifecycleService.applyStatusUpdate(
        incident,
        changes.status,
        options.changedByUserId,
      );
    } else if (changes.status !== undefined) {
      incident.status = changes.status;
    }

    this.incidentCheckpointSyncService.applyIncidentVerificationState(
      incident,
      changes.isVerified,
      options.changedByUserId,
    );
  }

  private assertValidPendingIncidentChanges(
    incident: Incident,
    changes: IncidentChangeSet,
  ): void {
    const checkpointId =
      changes.checkpointId !== undefined
        ? changes.checkpointId
        : this.getIncidentCheckpointId(incident);
    const incidentType = changes.type ?? incident.type;
    const impactStatus =
      changes.impactStatus !== undefined
        ? changes.impactStatus
        : incident.impactStatus;

    this.assertValidCheckpointLink(incidentType, checkpointId, impactStatus);
  }

  private assertValidCheckpointLink(
    incidentType: IncidentType | undefined,
    checkpointId: number | null,
    impactStatus?: CheckpointStatus | null,
  ): void {
    const linkableIncidentTypes = new Set<IncidentType>([
      IncidentType.CLOSURE,
      IncidentType.DELAY,
      IncidentType.ACCIDENT,
    ]);
    const impactStatuses = new Set<CheckpointStatus>([
      CheckpointStatus.OPEN,
      CheckpointStatus.CLOSED,
      CheckpointStatus.RESTRICTED,
      CheckpointStatus.DELAYED,
    ]);

    if (checkpointId === null) {
      if (impactStatus !== undefined && impactStatus !== null) {
        throw new BadRequestException(
          'Impact status requires checkpoint linking',
        );
      }
      return;
    }

    if (incidentType === undefined || !linkableIncidentTypes.has(incidentType)) {
      throw new BadRequestException('Invalid incident type for checkpoint linking');
    }

    if (
      impactStatus === undefined ||
      impactStatus === null ||
      !impactStatuses.has(impactStatus)
    ) {
      throw new BadRequestException('Invalid impact status for checkpoint linking');
    }
  }

  private async resolveCheckpointForPendingIncident(
    checkpointId: number | null,
  ): Promise<Checkpoint | null> {
    if (checkpointId === null) {
      return null;
    }

    const checkpoint = await this.checkpointsRepository.findOne({
      where: { id: checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with id ${checkpointId} not found`);
    }

    return checkpoint;
  }

  private async resolveCheckpointForCreate(
    checkpointId: number | null,
  ): Promise<Checkpoint | null> {
    try {
      return await this.resolveCheckpointForPendingIncident(checkpointId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }
  }

  private getIncidentPendingChanges(incident: Incident): IncidentChangeSet {
    return this.isRecord(incident.pendingChanges)
      ? (incident.pendingChanges as IncidentChangeSet)
      : {};
  }

  private applyIncidentPendingChangesForPublicRead(incident: Incident): Incident {
    if (incident.moderationStatus !== ModerationStatus.PENDING_UPDATE) {
      return incident;
    }

    const pendingChanges = this.getIncidentPendingChanges(incident);
    if (Object.keys(pendingChanges).length === 0) {
      return incident;
    }

    return Object.assign(incident, pendingChanges, {
      moderationStatus: ModerationStatus.APPROVED,
      pendingChanges: null,
    });
  }

  private isPubliclyVisibleModerationStatus(
    moderationStatus?: ModerationStatus,
  ): boolean {
    return PUBLIC_MODERATION_STATUSES.includes(
      moderationStatus ?? ModerationStatus.APPROVED,
    );
  }

  private buildIncidentCreateDetails(
    incident: Incident,
    userId?: number,
  ): string {
    return `INCIDENT created by ${this.formatActor(userId)}; published immediately; title: ${incident.title}; location: ${incident.location ?? 'empty'}; type: ${incident.type}; severity: ${incident.severity}; status: ${incident.status}; verified: ${incident.isVerified ? 'yes' : 'no'}`;
  }

  private buildIncidentUpdateDetails(
    incident: Incident,
    changes: IncidentChangeSet,
    userId: number | undefined,
    verb: 'submitted' | 'approved' | 'rejected' | 'applied',
    previousValues: IncidentChangeSet | Incident = incident,
  ): string {
    const flow =
      incident.moderationStatus === ModerationStatus.PENDING_CREATE
        ? 'create'
        : 'update';
    const changeDetails = this.formatIncidentChanges(previousValues, changes);

    return `INCIDENT ${flow} ${verb} by ${this.formatActor(userId)}; ${changeDetails}`;
  }

  private buildIncidentApprovalDetails(
    incident: Incident,
    previousModerationStatus: ModerationStatus,
    changes: IncidentChangeSet,
    userId?: number,
    previousValues?: IncidentChangeSet,
  ): string {
    if (previousModerationStatus === ModerationStatus.PENDING_CREATE) {
      return `INCIDENT approved by ${this.formatActor(userId)}; create flow published`;
    }

    if (previousModerationStatus === ModerationStatus.PENDING_DELETE) {
      return `INCIDENT delete approved by ${this.formatActor(userId)}; incident removed from public view`;
    }

    return this.buildIncidentUpdateDetails(
      incident,
      changes,
      userId,
      'approved',
      previousValues,
    );
  }

  private buildIncidentRejectionDetails(
    incident: Incident,
    previousModerationStatus: ModerationStatus,
    changes: IncidentChangeSet,
    userId?: number,
    reason?: string,
  ): string {
    let base: string;

    if (previousModerationStatus === ModerationStatus.PENDING_CREATE) {
      base = `INCIDENT rejected by ${this.formatActor(userId)}; create flow remains unpublished`;
    } else if (previousModerationStatus === ModerationStatus.PENDING_DELETE) {
      base = `INCIDENT delete rejected by ${this.formatActor(userId)}; public version remains active`;
    } else {
      base = this.buildIncidentUpdateDetails(
        incident,
        changes,
        userId,
        'rejected',
      );
    }

    const normalizedReason = reason?.trim();

    return normalizedReason ? `${base}; reason: ${normalizedReason}` : base;
  }

  private buildIncidentDeleteDetails(
    incident: Incident,
    userId: number | undefined,
    verb: 'submitted' | 'discarded' | 'deleted',
  ): string {
    if (verb === 'deleted') {
      return `INCIDENT deleted by ${this.formatActor(userId)}; removed from admin and citizen views: ${incident.title}`;
    }

    if (verb === 'discarded') {
      return `INCIDENT delete requested by ${this.formatActor(userId)}; unpublished create discarded from public workflow: ${incident.title}`;
    }

    return `INCIDENT delete submitted by ${this.formatActor(userId)}; pending approval (delete); public version remains active: ${incident.title}`;
  }

  private formatIncidentChanges(
    incident: IncidentChangeSet | Incident,
    changes: IncidentChangeSet,
  ): string {
    const entries = (Object.keys(changes) as (keyof IncidentChangeSet)[]).map(
      (key) => {
        const currentValue =
          key === 'checkpointId' && 'checkpoint' in incident
            ? this.getIncidentCheckpointId(incident)
            : incident[key];
        const oldValue = this.formatValue(currentValue);
        const newValue = this.formatValue(changes[key]);

        if (key === 'status') {
          return `status changed: ${oldValue} -> ${newValue}`;
        }

        return `${key} changed: ${oldValue} -> ${newValue}`;
      },
    );

    return entries.length > 0 ? entries.join('; ') : 'no field changes';
  }

  private snapshotIncidentFields(incident: Incident): IncidentChangeSet {
    return {
      title: incident.title,
      description: incident.description,
      latitude: incident.latitude,
      longitude: incident.longitude,
      location: incident.location ?? null,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      isVerified: incident.isVerified,
      checkpointId: this.getIncidentCheckpointId(incident),
      impactStatus: incident.impactStatus ?? null,
    };
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

  private createIncidentAlertState(incident: Incident): IncidentAlertState {
    return {
      isVerified: Boolean(incident.isVerified),
      status: incident.status,
    };
  }

  private async ensureNoOtherActiveIncidentWithTitle(
    title: string,
    currentIncidentId?: number,
  ): Promise<void> {
    const existingIncident = await this.findOtherActiveIncidentWithTitle(
      title,
      currentIncidentId,
    );

    if (existingIncident) {
      throw new ConflictException(
        'Duplicate Alert: An active incident with this exact title already exists.',
      );
    }
  }

  private async findOtherActiveIncidentWithTitle(
    title: string,
    currentIncidentId?: number,
  ): Promise<Incident | null> {
    const queryBuilder = this.incidentsRepository
      .createQueryBuilder('incident')
      .where('incident.title = :title', { title })
      .andWhere('incident.status = :status', {
        status: IncidentStatus.ACTIVE,
      })
      .andWhere(
        'incident.moderationStatus IN (:...publicModerationStatuses)',
        {
          publicModerationStatuses: PUBLIC_MODERATION_STATUSES,
        },
      );

    if (currentIncidentId !== undefined) {
      queryBuilder.andWhere('incident.id != :currentIncidentId', {
        currentIncidentId,
      });
    }

    return queryBuilder.getOne();
  }

  private dispatchPostCommitAlerts(
    incident: Incident,
    previousState?: IncidentAlertState,
  ): void {
    if (this.didTransitionToVerifiedActive(previousState, incident)) {
      this.incidentAlertObserver.notifyIncidentVerified(incident);
    }

    if (this.didTransitionToClosed(previousState, incident)) {
      this.incidentAlertObserver.notifyIncidentResolved(incident);
    }
  }

  private didTransitionToVerifiedActive(
    previousState: IncidentAlertState | undefined,
    incident: Incident,
  ): boolean {
    const isCurrentVerifiedActive =
      incident.isVerified && incident.status === IncidentStatus.ACTIVE;

    if (!isCurrentVerifiedActive) {
      return false;
    }

    if (!previousState) {
      return true;
    }

    return !(
      previousState.isVerified && previousState.status === IncidentStatus.ACTIVE
    );
  }

  private didTransitionToClosed(
    previousState: IncidentAlertState | undefined,
    incident: Incident,
  ): boolean {
    if (!previousState) {
      return false;
    }

    return (
      previousState.status !== IncidentStatus.CLOSED &&
      incident.status === IncidentStatus.CLOSED
    );
  }

  private assertValidMapDateRange(startDate?: Date, endDate?: Date): void {
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

  private assertValidPaginationDateRange(
    startDate?: Date,
    endDate?: Date,
  ): void {
    if (!startDate || !endDate) {
      return;
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be before endDate.');
    }
  }

  private normalizeIncidentForResponse(incident: Incident): Incident {
    if (
      (incident as unknown as { checkpoint?: Checkpoint | null }).checkpoint ===
      null
    ) {
      incident.checkpoint = undefined;
    }

    if (
      (incident as unknown as { checkpointId?: number | null }).checkpointId ===
      null
    ) {
      incident.checkpointId = undefined;
    }

    return incident;
  }

  private normalizeIncidentsForResponse(incidents: Incident[]): Incident[] {
    return incidents.map((incident) =>
      this.normalizeIncidentForResponse(incident),
    );
  }
}
