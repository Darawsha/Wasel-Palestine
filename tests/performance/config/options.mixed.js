import { baseThresholds } from './thresholds.js';

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    mixed_load: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.MIXED_RATE || 8),
      timeUnit: '1s',
      duration: __ENV.MIXED_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.MIXED_PRE_VUS || 20),
      maxVUs: Number(__ENV.MIXED_MAX_VUS || 50),
    },
  },
  thresholds: baseThresholds,
};
