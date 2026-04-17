import { apiRequest } from '/Services/api-client.js';

export function createIncident(payload) {
  return apiRequest(`/incidents/create`, {
    method: 'POST',
    data: payload,
  });
}

export function updateIncident(id, payload) {
  return apiRequest(`/incidents/${id}`, {
    method: 'PATCH',
    data: payload,
  });
}

export function deleteIncident(id) {
  return apiRequest(`/incidents/${id}`, {
    method: 'DELETE',
  });
}

export function getIncidentHistory(id) {
  return apiRequest(`/incidents/${id}/history`, {
    method: 'GET',
  });
}
