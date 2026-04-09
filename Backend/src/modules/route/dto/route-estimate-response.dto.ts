import { ApiProperty } from '@nestjs/swagger';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteFactorType } from '../enums/route-factor-type.enum';

export class RouteFactorResponseDto {
  @ApiProperty({
    enum: RouteFactorType,
    example: RouteFactorType.CHECKPOINT_AVOIDANCE,
  })
  type: RouteFactorType;

  @ApiProperty({
    example: 'Avoiding checkpoints changed the selected route path.',
  })
  description: string;

  @ApiProperty({ example: 2.4, required: false })
  impactDistanceKm?: number;

  @ApiProperty({ example: 6, required: false })
  impactDurationMinutes?: number;
}

export class RouteGeometryResponseDto {
  @ApiProperty({ example: 'LineString' })
  type: string;

  @ApiProperty({
    example: [
      [35.2544, 32.2211],
      [35.2401, 32.1802],
      [35.2137, 31.7683],
    ],
  })
  coordinates: number[][];
}

export class RouteMetadataResponseDto {
  @ApiProperty({
    enum: RouteEstimationMethod,
    example: RouteEstimationMethod.OPENROUTE_ROUTING,
  })
  method: RouteEstimationMethod;

  @ApiProperty({
    enum: RouteConstraintType,
    isArray: true,
    example: [
      RouteConstraintType.AVOID_CHECKPOINTS,
      RouteConstraintType.AVOID_AREAS,
    ],
  })
  appliedConstraints: RouteConstraintType[];

  @ApiProperty({ type: [RouteFactorResponseDto] })
  factors: RouteFactorResponseDto[];

  @ApiProperty({ type: [String], example: [] })
  warnings: string[];
}

export class RouteEstimateResponseDto {
  @ApiProperty({ example: 54.3 })
  estimatedDistanceKm: number;

  @ApiProperty({ example: 78 })
  estimatedDurationMinutes: number;

  @ApiProperty({ type: RouteGeometryResponseDto })
  geometry: RouteGeometryResponseDto;

  @ApiProperty({ type: RouteMetadataResponseDto })
  metadata: RouteMetadataResponseDto;
}