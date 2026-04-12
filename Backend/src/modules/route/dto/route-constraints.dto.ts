import { IsBoolean, IsOptional } from 'class-validator';

export class RouteConstraintsDto {
  @IsOptional()
  @IsBoolean()
  avoidCheckpoints?: boolean;

  @IsOptional()
  @IsBoolean()
  avoidIncidents?: boolean;
}
