import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { IncidentType } from '../../incidents/enums/incident-type.enum';

function normalizeTextInput(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export class CreateAlertPreferenceDto {
  @Transform(({ value }) => normalizeTextInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  geographicArea: string;

  @Transform(({ value }) => normalizeTextInput(value).toUpperCase())
  @IsEnum(IncidentType)
  incidentCategory: IncidentType;
}
