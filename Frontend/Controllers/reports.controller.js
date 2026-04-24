import {
  approveReport,
  createReport,
  deleteMyReport,
  getCommunityReportHistory,
  getCommunityReportsPage,
  getReportSimilarReports,
  getReportDetails,
  getMyReportsPage,
  getReportsPage,
  markReportUnderReview,
  rejectReport,
  updateMyReport,
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
  open: {
    label: 'Open',
    className: 'open',
    group: 'verified',
  },
  delayed: {
    label: 'Delayed',
    className: 'delay',
    group: 'pending',
  },
  delay: {
    label: 'Delay',
    className: 'delay',
    group: 'pending',
  },
  closed: {
    label: 'Closed',
    className: 'closed',
    group: 'verified',
  },
  restricted: {
    label: 'Restricted',
    className: 'restricted',
    group: 'pending',
  },
};

const CATEGORY_PRESENTATION = {
  checkpoint_issue: {
    label: 'Checkpoint Issue',
    icon: 'flag',
    badgeClass: 'category-badge-yellow',
    stateClass: 'state-restricted',
  },
  road_closure: {
    label: 'Road Closure',
    icon: 'block',
    badgeClass: 'category-badge-red',
    stateClass: 'state-closed',
  },
  delay: {
    label: 'Delay',
    icon: 'schedule',
    badgeClass: 'category-badge-yellow',
    stateClass: 'state-delay',
  },
  accident: {
    label: 'Accident',
    icon: 'car_crash',
    badgeClass: 'category-badge-orange',
    stateClass: 'state-restricted',
  },
  hazard: {
    label: 'Weather Hazard',
    icon: 'warning',
    badgeClass: 'category-badge-blue',
    stateClass: 'state-neutral',
  },
  other: {
    label: 'Other',
    icon: 'report',
    badgeClass: 'category-badge-slate',
    stateClass: 'state-neutral',
  },
  open: {
    label: 'Open',
    icon: 'check_circle',
    badgeClass: 'category-badge-green',
    stateClass: 'state-open',
  },
  closed: {
    label: 'Closed',
    icon: 'block',
    badgeClass: 'category-badge-red',
    stateClass: 'state-closed',
  },
  restricted: {
    label: 'Restricted',
    icon: 'rule',
    badgeClass: 'category-badge-amber',
    stateClass: 'state-restricted',
  },
};

const DEFAULT_DUPLICATE_MESSAGE =
  'A similar report was added recently with the same information. Your report was recorded in My Reports but was not published as a separate community report.';

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

function getStatePresentation(report, category) {
  const stateKeys = [
    report?.state,
    report?.impactStatus,
    report?.category,
    report?.status,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  const matchedState = stateKeys
    .map((stateKey) => STATE_PRESENTATION[stateKey])
    .find(Boolean);

  if (matchedState) {
    return matchedState;
  }

  return {
    label: category.label,
    className: category.stateClass || 'state-neutral',
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
  const upVotes = Math.max(Number(summary.upVotes) || 0, 0);
  const downVotes = Math.max(Number(summary.downVotes) || 0, 0);

  return {
    upVotes,
    downVotes,
    totalVotes: Math.max(Number(summary.totalVotes) || 0, upVotes + downVotes),
    confirmations: Math.max(Number(summary.confirmations) || 0, 0),
    userVoteType: summary.userVoteType || null,
    isConfirmedByCurrentUser: Boolean(summary.isConfirmedByCurrentUser),
  };
}

function normalizeModerationSummary(summary = {}) {
  const latestAction = escapeFallback(summary.latestAction).toLowerCase();
  const latestNotes = escapeFallback(summary.latestNotes);
  const latestActionAt = summary?.latestActionAt || null;

  return {
    latestAction: latestAction || null,
    latestNotes: latestNotes || null,
    latestActionAt,
    latestActionAtLabel: latestActionAt ? formatAbsoluteDate(latestActionAt) : null,
  };
}

function normalizeReport(report = {}) {
  const category = getCategoryPresentation(report.category);
  const status = getStatusPresentation(report.status);
  const state = getStatePresentation(report, category);
  const confidenceScore = Math.max(Number(report.confidenceScore) || 0, 0);
  const reporterName = getReporterName(
    report.submittedByUser,
    report.submittedByUserId,
  );
  const interactionSummary = normalizeInteractionSummary(report.interactionSummary);
  const normalizedStatus = escapeFallback(report.status, 'pending').toLowerCase();
  const isOwnReport = Boolean(report.isOwnReport);
  const canManage =
    typeof report.canManage === 'boolean'
      ? report.canManage
      : isOwnReport && !['approved', 'resolved'].includes(normalizedStatus);
  const duplicateOf = report.duplicateOf ? Number(report.duplicateOf) : null;
  const isDuplicate = Boolean(duplicateOf);

  return {
    id: Number(report.reportId),
    reportId: Number(report.reportId),
    category: report.category,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    categoryBadgeClass: category.badgeClass,
    title: category.label,
    stateLabel: state.label,
    stateClass: state.className,
    description: escapeFallback(report.description, 'No description provided.'),
    location: escapeFallback(report.location, 'Unknown location'),
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    status: normalizedStatus,
    statusLabel: status.label,
    statusClass: status.className,
    statusGroup: status.group,
    confidenceScore,
    confidenceLabel: `${confidenceScore}% confidence`,
    confidenceToneClass: confidenceScore < 40 ? 'low' : '',
    isPubliclyVisible: Boolean(report.isPubliclyVisible),
    isOwnReport,
    canManage,
    canVote: Boolean(report.canVote),
    duplicateOf,
    isDuplicate,
    duplicateMessage:
      escapeFallback(report.duplicateMessage) ||
      (isDuplicate ? DEFAULT_DUPLICATE_MESSAGE : ''),
    relativeTime: formatRelativeTime(report.createdAt),
    createdAtLabel: formatAbsoluteDate(report.createdAt),
    updatedAtLabel: formatAbsoluteDate(report.updatedAt),
    reporterName,
    reporterInitials: getInitials(reporterName),
    reporterEmail: escapeFallback(report?.submittedByUser?.email),
    interactionSummary,
    totalVotes: interactionSummary.totalVotes,
    communitySignalTotal: interactionSummary.totalVotes,
    moderationSummary: normalizeModerationSummary(report.moderationSummary),
  };
}

function normalizeTabCounts(rawCounts = {}) {
  const hasDirectBuckets =
    rawCounts &&
    typeof rawCounts === 'object' &&
    Object.prototype.hasOwnProperty.call(rawCounts, 'all') &&
    Object.prototype.hasOwnProperty.call(rawCounts, 'pending') &&
    Object.prototype.hasOwnProperty.call(rawCounts, 'verified') &&
    Object.prototype.hasOwnProperty.call(rawCounts, 'rejected');

  if (hasDirectBuckets) {
    return {
      all: Math.max(Number(rawCounts.all) || 0, 0),
      pending: Math.max(Number(rawCounts.pending) || 0, 0),
      verified: Math.max(Number(rawCounts.verified) || 0, 0),
      rejected: Math.max(Number(rawCounts.rejected) || 0, 0),
    };
  }

  const counts = {
    all: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  };

  Object.entries(rawCounts).forEach(([status, count]) => {
    if (['all', 'pending', 'verified', 'rejected'].includes(status)) {
      return;
    }

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
    canVote: Boolean(response.canVote),
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

export async function loadCommunityReportHistory(reportId) {
  const response = await getCommunityReportHistory(reportId);
  const history = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  return {
    data: history.map(normalizeReport),
    meta:
      response && typeof response.meta === 'object' && response.meta !== null
        ? response.meta
        : {
            reportId: Number(reportId),
            historyCount: history.length,
          },
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
    groupByLocation: true,
    sort: params.sort || 'createdAt',
    sortOrder: params.sortOrder || 'DESC',
  });

  return {
    data: response.data.map(normalizeReport),
    meta: response.meta,
    counts: normalizeTabCounts(response.counts),
  };
}

export async function loadSimilarReports(reportId) {
  const response = await getReportSimilarReports(reportId);
  const reports = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  return {
    data: reports.map(normalizeReport),
    meta:
      response && typeof response.meta === 'object' && response.meta !== null
        ? response.meta
        : {
            reportId: Number(reportId),
            total: reports.length,
            similarReportsCount: Math.max(reports.length - 1, 0),
          },
  };
}

export async function submitCitizenReport(payload) {
  const response = await createReport(payload);
  return normalizeReport(response);
}

export async function loadReportDetails(reportId) {
  const response = await getReportDetails(reportId);
  return normalizeReport(response);
}

export async function updateCitizenReport(reportId, payload) {
  const response = await updateMyReport(reportId, payload);
  return normalizeReport(response);
}

export function deleteCitizenReport(reportId) {
  return deleteMyReport(reportId);
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

export async function voteCommunityReport(reportId, type) {
  const normalizedType = String(type || '').trim().toUpperCase();
  const response = await voteOnReport(
    reportId,
    normalizedType === 'DOWN' ? 'DOWN' : 'UP',
  );
  return normalizeInteractionResponse(response);
}
