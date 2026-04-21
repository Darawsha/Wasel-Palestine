import {
  IsEnum,
  IsNumber,
  IsString,
  IsIn,
  Min,
  Max,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  EFFECTIVE_REPORT_CATEGORIES,
  ReportCategory,
} from '../enums/report-category.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({
    description: 'Latitude of the reported event',
    example: 32.2211,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ValidateIf((o) => o.latitude !== 0 || o.longitude !== 0, {
    message: 'Invalid location.',
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the reported event',
    example: 35.2544,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ValidateIf((o) => o.latitude !== 0 || o.longitude !== 0, {
    message: 'Invalid location.',
  })
  longitude: number;

  @ApiProperty({
    description: 'Human-readable location',
    example: 'Route 60, south entrance',
    minLength: 4,
  })
  @IsString()
  @MinLength(4, { message: 'Location is too short or empty.' })
  location: string;

  @ApiProperty({
    description: 'Report category',
    enum: EFFECTIVE_REPORT_CATEGORIES,
    example: ReportCategory.ROAD_CLOSURE,
  })
  @IsEnum(ReportCategory)
  @IsIn(EFFECTIVE_REPORT_CATEGORIES, {
    message:
      'Category must be one of: Road Closure, Delay, Accident, Weather Hazard, Other.',
  })
  category: ReportCategory;

  @ApiProperty({
    description: 'Detailed report description',
    example: 'Checkpoint lane blocked and traffic is not moving.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Description is too short or empty.' })
  description: string;
}
