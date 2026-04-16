import http from 'k6/http';
import { apiUrl } from '../config/env.js';
import { withBearerToken } from '../helpers/headers.js';

export function estimateRoute(token, payload) {
  return http.post(
    apiUrl('/routes/estimate'),
    JSON.stringify(payload),
    withBearerToken(token),
  );
}
