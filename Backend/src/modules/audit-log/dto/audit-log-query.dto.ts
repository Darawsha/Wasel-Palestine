import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuditAction } from '../enums/audit-action.enum';
import { AuditTargetType } from '../enums/audit-target-type.enum';

function normalizeOptional(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}

function normalizeSearch(value: unknown): unknown {
  const normalized = String(value || '').trim();
  return normalized || undefined;
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

export class AuditLogQueryDto {
  @ApiProperty({
    required: false,
    enum: AuditAction,
    description: 'Filter by audit action',
    example: AuditAction.APPROVED,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiProperty({
    required: false,
    enum: AuditTargetType,
    description: 'Filter by audit target type',
    example: AuditTargetType.CHECKPOINT,
  })
  @Transform(({ value }) => normalizeOptional(value))
  @IsEnum(AuditTargetType)
  @IsOptional()
  targetType?: AuditTargetType;

  @ApiProperty({
    required: false,
    description: 'Filter by dashboard user id',
    example: 7,
    minimum: 1,
  })
  @Transform(({ value }) => toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  performedByUserId?: number;

  @ApiProperty({
    required: false,
    description: 'Free text search in action, target, user, or details',
    example: 'checkpoint approved',
  })
  @Transform(({ value }) => normalizeSearch(value))
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Filter entries created on or after this datetime',
    example: '2026-04-17T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Transform(({ value }) => toOptionalDate(value))
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: 'Filter entries created on or before this datetime',
    example: '2026-04-17T23:59:59.999Z',
    type: String,
    format: 'date-time',
  })
  @Transform(({ value }) => toOptionalDate(value))
  @IsDate()
  @IsOptional()
  endDate?: Date;

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
}
