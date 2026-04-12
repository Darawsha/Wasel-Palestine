import { apiGet, apiRequest } from '/Services/api-client.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

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
  return loadReportsPage('/reports/my', params);
}

export function getCommunityReportsPage(params = {}) {
  return loadReportsPage('/reports/community', params);
}

export function createReport(payload) {
  return apiRequest('/reports/create', {
    method: 'POST',
    data: payload,
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
  return apiRequest(`/reports/${reportId}/confirm`, {
    method: 'POST',
    data: {},
  });
}

export function voteOnReport(reportId, type = 'UP') {
  return apiRequest(`/reports/${reportId}/vote`, {
    method: 'POST',
    data: { type },
  });
}
