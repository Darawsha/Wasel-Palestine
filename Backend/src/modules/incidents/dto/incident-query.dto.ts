import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { IncidentStatus } from '../enums/incident-status.enum';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { ApiProperty } from '@nestjs/swagger';

export enum IncidentSortBy {
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class IncidentQueryDto {
  private static normalizeOptional(value: unknown): unknown {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  }

  private static toOptionalPositiveNumber(value: unknown): unknown {
    const normalized = IncidentQueryDto.normalizeOptional(value);
    if (normalized === undefined) {
      return undefined;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return parsed;
  }

  @ApiProperty({
    required: false,
    description: 'Filter by incident status',
    enum: IncidentStatus,
    example: IncidentStatus.ACTIVE,
  })
  @Transform(({ value }) => IncidentQueryDto.normalizeOptional(value))
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @ApiProperty({
    required: false,
    description: 'Filter by incident type',
    enum: IncidentType,
    example: IncidentType.CLOSURE,
  })
  @Transform(({ value }) => IncidentQueryDto.normalizeOptional(value))
  @IsEnum(IncidentType)
  @IsOptional()
  type?: IncidentType;

  @ApiProperty({
    required: false,
    description: 'Filter by severity',
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
  })
  @Transform(({ value }) => IncidentQueryDto.normalizeOptional(value))
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiProperty({
    required: false,
    description: 'Filter incidents for a specific checkpoint',
    example: 15,
    minimum: 1,
  })
  @Transform(({ value }) => IncidentQueryDto.toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  checkpointId?: number;

  @ApiProperty({
    required: false,
    description: 'Sort field',
    enum: IncidentSortBy,
    default: IncidentSortBy.CREATED_AT,
    example: IncidentSortBy.CREATED_AT,
  })
  @Transform(({ value }) => IncidentQueryDto.normalizeOptional(value))
  @IsEnum(IncidentSortBy)
  @IsOptional()
  sortBy?: IncidentSortBy = IncidentSortBy.CREATED_AT;

  @ApiProperty({
    required: false,
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @Transform(({ value }) => IncidentQueryDto.normalizeOptional(value))
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    required: false,
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Transform(({ value }) => IncidentQueryDto.toOptionalPositiveNumber(value))
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
  @Transform(({ value }) => IncidentQueryDto.toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}