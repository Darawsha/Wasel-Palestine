import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateIncidentDto } from './create-incident.dto';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  @ApiProperty({
    required: false,
    description: 'Related checkpoint identifier',
    example: 15,
    minimum: 1,
    nullable: true,
  })
  @Transform(({ value }) =>
    value === ''
      ? undefined
      : value === null || value === undefined
        ? value
        : Number(value),
  )
  @IsInt()
  @Min(1)
  @IsOptional()
  checkpointId?: number | null;

  @ApiProperty({
    required: false,
    description: 'Checkpoint impact status caused by the incident',
    enum: CheckpointStatus,
    nullable: true,
    example: CheckpointStatus.DELAYED,
  })
  @Transform(({ value }) =>
    value === ''
      ? undefined
      : value === null || value === undefined
        ? value
        : value,
  )
  @IsEnum(CheckpointStatus)
  @IsOptional()
  impactStatus?: CheckpointStatus | null;
}
