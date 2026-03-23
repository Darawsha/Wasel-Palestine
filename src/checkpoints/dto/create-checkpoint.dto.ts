import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';

export class CreateCheckpointDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CheckpointStatus)
  @IsOptional()
  currentStatus?: CheckpointStatus;
}