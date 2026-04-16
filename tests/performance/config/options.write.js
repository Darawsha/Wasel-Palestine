import { baseThresholds } from './thresholds.js';

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    write_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.WRITE_STAGE1 || '30s', target: Number(__ENV.WRITE_VUS || 8) },
        { duration: __ENV.WRITE_STAGE2 || '1m', target: Number(__ENV.WRITE_VUS || 8) },
        { duration: __ENV.WRITE_STAGE3 || '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: baseThresholds,
};
