import http from 'k6/http';
import { apiUrl } from '../config/env.js';
import { withBearerToken } from '../helpers/headers.js';

export function getMapIncidents(token) {
  return http.get(apiUrl('/map/incidents'), withBearerToken(token));
}

export function getMapCheckpoints(token) {
  return http.get(apiUrl('/map/checkpoints'), withBearerToken(token));
}

export function getMapReports(token) {
  return http.get(apiUrl('/map/reports'), withBearerToken(token));
}
