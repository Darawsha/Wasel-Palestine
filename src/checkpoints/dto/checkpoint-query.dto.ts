import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { CheckpointSortBy } from '../enums/CheckpointSortBy.enums';
import { SortOrder } from '../enums/SortOrder.enums';
export class CheckpointQueryDto {
  @IsEnum(CheckpointStatus)
  @IsOptional()
  currentStatus?: CheckpointStatus;

  @IsEnum(CheckpointSortBy)
  @IsOptional()
  sortBy?: CheckpointSortBy = CheckpointSortBy.CREATED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}