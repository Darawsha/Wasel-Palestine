import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateIncidentDto } from './create-incident.dto';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
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
