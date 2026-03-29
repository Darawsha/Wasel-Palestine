import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './entities/incident.entity';
import { Checkpoint } from '../checkpoints/entities/checkpoint.entity';
import { IncidentStatusHistory } from './entities/status-history.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import {
  IncidentQueryDto,
  IncidentSortBy,
  SortOrder,
} from './dto/incident-query.dto';
import { IncidentStatus } from './enums/incident-status.enum';
import { SortStrategy } from './strategies/sort.strategy';
import { CheckpointStrategy } from './strategies/checkpoint.strategy';
import {
  SeverityStrategy,
  SeverityUpdateStrategy,
} from './strategies/severity.strategy';
import { TypeStrategy } from './strategies/type.strategy';
import {
  StatusStrategy,
} from './strategies/status.strategy';
import { TitleStrategy } from './strategies/title.strategy';
import { DescriptionStrategy } from './strategies/description.strategy';
import { TypeUpdateStrategy } from './strategies/type-update.strategy';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,

    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,

    @InjectRepository(IncidentStatusHistory)
    private readonly incidentStatusHistoryRepository: Repository<IncidentStatusHistory>,
  ) {}

  async create(createIncidentDto: CreateIncidentDto): Promise<Incident> {
    let checkpoint: Checkpoint | null = null;

    if (createIncidentDto.checkpointId) {
      checkpoint = await this.checkpointsRepository.findOne({
        where: { id: createIncidentDto.checkpointId },
      });

      if (!checkpoint) {
        throw new NotFoundException(
          `Checkpoint with id ${createIncidentDto.checkpointId} not found`,
        );
      }
    }

    const incident = this.incidentsRepository.create({
      title: createIncidentDto.title,
      description: createIncidentDto.description,
      location: createIncidentDto.location ?? undefined,
      type: createIncidentDto.type,
      severity: createIncidentDto.severity,
      status: createIncidentDto.status ?? IncidentStatus.ACTIVE,
      checkpoint: checkpoint ?? undefined,
    });

    return this.incidentsRepository.save(incident);
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

    StatusStrategy.apply(queryBuilder, status);
    TypeStrategy.apply(queryBuilder, type);
    SeverityStrategy.apply(queryBuilder, severity);
    CheckpointStrategy.apply(queryBuilder, checkpointId);
    SortStrategy.apply(queryBuilder, sortBy, sortOrder);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({
      where: { id },
      relations: ['checkpoint'],
    });

    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }

    return incident;
  }

  async update(
    id: number,
    updateIncidentDto: UpdateIncidentDto,
    changedByUserId?: number,
  ): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousStatus = incident.status;

    if (updateIncidentDto.checkpointId !== undefined) {
      if (updateIncidentDto.checkpointId === null) {
        incident.checkpoint = undefined;
      } else {
        const checkpoint = await this.checkpointsRepository.findOne({
          where: { id: updateIncidentDto.checkpointId },
        });

        if (!checkpoint) {
          throw new NotFoundException(
            `Checkpoint with id ${updateIncidentDto.checkpointId} not found`,
          );
        }

        incident.checkpoint = checkpoint;
      }
    }

    TitleStrategy.apply(incident, updateIncidentDto);
    DescriptionStrategy.apply(incident, updateIncidentDto);
    TypeUpdateStrategy.apply(incident, updateIncidentDto);
    SeverityUpdateStrategy.apply(incident, updateIncidentDto);

    if (updateIncidentDto.location !== undefined) {
      incident.location = updateIncidentDto.location ?? undefined;
    }

    this.applyStatusUpdate(
      incident,
      updateIncidentDto.status,
      changedByUserId,
    );

    return this.saveIncidentWithHistory(
      incident,
      previousStatus,
      changedByUserId,
    );
  }

  async verify(id: number, userId: number): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousStatus = incident.status;

    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Closed incident cannot be verified');
    }

    if (incident.status === IncidentStatus.VERIFIED) {
      throw new BadRequestException('Incident is already verified');
    }

    this.applyStatusSnapshot(incident, IncidentStatus.VERIFIED, userId);

    return this.saveIncidentWithHistory(incident, previousStatus, userId);
  }

  async close(id: number, userId: number): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousStatus = incident.status;

    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Incident is already closed');
    }

    this.applyStatusSnapshot(incident, IncidentStatus.CLOSED, userId);

    return this.saveIncidentWithHistory(incident, previousStatus, userId);
  }

  async remove(id: number): Promise<void> {
    const incident = await this.findOne(id);
    await this.incidentsRepository.remove(incident);
  }

  async countIncidents(): Promise<number> {
      return this.incidentsRepository.count();
    }

  async getActiveIncidentsCount(): Promise<number> {
      return this.incidentsRepository.count({ where: { status: IncidentStatus.ACTIVE } });
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

  private applyStatusUpdate(
    incident: Incident,
    nextStatus: IncidentStatus | undefined,
    changedByUserId?: number,
  ): void {
    if (nextStatus === undefined || nextStatus === incident.status) {
      return;
    }

    this.applyStatusSnapshot(incident, nextStatus, changedByUserId);
  }

  private applyStatusSnapshot(
    incident: Incident,
    nextStatus: IncidentStatus,
    changedByUserId?: number,
  ): void {
    const changedAt = new Date();
    incident.status = nextStatus;

    if (nextStatus === IncidentStatus.ACTIVE) {
      incident.verifiedByUserId = undefined;
      incident.verifiedAt = undefined;
      incident.closedByUserId = undefined;
      incident.closedAt = undefined;
      return;
    }

    if (nextStatus === IncidentStatus.VERIFIED) {
      incident.verifiedByUserId = changedByUserId;
      incident.verifiedAt = changedAt;
      incident.closedByUserId = undefined;
      incident.closedAt = undefined;
      return;
    }

    if (nextStatus === IncidentStatus.CLOSED) {
      incident.closedByUserId = changedByUserId;
      incident.closedAt = changedAt;
    }
  }

  private async saveIncidentWithHistory(
    incident: Incident,
    previousStatus: IncidentStatus,
    changedByUserId?: number,
  ): Promise<Incident> {
    const hasStatusChange = previousStatus !== incident.status;

    return this.incidentsRepository.manager.transaction(async (manager) => {
      const incidentRepository = manager.getRepository(Incident);
      const savedIncident = await incidentRepository.save(incident);

      if (!hasStatusChange) {
        return savedIncident;
      }

      const incidentStatusHistoryRepository =
        manager.getRepository(IncidentStatusHistory);

      const historyRecord = incidentStatusHistoryRepository.create({
        incident: savedIncident,
        oldStatus: previousStatus,
        newStatus: savedIncident.status,
        changedByUserId,
      });

      await incidentStatusHistoryRepository.save(historyRecord);
      return savedIncident;
    });
  }

  async findAllIncidents(incidentQueryDto: IncidentQueryDto) {
    const result = await this.findAll(incidentQueryDto);
    return {
      data: result.data,
      meta: result.meta,
    };
  }
}

