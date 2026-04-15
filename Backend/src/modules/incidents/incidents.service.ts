import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
import { IncidentAlertObserver } from './observers/incident-created.observer';
import { IncidentQueryStrategyService } from './services/incident-query-strategy.service';
import { IncidentStatusLifecycleService } from './services/incident-status-lifecycle.service';
import { IncidentUpdateStrategyService } from './services/incident-update-strategy.service';
import { IncidentCheckpointSyncService } from './sync/incident-checkpoint-sync.service';
import { MapFilterQueryDto } from '../map/dto/map-filter-query.dto';

type IncidentAlertState = {
  isVerified: boolean;
  status: IncidentStatus;
};

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,

    @InjectRepository(IncidentStatusHistory)
    private readonly incidentStatusHistoryRepository: Repository<IncidentStatusHistory>,

    private readonly incidentQueryStrategyService: IncidentQueryStrategyService,
    private readonly incidentUpdateStrategyService: IncidentUpdateStrategyService,
    private readonly incidentStatusLifecycleService: IncidentStatusLifecycleService,
    private readonly incidentAlertObserver: IncidentAlertObserver,
    private readonly incidentCheckpointSyncService: IncidentCheckpointSyncService,
  ) {}

  async verifyIncident(id: number) {
    const incident = await this.findOne(id);
    const previousAlertState = this.createIncidentAlertState(incident);
    const previousSnapshot =
      this.incidentCheckpointSyncService.createCheckpointSnapshot(incident);

    if (incident.isVerified || incident.verifiedAt) {
      return { message: 'Incident is already verified' };
    }

    this.incidentCheckpointSyncService.applyIncidentVerificationState(
      incident,
      true,
    );

    const updatedIncident =
      await this.incidentCheckpointSyncService.saveIncident({
        incident,
        previousSnapshot,
      });

    this.dispatchPostCommitAlerts(updatedIncident, previousAlertState);

    return this.normalizeIncidentForResponse(updatedIncident);
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

    const incident = this.incidentsRepository.create({
      title: createIncidentDto.title,
      description: createIncidentDto.description,
      type: createIncidentDto.type,
      severity: createIncidentDto.severity,
      status: nextStatus,
      impactStatus: createIncidentDto.impactStatus,
      checkpoint:
        createIncidentDto.checkpointId !== undefined &&
        createIncidentDto.checkpointId !== null
          ? ({ id: createIncidentDto.checkpointId } as Checkpoint)
          : undefined,
    });

    this.incidentCheckpointSyncService.applyIncidentLocationSnapshot(incident, {
      location: createIncidentDto.location,
      latitude: createIncidentDto.latitude,
      longitude: createIncidentDto.longitude,
    });

    this.incidentCheckpointSyncService.applyIncidentVerificationState(
      incident,
      createIncidentDto.isVerified ?? false,
      changedByUserId,
      { defaultToFalse: true },
    );

    let savedIncident: Incident;

    try {
      savedIncident = await this.incidentCheckpointSyncService.saveIncident({
        incident,
        changedByUserId,
      });
    } catch (error) {
      const isMissingCheckpointError =
        error instanceof NotFoundException &&
        String(error.message).includes('Checkpoint with id');

      if (!isMissingCheckpointError) {
        throw error;
      }

      incident.checkpoint = undefined;
      incident.checkpointId = null;
      incident.impactStatus = undefined;

      savedIncident = await this.incidentCheckpointSyncService.saveIncident({
        incident,
        changedByUserId,
      });
    }

    this.dispatchPostCommitAlerts(savedIncident);

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async findAll(incidentQueryDto: IncidentQueryDto) {
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

    this.incidentQueryStrategyService.apply(queryBuilder, {
      status,
      type,
      severity,
      checkpointId,
      sortBy,
      sortOrder,
    });

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: this.normalizeIncidentsForResponse(data),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllPaginated(paginationQuery: PaginationQueryDto) {
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

    if (startDate) {
      queryBuilder.andWhere('incident.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('incident.createdAt <= :endDate', { endDate });
    }

    queryBuilder.orderBy(`incident.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: this.normalizeIncidentsForResponse(data),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFilteredIncidents(filterDto: MapFilterQueryDto): Promise<Incident[]> {
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
        });

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
        .orderBy('incident.updatedAt', 'DESC')
        .getMany();

      return this.normalizeIncidentsForResponse(incidents);
    }

    const queryBuilder = this.incidentsRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.checkpoint', 'checkpoint')
      .where('incident.status = :status', { status: IncidentStatus.ACTIVE });

    if (types && types.length > 0) {
      queryBuilder.andWhere('incident.type IN (:...types)', { types });
    }

    if (severity) {
      queryBuilder.andWhere('incident.severity = :severity', { severity });
    }

    const incidents = await queryBuilder
      .orderBy('incident.updatedAt', 'DESC')
      .getMany();

    return this.normalizeIncidentsForResponse(incidents);
  }

  async findOne(id: number): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({
      where: { id },
      relations: ['checkpoint'],
    });

    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }

    return this.normalizeIncidentForResponse(incident);
  }

  async update(
    id: number,
    updateIncidentDto: UpdateIncidentDto,
    changedByUserId?: number,
  ): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousAlertState = this.createIncidentAlertState(incident);
    const previousStatus = incident.status;
    const previousSnapshot =
      this.incidentCheckpointSyncService.createCheckpointSnapshot(incident);

    if (updateIncidentDto.checkpointId !== undefined) {
      if (updateIncidentDto.checkpointId === null) {
        incident.checkpoint = undefined;
        incident.checkpointId = null;
        incident.impactStatus = null;
      } else {
        incident.checkpoint = {
          id: updateIncidentDto.checkpointId,
        } as Checkpoint;
      }
    }

    this.incidentUpdateStrategyService.apply(incident, updateIncidentDto);

    this.incidentCheckpointSyncService.applyIncidentLocationSnapshot(incident, {
      location: updateIncidentDto.location,
      latitude: updateIncidentDto.latitude,
      longitude: updateIncidentDto.longitude,
    });

    this.incidentStatusLifecycleService.applyStatusUpdate(
      incident,
      updateIncidentDto.status,
      changedByUserId,
    );

    if (incident.status === IncidentStatus.ACTIVE) {
      await this.ensureNoOtherActiveIncidentWithTitle(
        incident.title,
        incident.id,
      );
    }

    this.incidentCheckpointSyncService.applyIncidentVerificationState(
      incident,
      updateIncidentDto.isVerified,
      changedByUserId,
    );

    const savedIncident = await this.incidentCheckpointSyncService.saveIncident(
      {
        incident,
        previousSnapshot,
        previousStatus,
        changedByUserId,
      },
    );

    this.dispatchPostCommitAlerts(savedIncident, previousAlertState);

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async verify(id: number, userId: number): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousAlertState = this.createIncidentAlertState(incident);
    const previousSnapshot =
      this.incidentCheckpointSyncService.createCheckpointSnapshot(incident);

    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Closed incident cannot be verified');
    }

    if (incident.isVerified || incident.verifiedAt) {
      return incident;
    }

    this.incidentCheckpointSyncService.applyIncidentVerificationState(
      incident,
      true,
      userId,
    );

    const savedIncident = await this.incidentCheckpointSyncService.saveIncident(
      {
        incident,
        previousSnapshot,
        changedByUserId: userId,
      },
    );

    this.dispatchPostCommitAlerts(savedIncident, previousAlertState);

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async close(id: number, userId: number): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousAlertState = this.createIncidentAlertState(incident);
    const previousStatus = incident.status;
    const previousSnapshot =
      this.incidentCheckpointSyncService.createCheckpointSnapshot(incident);

    if (incident.status === IncidentStatus.CLOSED) {
      return incident;
    }

    this.incidentStatusLifecycleService.applyStatusSnapshot(
      incident,
      IncidentStatus.CLOSED,
      userId,
    );

    const savedIncident = await this.incidentCheckpointSyncService.saveIncident(
      {
        incident,
        previousSnapshot,
        previousStatus,
        changedByUserId: userId,
      },
    );

    this.dispatchPostCommitAlerts(savedIncident, previousAlertState);

    return this.normalizeIncidentForResponse(savedIncident);
  }

  async remove(id: number, changedByUserId?: number): Promise<void> {
    const incident = await this.findOne(id);
    await this.incidentCheckpointSyncService.removeIncident(
      incident,
      changedByUserId,
    );
  }

  async countIncidents(): Promise<number> {
    return this.incidentsRepository.count();
  }

  async getActiveIncidentsCount(): Promise<number> {
    return this.incidentsRepository.count({
      where: { status: IncidentStatus.ACTIVE },
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

  async findAllIncidents(incidentQueryDto: IncidentQueryDto) {
    const result = await this.findAll(incidentQueryDto);
    return {
      data: result.data,
      meta: result.meta,
    };
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
      });

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
    if ((incident as unknown as { checkpoint?: Checkpoint | null }).checkpoint === null) {
      incident.checkpoint = undefined;
    }

    if ((incident as unknown as { checkpointId?: number | null }).checkpointId === null) {
      incident.checkpointId = undefined;
    }

    return incident;
  }

  private normalizeIncidentsForResponse(incidents: Incident[]): Incident[] {
    return incidents.map((incident) => this.normalizeIncidentForResponse(incident));
  }
}
