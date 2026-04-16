import { sleep } from 'k6';
import { getMapCheckpoints, getMapIncidents, getMapReports } from '../clients/map.js';
import { getCommunityReports, getMyReports } from '../clients/reports.js';
import { estimateRoute } from '../clients/routes.js';
import { buildRouteEstimatePayload } from '../data/payloads.js';
import { expectStatus } from '../helpers/checks.js';

export function runReadHeavy(token) {
  expectStatus(getCommunityReports(token, 1, 10), 200, 'GET /reports/community');
  expectStatus(getMyReports(token, 1, 10), 200, 'GET /reports/my');
  expectStatus(getMapIncidents(token), 200, 'GET /map/incidents');
  expectStatus(getMapCheckpoints(token), 200, 'GET /map/checkpoints');
  expectStatus(getMapReports(token), 200, 'GET /map/reports');
  expectStatus(
    estimateRoute(token, buildRouteEstimatePayload()),
    201,
    'POST /routes/estimate',
  );

  sleep(Number(__ENV.READ_SLEEP || 1));
}
