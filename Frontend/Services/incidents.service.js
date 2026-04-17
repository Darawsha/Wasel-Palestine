import { apiGet } from '/Services/api-client.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function isCitizenPreviewActive() {
  return window.CitizenPreview?.isActive?.() === true;
}

function normalizeUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function getIncidentSearchText(incident = {}) {
  return [
    incident.title,
    incident.description,
    incident.location,
    incident.type,
    incident.severity,
    incident.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getSortableValue(incident = {}, sortBy = 'createdAt') {
  if (sortBy === 'title') {
    return String(incident.title || '').toLowerCase();
  }

  const dateValue = incident[sortBy] || incident.createdAt || incident.updatedAt;
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function filterPreviewIncidents(incidents, params = {}) {
  const search = String(params.search || '').trim().toLowerCase();
  const status = normalizeUpper(params.status);
  const isVerified =
    typeof params.isVerified === 'boolean' ? params.isVerified : undefined;

  return incidents.filter((incident) => {
    if (status && normalizeUpper(incident.status) !== status) {
      return false;
    }

    if (
      typeof isVerified === 'boolean' &&
      Boolean(incident.isVerified) !== isVerified
    ) {
      return false;
    }

    if (search && !getIncidentSearchText(incident).includes(search)) {
      return false;
    }

    return true;
  });
}

function sortPreviewIncidents(incidents, params = {}) {
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = normalizeUpper(params.sortOrder) === 'ASC' ? 'ASC' : 'DESC';
  const direction = sortOrder === 'ASC' ? 1 : -1;

  return [...incidents].sort((first, second) => {
    const firstValue = getSortableValue(first, sortBy);
    const secondValue = getSortableValue(second, sortBy);

    if (firstValue < secondValue) return -1 * direction;
    if (firstValue > secondValue) return 1 * direction;
    return 0;
  });
}

async function getPreviewIncidents(params = {}) {
  const response = await apiGet('/map/incidents', {
    params: {
      types: params.type || undefined,
      severity: params.severity || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
    },
  });

  return Array.isArray(response?.data) ? response.data : [];
}

async function getPreviewIncidentsPage(params = {}) {
  const requestPage = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const requestLimit = normalizePositiveInteger(params.limit, DEFAULT_LIMIT);
  const incidents = await getPreviewIncidents(params);
  const filteredIncidents = filterPreviewIncidents(incidents, params);
  const sortedIncidents = sortPreviewIncidents(filteredIncidents, params);
  const total = sortedIncidents.length;
  const totalPages = total > 0 ? Math.ceil(total / requestLimit) : 0;
  const page = totalPages > 0 ? Math.min(requestPage, totalPages) : requestPage;
  const start = (page - 1) * requestLimit;

  return {
    data: sortedIncidents.slice(start, start + requestLimit),
    meta: {
      total,
      page,
      limit: requestLimit,
      totalPages,
    },
  };
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

  if (isCitizenPreviewActive()) {
    return getPreviewIncidentsPage(params);
  }

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

  if (isCitizenPreviewActive()) {
    const incidents = await getPreviewIncidents();
    const incident = incidents.find((item) => Number(item?.id) === incidentId);

    if (!incident) {
      throw new Error('Incident not found.');
    }

    return incident;
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
