import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { IncidentType } from '../../incidents/enums/incident-type.enum';

function normalizeTextInput(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export class CreateAlertPreferenceDto {
  @ApiProperty({
    description: 'Geographic area the user wants to monitor',
    type: String,
    example: 'Area-{{$randomInt}}',
    maxLength: 100,
  })
  @Transform(({ value }) => normalizeTextInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  geographicArea: string;

  @ApiProperty({
    description: 'Incident category that triggers alerts',
    enum: IncidentType,
  })
  @Transform(({ value }) => normalizeTextInput(value).toUpperCase())
  @IsEnum(IncidentType)
  incidentCategory: IncidentType;
}