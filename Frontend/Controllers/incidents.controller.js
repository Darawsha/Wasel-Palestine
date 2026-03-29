import {getIncidentsPage} from '/Services/incidents.service.js';

export function loadIncidentsPage(params = {}) {
  return getIncidentsPage(params);
}

