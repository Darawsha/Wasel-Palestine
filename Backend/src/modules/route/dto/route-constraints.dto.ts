import { IsBoolean, IsArray, IsOptional } from 'class-validator';

export class RouteConstraintsDto {
  @IsOptional()
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @IsOptional()
  @IsArray()
  avoidAreas?: string[];
}