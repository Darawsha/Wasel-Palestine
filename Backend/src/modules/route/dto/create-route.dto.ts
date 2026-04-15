import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @ApiProperty({
    required: false,
    description: 'Avoid incidents when estimating route',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  avoidIncidents?: boolean;
}
