import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
} from 'class-validator';

import { IncidentSeverity } from '../../incidents/enums/incident-severity.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';

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

  return value;
}

export class MapFilterQueryDto {
  @Transform(({ value }) => parseTypes(value))
  @IsArray()
  @IsEnum(IncidentType, { each: true })
  @IsOptional()
  types?: IncidentType[];

  @Transform(({ value }) => parseSeverity(value))
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @Transform(({ value }) => normalizeDateInput(value))
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Transform(({ value }) => normalizeDateInput(value))
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;
}