import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteAvoidanceZoneGroup } from '../interfaces/route-avoidance-zone-group.interface';
import { RouteComplianceSummary } from '../interfaces/route-compliance-summary.interface';
import { buildRouteAvoidanceScore } from './route-avoidance-evaluator.util';

type ZoneGroupsByConstraint = Partial<
  Record<RouteConstraintType, RouteAvoidanceZoneGroup[]>
>;

export type IntersectedRouteAvoidanceGroup = {
  constraint: RouteConstraintType;
  group: RouteAvoidanceZoneGroup;
  intersectedZoneCount: number;
  intersectedSegmentCount: number;
  pointsInsideZoneCount: number;
};

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function buildRouteComplianceSummary(
  coordinates: number[][],
  requestedConstraints: RouteConstraintType[],
  zoneGroupsByConstraint: ZoneGroupsByConstraint,
): RouteComplianceSummary {
  const uniqueConstraints = [...new Set(requestedConstraints)];
  const constraintResults = uniqueConstraints.map((constraint) => {
    const groups = zoneGroupsByConstraint[constraint] ?? [];
    const groupScores = groups.map((group) =>
      buildRouteAvoidanceScore(coordinates, group.zones),
    );
    const intersectedGroupCount = groupScores.filter(
      (score) => score.intersectedZoneCount > 0,
    ).length;

    return {
      constraint,
      requested: true,
      satisfied: intersectedGroupCount === 0,
      intersectedGroupCount,
      intersectedZoneCount: sum(
        groupScores.map((score) => score.intersectedZoneCount),
      ),
      intersectedSegmentCount: sum(
        groupScores.map((score) => score.intersectedSegmentCount),
      ),
      pointsInsideZoneCount: sum(
        groupScores.map((score) => score.pointsInsideZoneCount),
      ),
    };
  });

  const satisfiedConstraints = constraintResults
    .filter((result) => result.satisfied)
    .map((result) => result.constraint);
  const unsatisfiedConstraints = constraintResults
    .filter((result) => !result.satisfied)
    .map((result) => result.constraint);

  return {
    isFullyCompliant: unsatisfiedConstraints.length === 0,
    requestedConstraints: uniqueConstraints,
    satisfiedConstraints,
    unsatisfiedConstraints,
    constraintResults,
  };
}

export function compareRouteComplianceSummaries(
  left: RouteComplianceSummary,
  right: RouteComplianceSummary,
): number {
  if (
    left.unsatisfiedConstraints.length !== right.unsatisfiedConstraints.length
  ) {
    return left.unsatisfiedConstraints.length - right.unsatisfiedConstraints.length;
  }

  const leftGroupCount = sum(
    left.constraintResults.map((result) => result.intersectedGroupCount),
  );
  const rightGroupCount = sum(
    right.constraintResults.map((result) => result.intersectedGroupCount),
  );

  if (leftGroupCount !== rightGroupCount) {
    return leftGroupCount - rightGroupCount;
  }

  const leftZoneCount = sum(
    left.constraintResults.map((result) => result.intersectedZoneCount),
  );
  const rightZoneCount = sum(
    right.constraintResults.map((result) => result.intersectedZoneCount),
  );

  if (leftZoneCount !== rightZoneCount) {
    return leftZoneCount - rightZoneCount;
  }

  const leftSegmentCount = sum(
    left.constraintResults.map((result) => result.intersectedSegmentCount),
  );
  const rightSegmentCount = sum(
    right.constraintResults.map((result) => result.intersectedSegmentCount),
  );

  if (leftSegmentCount !== rightSegmentCount) {
    return leftSegmentCount - rightSegmentCount;
  }

  const leftPointCount = sum(
    left.constraintResults.map((result) => result.pointsInsideZoneCount),
  );
  const rightPointCount = sum(
    right.constraintResults.map((result) => result.pointsInsideZoneCount),
  );

  if (leftPointCount !== rightPointCount) {
    return leftPointCount - rightPointCount;
  }

  return 0;
}

export function collectIntersectedRouteAvoidanceGroups(
  coordinates: number[][],
  requestedConstraints: RouteConstraintType[],
  zoneGroupsByConstraint: ZoneGroupsByConstraint,
): IntersectedRouteAvoidanceGroup[] {
  const uniqueConstraints = [...new Set(requestedConstraints)];

  return uniqueConstraints
    .flatMap((constraint) => {
      const groups = zoneGroupsByConstraint[constraint] ?? [];

      return groups
        .map((group) => {
          const score = buildRouteAvoidanceScore(coordinates, group.zones);

          if (score.intersectedZoneCount === 0) {
            return null;
          }

          return {
            constraint,
            group,
            intersectedZoneCount: score.intersectedZoneCount,
            intersectedSegmentCount: score.intersectedSegmentCount,
            pointsInsideZoneCount: score.pointsInsideZoneCount,
          };
        })
        .filter(
          (value): value is IntersectedRouteAvoidanceGroup => value !== null,
        );
    })
    .sort((left, right) => {
      if (left.intersectedZoneCount !== right.intersectedZoneCount) {
        return right.intersectedZoneCount - left.intersectedZoneCount;
      }

      if (left.intersectedSegmentCount !== right.intersectedSegmentCount) {
        return right.intersectedSegmentCount - left.intersectedSegmentCount;
      }

      if (left.pointsInsideZoneCount !== right.pointsInsideZoneCount) {
        return right.pointsInsideZoneCount - left.pointsInsideZoneCount;
      }

      return left.group.sourceLabel.localeCompare(right.group.sourceLabel);
    });
}
