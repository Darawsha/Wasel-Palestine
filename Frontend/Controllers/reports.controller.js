import {
  approveReport,
  confirmReport,
  createReport,
  getCommunityReportsPage,
  getMyReportsPage,
  getReportsPage,
  markReportUnderReview,
  rejectReport,
  voteOnReport,
} from '/Services/reports.service.js';

export const REPORT_TAB_GROUPS = {
  all: [],
  pending: ['pending', 'under_review'],
  verified: ['approved', 'resolved'],
  rejected: ['rejected'],
};

const STATUS_PRESENTATION = {
  pending: {
    label: 'Pending',
    className: 'pending',
    group: 'pending',
  },
  under_review: {
    label: 'Under Review',
    className: 'pending',
    group: 'pending',
  },
  approved: {
    label: 'Verified',
    className: 'verified',
    group: 'verified',
  },
  resolved: {
    label: 'Resolved',
    className: 'verified',
    group: 'verified',
  },
  rejected: {
    label: 'Rejected',
    className: 'rejected',
    group: 'rejected',
  },
};

const CATEGORY_PRESENTATION = {
  checkpoint_issue: {
    label: 'Checkpoint Issue',
    icon: 'flag',
    badgeClass: 'category-badge-yellow',
  },
  road_closure: {
    label: 'Road Closure',
    icon: 'block',
    badgeClass: 'category-badge-red',
  },
  delay: {
    label: 'Delay',
    icon: 'schedule',
    badgeClass: 'category-badge-amber',
  },
  accident: {
    label: 'Accident',
    icon: 'car_crash',
    badgeClass: 'category-badge-orange',
  },
  hazard: {
    label: 'Hazard',
    icon: 'warning',
    badgeClass: 'category-badge-blue',
  },
  other: {
    label: 'Other',
    icon: 'report',
    badgeClass: 'category-badge-slate',
  },
};

function escapeFallback(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function formatRelativeTime(dateValue) {
  if (!dateValue) return 'Unknown time';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  const deltaMs = Date.now() - date.getTime();
  const deltaMinutes = Math.max(Math.floor(deltaMs / 60000), 0);

  if (deltaMinutes < 1) return 'Just now';
  if (deltaMinutes < 60) {
    return `${deltaMinutes} minute${deltaMinutes === 1 ? '' : 's'} ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
}

function formatAbsoluteDate(dateValue) {
  if (!dateValue) return 'Unknown date';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getCategoryPresentation(category) {
  return CATEGORY_PRESENTATION[String(category || '').trim().toLowerCase()] || CATEGORY_PRESENTATION.other;
}

function getStatusPresentation(status) {
  return STATUS_PRESENTATION[String(status || '').trim().toLowerCase()] || {
    label: 'Unknown',
    className: 'pending',
    group: 'pending',
  };
}

function getReporterName(user, fallbackUserId) {
  const firstname = escapeFallback(user?.firstname);
  const lastname = escapeFallback(user?.lastname);
  const fullName = `${firstname} ${lastname}`.trim();

  if (fullName) {
    return fullName;
  }

  if (escapeFallback(user?.email)) {
    return user.email;
  }

  if (fallbackUserId) {
    return `Citizen #${fallbackUserId}`;
  }

  return 'Community member';
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'CM';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

function normalizeInteractionSummary(summary = {}) {
  return {
    upVotes: Math.max(Number(summary.upVotes) || 0, 0),
    downVotes: Math.max(Number(summary.downVotes) || 0, 0),
    confirmations: Math.max(Number(summary.confirmations) || 0, 0),
    userVoteType: summary.userVoteType || null,
    isConfirmedByCurrentUser: Boolean(summary.isConfirmedByCurrentUser),
  };
}

function normalizeReport(report = {}) {
  const category = getCategoryPresentation(report.category);
  const status = getStatusPresentation(report.status);
  const confidenceScore = Math.max(Number(report.confidenceScore) || 0, 0);
  const reporterName = getReporterName(
    report.submittedByUser,
    report.submittedByUserId,
  );

  return {
    id: Number(report.reportId),
    reportId: Number(report.reportId),
    category: report.category,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    categoryBadgeClass: category.badgeClass,
    title: category.label,
    description: escapeFallback(report.description, 'No description provided.'),
    location: escapeFallback(report.location, 'Unknown location'),
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    status: escapeFallback(report.status, 'pending').toLowerCase(),
    statusLabel: status.label,
    statusClass: status.className,
    statusGroup: status.group,
    confidenceScore,
    confidenceLabel: `${confidenceScore}% confidence`,
    confidenceToneClass: confidenceScore < 40 ? 'low' : '',
    duplicateOf: report.duplicateOf ? Number(report.duplicateOf) : null,
    isDuplicate: Boolean(report.duplicateOf),
    relativeTime: formatRelativeTime(report.updatedAt || report.createdAt),
    createdAtLabel: formatAbsoluteDate(report.createdAt),
    updatedAtLabel: formatAbsoluteDate(report.updatedAt),
    reporterName,
    reporterInitials: getInitials(reporterName),
    reporterEmail: escapeFallback(report?.submittedByUser?.email),
    interactionSummary: normalizeInteractionSummary(report.interactionSummary),
  };
}

function normalizeTabCounts(rawCounts = {}) {
  const counts = {
    all: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  };

  Object.entries(rawCounts).forEach(([status, count]) => {
    const numericCount = Math.max(Number(count) || 0, 0);
    counts.all += numericCount;

    if (REPORT_TAB_GROUPS.pending.includes(status)) {
      counts.pending += numericCount;
      return;
    }

    if (REPORT_TAB_GROUPS.verified.includes(status)) {
      counts.verified += numericCount;
      return;
    }

    if (REPORT_TAB_GROUPS.rejected.includes(status)) {
      counts.rejected += numericCount;
    }
  });

  return counts;
}

function normalizeInteractionResponse(response = {}) {
  return {
    reportId: Number(response.reportId),
    confidenceScore: Math.max(Number(response.confidenceScore) || 0, 0),
    interactionSummary: normalizeInteractionSummary(response.interactionSummary),
  };
}

export function buildMyReportsQuery(params = {}) {
  const normalizedTab = REPORT_TAB_GROUPS[params.tab] ? params.tab : 'all';
  const groupedStatuses = REPORT_TAB_GROUPS[normalizedTab];

  return {
    page: params.page || 1,
    limit: params.limit || 4,
    statuses: groupedStatuses.length > 0 ? groupedStatuses : undefined,
    sort: params.sort || 'createdAt',
    sortOrder: params.sortOrder || 'DESC',
  };
}

export async function loadMyReportsPage(params = {}) {
  const response = await getMyReportsPage(buildMyReportsQuery(params));

  return {
    data: response.data.map(normalizeReport),
    meta: response.meta,
    counts: normalizeTabCounts(response.counts),
  };
}

export async function loadCommunityReportsPage(params = {}) {
  const response = await getCommunityReportsPage({
    page: params.page || 1,
    limit: params.limit || 4,
    sort: params.sort || 'createdAt',
    sortOrder: params.sortOrder || 'DESC',
    latitude: params.latitude,
    longitude: params.longitude,
    radiusKm: params.radiusKm,
  });

  return {
    data: response.data.map(normalizeReport),
    meta: response.meta,
    counts: normalizeTabCounts(response.counts),
  };
}

export async function loadModerationQueuePage(params = {}) {
  const moderationStatuses =
    Array.isArray(params.statuses) && params.statuses.length > 0
      ? params.statuses
      : params.status
        ? [params.status]
        : ['pending', 'under_review'];

  const response = await getReportsPage({
    page: params.page || 1,
    limit: params.limit || 10,
    statuses: moderationStatuses,
    category: params.category || undefined,
    search: params.search || undefined,
    duplicateOnly:
      params.duplicateOnly === true ? true : undefined,
    sort: params.sort || 'createdAt',
    sortOrder: params.sortOrder || 'DESC',
  });

  return {
    data: response.data.map(normalizeReport),
    meta: response.meta,
    counts: normalizeTabCounts(response.counts),
  };
}

export async function submitCitizenReport(payload) {
  const response = await createReport(payload);
  return normalizeReport(response);
}

export async function approveModerationReport(reportId, notes) {
  const response = await approveReport(reportId, { notes });
  return normalizeReport(response);
}

export async function rejectModerationReport(reportId, notes) {
  const response = await rejectReport(reportId, { notes });
  return normalizeReport(response);
}

export async function startModerationReview(reportId, notes) {
  const response = await markReportUnderReview(reportId, { notes });
  return normalizeReport(response);
}

export async function confirmCommunityReport(reportId) {
  const response = await confirmReport(reportId);
  return normalizeInteractionResponse(response);
}

export async function supportCommunityReport(reportId) {
  const response = await voteOnReport(reportId, 'UP');
  return normalizeInteractionResponse(response);
}
