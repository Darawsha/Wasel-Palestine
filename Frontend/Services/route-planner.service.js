import { apiGet, apiPost } from '/Services/api-client.js';
import { fetchFilteredMapData } from '/Services/map.service.js';

const ROUTE_REQUEST_CACHE_TTL_MS = 1500;
const ROUTE_REQUEST_TIMEOUT_MS = 20000;
const inflightRouteEstimates = new Map();
const recentRouteEstimates = new Map();

export async function estimateRoute(payload) {
  const requestKey = buildRouteEstimateKey(payload);
  const now = Date.now();

  clearExpiredRouteEstimates(now);

  const cachedResult = recentRouteEstimates.get(requestKey);
  if (cachedResult && cachedResult.expiresAt > now) {
    return cachedResult.value;
  }

  const inflightEntry = inflightRouteEstimates.get(requestKey);
  if (inflightEntry?.promise) {
    return inflightEntry.promise;
  }

  const controller =
    typeof AbortController === 'function' ? new AbortController() : null;
  let abortReason = 'cancelled';
  const timeoutId =
    controller && typeof window.setTimeout === 'function'
      ? window.setTimeout(() => {
          abortReason = 'timeout';
          controller.abort();
        }, ROUTE_REQUEST_TIMEOUT_MS)
      : null;

  const requestPromise = apiPost(
    '/routes/estimate',
    payload,
    controller ? { signal: controller.signal } : {},
  )
    .then((result) => {
      recentRouteEstimates.set(requestKey, {
        value: result,
        expiresAt: Date.now() + ROUTE_REQUEST_CACHE_TTL_MS,
      });
      return result;
    })
    .catch((error) => {
      if (isRouteRequestAbortError(error)) {
        throw buildRouteRequestAbortError(error, abortReason);
      }

      throw error;
    })
    .finally(() => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (inflightRouteEstimates.get(requestKey)?.promise === requestPromise) {
        inflightRouteEstimates.delete(requestKey);
      }
    });

  inflightRouteEstimates.set(requestKey, {
    promise: requestPromise,
    controller,
    timeoutId,
  });
  return requestPromise;
}

export function cancelPendingRouteEstimates(options = {}) {
  const keepRequestKey =
    typeof options.keepRequestKey === 'string' && options.keepRequestKey
      ? options.keepRequestKey
      : options.keepPayload
        ? buildRouteEstimateKey(options.keepPayload)
        : '';

  inflightRouteEstimates.forEach((entry, key) => {
    if (keepRequestKey && key === keepRequestKey) {
      return;
    }

    if (entry?.timeoutId !== null && entry?.timeoutId !== undefined) {
      window.clearTimeout(entry.timeoutId);
    }

    if (entry?.controller && !entry.controller.signal.aborted) {
      entry.controller.abort('cancelled');
    }

    inflightRouteEstimates.delete(key);
  });
}

export async function getRouteContextData() {
  const mapData = await fetchFilteredMapData({}, { includeCheckpoints: true });

  return {
    checkpoints: Array.isArray(mapData?.checkpoints) ? mapData.checkpoints : [],
    incidents: Array.isArray(mapData?.incidents) ? mapData.incidents : [],
    reports: Array.isArray(mapData?.reports) ? mapData.reports : [],
  };
}

export async function getCurrentWeather(latitude, longitude) {
  return apiGet('/weather/current', {
    params: {
      latitude,
      longitude,
    },
  });
}

function buildRouteEstimateKey(payload = {}) {
  return JSON.stringify({
    startLatitude: normalizeCoordinate(payload.startLatitude),
    startLongitude: normalizeCoordinate(payload.startLongitude),
    endLatitude: normalizeCoordinate(payload.endLatitude),
    endLongitude: normalizeCoordinate(payload.endLongitude),
    avoidCheckpoints: Boolean(payload.avoidCheckpoints),
    avoidIncidents: Boolean(payload.avoidIncidents),
  });
}

function normalizeCoordinate(value) {
  const coordinate = Number(value);

  if (!Number.isFinite(coordinate)) {
    return null;
  }

  return Number(coordinate.toFixed(6));
}

function clearExpiredRouteEstimates(now = Date.now()) {
  recentRouteEstimates.forEach((entry, key) => {
    if (!entry || entry.expiresAt <= now) {
      recentRouteEstimates.delete(key);
    }
  });
}

function isRouteRequestAbortError(error) {
  return (
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED' ||
    normalizeErrorMessage(error) === 'canceled' ||
    normalizeErrorMessage(error) === 'cancelled'
  );
}

function buildRouteRequestAbortError(error, abortReason = 'cancelled') {
  const message =
    abortReason === 'timeout'
      ? 'Route calculation timed out. Please try again.'
      : 'Route calculation was cancelled. Please try again.';

  const abortError = new Error(message);
  abortError.cause = error;
  return abortError;
}

function normalizeErrorMessage(error) {
  return String(error?.message || '')
    .trim()
    .toLowerCase();
}
