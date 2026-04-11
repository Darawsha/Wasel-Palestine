import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the route should avoid checkpoints',
  })
  @IsOptional()
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the route should avoid incidents',
  })
  @IsOptional()
  @IsBoolean()
  avoidIncidents?: boolean;
}
