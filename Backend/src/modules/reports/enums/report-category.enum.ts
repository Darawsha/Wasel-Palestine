export enum ReportCategory {
  CHECKPOINT_ISSUE = 'checkpoint_issue',
  ROAD_CLOSURE = 'road_closure',
  DELAY = 'delay',
  ACCIDENT = 'accident',
  HAZARD = 'hazard',
  OTHER = 'other',
}

export const EFFECTIVE_REPORT_CATEGORIES: ReadonlyArray<ReportCategory> = [
  ReportCategory.ROAD_CLOSURE,
  ReportCategory.DELAY,
  ReportCategory.ACCIDENT,
  ReportCategory.HAZARD,
  ReportCategory.OTHER,
];
