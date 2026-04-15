import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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

@Injectable()
export class CheckpointsService {
  constructor(
    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,

    @InjectRepository(CheckpointStatusHistory)
    private readonly checkpointStatusHistoryRepository: Repository<CheckpointStatusHistory>,

    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
  ) {}



  async create(createCheckpointDto: CreateCheckpointDto): Promise<Checkpoint> {

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
        CheckpointStatus.ACTIVE,
    });

    return this.checkpointsRepository.save(checkpoint);
  }

  async findAll(checkpointQueryDto: CheckpointQueryDto) {
    const {
      currentStatus,
      sortBy = CheckpointSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 10,
    } = checkpointQueryDto;

    const queryBuilder =
      this.checkpointsRepository.createQueryBuilder('checkpoint');

    if (currentStatus) {
      queryBuilder.andWhere('checkpoint.currentStatus = :currentStatus', {
        currentStatus,
      });
    }

    queryBuilder.orderBy(`checkpoint.${sortBy}`, sortOrder);

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

      return Array.from(checkpointsById.values());
    }

    return this.checkpointsRepository
      .createQueryBuilder('checkpoint')
      .orderBy('checkpoint.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Checkpoint> {
    const checkpoint = await this.checkpointsRepository.findOne({
      where: { id },
    });

    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with id ${id} not found`);
    }

    return checkpoint;
  }

  async update(
    id: number,
    updateCheckpointDto: UpdateCheckpointDto,
    changedByUserId?: number,
  ): Promise<Checkpoint> {
    return this.checkpointsRepository.manager.transaction(async (manager) => {
      const checkpoint = await this.findCheckpointInTransaction(manager, id);
      const previousStatus = checkpoint.currentStatus;
      const activeLinkedIncident = await this.findActiveLinkedIncident(
        manager,
        id,
      );
      const requestedStatus =
        updateCheckpointDto.status ?? updateCheckpointDto.currentStatus;

      if (requestedStatus !== undefined && activeLinkedIncident) {
        throw new ForbiddenException('Status is locked by an active incident');
      }

      const updateData: Partial<Checkpoint> = {
        name: updateCheckpointDto.name,
        location: updateCheckpointDto.location,
        latitude: updateCheckpointDto.latitude,
        longitude: updateCheckpointDto.longitude,
        description: updateCheckpointDto.notes || updateCheckpointDto.description,
        currentStatus: requestedStatus,
      };

      (Object.keys(updateData) as (keyof Checkpoint)[]).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      Object.assign(checkpoint, updateData);

      const savedCheckpoint = await this.saveCheckpointWithHistoryInTransaction(
        manager,
        checkpoint,
        previousStatus,
        changedByUserId,
      );

      const shouldCascadeIncidentMasterData =
        updateCheckpointDto.name !== undefined ||
        updateCheckpointDto.location !== undefined ||
        updateCheckpointDto.latitude !== undefined ||
        updateCheckpointDto.longitude !== undefined;

      if (shouldCascadeIncidentMasterData) {
        await this.syncActiveIncidentLocationsForCheckpoint(
          manager,
          savedCheckpoint,
        );
      }

      return savedCheckpoint;
    });
  }
  async remove(id: number): Promise<void> {
    const checkpoint = await this.checkpointsRepository.findOne({
      where: { id },
    });

    if (!checkpoint) {
      return;
    }

    await this.checkpointsRepository.remove(checkpoint);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStatusDto,
    changedByUserId?: number,
  ): Promise<Checkpoint> {
    return this.checkpointsRepository.manager.transaction(async (manager) => {
      const checkpoint = await this.findCheckpointInTransaction(manager, id);
      const activeLinkedIncident = await this.findActiveLinkedIncident(
        manager,
        id,
      );

      if (activeLinkedIncident) {
        throw new ForbiddenException('Status is locked by an active incident');
      }

      const oldStatus = checkpoint.currentStatus;
      const newStatus = updateStatusDto.currentStatus;

      if (oldStatus === newStatus) {
        return checkpoint;
      }

      checkpoint.currentStatus = newStatus;
      return this.saveCheckpointWithHistoryInTransaction(
        manager,
        checkpoint,
        oldStatus,
        changedByUserId,
      );
    });
  }

  async getHistory(id: number): Promise<CheckpointStatusHistory[]> {
    await this.findOne(id);

    return this.checkpointStatusHistoryRepository.find({
      where: {
        checkpoint: {
          id,
        },
      },
      relations: ['checkpoint'],
      order: { changedAt: 'DESC' },
    });
  }

  async countCheckpoints(): Promise<number> {
    return this.checkpointsRepository.count();
  }

  async getActiveCheckpointsCount(): Promise<number> {
    return this.checkpointsRepository.count({
      where: { currentStatus: CheckpointStatus.ACTIVE },
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
      oldStatus: previousStatus,
      newStatus: savedCheckpoint.currentStatus,
      changedByUserId,
    });

    await checkpointStatusHistoryRepository.save(historyRecord);
    return savedCheckpoint;
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
        currentStatus: CheckpointStatus.ACTIVE,
      },
    });
  }
}

