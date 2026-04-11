import { ApiProperty } from '@nestjs/swagger';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteFactorType } from '../enums/route-factor-type.enum';
import { RouteOptionKind } from '../enums/route-option-kind.enum';
import { RouteRecommendationReason } from '../enums/route-recommendation-reason.enum';

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

export class RouteConstraintComplianceResponseDto {
  @ApiProperty({
    enum: RouteConstraintType,
    example: RouteConstraintType.AVOID_INCIDENTS,
  })
  constraint: RouteConstraintType;

  @ApiProperty({ example: true })
  requested: boolean;

  @ApiProperty({ example: false })
  satisfied: boolean;

  @ApiProperty({ example: 1 })
  intersectedGroupCount: number;

  @ApiProperty({ example: 3 })
  intersectedZoneCount: number;

  @ApiProperty({ example: 2 })
  intersectedSegmentCount: number;

  @ApiProperty({ example: 5 })
  pointsInsideZoneCount: number;
}

export class RouteComplianceResponseDto {
  @ApiProperty({ example: false })
  isFullyCompliant: boolean;

  @ApiProperty({
    enum: RouteConstraintType,
    isArray: true,
    example: [RouteConstraintType.AVOID_CHECKPOINTS],
  })
  requestedConstraints: RouteConstraintType[];

  @ApiProperty({
    enum: RouteConstraintType,
    isArray: true,
    example: [],
  })
  satisfiedConstraints: RouteConstraintType[];

  @ApiProperty({
    enum: RouteConstraintType,
    isArray: true,
    example: [RouteConstraintType.AVOID_CHECKPOINTS],
  })
  unsatisfiedConstraints: RouteConstraintType[];

  @ApiProperty({ type: [RouteConstraintComplianceResponseDto] })
  constraintResults: RouteConstraintComplianceResponseDto[];
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
      RouteConstraintType.AVOID_INCIDENTS,
    ],
  })
  appliedConstraints: RouteConstraintType[];

  @ApiProperty({ type: [RouteFactorResponseDto] })
  factors: RouteFactorResponseDto[];

  @ApiProperty({ type: RouteComplianceResponseDto })
  compliance: RouteComplianceResponseDto;

  @ApiProperty({ type: [String], example: [] })
  warnings: string[];
}

export class RouteOptionResponseDto {
  @ApiProperty({
    enum: RouteOptionKind,
    example: RouteOptionKind.DEFAULT,
  })
  kind: RouteOptionKind;

  @ApiProperty({ example: 54.3 })
  estimatedDistanceKm: number;

  @ApiProperty({ example: 78 })
  estimatedDurationMinutes: number;

  @ApiProperty({ type: RouteGeometryResponseDto })
  geometry: RouteGeometryResponseDto;

  @ApiProperty({ type: RouteMetadataResponseDto })
  metadata: RouteMetadataResponseDto;
}

export class RouteComparisonSummaryResponseDto {
  @ApiProperty({ example: 2.35 })
  distanceIncreaseKm: number;

  @ApiProperty({ example: 14.6 })
  distanceIncreasePercent: number;

  @ApiProperty({ example: 6 })
  durationIncreaseMinutes: number;

  @ApiProperty({ example: 18.2 })
  durationIncreasePercent: number;

  @ApiProperty({ example: false })
  isWithinAutoApplyThresholds: boolean;
}

export class RouteRecommendationResponseDto {
  @ApiProperty({
    enum: RouteOptionKind,
    example: RouteOptionKind.AVOIDED,
  })
  primaryRouteKind: RouteOptionKind;

  @ApiProperty({
    enum: RouteOptionKind,
    nullable: true,
    required: false,
    example: RouteOptionKind.AVOIDED,
  })
  suggestedRouteKind?: RouteOptionKind | null;

  @ApiProperty({ example: true })
  requiresUserApproval: boolean;

  @ApiProperty({ example: false })
  autoApplied: boolean;

  @ApiProperty({
    enum: RouteRecommendationReason,
    example: RouteRecommendationReason.AVOIDED_ROUTE_REQUIRES_CONFIRMATION,
  })
  reason: RouteRecommendationReason;

  @ApiProperty({
    example:
      'An avoided route is available, but it adds 2.35 km and 6 min compared with the default route. Review it on the map and confirm if you want to switch.',
  })
  message: string;

  @ApiProperty({ type: RouteComparisonSummaryResponseDto, nullable: true })
  comparison: RouteComparisonSummaryResponseDto | null;

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

  @ApiProperty({ type: RouteOptionResponseDto })
  defaultRoute: RouteOptionResponseDto;

  @ApiProperty({ type: RouteOptionResponseDto, nullable: true })
  avoidedRoute: RouteOptionResponseDto | null;

  @ApiProperty({ type: RouteOptionResponseDto })
  primaryRoute: RouteOptionResponseDto;

  @ApiProperty({ type: RouteOptionResponseDto, nullable: true })
  suggestedRoute: RouteOptionResponseDto | null;

  @ApiProperty({ type: RouteRecommendationResponseDto })
  recommendation: RouteRecommendationResponseDto;
}
