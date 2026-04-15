import { apiGet, apiPost, apiRequest } from '/Services/api-client.js';

function normalizePreferenceId(id) {
  const normalizedId = String(id || '').trim();

  if (!normalizedId) {
    throw new Error('A valid alert preference id is required.');
  }

  return normalizedId;
}

export function getAlertPreferences() {
  return apiGet('/alerts/preferences');
}

export function getAlertPreferencesOverview() {
  return apiGet('/alerts/preferences/overview');
}

export function getAlertInbox() {
  return apiGet('/alerts/inbox');
}

export function createAlertPreference(payload) {
  return apiPost('/alerts/preferences', payload);
}

export function createAlertPreferencesBatch(payload) {
  return apiPost('/alerts/preferences/batch', payload);
}

export function deleteAlertPreference(id) {
  const preferenceId = normalizePreferenceId(id);

  return apiRequest(`/alerts/preferences/${encodeURIComponent(preferenceId)}`, {
    method: 'DELETE',
  });
}

export function markAlertAsRead(id) {
  const recordId = normalizePreferenceId(id);

  return apiRequest(`/alerts/inbox/${encodeURIComponent(recordId)}/read`, {
    method: 'PATCH',
  });
}
