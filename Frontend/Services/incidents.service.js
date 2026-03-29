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
  const totalPages = total > 0
    ? Math.max(Number(meta.totalPages) || 0, Math.ceil(total / limit))
    : 0;

  return {
    total,
    page: totalPages > 0
      ? Math.min(normalizePositiveInteger(meta.page, requestPage), totalPages)
      : requestPage,
    limit,
    totalPages,
  };
}

export async function getIncidentsPage(params = {}) {
  const requestPage = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const requestLimit = normalizePositiveInteger(params.limit, DEFAULT_LIMIT);

  try {
    const response = await apiGet('/incidents/findAll', {
      params: {
        page: requestPage,
        limit: requestLimit,
        status: params.status || undefined,
        severity: params.severity || undefined,
        type: params.type || undefined,
      },
    });

    return {
      data: Array.isArray(response?.data) ? response.data : [],
      meta: buildMeta(response?.meta, requestPage, requestLimit),
    };
  } catch (err) {
    console.error('Failed to fetch incidents page', err);
    return {
      data: [],
      meta: buildMeta({}, requestPage, requestLimit),
    };
  }
}
