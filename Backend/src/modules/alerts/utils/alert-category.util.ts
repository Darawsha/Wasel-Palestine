import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { IncidentType } from '../../incidents/enums/incident-type.enum';
import { ReportCategory } from '../../reports/enums/report-category.enum';

const REPORT_CATEGORIES_BY_INCIDENT_TYPE: Partial<
  Record<IncidentType, ReportCategory[]>
> = {
  [IncidentType.CLOSURE]: [
    ReportCategory.ROAD_CLOSURE,
    ReportCategory.CHECKPOINT_ISSUE,
  ],
  [IncidentType.DELAY]: [
    ReportCategory.DELAY,
    ReportCategory.CHECKPOINT_ISSUE,
  ],
  [IncidentType.ACCIDENT]: [ReportCategory.ACCIDENT],
  [IncidentType.WEATHER_HAZARD]: [ReportCategory.HAZARD],
};

const CHECKPOINT_STATUSES_BY_INCIDENT_TYPE: Partial<
  Record<IncidentType, CheckpointStatus[]>
> = {
  [IncidentType.CLOSURE]: [CheckpointStatus.CLOSED],
  [IncidentType.DELAY]: [CheckpointStatus.DELAYED],
};

export function normalizeIncidentCategory(value: string): IncidentType {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase() as IncidentType;
}

export function getReportCategoriesForIncidentTypes(
  categories: IncidentType[],
): ReportCategory[] {
  return Array.from(
    new Set(
      categories.flatMap(
        (category) => REPORT_CATEGORIES_BY_INCIDENT_TYPE[category] ?? [],
      ),
    ),
  );
}

export function getCheckpointStatusesForIncidentTypes(
  categories: IncidentType[],
): CheckpointStatus[] {
  return Array.from(
    new Set(
      categories.flatMap(
        (category) => CHECKPOINT_STATUSES_BY_INCIDENT_TYPE[category] ?? [],
      ),
    ),
  );
}

export function matchesCheckpointCategory(
  category: IncidentType,
  checkpointStatus: CheckpointStatus,
): boolean {
  return (
    CHECKPOINT_STATUSES_BY_INCIDENT_TYPE[category]?.includes(checkpointStatus) ??
    false
  );
}

export function matchesReportCategory(
  category: IncidentType,
  reportCategory: ReportCategory,
): boolean {
  return REPORT_CATEGORIES_BY_INCIDENT_TYPE[category]?.includes(reportCategory) ?? false;
}

export function formatIncidentCategoryLabel(category: IncidentType): string {
  switch (category) {
    case IncidentType.CLOSURE:
      return 'Road Closure';
    case IncidentType.DELAY:
      return 'Delay';
    case IncidentType.ACCIDENT:
      return 'Accident';
    case IncidentType.WEATHER_HAZARD:
      return 'Weather Hazard';
    default:
      return String(category || '').trim();
  }
}

export function formatCheckpointStatusLabel(status: CheckpointStatus): string {
  switch (status) {
    case CheckpointStatus.OPEN:
      return 'Open';
    case CheckpointStatus.CLOSED:
      return 'Closed';
    case CheckpointStatus.DELAYED:
      return 'Delayed';
    case CheckpointStatus.RESTRICTED:
      return 'Restricted';
    default:
      return String(status || '').trim();
  }
}
