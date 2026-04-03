import {
  getActiveIncidents,
  getIncidentDetails,
  getIncidentsPage,
} from '/Services/incidents.service.js';

export function loadIncidentsPage(params = {}) {
  return getIncidentsPage(params);
}

export async function loadIncidentsForMap() {
  const incidents = await getActiveIncidents();

  return incidents
    .map((incident) => ({
      ...incident,
      latitude: Number(incident?.latitude),
      longitude: Number(incident?.longitude),
    }))
    .filter(
      (incident) =>
        Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude),
    );
}

export function loadIncidentDetails(incidentId) {
  return getIncidentDetails(incidentId);
}

export function getIncidentDetailsById(incidentId) {
  return loadIncidentDetails(incidentId);
}

export class IncidentsController {
  static loadIncidentsPage(params = {}) {
    return loadIncidentsPage(params);
  }

  static loadIncidentsForMap() {
    return loadIncidentsForMap();
  }

  static loadIncidentDetails(incidentId) {
    return loadIncidentDetails(incidentId);
  }
}

if (typeof window !== 'undefined') {
  window.IncidentsController = IncidentsController;
}

export default IncidentsController;
