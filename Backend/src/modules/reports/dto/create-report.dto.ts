import {
  IsEnum,
  IsNumber,
  IsString,
  Min,
  Max,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ReportCategory } from '../enums/report-category.enum';

export class CreateReportDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ValidateIf((o) => o.latitude !== 0 || o.longitude !== 0, {
    message: 'Invalid location.',
  })
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @ValidateIf((o) => o.latitude !== 0 || o.longitude !== 0, {
    message: 'Invalid location.',
  })
  longitude: number;

  @IsString()
  @MinLength(10)
  location: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsString()
  @MinLength(10, { message: 'Description is too short or empty.' })
  description: string;
}
