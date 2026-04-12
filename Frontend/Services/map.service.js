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

async function fetchMapReports(params) {
  const response = await apiGet('/map/reports', { params });
  return Array.isArray(response?.data) ? response.data : [];
}

function getSettledArray(result) {
  return result.status === 'fulfilled' && Array.isArray(result.value)
    ? result.value
    : [];
}

export async function fetchFilteredMapData(filters = {}, options = {}) {
  const includeCheckpoints = options.includeCheckpoints !== false;

  const params = buildMapQueryParams(filters);

  if (!includeCheckpoints) {
    const [incidentsResult, reportsResult] = await Promise.allSettled([
      fetchMapIncidents(params),
      fetchMapReports(params),
    ]);

    return {
      incidents: getSettledArray(incidentsResult),
      checkpoints: [],
      reports: getSettledArray(reportsResult),
    };
  }

  const [incidentsResult, checkpointsResult, reportsResult] =
    await Promise.allSettled([
      fetchMapIncidents(params),
      fetchMapCheckpoints(params),
      fetchMapReports(params),
    ]);

  return {
    incidents: getSettledArray(incidentsResult),
    checkpoints: getSettledArray(checkpointsResult),
    reports: getSettledArray(reportsResult),
  };
}
