import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class AvoidAreaDto {
  @ApiProperty({
    example: 32.105,
    description: 'Latitude of the area center',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLatitude: number;

  @ApiProperty({
    example: 35.21,
    description: 'Longitude of the area center',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLongitude: number;

  @ApiProperty({
    example: 800,
    description: 'Radius of the area in meters',
  })
  @IsNumber()
  @Min(1)
  radiusMeters: number;
}