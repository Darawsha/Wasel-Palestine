import {
  createIncident,
  updateIncident,
  deleteIncident,
} from '/Services/incidentActions.service.js';

export function createNewIncident(payload) {
  return createIncident(payload);
}

export function updateExistingIncident(incidentId, payload) {
  return updateIncident(incidentId, payload);
}

export function deleteExistingIncident(incidentId) {
  return deleteIncident(incidentId);
}
