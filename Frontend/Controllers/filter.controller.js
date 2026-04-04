import { fetchFilteredMapData } from '/Services/map.service.js';
import { normalizeDateRange } from '/utils/date.util.js';

const TYPE_ALIASES = {
  'ROAD-CLOSURE': 'CLOSURE',
  ROAD_CLOSURE: 'CLOSURE',
  CLOSURE: 'CLOSURE',
  DELAY: 'DELAY',
  ACCIDENT: 'ACCIDENT',
  WEATHER: 'WEATHER_HAZARD',
  WEATHER_HAZARD: 'WEATHER_HAZARD',
};

const CHECKPOINT_RELATED_TYPES = new Set(['CLOSURE', 'DELAY', 'ACCIDENT']);

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

function normalizeTypes(rawTypes) {
  const values = Array.isArray(rawTypes) ? rawTypes : [];

  return values
    .map((value) => TYPE_ALIASES[normalizeUpper(value)] || normalizeUpper(value))
    .filter(Boolean);
}

function normalizeSeverity(rawSeverity) {
  const normalized = normalizeUpper(rawSeverity);
  return normalized || undefined;
}

function shouldIncludeCheckpoints(normalizedTypes) {
  if (!Array.isArray(normalizedTypes) || normalizedTypes.length === 0) {
    return true;
  }

  return normalizedTypes.some((type) => CHECKPOINT_RELATED_TYPES.has(type));
}

export class FilterController {
  constructor(mapMarkerController) {
    this.mapMarkerController = mapMarkerController;
  }

  async applyFilters(rawPayload = {}) {
    const normalizedTypes = normalizeTypes(rawPayload.types);

    const { startDate, endDate } = normalizeDateRange(
      rawPayload.fromDate,
      rawPayload.toDate,
    );

    const filters = {
      types: normalizedTypes,
      severity: normalizeSeverity(rawPayload.severity),
      startDate,
      endDate,
    };

    const includeCheckpoints = shouldIncludeCheckpoints(normalizedTypes);

    try {
      const mapData = await fetchFilteredMapData(filters, { includeCheckpoints });
      this.mapMarkerController.renderMapData(mapData);
      return mapData;
    } catch (error) {
      console.error('Failed to apply map filters', error);
      this.mapMarkerController.renderMapData({ incidents: [], checkpoints: [] });
      return { incidents: [], checkpoints: [] };
    }
  }
}
