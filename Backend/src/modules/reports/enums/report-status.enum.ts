export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESOLVED = 'resolved',
}

export const PUBLIC_COMMUNITY_REPORT_STATUSES: ReadonlyArray<ReportStatus> = [
  ReportStatus.PENDING,
  ReportStatus.UNDER_REVIEW,
  ReportStatus.APPROVED,
];

export const COMMUNITY_INTERACTIVE_REPORT_STATUSES =
  PUBLIC_COMMUNITY_REPORT_STATUSES;
