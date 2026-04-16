import { baseThresholds } from './thresholds.js';

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    soak_long_run: {
      executor: 'constant-vus',
      vus: Number(__ENV.SOAK_VUS || 6),
      duration: __ENV.SOAK_DURATION || '20m',
      gracefulStop: '30s',
    },
  },
  thresholds: baseThresholds,
};
