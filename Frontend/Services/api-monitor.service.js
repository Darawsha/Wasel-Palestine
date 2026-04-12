import { loadSystemSettingsSnapshot } from '/Services/system-settings.service.js';

const HISTORY_STORAGE_KEY = 'wasel.admin.api-monitor.history';
const MAX_HISTORY_ITEMS = 50;
const HISTORY_PAGE_SIZE = 8;

const ROUTING_PROBE_PATH = '/driving/35.2137,31.7683;35.2206,31.7784?overview=false';
const WEATHER_PROBE_PATH = '/current.json?q=31.7683,35.2137';

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = window.localStorage?.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (_error) {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  window.localStorage?.setItem(key, JSON.stringify(value));
  return value;
}

function createRelativeTimeFormatter() {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'Never';
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = createRelativeTimeFormatter();

  if (Math.abs(diffMinutes) < 1) {
    return 'Just now';
  }

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(-diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(-diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(-diffDays, 'day');
}

function formatTimestamp(timestamp) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  } catch (_error) {
    return '--';
  }
}

function formatResponseTime(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0
    ? `${Math.round(normalized)}ms`
    : '--';
}

function determineStatusTone(successRate, averageResponseTime) {
  if (successRate >= 99 && averageResponseTime <= 250) {
    return 'Healthy';
  }

  if (successRate >= 95 && averageResponseTime <= 1000) {
    return 'Degraded';
  }

  return 'Critical';
}

function determineTrend(currentValue, previousValue) {
  const current = Number(currentValue) || 0;
  const previous = Number(previousValue) || 0;
  const delta = Math.round(current - previous);

  if (!Number.isFinite(delta) || delta === 0) {
    return {
      direction: 'flat',
      deltaLabel: '0ms',
    };
  }

  return {
    direction: delta < 0 ? 'down' : 'up',
    deltaLabel: `${Math.abs(delta)}ms`,
  };
}

function getResponseStatus(code) {
  if (code >= 200 && code < 400) {
    return {
      label: 'Success',
      tone: 'success',
      rowTone: '',
      badgeTone: 'Normal',
    };
  }

  if (code === 429) {
    return {
      label: 'Rate Limited',
      tone: 'warning',
      rowTone: 'row-warning',
      badgeTone: 'Warning',
    };
  }

  return {
    label: 'Error',
    tone: 'danger',
    rowTone: 'row-danger',
    badgeTone: 'Critical',
  };
}

function appendQuery(url, query) {
  const connector = url.includes('?') ? '&' : '?';
  return `${url}${connector}${query}`;
}

function normalizeUrl(baseUrl, path = '') {
  const normalizedBase = String(baseUrl || '').trim().replace(/\/$/, '');
  if (!normalizedBase) {
    return '';
  }

  return `${normalizedBase}${path}`;
}

function buildProbeDefinitions(settingsSnapshot) {
  const weatherApiKey = String(settingsSnapshot.weatherApiKey || '').trim();
  const weatherBaseUrl = normalizeUrl(settingsSnapshot.weatherEndpointUrl, WEATHER_PROBE_PATH);

  return [
    {
      id: 'routing',
      name: 'Routing API',
      vendor: 'OpenStreetMap OSRM',
      endpoint: normalizeUrl(settingsSnapshot.routingEndpointUrl, ROUTING_PROBE_PATH),
      requestPath: '/route/v1/driving',
      rateLimit: 1000,
      headers: {},
    },
    {
      id: 'weather',
      name: 'Weather API',
      vendor: 'WeatherAPI',
      endpoint: weatherApiKey && weatherBaseUrl
        ? appendQuery(weatherBaseUrl, `key=${encodeURIComponent(weatherApiKey)}`)
        : '',
      requestPath: '/current.json',
      rateLimit: 500,
      headers: {},
    },
  ].map((probe) => ({
    ...probe,
    endpoint: probe.id === 'weather' && !weatherApiKey
      ? ''
      : probe.endpoint,
    configMissing: probe.id === 'weather' && !weatherApiKey,
  }));
}

function getHistory() {
  return readJsonStorage(HISTORY_STORAGE_KEY, []);
}

function saveHistory(history) {
  return writeJsonStorage(HISTORY_STORAGE_KEY, history.slice(0, MAX_HISTORY_ITEMS));
}

function createHistoryEntry(probe, result) {
  return {
    timestamp: result.timestamp,
    apiId: probe.id,
    apiName: probe.name,
    endpoint: probe.requestPath,
    responseCode: result.responseCode,
    responseTimeMs: result.responseTimeMs,
    status: getResponseStatus(result.responseCode).label,
  };
}

async function runProbe(probe) {
  const timestamp = new Date().toISOString();

  if (!probe.endpoint) {
    return {
      timestamp,
      responseCode: probe.configMissing ? 0 : 503,
      responseTimeMs: null,
      success: false,
      detail: probe.configMissing
        ? 'API key missing from runtime settings.'
        : 'Endpoint is not configured.',
    };
  }

  const startedAt = window.performance?.now?.() ?? Date.now();

  try {
    const response = await fetch(probe.endpoint, {
      method: 'GET',
      headers: probe.headers,
    });
    const endedAt = window.performance?.now?.() ?? Date.now();

    return {
      timestamp,
      responseCode: response.status,
      responseTimeMs: Math.max(0, Math.round(endedAt - startedAt)),
      success: response.ok,
      detail: response.ok
        ? 'Request succeeded.'
        : `Request returned HTTP ${response.status}.`,
    };
  } catch (_error) {
    return {
      timestamp,
      responseCode: 503,
      responseTimeMs: null,
      success: false,
      detail: 'Request failed or was blocked by the browser/network.',
    };
  }
}

function buildMetricCard(probe, history, latestResult) {
  const apiHistory = history.filter((entry) => entry.apiId === probe.id);
  const successfulCalls = apiHistory.filter((entry) => entry.responseCode >= 200 && entry.responseCode < 400);
  const averageResponseTime = successfulCalls.length > 0
    ? Math.round(
      successfulCalls.reduce((sum, entry) => sum + (Number(entry.responseTimeMs) || 0), 0)
      / successfulCalls.length,
    )
    : 0;
  const previousSuccessfulCall = successfulCalls[1];
  const successRate = apiHistory.length > 0
    ? Math.round((successfulCalls.length / apiHistory.length) * 1000) / 10
    : 0;
  const trend = determineTrend(
    successfulCalls[0]?.responseTimeMs,
    previousSuccessfulCall?.responseTimeMs,
  );
  const rateLimitUsed = Math.min(apiHistory.length, probe.rateLimit);
  const lastSuccess = successfulCalls[0]?.timestamp || latestResult?.timestamp || null;
  const latestCode = latestResult?.responseCode ?? apiHistory[0]?.responseCode ?? 0;

  return {
    id: probe.id,
    name: probe.name,
    vendor: probe.vendor,
    lastSuccessfulCall: formatRelativeTime(lastSuccess),
    averageResponseTime: formatResponseTime(averageResponseTime),
    averageResponseTimeMs: averageResponseTime,
    trend,
    rateLimit: {
      used: rateLimitUsed,
      limit: probe.rateLimit,
      percent: probe.rateLimit > 0 ? Math.min((rateLimitUsed / probe.rateLimit) * 100, 100) : 0,
    },
    errorRate: `${Math.max(0, (100 - successRate)).toFixed(successRate % 1 === 0 ? 0 : 1)}%`,
    errorBadge: getResponseStatus(latestCode).badgeTone,
    status: determineStatusTone(successRate, averageResponseTime),
  };
}

function buildMonitorMetrics(probes, history, latestResults) {
  return probes.map((probe) => {
    const latestResult = latestResults.find((result) => result.apiId === probe.id) || null;
    return buildMetricCard(probe, history, latestResult);
  });
}

function buildRecentCalls(history, apiFilter, page) {
  const filteredHistory = apiFilter === 'all'
    ? history
    : history.filter((entry) => entry.apiId === apiFilter);
  const total = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const currentItems = filteredHistory.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

  return {
    items: currentItems.map((entry) => ({
      ...entry,
      timestampLabel: formatTimestamp(entry.timestamp),
      responseTimeLabel: entry.responseTimeMs == null ? '--' : formatResponseTime(entry.responseTimeMs),
      statusPresentation: getResponseStatus(entry.responseCode),
    })),
    total,
    page: currentPage,
    pageSize: HISTORY_PAGE_SIZE,
    totalPages,
    startItem: total === 0 ? 0 : startIndex + 1,
    endItem: Math.min(startIndex + HISTORY_PAGE_SIZE, total),
  };
}

export async function getApiMonitorSnapshot(options = {}) {
  const { refresh = false, apiFilter = 'all', page = 1 } = options;
  const settingsSnapshot = await loadSystemSettingsSnapshot();
  const probes = buildProbeDefinitions(settingsSnapshot);
  let history = getHistory();
  const latestResults = [];

  if (refresh || history.length === 0) {
    const probeResults = await Promise.all(
      probes.map(async (probe) => ({
        apiId: probe.id,
        ...(await runProbe(probe)),
      })),
    );

    const nextEntries = probeResults.map((result) => {
      const probe = probes.find((candidate) => candidate.id === result.apiId);
      return createHistoryEntry(probe, result);
    });

    history = saveHistory([...nextEntries.reverse(), ...history]);
    latestResults.push(...probeResults);
  }

  return {
    lastUpdatedLabel: history[0]?.timestamp
      ? formatRelativeTime(history[0].timestamp)
      : 'Never',
    metrics: buildMonitorMetrics(probes, history, latestResults),
    filters: [
      { value: 'all', label: 'All APIs' },
      ...probes.map((probe) => ({
        value: probe.id,
        label: probe.name,
      })),
    ],
    recentCalls: buildRecentCalls(history, apiFilter, page),
  };
}
