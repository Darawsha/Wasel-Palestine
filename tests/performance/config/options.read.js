import { strictReadThresholds } from './thresholds.js';

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    read_heavy: {
      executor: 'ramping-vus', // number of VUs "virtual users" changes over time
      startVUs: 0,
      stages: [
        { duration: __ENV.READ_STAGE1 || '30s', target: Number(__ENV.READ_VUS || 20) },// i can enter from cmd using env vars like: --env READ_STAGE1=1m --env READ_VUS=50
        { duration: __ENV.READ_STAGE2 || '1m', target: Number(__ENV.READ_VUS || 20) },
        { duration: __ENV.READ_STAGE3 || '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: strictReadThresholds,
};
