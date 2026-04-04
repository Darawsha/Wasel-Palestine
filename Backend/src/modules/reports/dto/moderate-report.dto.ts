import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
