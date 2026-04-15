import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';
import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty({
    description: 'Incident title',
    type: String,
    example: 'Incident {{$randomInt}} - Route disruption',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Detailed incident description',
    type: String,
    example: 'Traffic disruption observed near the checkpoint with temporary closure.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    required: false,
    description: 'Incident latitude',
    type: Number,
    example: 32.205,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    required: false,
    description: 'Incident longitude',
    type: Number,
    example: 35.284,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    required: false,
    description: 'Human-readable location label',
    type: String,
    example: 'Route 60 - South Entrance',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Incident type',
    enum: IncidentType,
    example: IncidentType.CLOSURE,
  })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({
    description: 'Incident severity level',
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
  })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({
    required: false,
    description: 'Incident workflow status',
    enum: IncidentStatus,
    example: IncidentStatus.ACTIVE,
  })
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @ApiProperty({
    required: false,
    description: 'Whether the incident is verified',
    type: Boolean,
    example: false,
  })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiProperty({
    required: false,
    description: 'Related checkpoint identifier',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  @IsOptional()
  checkpointId?: number;

  @ApiProperty({
    required: false,
    description: 'Checkpoint impact status caused by the incident',
    enum: CheckpointStatus,
    example: CheckpointStatus.DELAYED,
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsEnum(CheckpointStatus)
  @IsOptional()
  impactStatus?: CheckpointStatus;
}
