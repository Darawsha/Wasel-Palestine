import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';

export class CreateCheckpointDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(CheckpointStatus)
  @IsNotEmpty()
  status: CheckpointStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CheckpointStatus)
  @IsOptional()
  currentStatus?: CheckpointStatus;
}