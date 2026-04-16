import { baseThresholds } from './thresholds.js';

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    spike_traffic: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.SPIKE_START_RATE || 2),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.SPIKE_PRE_VUS || 100),
      maxVUs: Number(__ENV.SPIKE_MAX_VUS || 300),
      stages: [
        { target: Number(__ENV.SPIKE_TARGET_RATE || 50), duration: __ENV.SPIKE_UP || '30s' },
        { target: Number(__ENV.SPIKE_TARGET_RATE || 50), duration: __ENV.SPIKE_HOLD || '50s' },
        { target: 0, duration: __ENV.SPIKE_DOWN || '20s' },
      ],
    },
  },
  thresholds: baseThresholds,
};
