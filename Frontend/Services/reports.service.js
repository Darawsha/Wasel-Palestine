import { apiGet, apiRequest } from '/Services/api-client.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
let previewReportSequence = 900000;
const previewReports = [];
const previewReportVotes = new Map();

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function buildMeta(response = {}, requestPage = DEFAULT_PAGE, requestLimit = DEFAULT_LIMIT) {
  const source = response?.meta || response || {};
  const total = Math.max(Number(source.total) || 0, 0);
  const limit = normalizePositiveInteger(source.limit, requestLimit);
  const totalPages =
    total > 0
      ? Math.max(Number(source.totalPages) || 0, Math.ceil(total / limit))
      : 0;

  return {
    total,
    page:
      totalPages > 0
        ? Math.min(normalizePositiveInteger(source.page, requestPage), totalPages)
        : requestPage,
    limit,
    totalPages,
  };
}

function buildPagePayload(response, requestPage, requestLimit) {
  return {
    data: Array.isArray(response?.data) ? response.data : [],
    meta: buildMeta(response, requestPage, requestLimit),
    counts:
      response && typeof response.counts === 'object' && response.counts !== null
        ? response.counts
        : {},
  };
}

function isCitizenPreviewActive() {
  return window.CitizenPreview?.isActive?.() === true;
}

function nowIsoString() {
  return new Date().toISOString();
}

function normalizePreviewStatuses(params = {}) {
  if (Array.isArray(params.statuses) && params.statuses.length > 0) {
    return params.statuses.map((status) => String(status).toLowerCase());
  }

  if (params.status) {
    return [String(params.status).toLowerCase()];
  }

  return [];
}

function buildPreviewCounts(reports = []) {
  return reports.reduce(
    (counts, report) => {
      const status = String(report.status || '').toLowerCase();
      counts.all += 1;

      if (status === 'pending' || status === 'under_review') {
        counts.pending += 1;
      } else if (status === 'approved' || status === 'resolved') {
        counts.verified += 1;
      } else if (status === 'rejected') {
        counts.rejected += 1;
      }

      return counts;
    },
    {
      all: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
    },
  );
}

function paginatePreviewReports(reports = [], params = {}) {
  const requestPage = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const requestLimit = normalizePositiveInteger(params.limit, DEFAULT_LIMIT);
  const total = reports.length;
  const totalPages = total > 0 ? Math.ceil(total / requestLimit) : 0;
  const page = totalPages > 0 ? Math.min(requestPage, totalPages) : requestPage;
  const start = (page - 1) * requestLimit;

  return {
    data: reports.slice(start, start + requestLimit),
    meta: {
      total,
      page,
      limit: requestLimit,
      totalPages,
    },
    counts: buildPreviewCounts(reports),
  };
}

function buildPreviewInteractionSummary(reportId) {
  const voteType = previewReportVotes.get(Number(reportId)) || null;

  return {
    upVotes: voteType === 'UP' ? 1 : 0,
    downVotes: voteType === 'DOWN' ? 1 : 0,
    totalVotes: voteType ? 1 : 0,
    confirmations: 0,
    userVoteType: voteType,
    isConfirmedByCurrentUser: false,
  };
}

function buildPreviewReport(payload = {}, overrides = {}) {
  const timestamp = nowIsoString();
  const reportId =
    Number(overrides.reportId) > 0 ? Number(overrides.reportId) : ++previewReportSequence;

  return {
    reportId,
    category: payload.category || overrides.category || 'other',
    location: payload.location || overrides.location || 'Preview location',
    description:
      payload.description ||
      overrides.description ||
      'Preview-only report. This record was not saved.',
    latitude: Number(payload.latitude ?? overrides.latitude ?? 0),
    longitude: Number(payload.longitude ?? overrides.longitude ?? 0),
    status: overrides.status || 'pending',
    confidenceScore: Math.max(Number(overrides.confidenceScore) || 0, 0),
    submittedByUser: null,
    submittedByUserId: null,
    duplicateOf: null,
    isPubliclyVisible: false,
    isOwnReport: true,
    canManage: true,
    canVote: false,
    interactionSummary: buildPreviewInteractionSummary(reportId),
    moderationSummary: {
      latestAction: null,
      latestNotes: null,
      latestActionAt: null,
    },
    createdAt: overrides.createdAt || timestamp,
    updatedAt: overrides.updatedAt || timestamp,
    previewOnly: true,
  };
}

function findPreviewReport(reportId) {
  const normalizedReportId = Number(reportId);
  return previewReports.find(
    (report) => Number(report.reportId) === normalizedReportId,
  );
}

function getPreviewMyReportsPage(params = {}) {
  const statuses = normalizePreviewStatuses(params);
  const filteredReports =
    statuses.length > 0
      ? previewReports.filter((report) =>
          statuses.includes(String(report.status || '').toLowerCase()),
        )
      : [...previewReports];

  return Promise.resolve(paginatePreviewReports(filteredReports, params));
}

function normalizePreviewCommunityReport(report = {}) {
  const reportId = Number(report.reportId || report.id);
  const interactionSummary = buildPreviewInteractionSummary(reportId);

  return {
    reportId,
    category: report.category || 'other',
    location: report.location || 'Unknown location',
    description: report.description || 'No description provided.',
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    status: report.status || 'approved',
    confidenceScore: Math.max(Number(report.confidenceScore) || 0, 0),
    submittedByUser: null,
    submittedByUserId: null,
    duplicateOf: report.duplicateOf || null,
    isPubliclyVisible: true,
    isOwnReport: false,
    canManage: false,
    canVote: !interactionSummary.userVoteType,
    interactionSummary,
    moderationSummary: {
      latestAction: null,
      latestNotes: null,
      latestActionAt: null,
    },
    createdAt: report.createdAt || nowIsoString(),
    updatedAt: report.updatedAt || report.createdAt || nowIsoString(),
    previewOnly: true,
  };
}

async function getPreviewCommunityReportsPage(params = {}) {
  const response = await apiGet('/map/reports');
  const reports = Array.isArray(response?.data)
    ? response.data.map(normalizePreviewCommunityReport)
    : [];

  return paginatePreviewReports(reports, params);
}

async function loadReportsPage(path, params = {}) {
  const requestPage = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const requestLimit = normalizePositiveInteger(params.limit, DEFAULT_LIMIT);

  try {
    const response = await apiGet(path, {
      params: {
        page: requestPage,
        limit: requestLimit,
        status: params.status || undefined,
        statuses:
          Array.isArray(params.statuses) && params.statuses.length > 0
            ? params.statuses.join(',')
            : undefined,
        category: params.category || undefined,
        location: params.location || undefined,
        search: params.search || undefined,
        minConfidence:
          typeof params.minConfidence === 'number'
            ? params.minConfidence
            : undefined,
        sort: params.sort || undefined,
        sortOrder: params.sortOrder || undefined,
        submittedByUserId: params.submittedByUserId || undefined,
        excludeSubmittedByUserId: params.excludeSubmittedByUserId || undefined,
        duplicateOnly:
          params.duplicateOnly !== undefined && params.duplicateOnly !== null
            ? String(params.duplicateOnly)
            : undefined,
        latitude:
          typeof params.latitude === 'number' ? params.latitude : undefined,
        longitude:
          typeof params.longitude === 'number' ? params.longitude : undefined,
        radiusKm:
          typeof params.radiusKm === 'number' ? params.radiusKm : undefined,
      },
    });

    return buildPagePayload(response, requestPage, requestLimit);
  } catch (error) {
    console.error(`Failed to fetch reports page for ${path}`, error);
    throw error;
  }
}

export function getReportsPage(params = {}) {
  return loadReportsPage('/reports', params);
}

export function getMyReportsPage(params = {}) {
  if (isCitizenPreviewActive()) {
    return getPreviewMyReportsPage(params);
  }

  return loadReportsPage('/reports/my', params);
}

export function getCommunityReportsPage(params = {}) {
  if (isCitizenPreviewActive()) {
    return getPreviewCommunityReportsPage(params);
  }

  return loadReportsPage('/reports/community', params);
}

export function getReportDetails(reportId) {
  if (isCitizenPreviewActive()) {
    const previewReport = findPreviewReport(reportId);
    if (previewReport) {
      return Promise.resolve(previewReport);
    }

    return apiGet('/map/reports').then((response) => {
      const report = Array.isArray(response?.data)
        ? response.data.find(
            (item) => Number(item.reportId || item.id) === Number(reportId),
          )
        : null;

      if (!report) {
        throw new Error('Report not found.');
      }

      return normalizePreviewCommunityReport(report);
    });
  }

  return apiGet(`/reports/${reportId}`);
}

export function createReport(payload) {
  if (isCitizenPreviewActive()) {
    const report = buildPreviewReport(payload);
    previewReports.unshift(report);
    return Promise.resolve(report);
  }

  return apiRequest('/reports/create', {
    method: 'POST',
    data: payload,
  });
}

export function updateMyReport(reportId, payload) {
  if (isCitizenPreviewActive()) {
    const existingReport = findPreviewReport(reportId);

    if (!existingReport) {
      throw new Error('Preview report not found.');
    }

    Object.assign(existingReport, payload, {
      updatedAt: nowIsoString(),
    });

    return Promise.resolve(existingReport);
  }

  return apiRequest(`/reports/my/${reportId}`, {
    method: 'PATCH',
    data: payload,
  });
}

export function deleteMyReport(reportId) {
  if (isCitizenPreviewActive()) {
    const index = previewReports.findIndex(
      (report) => Number(report.reportId) === Number(reportId),
    );

    if (index >= 0) {
      previewReports.splice(index, 1);
    }

    return Promise.resolve({
      deleted: true,
      reportId: Number(reportId),
      previewOnly: true,
    });
  }

  return apiRequest(`/reports/my/${reportId}`, {
    method: 'DELETE',
  });
}

export function approveReport(reportId, payload = {}) {
  return apiRequest(`/reports/${reportId}/approve`, {
    method: 'PATCH',
    data: payload,
  });
}

export function rejectReport(reportId, payload = {}) {
  return apiRequest(`/reports/${reportId}/reject`, {
    method: 'PATCH',
    data: payload,
  });
}

export function markReportUnderReview(reportId, payload = {}) {
  return apiRequest(`/reports/${reportId}/review`, {
    method: 'PATCH',
    data: payload,
  });
}

export function confirmReport(reportId) {
  if (isCitizenPreviewActive()) {
    return Promise.resolve({
      reportId: Number(reportId),
      confidenceScore: 0,
      interactionSummary: {
        ...buildPreviewInteractionSummary(reportId),
        confirmations: 1,
        isConfirmedByCurrentUser: true,
      },
      canVote: false,
      previewOnly: true,
    });
  }

  return apiRequest(`/reports/${reportId}/confirm`, {
    method: 'POST',
    data: {},
  });
}

export function voteOnReport(reportId, type = 'UP') {
  if (isCitizenPreviewActive()) {
    const normalizedType = String(type || '').trim().toUpperCase() === 'DOWN'
      ? 'DOWN'
      : 'UP';

    previewReportVotes.set(Number(reportId), normalizedType);

    return Promise.resolve({
      reportId: Number(reportId),
      confidenceScore: normalizedType === 'UP' ? 50 : 0,
      interactionSummary: buildPreviewInteractionSummary(reportId),
      canVote: false,
      previewOnly: true,
    });
  }

  return apiRequest(`/reports/${reportId}/vote`, {
    method: 'POST',
    data: { type },
  });
}
