export const baseThresholds = {
  http_req_failed: ['rate<0.02'],
  http_req_duration: ['p(95)<1200', 'p(99)<2500'],
  checks: ['rate>0.98'],
};

export const strictReadThresholds = {
  ...baseThresholds,
  http_req_duration: ['p(95)<800', 'p(99)<1500'],
};
