export const CHECKPOINT_STATUS_COLORS = {
  OPEN: '#22c55e',
  DELAYED: '#eab308',
  RESTRICTED: '#f97316',
  CLOSED: '#ef4444',
};

export const INCIDENT_TYPE_COLORS = {
  CLOSURE: '#ef4444',
  DELAY: '#eab308',
  ACCIDENT: '#3b82f6',
  WEATHER: '#06b6d4',
  WEATHER_HAZARD: '#06b6d4',
  DEFAULT: '#f97316',
};

export const REPORT_COLOR = '#3b82f6';

const iconCache = new Map();

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

export function toCheckpointStatusKey(status) {
  const normalized = normalizeUpper(status);
  return normalized || 'OPEN';
}

export function toIncidentTypeKey(type) {
  const normalized = normalizeUpper(type);
  if (normalized === 'ROAD_CLOSURE') {
    return 'CLOSURE';
  }
  if (normalized === 'WEATHER_HAZARD') {
    return 'WEATHER';
  }
  return normalized || 'DEFAULT';
}

export function getDynamicIcon(entityType, value, leaflet = window.L) {
  if (!leaflet || typeof leaflet.divIcon !== 'function') {
    return null;
  }

  const normalizedEntityType = normalizeUpper(entityType);
  const cacheKey = `${normalizedEntityType}:${normalizeUpper(value)}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  if (normalizedEntityType === 'CHECKPOINT') {
    const statusKey = toCheckpointStatusKey(value);
    const color = CHECKPOINT_STATUS_COLORS[statusKey] || CHECKPOINT_STATUS_COLORS.OPEN;

    const icon = leaflet.divIcon({
      className: 'custom-checkpoint-icon',
      html: `<div style="width: 16px; height: 16px; background-color: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0px 2px 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    iconCache.set(cacheKey, icon);
    return icon;
  }

  if (normalizedEntityType === 'INCIDENT') {
    const typeKey = toIncidentTypeKey(value);
    const color = INCIDENT_TYPE_COLORS[typeKey] || INCIDENT_TYPE_COLORS.DEFAULT;

    const icon = leaflet.divIcon({
      className: 'custom-incident-icon',
      html: `<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 18px solid ${color}; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    iconCache.set(cacheKey, icon);
    return icon;
  }

  if (normalizedEntityType === 'REPORT') {
    const icon = leaflet.divIcon({
      className: 'custom-report-icon',
      html: `<div style="width: 12px; height: 12px; background-color: ${REPORT_COLOR}; transform: rotate(45deg); border-radius: 2px; box-shadow: 0px 2px 3px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });

    iconCache.set(cacheKey, icon);
    return icon;
  }

  return null;
}
