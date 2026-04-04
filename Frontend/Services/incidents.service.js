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
    const response = await apiGet('/incidents', {
      params: {
        page: requestPage,
        limit: requestLimit,
        status: params.status || undefined,
        isVerified:
          typeof params.isVerified === 'boolean' ? params.isVerified : undefined,
        severity: params.severity || undefined,
        type: params.type || undefined,
        checkpointId: params.checkpointId || undefined,
        search: params.search || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        sortBy: params.sortBy || undefined,
        sortOrder: params.sortOrder || undefined,
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

export async function getIncidentDetails(id) {
  const incidentId = Number(id);

  if (!Number.isFinite(incidentId) || incidentId <= 0) {
    throw new Error('Invalid incident id.');
  }

  return apiGet(`/incidents/${incidentId}`);
}

export class IncidentsService {
  static getIncidentsPage(params = {}) {
    return getIncidentsPage(params);
  }

  static getIncidentDetails(id) {
    return getIncidentDetails(id);
  }

  static async getActiveIncidents() {
    try {
      const response = await apiGet('/map/incidents');

      if (Array.isArray(response)) {
        return response;
      }

      if (Array.isArray(response?.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return []; 
    }
  }
}

export async function getActiveIncidents() {
  return IncidentsService.getActiveIncidents();
}

export async function fetchIncidentDetails(id) {
  return IncidentsService.getIncidentDetails(id);
}

if (typeof window !== 'undefined') {
  window.IncidentsService = IncidentsService;
}

export default IncidentsService;
