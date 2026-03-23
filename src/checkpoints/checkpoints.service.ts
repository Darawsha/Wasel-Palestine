import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkpoint } from './entities/checkpoint.entity';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { CheckpointStatus } from './enums/checkpoint-status.enum';
import { CheckpointStatusHistory } from './entities/status-history.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { BadRequestException } from '@nestjs/common';
import {CheckpointQueryDto} from './dto/checkpoint-query.dto';
import {CheckpointSortBy}from './enums/CheckpointSortBy.enums'
import {SortOrder}from './enums/SortOrder.enums'
@Injectable()
export class CheckpointsService {
  constructor(
    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,

    @InjectRepository(CheckpointStatusHistory)
    private readonly checkpointStatusHistoryRepository: Repository<CheckpointStatusHistory>,
  ) {}

  async create(createCheckpointDto: CreateCheckpointDto): Promise<Checkpoint> {
    const checkpoint = this.checkpointsRepository.create({
      ...createCheckpointDto,
      currentStatus: createCheckpointDto.currentStatus ?? CheckpointStatus.OPEN,
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

  const queryBuilder = this.checkpointsRepository.createQueryBuilder('checkpoint');

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

  async findOne(id: number): Promise<Checkpoint> {
    const checkpoint = await this.checkpointsRepository.findOne({
      where: { id },
    });

    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with id ${id} not found`);
    }

    return checkpoint;
  }

  async update(id: number, updateCheckpointDto: UpdateCheckpointDto): Promise<Checkpoint> {
    const checkpoint = await this.findOne(id);

    Object.assign(checkpoint, updateCheckpointDto);

    return this.checkpointsRepository.save(checkpoint);
  }
  async remove(id: number): Promise<void> {
  const checkpoint = await this.findOne(id);
  await this.checkpointsRepository.remove(checkpoint);
}

async updateStatus(
    id: number,
    updateStatusDto: UpdateStatusDto,
  ): Promise<Checkpoint> {
    const checkpoint = await this.findOne(id);

    const oldStatus = checkpoint.currentStatus;
    const newStatus = updateStatusDto.currentStatus;

    if (oldStatus === newStatus) {
      throw new BadRequestException('Checkpoint already has this status');
    }

    checkpoint.currentStatus = newStatus;
    const updatedCheckpoint = await this.checkpointsRepository.save(checkpoint);

    const historyRecord = this.checkpointStatusHistoryRepository.create({
      checkpoint: updatedCheckpoint,
      oldStatus,
      newStatus,
    });

    await this.checkpointStatusHistoryRepository.save(historyRecord);

    return updatedCheckpoint;
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



}