import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { CheckpointSortBy } from '../enums/CheckpointSortBy.enums';
import { SortOrder } from '../enums/SortOrder.enums';
import { ApiProperty } from '@nestjs/swagger';

export class CheckpointQueryDto {
  private static normalizeOptional(value: unknown): unknown {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  }

  private static toOptionalPositiveNumber(value: unknown): unknown {
    const normalized = CheckpointQueryDto.normalizeOptional(value);
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
    description: 'Filter checkpoints by current status',
    enum: CheckpointStatus,
    example: CheckpointStatus.ACTIVE,
  })
  @Transform(({ value }) => CheckpointQueryDto.normalizeOptional(value))
  @IsEnum(CheckpointStatus)
  @IsOptional()
  currentStatus?: CheckpointStatus;

  @ApiProperty({
    required: false,
    description: 'Sort field',
    enum: CheckpointSortBy,
    default: CheckpointSortBy.CREATED_AT,
    example: CheckpointSortBy.CREATED_AT,
  })
  @Transform(({ value }) => CheckpointQueryDto.normalizeOptional(value))
  @IsEnum(CheckpointSortBy)
  @IsOptional()
  sortBy?: CheckpointSortBy = CheckpointSortBy.CREATED_AT;

  @ApiProperty({
    required: false,
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @Transform(({ value }) => CheckpointQueryDto.normalizeOptional(value))
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
  @Transform(({ value }) => CheckpointQueryDto.toOptionalPositiveNumber(value))
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
  @Transform(({ value }) => CheckpointQueryDto.toOptionalPositiveNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}