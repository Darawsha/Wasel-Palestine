import { ApiProperty } from '@nestjs/swagger';
import { CheckpointResponseDto } from '../../checkpoints/dto/checkpoint-response.dto';
import { IncidentResponseDto } from '../../incidents/dto/incident-response.dto';
import { ReportCategory } from '../../reports/enums/report-category.enum';
import { ReportStatus } from '../../reports/enums/report-status.enum';

export class MapIncidentsResponseDto {
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
      },
    ],
  })
  data: IncidentResponseDto[];
}

export class MapCheckpointsResponseDto {
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
}

export class MapReportMarkerResponseDto {
  @ApiProperty({
    description: 'Report identifier',
    example: 42,
  })
  reportId: number;

  @ApiProperty({
    description: 'Report latitude',
    example: 32.2211,
  })
  latitude: number;

  @ApiProperty({
    description: 'Report longitude',
    example: 35.2544,
  })
  longitude: number;

  @ApiProperty({
    description: 'Human-readable report location',
    example: 'Route 60, south entrance',
  })
  location: string;

  @ApiProperty({
    description: 'Report category',
    enum: ReportCategory,
    example: ReportCategory.ROAD_CLOSURE,
  })
  category: ReportCategory;

  @ApiProperty({
    description: 'Report description',
    example: 'Checkpoint lane blocked and traffic is not moving.',
  })
  description: string;

  @ApiProperty({
    description: 'Report moderation status',
    enum: ReportStatus,
    example: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ApiProperty({
    description: 'Duplicate source report id when flagged as duplicate',
    example: null,
    nullable: true,
    required: false,
  })
  duplicateOf?: number | null;

  @ApiProperty({
    description: 'Credibility score',
    example: 76,
  })
  confidenceScore: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-04-13T08:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-04-13T09:05:00.000Z',
  })
  updatedAt: string;
}

export class MapReportsResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [MapReportMarkerResponseDto],
    example: [
      {
        reportId: 42,
        latitude: 32.2211,
        longitude: 35.2544,
        location: 'Route 60, south entrance',
        category: 'road_closure',
        description: 'Checkpoint lane blocked and traffic is not moving.',
        status: 'pending',
        confidenceScore: 76,
      },
    ],
  })
  data: MapReportMarkerResponseDto[];
}
