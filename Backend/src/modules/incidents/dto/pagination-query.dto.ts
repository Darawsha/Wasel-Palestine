import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  IncidentSortBy,
  SortOrder,
} from './incident-query.dto';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';
import { IncidentType } from '../enums/incident-type.enum';
import { ApiProperty } from '@nestjs/swagger';

function toBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return value;
}

function normalizeSearch(value: unknown): unknown {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function normalizeOptional(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return value;
}

function toOptionalPositiveNumber(value: unknown): unknown {
  const normalized = normalizeOptional(value);
  if (normalized === undefined) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function toOptionalDate(value: unknown): unknown {
  const normalized = normalizeOptional(value);
  if (normalized === undefined) {
    return undefined;
  }

  const parsed = new Date(String(normalized));
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export class PaginationQueryDto {
  @ApiProperty({
    required: false,
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    required: false,
    description: 'Filter by status',
    enum: IncidentStatus,
    example: IncidentStatus.ACTIVE,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @ApiProperty({
    required: false,
    description: 'Filter by type',
    enum: IncidentType,
    example: IncidentType.CLOSURE,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(IncidentType)
  @IsOptional()
  type?: IncidentType;

  @ApiProperty({
    required: false,
    description: 'Filter by severity',
    enum: IncidentSeverity,
    example: IncidentSeverity.MEDIUM,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiProperty({
    required: false,
    description: 'Filter by verification state',
    example: true,
  })
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiProperty({
    required: false,
    description: 'Related checkpoint identifier',
    example: 1,
    minimum: 1,
  })
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  checkpointId?: number;

  @ApiProperty({
    required: false,
    description: 'Free text search in title/description/location',
    example: 'checkpoint delay',
  })
  @Transform(({ value }) => normalizeSearch(value))
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Filter incidents created on or after this datetime',
    example: '2026-04-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Transform(({ value }) => toOptionalDate(value))
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: 'Filter incidents created on or before this datetime',
    example: '2026-04-30T23:59:59.999Z',
    type: String,
    format: 'date-time',
  })
  @Transform(({ value }) => toOptionalDate(value))
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    required: false,
    description: 'Sort field',
    enum: IncidentSortBy,
    default: IncidentSortBy.CREATED_AT,
    example: IncidentSortBy.CREATED_AT,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(IncidentSortBy)
  @IsOptional()
  sortBy?: IncidentSortBy = IncidentSortBy.CREATED_AT;

  @ApiProperty({
    required: false,
    description: 'Sort direction',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}
