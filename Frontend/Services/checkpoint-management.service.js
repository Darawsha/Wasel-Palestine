import { apiGet, apiRequest } from '/Services/api-client.js';

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

/**
 * Fetches a paginated list of checkpoints.
 */
export async function getCheckpointsPage(params = {}) {
  const requestPage = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const requestLimit = normalizePositiveInteger(params.limit, DEFAULT_LIMIT);

  try {
    const response = await apiGet('/checkpoints', {
      params: {
        page: requestPage,
        limit: requestLimit,
        status: params.status || undefined,
        search: params.search || undefined,
      },
    });

    return {
      data: Array.isArray(response?.data) ? response.data : [],
      meta: buildMeta(response?.meta, requestPage, requestLimit),
    };
  } catch (err) {
    console.error('Failed to fetch checkpoints page', err);
    return {
      data: [],
      meta: buildMeta({}, requestPage, requestLimit),
    };
  }
}

/**
 * Fetches a single checkpoint by ID.
 */
export async function getCheckpointById(id) {
  return apiGet(`/checkpoints/${id}`);
}

/**
 * Deletes a checkpoint.
 */
export async function deleteExistingCheckpoint(id) {
  return apiRequest(`/checkpoints/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Updates a checkpoint.
 */
export async function updateExistingCheckpoint(id, payload) {
  return apiRequest(`/checkpoints/${id}`, {
    method: 'PATCH',
    data: payload,
  });
}

/**
 * Creates a new checkpoint.
 */
export async function createNewCheckpoint(payload) {
  return apiRequest(`/checkpoints`, {
    method: 'POST',
    data: payload,
  });
}
