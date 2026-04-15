import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteEstimationMethod } from '../enums/route-estimation-method.enum';
import { RouteFactorType } from '../enums/route-factor-type.enum';
import { RouteOptionKind } from '../enums/route-option-kind.enum';
import { RouteRecommendationReason } from '../enums/route-recommendation-reason.enum';

export class RouteFactorResponseDto {
  @ApiProperty({
    description: 'Describes the type field.',
    enum: RouteFactorType,
    example: RouteFactorType.CHECKPOINT_AVOIDANCE,
  })
  type: RouteFactorType;

  @ApiProperty({
    description: 'Describes the description field.',
    example: 'Avoiding checkpoints changed the selected route path.',
  })
  description: string;

  @ApiProperty({
    description: 'Describes the impact distance km field.',
    example: 2.4, required: false
  })
  impactDistanceKm?: number;

  @ApiProperty({
    description: 'Describes the impact duration minutes field.',
    example: 6, required: false
  })
  impactDurationMinutes?: number;
}

export class RouteGeometryResponseDto {
  @ApiProperty({
    description: 'Describes the type field.',
    example: 'LineString'
  })
  type: string;

  @ApiProperty({
    description: 'Describes the coordinates field.',
    type: 'array',
    items: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'number' },
    },
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
    description: 'Describes the constraint field.',
    enum: RouteConstraintType,
    example: RouteConstraintType.AVOID_INCIDENTS,
  })
  constraint: RouteConstraintType;

  @ApiProperty({
    description: 'Describes the requested field.',
    example: true
  })
  requested: boolean;

  @ApiProperty({
    description: 'Describes the satisfied field.',
    example: false
  })
  satisfied: boolean;

  @ApiProperty({
    description: 'Describes the intersected group count field.',
    example: 1
  })
  intersectedGroupCount: number;

  @ApiProperty({
    description: 'Describes the intersected zone count field.',
    example: 3
  })
  intersectedZoneCount: number;

  @ApiProperty({
    description: 'Describes the intersected segment count field.',
    example: 2
  })
  intersectedSegmentCount: number;

  @ApiProperty({
    description: 'Describes the points inside zone count field.',
    example: 5
  })
  pointsInsideZoneCount: number;
}

export class RouteComplianceResponseDto {
  @ApiProperty({
    description: 'Describes the is fully compliant field.',
    example: false
  })
  isFullyCompliant: boolean;

  @ApiProperty({
    description: 'Describes the requested constraints field.',
    enum: RouteConstraintType,
    isArray: true,
    example: [RouteConstraintType.AVOID_CHECKPOINTS],
  })
  requestedConstraints: RouteConstraintType[];

  @ApiProperty({
    description: 'Describes the satisfied constraints field.',
    enum: RouteConstraintType,
    isArray: true,
    example: [],
  })
  satisfiedConstraints: RouteConstraintType[];

  @ApiProperty({
    description: 'Describes the unsatisfied constraints field.',
    enum: RouteConstraintType,
    isArray: true,
    example: [RouteConstraintType.AVOID_CHECKPOINTS],
  })
  unsatisfiedConstraints: RouteConstraintType[];

  @ApiProperty({
    description: 'Describes the constraint results field.',
    type: [RouteConstraintComplianceResponseDto],
    example: [
      {
        constraint: RouteConstraintType.AVOID_CHECKPOINTS,
        requested: true,
        satisfied: false,
        intersectedGroupCount: 1,
        intersectedZoneCount: 3,
        intersectedSegmentCount: 2,
        pointsInsideZoneCount: 5,
      },
    ],
  })
  constraintResults: RouteConstraintComplianceResponseDto[];
}

export class RouteMetadataResponseDto {
  @ApiProperty({
    description: 'Describes the method field.',
    enum: RouteEstimationMethod,
    example: RouteEstimationMethod.OPENROUTE_ROUTING,
  })
  method: RouteEstimationMethod;

  @ApiProperty({
    description: 'Describes the applied constraints field.',
    enum: RouteConstraintType,
    isArray: true,
    example: [
      RouteConstraintType.AVOID_CHECKPOINTS,
      RouteConstraintType.AVOID_INCIDENTS,
    ],
  })
  appliedConstraints: RouteConstraintType[];

  @ApiProperty({
    description: 'Describes the factors field.',
    type: [RouteFactorResponseDto],
    example: [
      {
        type: RouteFactorType.CHECKPOINT_AVOIDANCE,
        description: 'Avoiding checkpoints changed the selected route path.',
        impactDistanceKm: 2.4,
        impactDurationMinutes: 6,
      },
    ],
  })
  factors: RouteFactorResponseDto[];

  @ApiProperty({
    description: 'Describes the compliance field.',
    type: RouteComplianceResponseDto,
    example: {
      isFullyCompliant: false,
      requestedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
      satisfiedConstraints: [],
      unsatisfiedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
      constraintResults: [
        {
          constraint: RouteConstraintType.AVOID_CHECKPOINTS,
          requested: true,
          satisfied: false,
          intersectedGroupCount: 1,
          intersectedZoneCount: 3,
          intersectedSegmentCount: 2,
          pointsInsideZoneCount: 5,
        },
      ],
    },
  })
  compliance: RouteComplianceResponseDto;

  @ApiProperty({
    description: 'Describes the warnings field.',
    type: [String], example: []
  })
  warnings: string[];
}

export class RouteOptionResponseDto {
  @ApiProperty({
    description: 'Describes the kind field.',
    enum: RouteOptionKind,
    example: RouteOptionKind.DEFAULT,
  })
  kind: RouteOptionKind;

  @ApiProperty({
    description: 'Describes the estimated distance km field.',
    example: 54.3
  })
  estimatedDistanceKm: number;

  @ApiProperty({
    description: 'Describes the estimated duration minutes field.',
    example: 78
  })
  estimatedDurationMinutes: number;

  @ApiProperty({
    description: 'Describes the geometry field.',
    type: RouteGeometryResponseDto,
    example: {
      type: 'LineString',
      coordinates: [
        [35.2544, 32.2211],
        [35.2401, 32.1802],
        [35.2137, 31.7683],
      ],
    },
  })
  geometry: RouteGeometryResponseDto;

  @ApiProperty({
    description: 'Describes the metadata field.',
    type: RouteMetadataResponseDto,
    example: {
      method: RouteEstimationMethod.OPENROUTE_ROUTING,
      appliedConstraints: [
        RouteConstraintType.AVOID_CHECKPOINTS,
        RouteConstraintType.AVOID_INCIDENTS,
      ],
      factors: [
        {
          type: RouteFactorType.CHECKPOINT_AVOIDANCE,
          description: 'Avoiding checkpoints changed the selected route path.',
          impactDistanceKm: 2.4,
          impactDurationMinutes: 6,
        },
      ],
      compliance: {
        isFullyCompliant: false,
        requestedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
        satisfiedConstraints: [],
        unsatisfiedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
        constraintResults: [
          {
            constraint: RouteConstraintType.AVOID_CHECKPOINTS,
            requested: true,
            satisfied: false,
            intersectedGroupCount: 1,
            intersectedZoneCount: 3,
            intersectedSegmentCount: 2,
            pointsInsideZoneCount: 5,
          },
        ],
      },
      warnings: [],
    },
  })
  metadata: RouteMetadataResponseDto;
}

export class RouteComparisonSummaryResponseDto {
  @ApiProperty({
    description: 'Describes the distance increase km field.',
    example: 2.35
  })
  distanceIncreaseKm: number;

  @ApiProperty({
    description: 'Describes the distance increase percent field.',
    example: 14.6
  })
  distanceIncreasePercent: number;

  @ApiProperty({
    description: 'Describes the duration increase minutes field.',
    example: 6
  })
  durationIncreaseMinutes: number;

  @ApiProperty({
    description: 'Describes the duration increase percent field.',
    example: 18.2
  })
  durationIncreasePercent: number;

  @ApiProperty({
    description: 'Describes the is within auto apply thresholds field.',
    example: false
  })
  isWithinAutoApplyThresholds: boolean;
}

export class RouteRecommendationResponseDto {
  @ApiProperty({
    description: 'Describes the primary route kind field.',
    enum: RouteOptionKind,
    example: RouteOptionKind.AVOIDED,
  })
  primaryRouteKind: RouteOptionKind;

  @ApiProperty({
    description: 'Describes the suggested route kind field.',
    enum: RouteOptionKind,
    nullable: true,
    required: false,
    example: RouteOptionKind.AVOIDED,
  })
  suggestedRouteKind?: RouteOptionKind | null;

  @ApiProperty({
    description: 'Describes the requires user approval field.',
    example: true
  })
  requiresUserApproval: boolean;

  @ApiProperty({
    description: 'Describes the auto applied field.',
    example: false
  })
  autoApplied: boolean;

  @ApiProperty({
    description: 'Describes the reason field.',
    enum: RouteRecommendationReason,
    example: RouteRecommendationReason.AVOIDED_ROUTE_REQUIRES_CONFIRMATION,
  })
  reason: RouteRecommendationReason;

  @ApiProperty({
    description: 'Describes the message field.',
    example:
      'An avoided route is available, but it adds 2.35 km and 6 min compared with the default route. Review it on the map and confirm if you want to switch.',
  })
  message: string;

  @ApiProperty({
    description: 'Describes the comparison field.',
    oneOf: [
      { $ref: getSchemaPath(RouteComparisonSummaryResponseDto) },
      { enum: [null] },
    ],
    example: {
      distanceIncreaseKm: 2.35,
      distanceIncreasePercent: 14.6,
      durationIncreaseMinutes: 6,
      durationIncreasePercent: 18.2,
      isWithinAutoApplyThresholds: false,
    },
  })
  comparison: object | null;

  @ApiProperty({
    description: 'Describes the warnings field.',
    type: [String], example: []
  })
  warnings: string[];
}

export class RouteEstimateResponseDto {
  @ApiProperty({
    description: 'Describes the estimated distance km field.',
    example: 54.3
  })
  estimatedDistanceKm: number;

  @ApiProperty({
    description: 'Describes the estimated duration minutes field.',
    example: 78
  })
  estimatedDurationMinutes: number;

  @ApiProperty({
    description: 'Describes the geometry field.',
    type: RouteGeometryResponseDto,
    example: {
      type: 'LineString',
      coordinates: [
        [35.2544, 32.2211],
        [35.2401, 32.1802],
        [35.2137, 31.7683],
      ],
    },
  })
  geometry: RouteGeometryResponseDto;

  @ApiProperty({
    description: 'Describes the metadata field.',
    type: RouteMetadataResponseDto,
    example: {
      method: RouteEstimationMethod.OPENROUTE_ROUTING,
      appliedConstraints: [
        RouteConstraintType.AVOID_CHECKPOINTS,
        RouteConstraintType.AVOID_INCIDENTS,
      ],
      factors: [
        {
          type: RouteFactorType.CHECKPOINT_AVOIDANCE,
          description: 'Avoiding checkpoints changed the selected route path.',
          impactDistanceKm: 2.4,
          impactDurationMinutes: 6,
        },
      ],
      compliance: {
        isFullyCompliant: false,
        requestedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
        satisfiedConstraints: [],
        unsatisfiedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
        constraintResults: [
          {
            constraint: RouteConstraintType.AVOID_CHECKPOINTS,
            requested: true,
            satisfied: false,
            intersectedGroupCount: 1,
            intersectedZoneCount: 3,
            intersectedSegmentCount: 2,
            pointsInsideZoneCount: 5,
          },
        ],
      },
      warnings: [],
    },
  })
  metadata: RouteMetadataResponseDto;

  @ApiProperty({
    description: 'Describes the default route field.',
    type: RouteOptionResponseDto,
    example: {
      kind: RouteOptionKind.DEFAULT,
      estimatedDistanceKm: 54.3,
      estimatedDurationMinutes: 78,
      geometry: {
        type: 'LineString',
        coordinates: [
          [35.2544, 32.2211],
          [35.2401, 32.1802],
          [35.2137, 31.7683],
        ],
      },
      metadata: {
        method: RouteEstimationMethod.OPENROUTE_ROUTING,
        appliedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
        factors: [],
        compliance: {
          isFullyCompliant: true,
          requestedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
          satisfiedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
          unsatisfiedConstraints: [],
          constraintResults: [
            {
              constraint: RouteConstraintType.AVOID_CHECKPOINTS,
              requested: true,
              satisfied: true,
              intersectedGroupCount: 0,
              intersectedZoneCount: 0,
              intersectedSegmentCount: 0,
              pointsInsideZoneCount: 0,
            },
          ],
        },
        warnings: [],
      },
    },
  })
  defaultRoute: RouteOptionResponseDto;

  @ApiProperty({
    description: 'Describes the avoided route field.',
    oneOf: [
      { $ref: getSchemaPath(RouteOptionResponseDto) },
      { enum: [null] },
    ],
    example: {
      kind: RouteOptionKind.AVOIDED,
      estimatedDistanceKm: 56.65,
      estimatedDurationMinutes: 84,
      geometry: {
        type: 'LineString',
        coordinates: [
          [35.2544, 32.2211],
          [35.2301, 32.1502],
          [35.2137, 31.7683],
        ],
      },
      metadata: {
        method: RouteEstimationMethod.OPENROUTE_ROUTING,
        appliedConstraints: [
          RouteConstraintType.AVOID_CHECKPOINTS,
          RouteConstraintType.AVOID_INCIDENTS,
        ],
        factors: [
          {
            type: RouteFactorType.CHECKPOINT_AVOIDANCE,
            description: 'Avoiding checkpoints changed the selected route path.',
            impactDistanceKm: 2.35,
            impactDurationMinutes: 6,
          },
        ],
        compliance: {
          isFullyCompliant: true,
          requestedConstraints: [
            RouteConstraintType.AVOID_CHECKPOINTS,
            RouteConstraintType.AVOID_INCIDENTS,
          ],
          satisfiedConstraints: [
            RouteConstraintType.AVOID_CHECKPOINTS,
            RouteConstraintType.AVOID_INCIDENTS,
          ],
          unsatisfiedConstraints: [],
          constraintResults: [
            {
              constraint: RouteConstraintType.AVOID_CHECKPOINTS,
              requested: true,
              satisfied: true,
              intersectedGroupCount: 0,
              intersectedZoneCount: 0,
              intersectedSegmentCount: 0,
              pointsInsideZoneCount: 0,
            },
            {
              constraint: RouteConstraintType.AVOID_INCIDENTS,
              requested: true,
              satisfied: true,
              intersectedGroupCount: 0,
              intersectedZoneCount: 0,
              intersectedSegmentCount: 0,
              pointsInsideZoneCount: 0,
            },
          ],
        },
        warnings: [],
      },
    },
  })
  avoidedRoute: object | null;

  @ApiProperty({
    description: 'Describes the primary route field.',
    type: RouteOptionResponseDto,
    example: {
      kind: RouteOptionKind.AVOIDED,
      estimatedDistanceKm: 56.65,
      estimatedDurationMinutes: 84,
      geometry: {
        type: 'LineString',
        coordinates: [
          [35.2544, 32.2211],
          [35.2301, 32.1502],
          [35.2137, 31.7683],
        ],
      },
      metadata: {
        method: RouteEstimationMethod.OPENROUTE_ROUTING,
        appliedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
        factors: [
          {
            type: RouteFactorType.CHECKPOINT_AVOIDANCE,
            description: 'Avoiding checkpoints changed the selected route path.',
            impactDistanceKm: 2.35,
            impactDurationMinutes: 6,
          },
        ],
        compliance: {
          isFullyCompliant: false,
          requestedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
          satisfiedConstraints: [],
          unsatisfiedConstraints: [RouteConstraintType.AVOID_CHECKPOINTS],
          constraintResults: [
            {
              constraint: RouteConstraintType.AVOID_CHECKPOINTS,
              requested: true,
              satisfied: false,
              intersectedGroupCount: 1,
              intersectedZoneCount: 3,
              intersectedSegmentCount: 2,
              pointsInsideZoneCount: 5,
            },
          ],
        },
        warnings: [],
      },
    },
  })
  primaryRoute: RouteOptionResponseDto;

  @ApiProperty({
    description: 'Describes the suggested route field.',
    oneOf: [
      { $ref: getSchemaPath(RouteOptionResponseDto) },
      { enum: [null] },
    ],
    example: null,
  })
  suggestedRoute: object | null;

  @ApiProperty({
    description: 'Describes the recommendation field.',
    type: RouteRecommendationResponseDto,
    example: {
      primaryRouteKind: RouteOptionKind.AVOIDED,
      suggestedRouteKind: RouteOptionKind.AVOIDED,
      requiresUserApproval: true,
      autoApplied: false,
      reason: RouteRecommendationReason.AVOIDED_ROUTE_REQUIRES_CONFIRMATION,
      message:
        'An avoided route is available, but it adds 2.35 km and 6 min compared with the default route. Review it on the map and confirm if you want to switch.',
      comparison: {
        distanceIncreaseKm: 2.35,
        distanceIncreasePercent: 14.6,
        durationIncreaseMinutes: 6,
        durationIncreasePercent: 18.2,
        isWithinAutoApplyThresholds: false,
      },
      warnings: [],
    },
  })
  recommendation: RouteRecommendationResponseDto;
}
