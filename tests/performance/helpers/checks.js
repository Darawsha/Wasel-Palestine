import { check } from 'k6';

export function expectStatus(res, expectedStatus, label) {
  return check(res, {
    [`${label} status ${expectedStatus}`]:
      (response) => response.status === expectedStatus,
  });
}

export function expectAnyStatus(res, expectedStatuses, label) {
  return check(res, {
    [`${label} status allowed`]:
      (response) => expectedStatuses.includes(response.status),
  });
}
