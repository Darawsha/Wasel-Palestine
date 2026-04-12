import { apiGet, apiRequest } from '/Services/api-client.js';

const PAGE_SIZE = 10;

const CATEGORY_LABELS = {
  CLOSURE: 'Closure',
  DELAY: 'Delay',
  ACCIDENT: 'Accident',
  WEATHER: 'Weather',
  OTHER: 'Other',
};

function normalizePositiveInteger(value, fallbackValue) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0
    ? Math.floor(normalized)
    : fallbackValue;
}

function formatCategory(category) {
  const normalized = String(category || '').trim().toUpperCase();
  return CATEGORY_LABELS[normalized] || (normalized ? normalized.charAt(0) + normalized.slice(1).toLowerCase() : 'Other');
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return '--';
  }

  const createdAt = new Date(timestamp).getTime();
  const diffMinutes = Math.max(0, Math.round((Date.now() - createdAt) / 60000));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function buildUserLabel(report) {
  return `user_${report.submittedByUserId || 'unknown'}`;
}

function normalizeReport(report) {
  const confidenceScore = Number(report?.confidenceScore) || 0;
  const duplicateOf = Number(report?.duplicateOf) || 0;

  return {
    id: Number(report?.reportId) || 0,
    category: String(report?.category || '').toUpperCase(),
    categoryLabel: formatCategory(report?.category),
    location: String(report?.location || '').trim(),
    description: String(report?.description || '').trim(),
    submittedBy: buildUserLabel(report || {}),
    submittedByUserId: Number(report?.submittedByUserId) || 0,
    timeAgo: formatRelativeTime(report?.createdAt),
    score: confidenceScore.toFixed(1),
    scoreValue: confidenceScore,
    duplicateOf,
    hasFlags: duplicateOf > 0 || confidenceScore < 2.5,
    status: String(report?.status || 'PENDING').toUpperCase(),
  };
}

function buildMeta(response, page = 1, limit = PAGE_SIZE) {
  const total = Number(response?.total);
  const currentPage = Number(response?.page);
  const currentLimit = Number(response?.limit);
  const totalPages = Number(response?.totalPages);

  return {
    total: Number.isFinite(total) ? total : 0,
    page: Number.isFinite(currentPage) ? currentPage : page,
    limit: Number.isFinite(currentLimit) ? currentLimit : limit,
    totalPages: Number.isFinite(totalPages) ? totalPages : 1,
  };
}

export async function getModerationQueuePage(params = {}) {
  const requestPage = normalizePositiveInteger(params.page, 1);
  const requestLimit = normalizePositiveInteger(params.limit, PAGE_SIZE);
  const sort = params.sort === 'confidenceScore' ? 'confidenceScore' : 'createdAt';
  const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  try {
    const response = await apiGet('/reports', {
      params: {
        page: requestPage,
        limit: requestLimit,
        status: params.status || 'PENDING',
        category: params.category || undefined,
        location: params.search || undefined,
        sort,
        sortOrder,
      },
    });

    return {
      data: Array.isArray(response?.data) ? response.data.map((report) => normalizeReport(report)) : [],
      meta: buildMeta(response, requestPage, requestLimit),
    };
  } catch (error) {
    console.error('Failed to fetch moderation queue page', error);
    return {
      data: [],
      meta: buildMeta(null, requestPage, requestLimit),
    };
  }
}

export async function moderateReport(reportId, action, notes = '') {
  const normalizedId = Number(reportId);
  const normalizedAction = String(action || '').trim().toLowerCase();

  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw new Error('A valid report id is required.');
  }

  if (!['review', 'approve', 'reject', 'resolve'].includes(normalizedAction)) {
    throw new Error('A valid moderation action is required.');
  }

  return apiRequest(`/reports/${normalizedId}/${normalizedAction}`, {
    method: 'PATCH',
    data: notes ? { notes } : {},
  });
}

export { PAGE_SIZE };
