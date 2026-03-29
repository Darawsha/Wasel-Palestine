import { apiGet, apiPost } from '/Services/api-client.js';

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function buildUsersPageFallback(page = 1, limit = 10) {
  const normalizedPage = normalizePositiveInteger(page, 1);
  const normalizedLimit = normalizePositiveInteger(limit, 10);

  return {
    data: [],
    meta: {
      total: 0,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages: 0,
    },
  };
}

function normalizeUsersPageResponse(response, page = 1, limit = 10) {
  const fallback = buildUsersPageFallback(page, limit);
  const data = Array.isArray(response?.data) ? response.data : fallback.data;
  const total = Number(response?.meta?.total);
  const currentPage = Number(response?.meta?.page);
  const currentLimit = Number(response?.meta?.limit);
  const totalPages = Number(response?.meta?.totalPages);

  return {
    data,
    meta: {
      total: Number.isFinite(total) && total >= 0 ? total : fallback.meta.total,
      page:
        Number.isFinite(currentPage) && currentPage > 0
          ? currentPage
          : fallback.meta.page,
      limit:
        Number.isFinite(currentLimit) && currentLimit > 0
          ? currentLimit
          : fallback.meta.limit,
      totalPages:
        Number.isFinite(totalPages) && totalPages >= 0
          ? totalPages
          : fallback.meta.totalPages,
    },
  };
}

export async function getCitizensPage(params = {}) {
  const page = normalizePositiveInteger(params.page, 1);
  const limit = normalizePositiveInteger(params.limit, 10);

  try {
    const response = await apiGet('/users/citizens', {
      params: {
        page,
        limit,
      },
    });

    return normalizeUsersPageResponse(response, page, limit);
  } catch (error) {
    console.error('Failed to fetch citizens page', error);
    return buildUsersPageFallback(page, limit);
  }
}

export function createUser(payload) {
  return apiPost('/users', payload);
}
