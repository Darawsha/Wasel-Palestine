import { sleep } from 'k6';
import { getMapIncidents } from '../clients/map.js';
import { getCommunityReports } from '../clients/reports.js';
import { estimateRoute } from '../clients/routes.js';
import { buildRouteEstimatePayload } from '../data/payloads.js';
import { expectStatus } from '../helpers/checks.js';

export function runSpike(token) {
  expectStatus(getCommunityReports(token, 1, 10), 200, 'GET /reports/community');
  expectStatus(getMapIncidents(token), 200, 'GET /map/incidents');
  expectStatus(
    estimateRoute(token, buildRouteEstimatePayload()),
    201,
    'POST /routes/estimate',
  );

  sleep(Number(__ENV.SPIKE_SLEEP || 0.2));
}
