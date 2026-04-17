import { apiGet } from '/Services/api-client.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function buildMeta(meta = {}, requestPage = DEFAULT_PAGE, requestLimit = DEFAULT_LIMIT) {
  const total = Math.max(Number(meta.total) || 0, 0);
  const limit = normalizePositiveInteger(meta.limit, requestLimit);
  const totalPages =
    total > 0
      ? Math.max(Number(meta.totalPages) || 0, Math.ceil(total / limit))
      : 0;

  return {
    total,
    page:
      totalPages > 0
        ? Math.min(normalizePositiveInteger(meta.page, requestPage), totalPages)
        : requestPage,
    limit,
    totalPages,
  };
}

export async function getAuditLogPage(params = {}) {
  const requestPage = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const requestLimit = normalizePositiveInteger(params.limit, DEFAULT_LIMIT);

  const response = await apiGet('/audit-log', {
    params: {
      page: requestPage,
      limit: requestLimit,
      action: params.action || undefined,
      targetType: params.targetType || undefined,
      performedByUserId: params.performedByUserId || undefined,
      search: params.search || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
    },
  });

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    meta: buildMeta(response?.meta, requestPage, requestLimit),
  };
}

export async function getAuditActors() {
  const response = await apiGet('/audit-log/actors');
  return Array.isArray(response?.data) ? response.data : [];
}
