import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentStatus } from '../enums/incident-status.enum';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(IncidentType)
  type: IncidentType;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  checkpointId?: number;
}