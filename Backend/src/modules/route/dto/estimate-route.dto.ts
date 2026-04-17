import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

function toOptionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return value;
}

export class EstimateRouteDto {
  @ApiProperty({ example: 32.2211, description: 'Start latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLatitude: number;

  @ApiProperty({ example: 35.2544, description: 'Start longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLongitude: number;

  @ApiProperty({ example: 31.7683, description: 'End latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLatitude: number;

  @ApiProperty({ example: 35.2137, description: 'End longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLongitude: number;

  @ApiProperty({
    required: false,
    example: true,
    description: 'Whether the route should avoid checkpoints',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @ApiProperty({
    required: false,
    example: true,
    description: 'Whether the route should avoid incidents',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  avoidIncidents?: boolean;
}
