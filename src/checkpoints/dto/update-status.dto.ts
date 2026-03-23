import { IsEnum } from 'class-validator';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';

export class UpdateStatusDto {
  @IsEnum(CheckpointStatus)
  currentStatus: CheckpointStatus;
}