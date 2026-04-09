import { IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class CreateRouteDto {
  @IsNumber()
  startLatitude: number;

  @IsNumber()
  startLongitude: number;

  @IsNumber()
  endLatitude: number;

  @IsNumber()
  endLongitude: number;

  @IsOptional()
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @IsOptional()
  @IsArray()
  avoidAreas?: string[];
}