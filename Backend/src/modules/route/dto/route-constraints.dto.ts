import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RouteConstraintsDto {
  @ApiProperty({
    required: false,
    description: 'Avoid checkpoints in route calculation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @ApiProperty({
    required: false,
    description: 'Avoid incidents in route calculation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  avoidIncidents?: boolean;
}
