import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
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

export class CreateRouteDto {
  @ApiProperty({ description: 'Start point latitude', example: 32.2211 })
  @IsNumber()
  startLatitude: number;

  @ApiProperty({ description: 'Start point longitude', example: 35.2544 })
  @IsNumber()
  startLongitude: number;

  @ApiProperty({ description: 'End point latitude', example: 31.7683 })
  @IsNumber()
  endLatitude: number;

  @ApiProperty({ description: 'End point longitude', example: 35.2137 })
  @IsNumber()
  endLongitude: number;

  @ApiProperty({
    required: false,
    description: 'Avoid checkpoints when estimating route',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @ApiProperty({
    required: false,
    description: 'Avoid incidents when estimating route',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  avoidIncidents?: boolean;
}
