import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import { IncidentType } from '../../incidents/enums/incident-type.enum';

function normalizeTextInput(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeCategoryArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeTextInput(entry).toUpperCase());
}

export class CreateAlertPreferencesBatchDto {
  @Transform(({ value }) => normalizeTextInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  geographicArea: string;

  @Transform(({ value }) => normalizeCategoryArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(IncidentType, { each: true })
  incidentCategories: IncidentType[];
}
