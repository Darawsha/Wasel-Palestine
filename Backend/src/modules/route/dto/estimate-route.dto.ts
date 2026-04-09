import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvoidAreaDto } from './avoid-area.dto';

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
    type: [AvoidAreaDto],
    description: 'Optional circular areas to avoid',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvoidAreaDto)
  avoidAreas?: AvoidAreaDto[];
}