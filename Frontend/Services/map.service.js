import { apiGet } from '/Services/api-client.js';

function buildMapQueryParams(filters = {}) {
  const types = Array.isArray(filters.types) ? filters.types.filter(Boolean) : [];

  return {
    types: types.length > 0 ? types.join(',') : undefined,
    severity: filters.severity || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  };
}

async function fetchMapIncidents(params) {
  const response = await apiGet('/map/incidents', { params });
  return Array.isArray(response?.data) ? response.data : [];
}

async function fetchMapCheckpoints(params) {
  const response = await apiGet('/map/checkpoints', { params });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function fetchFilteredMapData(filters = {}, options = {}) {
  const includeCheckpoints = options.includeCheckpoints !== false;

  const params = buildMapQueryParams(filters);

  if (!includeCheckpoints) {
    const incidents = await fetchMapIncidents(params);

    return {
      incidents,
      checkpoints: [],
    };
  }

  const [incidents, checkpoints] = await Promise.all([
    fetchMapIncidents(params),
    fetchMapCheckpoints(params),
  ]);

  return {
    incidents,
    checkpoints,
  };
}
