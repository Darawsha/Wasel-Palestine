import {
  getCheckpointsCount,
  getCitizensCount,
  getCitizensRegistrationTrend,
  getIncidentsCount,
  getIncidentsCreatedTodayCount,
  getIncidentsTimeline,
  getUserRegistrationBuckets,
} from '/Services/admin_dashboard.service.js';

export function countCitizens() {
  return getCitizensCount();
}

export function countIncidents() {
  return getIncidentsCount();
}

export function countIncidentsCreatedToday() {
  return getIncidentsCreatedTodayCount();
}

export function countCheckpoints() {
  return getCheckpointsCount();
}

export function getUserRegistrationTrend(days = 7) {
  return getCitizensRegistrationTrend(days);
}

export function getIncidentTimeline(days = 30) {
  return getIncidentsTimeline(days);
}

export function getDashboardUserRegistrationBuckets(months = 6) {
  return getUserRegistrationBuckets(months);
}
