import { apiGet, apiPost, apiRequest } from '/Services/api-client.js';

let previewAlertPreferenceSequence = 800000;
const previewAlertPreferences = [];

function isCitizenPreviewActive() {
  return window.CitizenPreview?.isActive?.() === true;
}

function nowIsoString() {
  return new Date().toISOString();
}

function normalizePreferenceId(id) {
  const normalizedId = String(id || '').trim();

  if (!normalizedId) {
    throw new Error('A valid alert preference id is required.');
  }

  return normalizedId;
}

function normalizeCategory(category) {
  return String(category || '').trim().toUpperCase();
}

function createPreviewPreference(payload = {}) {
  const preference = {
    id: String(++previewAlertPreferenceSequence),
    geographicArea: String(payload.geographicArea || '').trim(),
    incidentCategory: normalizeCategory(payload.incidentCategory),
    createdAt: nowIsoString(),
    updatedAt: nowIsoString(),
    previewOnly: true,
  };

  previewAlertPreferences.unshift(preference);
  return preference;
}

function buildPreviewOverview() {
  const groupsByLocation = new Map();

  previewAlertPreferences.forEach((preference) => {
    const location = preference.geographicArea || 'Preview location';
    const key = location.toLowerCase();
    const group =
      groupsByLocation.get(key) ||
      {
        key,
        location,
        preferenceIds: [],
        categories: [],
        subscribedSince: preference.createdAt,
        currentMatches: [],
        matchCount: 0,
        previewOnly: true,
      };

    group.preferenceIds.push(preference.id);
    group.categories.push({
      key: preference.incidentCategory,
      preferenceId: preference.id,
    });

    if (new Date(preference.createdAt) < new Date(group.subscribedSince)) {
      group.subscribedSince = preference.createdAt;
    }

    groupsByLocation.set(key, group);
  });

  return Array.from(groupsByLocation.values());
}

export function getAlertPreferences() {
  if (isCitizenPreviewActive()) {
    return Promise.resolve([...previewAlertPreferences]);
  }

  return apiGet('/alerts/preferences');
}

export function getAlertPreferencesOverview() {
  if (isCitizenPreviewActive()) {
    return Promise.resolve(buildPreviewOverview());
  }

  return apiGet('/alerts/preferences/overview');
}

export function getAlertsUnreadCount() {
  if (isCitizenPreviewActive()) {
    return Promise.resolve({
      unreadCount: 0,
      lastAlertsViewedAt: null,
      previewOnly: true,
    });
  }

  return apiGet('/alerts/unread-count');
}

export function markAlertsViewed() {
  if (isCitizenPreviewActive()) {
    return Promise.resolve({
      unreadCount: 0,
      lastAlertsViewedAt: nowIsoString(),
      previewOnly: true,
    });
  }

  return apiRequest('/alerts/viewed', {
    method: 'PATCH',
    data: {},
  });
}

export function getAlertInbox() {
  if (isCitizenPreviewActive()) {
    return Promise.resolve([]);
  }

  return apiGet('/alerts/inbox');
}

export function createAlertPreference(payload) {
  if (isCitizenPreviewActive()) {
    return Promise.resolve(createPreviewPreference(payload));
  }

  return apiPost('/alerts/preferences', payload);
}

export function createAlertPreferencesBatch(payload) {
  if (isCitizenPreviewActive()) {
    const categories = Array.isArray(payload?.incidentCategories)
      ? payload.incidentCategories
      : [];
    const preferences = categories.map((incidentCategory) =>
      createPreviewPreference({
        geographicArea: payload?.geographicArea,
        incidentCategory,
      }),
    );

    return Promise.resolve(preferences);
  }

  return apiPost('/alerts/preferences/batch', payload);
}

export function deleteAlertPreference(id) {
  const preferenceId = normalizePreferenceId(id);

  if (isCitizenPreviewActive()) {
    const index = previewAlertPreferences.findIndex(
      (preference) => preference.id === preferenceId,
    );

    if (index >= 0) {
      previewAlertPreferences.splice(index, 1);
    }

    return Promise.resolve({
      deleted: true,
      id: preferenceId,
      previewOnly: true,
    });
  }

  return apiRequest(`/alerts/preferences/${encodeURIComponent(preferenceId)}`, {
    method: 'DELETE',
  });
}

export function markAlertAsRead(id) {
  const recordId = normalizePreferenceId(id);

  if (isCitizenPreviewActive()) {
    return Promise.resolve({
      id: recordId,
      read: true,
      previewOnly: true,
    });
  }

  return apiRequest(`/alerts/inbox/${encodeURIComponent(recordId)}/read`, {
    method: 'PATCH',
  });
}
