import { IsEnum } from 'class-validator';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New checkpoint status',
    enum: CheckpointStatus,
    example: CheckpointStatus.CLOSED,
  })
  @IsEnum(CheckpointStatus)
  currentStatus: CheckpointStatus;
}