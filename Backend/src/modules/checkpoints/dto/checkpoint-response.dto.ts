import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaResponseDto } from '../../../common/dto/common-response.dto';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';

export class CheckpointResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 12
  })
  id: number;

  @ApiProperty({
    description: 'Describes the name field.',
    example: 'Huwara Checkpoint'
  })
  name: string;

  @ApiProperty({
    description: 'Describes the latitude field.',
    example: 32.205
  })
  latitude: number;

  @ApiProperty({
    description: 'Describes the longitude field.',
    example: 35.284
  })
  longitude: number;

  @ApiProperty({
    description: 'Describes the location field.',
    example: 'South Nablus, Route 60'
  })
  location: string;

  @ApiProperty({
    description: 'Describes the current status field.',
    enum: CheckpointStatus,
    example: CheckpointStatus.ACTIVE,
  })
  currentStatus: CheckpointStatus;

  @ApiProperty({
    description: 'Describes the description field.',
    example: 'Military gate with document checks.',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    description: 'Describes the created at field.',
    example: '2026-04-13T07:15:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Describes the updated at field.',
    example: '2026-04-13T09:20:00.000Z'
  })
  updatedAt: string;
}

export class CheckpointStatusHistoryResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 48
  })
  id: number;

  @ApiProperty({
    description: 'Describes the old status field.',
    enum: CheckpointStatus, example: CheckpointStatus.ACTIVE
  })
  oldStatus: CheckpointStatus;

  @ApiProperty({
    description: 'Describes the new status field.',
    enum: CheckpointStatus, example: CheckpointStatus.DELAYED
  })
  newStatus: CheckpointStatus;

  @ApiProperty({
    description: 'Describes the changed by user id field.',
    example: 7, nullable: true
  })
  changedByUserId?: number | null;

  @ApiProperty({
    description: 'Describes the changed at field.',
    example: '2026-04-13T09:10:00.000Z'
  })
  changedAt: string;
}

export class CheckpointHistoryEnvelopeResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [CheckpointStatusHistoryResponseDto],
    example: [
      {
        id: 48,
        oldStatus: 'active',
        newStatus: 'delayed',
        changedByUserId: 7,
        changedAt: '2026-04-13T09:10:00.000Z',
      },
    ],
  })
  data: CheckpointStatusHistoryResponseDto[];
}

export class CheckpointPaginatedResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [CheckpointResponseDto],
    example: [
      {
        id: 12,
        name: 'Huwara Checkpoint',
        latitude: 32.205,
        longitude: 35.284,
        location: 'South Nablus, Route 60',
        currentStatus: 'active',
        description: 'Military gate with document checks.',
        createdAt: '2026-04-13T07:15:00.000Z',
        updatedAt: '2026-04-13T09:20:00.000Z',
      },
    ],
  })
  data: CheckpointResponseDto[];

  @ApiProperty({
    description: 'Describes the meta field.',
    type: PaginationMetaResponseDto,
    example: {
      total: 32,
      page: 1,
      limit: 10,
      totalPages: 4,
    },
  })
  meta: PaginationMetaResponseDto;
}
