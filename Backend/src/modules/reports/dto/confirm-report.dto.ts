import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmReportDto {
  @ApiProperty({
    required: false,
    description: 'Optional user id override (normally derived from JWT)',
    example: 17,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
