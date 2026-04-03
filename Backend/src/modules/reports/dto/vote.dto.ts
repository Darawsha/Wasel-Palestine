import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { VoteType } from '../enums/VoteType.enum';

export class VoteReportDto {
  @IsEnum(VoteType)
  type: VoteType;

  @IsOptional()
  @IsNumber()
  userId?: number;
}
