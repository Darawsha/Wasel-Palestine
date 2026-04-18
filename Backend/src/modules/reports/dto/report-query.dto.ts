import {
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportCategory } from '../enums/report-category.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { ApiProperty } from '@nestjs/swagger';

function normalizeOptional(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return undefined;
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return value;
}

function toOptionalNumber(value: unknown): unknown {
  const normalized = normalizeOptional(value);
  if (normalized === undefined) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function toOptionalPositiveNumber(value: unknown): unknown {
  const parsed = toOptionalNumber(value);
  if (typeof parsed !== 'number' || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function toOptionalBoolean(value: unknown): unknown {
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

export class ReportQueryDto {
  @ApiProperty({
    required: false,
    description: 'Filter by submitter user id',
    example: 16,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsNumber()
  @Min(1)
  submittedByUserId?: number;

  @ApiProperty({
    required: false,
    description: 'Exclude reports submitted by this user id',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsNumber()
  @Min(1)
  excludeSubmittedByUserId?: number;

  @ApiProperty({
    required: false,
    description: 'Filter by category',
    enum: ReportCategory,
    example: ReportCategory.ROAD_CLOSURE,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @ApiProperty({
    required: false,
    description: 'Filter by location text',
    example: 'Nablus',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptional(value))
  @IsString()
  location?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by single status',
    enum: ReportStatus,
    example: ReportStatus.PENDING,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiProperty({
    required: false,
    description:
      'Filter by multiple statuses. Supports comma-separated values such as pending,under_review.',
    enum: ReportStatus,
    isArray: true,
    example: [ReportStatus.PENDING],
  })
  @IsOptional()
  @Transform(({ value }) => {
    const rawValues = Array.isArray(value) ? value : [value];

    const normalizedValues = rawValues
      .map((entry) => normalizeOptional(entry))
      .filter((entry) => entry !== undefined)
      .flatMap((entry) => String(entry).split(','))
      .map((item) => item.trim())
      .filter(Boolean);

    return normalizedValues.length > 0 ? normalizedValues : undefined;
  })
  @IsEnum(ReportStatus, { each: true })
  statuses?: ReportStatus[];

  @ApiProperty({
    required: false,
    description: 'Keyword search across location, description and reporter info',
    example: 'closure',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptional(value))
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Minimum confidence score',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  minConfidence?: number;

  @ApiProperty({
    required: false,
    description: 'Latitude for radius filtering',
    example: 32.2211,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    required: false,
    description: 'Longitude for radius filtering',
    example: 35.2544,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    required: false,
    description: 'Radius in kilometers used with latitude/longitude',
    example: 25,
    minimum: 0.1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number;

  @ApiProperty({
    required: false,
    description: 'Return only duplicate reports',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  duplicateOnly?: boolean;

  @ApiProperty({
    required: false,
    description: 'Sort field',
    enum: ['createdAt', 'updatedAt', 'status', 'category', 'confidenceScore'],
    example: 'createdAt',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptional(value))
  @IsString()
  @IsIn([
    'createdAt',
    'updatedAt',
    'status',
    'category',
    'confidenceScore',
  ])
  sort?: string;

  @ApiProperty({
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptional(value))
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiProperty({
    required: false,
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
