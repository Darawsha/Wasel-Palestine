import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { RouteConstraintCompliance } from './route-constraint-compliance.interface';

export interface RouteComplianceSummary {
  isFullyCompliant: boolean;
  requestedConstraints: RouteConstraintType[];
  satisfiedConstraints: RouteConstraintType[];
  unsatisfiedConstraints: RouteConstraintType[];
  constraintResults: RouteConstraintCompliance[];
}
