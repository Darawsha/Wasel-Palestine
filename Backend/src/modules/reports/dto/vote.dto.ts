import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { VoteType } from '../enums/VoteType.enum';
import { ApiProperty } from '@nestjs/swagger';

export class VoteReportDto {
  @ApiProperty({
    description: 'Vote direction',
    enum: VoteType,
    example: VoteType.UP,
  })
  @IsEnum(VoteType)
  type: VoteType;

  @ApiProperty({
    required: false,
    description: 'Optional user id override (normally derived from JWT)',
    example: 17,
  })
  @IsOptional()
  @IsNumber()
  userId?: number;
}
