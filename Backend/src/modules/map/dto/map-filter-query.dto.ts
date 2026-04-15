import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
} from 'class-validator';

import { IncidentSeverity } from '../../incidents/enums/incident-severity.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { ApiProperty } from '@nestjs/swagger';

const INCIDENT_TYPE_ALIASES: Record<string, IncidentType> = {
  CLOSURE: IncidentType.CLOSURE,
  'ROAD-CLOSURE': IncidentType.CLOSURE,
  ROAD_CLOSURE: IncidentType.CLOSURE,
  DELAY: IncidentType.DELAY,
  ACCIDENT: IncidentType.ACCIDENT,
  WEATHER: IncidentType.WEATHER_HAZARD,
  WEATHER_HAZARD: IncidentType.WEATHER_HAZARD,
  'WEATHER-HAZARD': IncidentType.WEATHER_HAZARD,
};

const INCIDENT_SEVERITY_ALIASES: Record<string, IncidentSeverity> = {
  LOW: IncidentSeverity.LOW,
  MEDIUM: IncidentSeverity.MEDIUM,
  HIGH: IncidentSeverity.HIGH,
  CRITICAL: IncidentSeverity.CRITICAL,
};

function normalizeToken(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

function parseTypes(value: unknown): IncidentType[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const normalizedValues = rawValues
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => normalizeToken(entry))
    .map((entry) => INCIDENT_TYPE_ALIASES[entry] || entry)
    .filter(Boolean) as IncidentType[];

  if (normalizedValues.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalizedValues));
}

function parseSeverity(value: unknown): IncidentSeverity | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalizedSeverity = normalizeToken(value);
  return INCIDENT_SEVERITY_ALIASES[normalizedSeverity] || (normalizedSeverity as IncidentSeverity);
}

function normalizeDateInput(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export class MapFilterQueryDto {
  @ApiProperty({
    required: false,
    description:
      'Incident types to include (comma-separated is supported, e.g. CLOSURE,DELAY).',
    enum: IncidentType,
    isArray: true,
    example: [IncidentType.CLOSURE],
  })
  @Transform(({ value }) => parseTypes(value))
  @IsArray()
  @IsEnum(IncidentType, { each: true })
  @IsOptional()
  types?: IncidentType[];

  @ApiProperty({
    required: false,
    description: 'Severity filter',
    enum: IncidentSeverity,
    example: IncidentSeverity.MEDIUM,
  })
  @Transform(({ value }) => parseSeverity(value))
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiProperty({
    required: false,
    description: 'Start datetime for filtering',
    type: String,
    format: 'date-time',
    example: '2026-04-10T00:00:00.000Z',
  })
  @Transform(({ value }) => normalizeDateInput(value))
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: 'End datetime for filtering',
    type: String,
    format: 'date-time',
    example: '2026-04-13T23:59:59.999Z',
  })
  @Transform(({ value }) => normalizeDateInput(value))
  @IsDate()
  @IsOptional()
  endDate?: Date;
}