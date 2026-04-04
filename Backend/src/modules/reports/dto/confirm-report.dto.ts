import { IsInt, IsOptional, Min } from 'class-validator';

export class ConfirmReportDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
