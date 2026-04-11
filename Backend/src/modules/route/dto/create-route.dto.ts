import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

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
  @IsBoolean()
  avoidIncidents?: boolean;
}
