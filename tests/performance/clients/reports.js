import http from 'k6/http';
import { apiUrl } from '../config/env.js';
import { withBearerToken } from '../helpers/headers.js';

export function getMyReports(token, page = 1, limit = 10) {
  return http.get(
    apiUrl(`/reports/my?page=${page}&limit=${limit}`),
    withBearerToken(token),
  );
}

export function getCommunityReports(token, page = 1, limit = 10) {
  return http.get(
    apiUrl(`/reports/community?page=${page}&limit=${limit}`),
    withBearerToken(token),
  );
}

export function getReportById(token, reportId) {
  return http.get(apiUrl(`/reports/${reportId}`), withBearerToken(token));
}

export function createReport(token, payload, extraParams = {}) {
  const params = {
    ...withBearerToken(token),
    ...extraParams,
  };
  params.responseType = 'text';

  return http.post(
    apiUrl('/reports/create'),
    JSON.stringify(payload),
    params,
  );
}

export function updateMyReport(token, reportId, payload) {
  return http.patch(
    apiUrl(`/reports/my/${reportId}`),
    JSON.stringify(payload),
    withBearerToken(token),
  );
}

export function deleteMyReport(token, reportId) {
  return http.del(apiUrl(`/reports/my/${reportId}`), null, withBearerToken(token));
}
