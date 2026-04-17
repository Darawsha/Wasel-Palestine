import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaResponseDto } from '../../../common/dto/common-response.dto';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { ModerationStatus } from '../../../common/enums/moderation-status.enum';

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
    example: CheckpointStatus.OPEN,
  })
  currentStatus: CheckpointStatus;

  @ApiProperty({
    description: 'Checkpoint moderation workflow status.',
    enum: ModerationStatus,
    example: ModerationStatus.PENDING_CREATE,
  })
  moderationStatus: ModerationStatus;

  @ApiProperty({
    required: false,
    description: 'Pending update changes waiting for approval.',
    example: { currentStatus: 'DELAYED' },
    nullable: true,
  })
  pendingChanges?: Record<string, unknown> | null;

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

  @ApiProperty({
    required: false,
    description: 'Admin user id that created the checkpoint.',
    example: 7,
    nullable: true,
  })
  createdByUserId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Admin user id that last submitted an update.',
    example: 8,
    nullable: true,
  })
  updatedByUserId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Admin user id that last approved the checkpoint workflow.',
    example: 7,
    nullable: true,
  })
  approvedByUserId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Timestamp of the last approval decision.',
    example: '2026-04-13T09:20:00.000Z',
    nullable: true,
  })
  approvedAt?: string | null;

  @ApiProperty({
    required: false,
    description: 'Admin user id that last rejected the checkpoint workflow.',
    example: 9,
    nullable: true,
  })
  rejectedByUserId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Timestamp of the last rejection decision.',
    example: '2026-04-13T09:20:00.000Z',
    nullable: true,
  })
  rejectedAt?: string | null;

  @ApiProperty({
    required: false,
    description: 'Optional reason recorded for the last rejection.',
    example: 'Duplicate checkpoint entry.',
    nullable: true,
  })
  rejectionReason?: string | null;
}

export class CheckpointStatusHistoryResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 48
  })
  id: number;

  @ApiProperty({
    description: 'Describes the checkpoint id field.',
    example: 8,
  })
  checkpointId: number;

  @ApiProperty({
    description: 'Describes the old status field.',
    enum: CheckpointStatus, example: CheckpointStatus.OPEN
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
    description: 'Checkpoint identifier.',
    example: 8,
  })
  checkpointId: number;

  @ApiProperty({
    description: 'Checkpoint display name.',
    example: 'Huwara Checkpoint',
  })
  checkpointName: string;

  @ApiProperty({
    description: 'Checkpoint location label.',
    example: 'South Nablus, Route 60',
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'Current checkpoint status.',
    enum: CheckpointStatus,
    example: CheckpointStatus.CLOSED,
  })
  currentStatus: CheckpointStatus;

  @ApiProperty({
    description: 'Newest-first checkpoint status history.',
    type: [CheckpointStatusHistoryResponseDto],
    example: [
      {
        id: 48,
        checkpointId: 8,
        oldStatus: 'OPEN',
        newStatus: 'DELAYED',
        changedByUserId: 7,
        changedAt: '2026-04-13T09:10:00.000Z',
      },
    ],
  })
  history: CheckpointStatusHistoryResponseDto[];
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
        currentStatus: 'OPEN',
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
