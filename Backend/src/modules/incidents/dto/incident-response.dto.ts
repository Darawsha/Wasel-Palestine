import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  IncidentsTimelineResponseDto,
  PaginationMetaResponseDto,
} from '../../../common/dto/common-response.dto';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';
import { IncidentType } from '../enums/incident-type.enum';

export class IncidentCheckpointResponseDto {
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
    description: 'Describes the location field.',
    example: 'South Nablus, Route 60'
  })
  location: string;

  @ApiProperty({
    description: 'Describes the current status field.',
    enum: CheckpointStatus, example: CheckpointStatus.ACTIVE
  })
  currentStatus: CheckpointStatus;
}

export class IncidentResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 25
  })
  id: number;

  @ApiProperty({
    description: 'Describes the is verified field.',
    example: false
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Describes the title field.',
    example: 'Road closure near city entrance'
  })
  title: string;

  @ApiProperty({
    description: 'Describes the description field.',
    example: 'Security forces closed the road in both directions.',
  })
  description: string;

  @ApiProperty({
    required: false,
    description: 'Describes the latitude field.',
    example: 32.205, nullable: true
  })
  latitude?: number | null;

  @ApiProperty({
    required: false,
    description: 'Describes the longitude field.',
    example: 35.284, nullable: true
  })
  longitude?: number | null;

  @ApiProperty({
    required: false,
    description: 'Describes the location field.',
    example: 'Route 60 - South Entrance', nullable: true
  })
  location?: string | null;

  @ApiProperty({
    description: 'Describes the type field.',
    enum: IncidentType, example: IncidentType.CLOSURE
  })
  type: IncidentType;

  @ApiProperty({
    description: 'Describes the severity field.',
    enum: IncidentSeverity, example: IncidentSeverity.HIGH
  })
  severity: IncidentSeverity;

  @ApiProperty({
    description: 'Describes the status field.',
    enum: IncidentStatus, example: IncidentStatus.ACTIVE
  })
  status: IncidentStatus;

  @ApiProperty({
    required: false,
    description: 'Describes the impact status field.',
    enum: CheckpointStatus,
    example: CheckpointStatus.DELAYED,
    nullable: true,
  })
  impactStatus?: CheckpointStatus | null;

  @ApiProperty({
    required: false,
    description: 'Describes the checkpoint id field.',
    example: 12, nullable: true
  })
  checkpointId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Describes the checkpoint field.',
    oneOf: [
      { $ref: getSchemaPath(IncidentCheckpointResponseDto) },
      { enum: [null] },
    ],
    example: {
      id: 12,
      name: 'Huwara Checkpoint',
      location: 'South Nablus, Route 60',
      currentStatus: 'active',
    },
  })
  checkpoint?: object | null;

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
    description: 'Describes the verified by user id field.',
    example: 7, nullable: true
  })
  verifiedByUserId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Describes the verified at field.',
    example: '2026-04-13T09:00:00.000Z', nullable: true
  })
  verifiedAt?: string | null;

  @ApiProperty({
    required: false,
    description: 'Describes the closed by user id field.',
    example: 7, nullable: true
  })
  closedByUserId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Describes the closed at field.',
    example: '2026-04-13T11:00:00.000Z', nullable: true
  })
  closedAt?: string | null;
}

export class IncidentStatusHistoryResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 101
  })
  id: number;

  @ApiProperty({
    description: 'Describes the old status field.',
    enum: IncidentStatus, example: IncidentStatus.ACTIVE
  })
  oldStatus: IncidentStatus;

  @ApiProperty({
    description: 'Describes the new status field.',
    enum: IncidentStatus, example: IncidentStatus.CLOSED
  })
  newStatus: IncidentStatus;

  @ApiProperty({
    description: 'Describes the changed by user id field.',
    example: 7, nullable: true
  })
  changedByUserId?: number | null;

  @ApiProperty({
    description: 'Describes the changed at field.',
    example: '2026-04-13T10:00:00.000Z'
  })
  changedAt: string;
}

export class IncidentHistoryEnvelopeResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [IncidentStatusHistoryResponseDto],
    example: [
      {
        id: 101,
        oldStatus: 'active',
        newStatus: 'closed',
        changedByUserId: 7,
        changedAt: '2026-04-13T10:00:00.000Z',
      },
    ],
  })
  data: IncidentStatusHistoryResponseDto[];
}

export class IncidentPaginatedResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [IncidentResponseDto],
    example: [
      {
        id: 25,
        isVerified: false,
        title: 'Road closure near city entrance',
        description: 'Security forces closed the road in both directions.',
        latitude: 32.205,
        longitude: 35.284,
        location: 'Route 60 - South Entrance',
        type: 'closure',
        severity: 'high',
        status: 'active',
        impactStatus: 'delayed',
        checkpointId: 12,
        checkpoint: {
          id: 12,
          name: 'Huwara Checkpoint',
          location: 'South Nablus, Route 60',
          currentStatus: 'active',
        },
        createdAt: '2026-04-13T07:15:00.000Z',
        updatedAt: '2026-04-13T09:20:00.000Z',
        verifiedByUserId: 7,
        verifiedAt: '2026-04-13T09:00:00.000Z',
        closedByUserId: null,
        closedAt: null,
      },
    ],
  })
  data: IncidentResponseDto[];

  @ApiProperty({
    description: 'Describes the meta field.',
    type: PaginationMetaResponseDto,
    example: {
      total: 55,
      page: 1,
      limit: 10,
      totalPages: 6,
    },
  })
  meta: PaginationMetaResponseDto;
}

export class IncidentTimelineResponseDto extends IncidentsTimelineResponseDto {}

export class IncidentVerifyLegacyResponseDto {
  @ApiProperty({
    description: 'Describes the message field.',
    required: false,
    example: 'Incident is already verified',
  })
  message?: string;

  @ApiProperty({
    required: false,
    description: 'Incident id when an incident payload is returned',
    example: 25,
  })
  id?: number;

  @ApiProperty({
    required: false,
    description: 'Current verification state when an incident payload is returned',
    example: true,
  })
  isVerified?: boolean;

  @ApiProperty({
    required: false,
    description: 'Current incident status when an incident payload is returned',
    enum: IncidentStatus,
    example: IncidentStatus.ACTIVE,
  })
  status?: IncidentStatus;
}
