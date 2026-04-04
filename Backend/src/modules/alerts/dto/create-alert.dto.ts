import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateAlertDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsString()
  @IsNotEmpty()
  messageBody: string;

  @IsOptional()
  @IsString()
  status?: string;
}
