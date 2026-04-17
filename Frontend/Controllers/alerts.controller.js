import { isLocationReal } from '/shared/location_validator.js';
import {
  createAlertPreference,
  createAlertPreferencesBatch,
  deleteAlertPreference,
  getAlertPreferencesOverview,
  getAlertsUnreadCount,
  markAlertsViewed,
} from '/Services/alerts.service.js';

export const ALERT_CATEGORY_PRESENTATION = {
  CLOSURE: {
    key: 'CLOSURE',
    label: 'Road Closure',
    badgeClass: 'badge-red',
  },
  DELAY: {
    key: 'DELAY',
    label: 'Delay',
    badgeClass: 'badge-yellow',
  },
  ACCIDENT: {
    key: 'ACCIDENT',
    label: 'Accident',
    badgeClass: 'badge-orange',
  },
  WEATHER_HAZARD: {
    key: 'WEATHER_HAZARD',
    label: 'Weather Hazard',
    badgeClass: 'badge-blue',
  },
};

export const ALERT_CATEGORY_OPTIONS = Object.values(ALERT_CATEGORY_PRESENTATION);

function normalizeText(value, fallback = '') {
  const normalizedValue = String(value ?? fallback).trim();
  return normalizedValue || fallback;
}

function normalizeLocationInput(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function normalizeCategoryKey(value) {
  return normalizeText(value).replace(/\s+/g, '_').toUpperCase();
}

function buildLocationKey(location) {
  return normalizeLocationInput(location).toLowerCase();
}

function formatDateLabel(dateValue) {
  if (!dateValue) {
    return 'Unknown date';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(dateValue) {
  if (!dateValue) {
    return 'Just now';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const deltaMinutes = Math.max(
    Math.floor((Date.now() - date.getTime()) / 60000),
    0,
  );

  if (deltaMinutes < 1) {
    return 'Just now';
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min${deltaMinutes === 1 ? '' : 's'} ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
}

function getCategoryPresentation(category) {
  const normalizedCategory = normalizeCategoryKey(category);

  return (
    ALERT_CATEGORY_PRESENTATION[normalizedCategory] || {
      key: normalizedCategory || 'UNKNOWN',
      label: normalizedCategory || 'Unknown',
      badgeClass: 'badge-blue',
    }
  );
}

function getCategoryIconPresentation(category) {
  const normalizedCategory = normalizeCategoryKey(category);

  switch (normalizedCategory) {
    case 'DELAY':
      return {
        name: 'schedule',
        colorClass: 'text-amber',
      };
    case 'ACCIDENT':
      return {
        name: 'car_crash',
        colorClass: 'text-red',
      };
    case 'WEATHER_HAZARD':
      return {
        name: 'thunderstorm',
        colorClass: 'text-amber',
      };
    default:
      return {
        name: 'block',
        colorClass: 'text-red',
      };
  }
}

async function ensureValidLocation(location) {
  const normalizedLocation = normalizeLocationInput(location);

  if (!normalizedLocation || normalizedLocation.length < 3) {
    throw new Error(
      'Unable to validate this location. Please enter a more specific address.',
    );
  }

  const geocodedLocation = await isLocationReal(normalizedLocation, {
    countryCodes: ['ps'],
  });

  if (!geocodedLocation?.isValid) {
    throw new Error(
      'Unable to validate this location. Please enter a more specific address.',
    );
  }

  return normalizedLocation;
}

function ensureValidCategories(categories) {
  const normalizedCategories = Array.from(
    new Set(
      (Array.isArray(categories) ? categories : [])
        .map(normalizeCategoryKey)
        .filter((category) => Boolean(ALERT_CATEGORY_PRESENTATION[category])),
    ),
  );

  if (normalizedCategories.length === 0) {
    throw new Error('Select at least one incident category.');
  }

  return normalizedCategories;
}

function toTimeValue(dateValue, fallback) {
  const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function normalizePreference(preference = {}) {
  const category = getCategoryPresentation(preference.incidentCategory);
  const createdAt = preference.createdAt || null;
  const preferenceId = normalizeText(preference.id);

  return {
    id: preferenceId,
    geographicArea: normalizeLocationInput(preference.geographicArea || 'Unknown area'),
    incidentCategory: category.key,
    categoryLabel: category.label,
    badgeClass: category.badgeClass,
    createdAt,
    createdAtLabel: formatDateLabel(createdAt),
  };
}

function formatStatusLabel(status) {
  return normalizeText(status)
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getSeverityBadgeClass(severity) {
  const normalizedSeverity = normalizeText(severity).toUpperCase();

  if (normalizedSeverity === 'CRITICAL') return 'badge-critical';
  if (normalizedSeverity === 'HIGH') return 'badge-high';
  if (normalizedSeverity === 'MEDIUM') return 'badge-medium';
  return 'badge-low';
}

function getPriorityBadgePresentation(sourceType, severityKey, statusKey) {
  const normalizedSourceType = normalizeText(sourceType).toLowerCase();
  const normalizedSeverity = normalizeText(severityKey).toUpperCase();
  const normalizedStatus = normalizeText(statusKey).toUpperCase();

  if (normalizedSeverity) {
    return {
      label: normalizedSeverity,
      className: getSeverityBadgeClass(normalizedSeverity),
    };
  }

  if (normalizedSourceType === 'checkpoint') {
    if (normalizedStatus === 'CLOSED') {
      return { label: 'Closed', className: 'badge-critical' };
    }

    if (normalizedStatus === 'DELAYED') {
      return { label: 'Delayed', className: 'badge-high' };
    }

    if (normalizedStatus === 'RESTRICTED') {
      return { label: 'Restricted', className: 'badge-medium' };
    }

    return { label: 'Open', className: 'badge-low' };
  }

  if (normalizedSourceType === 'report') {
    return { label: 'Approved', className: 'badge-approved' };
  }

  return null;
}

function getMatchStatusPresentation(match = {}) {
  const sourceType = normalizeText(match.sourceType).toLowerCase();
  const normalizedStatus = normalizeText(match.statusKey).toUpperCase();

  if (sourceType === 'incident') {
    if (normalizedStatus === 'CLOSED') {
      return {
        label: 'Closed',
        className: 'status-closed',
        icon: 'cancel',
      };
    }

    if (match.isVerified) {
      return {
        label: 'Verified',
        className: 'status-verified',
        icon: 'verified',
      };
    }

    return {
      label: 'Active',
      className: 'status-active',
      icon: '',
    };
  }

  if (sourceType === 'report') {
    return {
      label: 'Approved',
      className: 'status-verified',
      icon: 'verified',
    };
  }

  if (normalizedStatus === 'CLOSED') {
    return {
      label: 'Closed Checkpoint',
      className: 'status-closed',
      icon: 'cancel',
    };
  }

  if (normalizedStatus === 'DELAYED') {
    return {
      label: 'Delayed Checkpoint',
      className: 'status-warning',
      icon: 'schedule',
    };
  }

  if (normalizedStatus === 'RESTRICTED') {
    return {
      label: 'Restricted Checkpoint',
      className: 'status-warning',
      icon: 'warning',
    };
  }

  return {
    label: 'Open Checkpoint',
    className: 'status-active',
    icon: '',
  };
}

function normalizeMatch(match = {}) {
  const category = getCategoryPresentation(match.categoryKey);
  const categoryIcon = getCategoryIconPresentation(category.key);
  const sourceType = normalizeText(match.sourceType || 'incident').toLowerCase();
  const createdAt = match.createdAt || null;
  const sourceRecordId = normalizeText(match.sourceRecordId);
  const severityKey = normalizeText(match.severityKey).toUpperCase();
  const priorityBadge = getPriorityBadgePresentation(
    sourceType,
    severityKey,
    match.statusKey,
  );
  const statusPresentation = getMatchStatusPresentation({
    sourceType,
    statusKey: match.statusKey,
    isVerified: match.isVerified,
  });

  return {
    id: normalizeText(match.id),
    sourceRecordId,
    sourceType: sourceType || 'incident',
    title: normalizeText(match.title, 'Matching mobility update'),
    summary: normalizeText(match.summary, 'A relevant match was found.'),
    location: normalizeLocationInput(match.location || 'Unknown location'),
    categoryKey: category.key,
    categoryLabel: category.label,
    badgeClass: category.badgeClass,
    statusKey: normalizeText(match.statusKey),
    statusLabel: formatStatusLabel(match.statusKey) || 'Unknown',
    severityKey,
    isVerified: Boolean(match.isVerified),
    createdAt,
    createdAtLabel: formatDateLabel(createdAt),
    relativeTimeLabel: formatRelativeTime(createdAt),
    iconName: categoryIcon.name,
    iconColorClass: categoryIcon.colorClass,
    priorityBadgeLabel: priorityBadge?.label || '',
    priorityBadgeClass: priorityBadge?.className || '',
    statusPillLabel: statusPresentation.label,
    statusPillClass: statusPresentation.className,
    statusPillIcon: statusPresentation.icon,
    canViewDetails:
      (sourceType === 'incident' || sourceType === 'report') &&
      Number.isFinite(Number(sourceRecordId)) &&
      Number(sourceRecordId) > 0,
  };
}

function normalizeOverviewSubscription(subscription = {}) {
  const location = normalizeLocationInput(subscription.location || 'Unknown area');
  const categories = Array.isArray(subscription.categories)
    ? subscription.categories.map((category) => {
        const presentation = getCategoryPresentation(category?.key);

        return {
          key: presentation.key,
          label: presentation.label,
          badgeClass: presentation.badgeClass,
          preferenceId: normalizeText(category?.preferenceId),
        };
      })
    : [];
  const matches = Array.isArray(subscription.currentMatches)
    ? subscription.currentMatches.map(normalizeMatch)
    : [];

  return {
    key: normalizeText(subscription.key, buildLocationKey(location)),
    location,
    preferenceIds: Array.from(
      new Set(
        (Array.isArray(subscription.preferenceIds) ? subscription.preferenceIds : [])
          .map((id) => normalizeText(id))
          .filter(Boolean),
      ),
    ),
    categories,
    subscribedSince: subscription.subscribedSince || null,
    subscribedSinceLabel: formatDateLabel(subscription.subscribedSince),
    currentMatches: matches.sort(
      (left, right) => toTimeValue(right.createdAt, 0) - toTimeValue(left.createdAt, 0),
    ),
    matchCount: Number(subscription.matchCount) || matches.length,
  };
}

export function groupAlertPreferences(preferences = []) {
  const groups = new Map();

  preferences
    .map(normalizePreference)
    .filter((preference) => preference.id)
    .forEach((preference) => {
      const groupKey = buildLocationKey(preference.geographicArea);
      const existingGroup = groups.get(groupKey);

      if (!existingGroup) {
        groups.set(groupKey, {
          key: groupKey,
          location: preference.geographicArea,
          preferenceIds: [preference.id],
          categories: [
            {
              key: preference.incidentCategory,
              label: preference.categoryLabel,
              badgeClass: preference.badgeClass,
              preferenceId: preference.id,
            },
          ],
          subscribedSince: preference.createdAt,
          subscribedSinceLabel: preference.createdAtLabel,
          lastCreatedAt: preference.createdAt,
        });
        return;
      }

      existingGroup.preferenceIds.push(preference.id);

      if (
        !existingGroup.categories.some(
          (category) => category.key === preference.incidentCategory,
        )
      ) {
        existingGroup.categories.push({
          key: preference.incidentCategory,
          label: preference.categoryLabel,
          badgeClass: preference.badgeClass,
          preferenceId: preference.id,
        });
      }

      if (
        toTimeValue(preference.createdAt, Number.POSITIVE_INFINITY) <
        toTimeValue(existingGroup.subscribedSince, Number.POSITIVE_INFINITY)
      ) {
        existingGroup.subscribedSince = preference.createdAt;
        existingGroup.subscribedSinceLabel = preference.createdAtLabel;
      }

      if (
        toTimeValue(preference.createdAt, 0) >
        toTimeValue(existingGroup.lastCreatedAt, 0)
      ) {
        existingGroup.lastCreatedAt = preference.createdAt;
      }
    });

  return Array.from(groups.values())
    .map((group) => {
      group.categories.sort((left, right) => left.label.localeCompare(right.label));
      return group;
    })
    .sort(
      (left, right) =>
        toTimeValue(right.lastCreatedAt, 0) - toTimeValue(left.lastCreatedAt, 0),
    );
}

export async function loadAlertSubscriptions() {
  const response = await getAlertPreferencesOverview();

  if (!Array.isArray(response)) {
    return [];
  }

  return response.map(normalizeOverviewSubscription);
}

export async function loadAlertsUnreadCount() {
  const response = await getAlertsUnreadCount();
  return Math.max(Number(response?.unreadCount) || 0, 0);
}

export async function markAlertMatchesViewed() {
  const response = await markAlertsViewed();
  return {
    unreadCount: Math.max(Number(response?.unreadCount) || 0, 0),
    lastAlertsViewedAt: response?.lastAlertsViewedAt || null,
  };
}

export function extractAlertErrorMessage(error, fallback = 'Request failed.') {
  const responseMessage = error?.response?.data?.message;

  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return responseMessage[0];
  }

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

export async function createAlertSubscriptions(input = {}) {
  const geographicArea = await ensureValidLocation(input.location);
  const categories = ensureValidCategories(input.categories);
  const response = await createAlertPreferencesBatch({
    geographicArea,
    incidentCategories: categories,
  });

  return Array.isArray(response) ? response.map(normalizePreference) : [];
}

export async function deleteAlertSubscriptionGroup(subscription = {}) {
  const preferenceIds = Array.from(
    new Set((Array.isArray(subscription.preferenceIds) ? subscription.preferenceIds : []).map(normalizeText).filter(Boolean)),
  );

  if (preferenceIds.length === 0) {
    throw new Error('No active subscription records were found to delete.');
  }

  const results = await Promise.allSettled(
    preferenceIds.map((preferenceId) => deleteAlertPreference(preferenceId)),
  );

  const failedCount = results.filter((result) => result.status === 'rejected').length;
  if (failedCount > 0) {
    throw new Error(
      failedCount === preferenceIds.length
        ? 'Unable to delete the selected subscription.'
        : 'The subscription was only partially deleted. Refresh and try again.',
    );
  }
}

export async function updateAlertSubscription(existingSubscription = {}, input = {}) {
  const nextLocation = await ensureValidLocation(input.location);
  const nextCategories = ensureValidCategories(input.categories);
  const currentCategories = Array.isArray(existingSubscription.categories)
    ? existingSubscription.categories
    : [];
  const currentLocationKey = buildLocationKey(existingSubscription.location);
  const nextLocationKey = buildLocationKey(nextLocation);
  const currentCategoriesByKey = new Map(
    currentCategories.map((category) => [normalizeCategoryKey(category.key), category]),
  );

  if (currentLocationKey && currentLocationKey === nextLocationKey) {
    const categoriesToCreate = nextCategories.filter(
      (category) => !currentCategoriesByKey.has(category),
    );
    const categoriesToDelete = currentCategories.filter(
      (category) => !nextCategories.includes(normalizeCategoryKey(category.key)),
    );
    const createdPreferences = [];

    try {
      for (const incidentCategory of categoriesToCreate) {
        const createdPreference = await createAlertPreference({
          geographicArea: nextLocation,
          incidentCategory,
        });

        createdPreferences.push(normalizePreference(createdPreference));
      }
    } catch (error) {
      await Promise.allSettled(
        createdPreferences.map((preference) => deleteAlertPreference(preference.id)),
      );
      throw error;
    }

    const deleteResults = await Promise.allSettled(
      categoriesToDelete.map((category) =>
        deleteAlertPreference(category.preferenceId),
      ),
    );

    if (deleteResults.some((result) => result.status === 'rejected')) {
      throw new Error(
        'The subscription was updated, but some old categories could not be removed. Refresh and review the saved subscriptions.',
      );
    }

    return;
  }

  const createdPreferences = [];

  try {
    for (const incidentCategory of nextCategories) {
      const createdPreference = await createAlertPreference({
        geographicArea: nextLocation,
        incidentCategory,
      });

      createdPreferences.push(normalizePreference(createdPreference));
    }
  } catch (error) {
    await Promise.allSettled(
      createdPreferences.map((preference) => deleteAlertPreference(preference.id)),
    );
    throw error;
  }

  const deleteResults = await Promise.allSettled(
    (Array.isArray(existingSubscription.preferenceIds)
      ? existingSubscription.preferenceIds
      : []
    )
      .map(normalizeText)
      .filter(Boolean)
      .map((preferenceId) => deleteAlertPreference(preferenceId)),
  );

  if (deleteResults.some((result) => result.status === 'rejected')) {
    throw new Error(
      'The subscription was moved, but some previous category records could not be removed. Refresh and review the saved subscriptions.',
    );
  }
}
