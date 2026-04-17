import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModerationDecisionDto {
  @ApiProperty({
    required: false,
    description: 'Optional rejection reason or decision note',
    example: 'Duplicate or insufficient operational detail.',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
