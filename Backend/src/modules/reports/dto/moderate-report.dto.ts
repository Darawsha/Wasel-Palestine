import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModerateReportDto {
  @ApiProperty({
    required: false,
    description: 'Moderator notes for audit trail',
    example: 'Verified with field team and CCTV feed.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
