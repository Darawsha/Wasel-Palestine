import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CheckpointStatus } from '../enums/checkpoint-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckpointDto {
  @ApiProperty({
    description: 'Checkpoint display name',
    type: String,
    example: 'Checkpoint-{{$randomInt}}',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Checkpoint location label',
    type: String,
    example: 'Area-{{$randomInt}}, Route {{$randomInt}}',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @ApiProperty({
    required: false,
    description: 'Latitude coordinate',
    type: Number,
    example: 32.205,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    required: false,
    description: 'Longitude coordinate',
    type: Number,
    example: 35.284,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    required: false,
    description: 'Operational notes',
    type: String,
    example: 'Traffic generally slower during morning peak.',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Initial checkpoint status',
    enum: CheckpointStatus,
    example: CheckpointStatus.ACTIVE,
  })
  @IsEnum(CheckpointStatus)
  @IsNotEmpty()
  status: CheckpointStatus;

  @ApiProperty({
    required: false,
    description: 'Additional checkpoint description',
    type: String,
    example: 'Military gate with document checks.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    required: false,
    description: 'Current dynamic status for filtering and updates',
    enum: CheckpointStatus,
    example: CheckpointStatus.ACTIVE,
  })
  @IsEnum(CheckpointStatus)
  @IsOptional()
  currentStatus?: CheckpointStatus;
}