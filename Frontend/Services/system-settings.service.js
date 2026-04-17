import { apiGet, apiPatch } from '/Services/api-client.js';

const DRAFT_STORAGE_KEY = 'wasel.admin.system-settings.draft';
const APPLIED_STORAGE_KEY = 'wasel.admin.system-settings.applied';

const DEFAULT_ENV = {
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  MIN_PASSWORD_LENGTH: '8',
  WEATHER_API_KEY: '',
  WEATHER_FALLBACK_COORDS: '32.1744,35.2856',
  ROUTING_API_URL: 'https://router.project-osrm.org/route/v1',
  ROUTING_API_TIMEOUT: '10s',
  ROUTING_API_CACHE_TTL: '15m',
  WEATHER_API_URL: 'https://api.weatherapi.com/v1',
  WEATHER_API_TIMEOUT: '5s',
  WEATHER_API_CACHE_TTL: '30m',
};

const WEATHER_API_FALLBACK_KEY = '51e8b6c810274f0296602528261803';
const DEFAULT_PLATFORM_NAME = 'Wasel Palestine';
const DEFAULT_PRIMARY_LANGUAGE = 'English';
const ALLOWED_PRIMARY_LANGUAGES = new Set(['English', 'Arabic']);

let cachedEnv = null;

function readJsonStorage(key) {
  try {
    const rawValue = window.localStorage?.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.warn(`Could not read storage value for ${key}.`, error);
    return null;
  }
}

function writeJsonStorage(key, value) {
  window.localStorage?.setItem(key, JSON.stringify(value));
  return value;
}

function normalizePrimaryLanguage(value) {
  const normalizedValue = String(value || '').trim();
  return ALLOWED_PRIMARY_LANGUAGES.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_PRIMARY_LANGUAGE;
}

function normalizePersistedGeneralSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  return {
    platformName:
      String(settings.platformName || '').trim() || DEFAULT_PLATFORM_NAME,
    primaryLanguage: normalizePrimaryLanguage(settings.primaryLanguage),
  };
}

async function loadPersistedGeneralSettings() {
  try {
    return normalizePersistedGeneralSettings(await apiGet('/system-settings'));
  } catch (error) {
    console.warn('Could not load persisted system settings.', error);
    return null;
  }
}

async function persistGeneralSettings(snapshot) {
  const platformName = String(snapshot?.platformName || '').trim();
  const primaryLanguage = normalizePrimaryLanguage(snapshot?.primaryLanguage);

  const response = await apiPatch('/system-settings', {
    platformName,
    primaryLanguage,
  });

  return normalizePersistedGeneralSettings(response);
}

function mapTimezoneToOptionLabel(timezone) {
  const normalizedTimezone = String(timezone || '').trim();

  if (normalizedTimezone === 'Asia/Hebron' || normalizedTimezone === 'Asia/Jerusalem') {
    return 'Asia/Jerusalem (GMT+03:00)';
  }

  if (normalizedTimezone === 'Europe/London') {
    return 'Europe/London (GMT+01:00)';
  }

  if (normalizedTimezone === 'America/New_York') {
    return 'America/New_York (GMT-04:00)';
  }

  return 'Asia/Jerusalem (GMT+03:00)';
}

function inferEnvironment(apiBaseUrl) {
  const normalizedUrl = String(apiBaseUrl || '').toLowerCase();

  if (!normalizedUrl) {
    return 'Unknown';
  }

  if (normalizedUrl.includes('localhost') || normalizedUrl.includes('127.0.0.1')) {
    return 'Local';
  }

  if (normalizedUrl.includes('staging') || normalizedUrl.includes('test')) {
    return 'Staging';
  }

  return 'Production';
}

function maskSecret(value) {
  const normalizedValue = String(value || '');
  return normalizedValue ? '*'.repeat(Math.min(Math.max(normalizedValue.length, 8), 16)) : '';
}

function buildLinkedApis(apiBaseUrl, envOrSnapshot) {
  return [
    {
      name: 'Platform API',
      url: apiBaseUrl,
      status: apiBaseUrl ? 'Configured' : 'Missing',
    },
    {
      name: 'Routing API',
      url: envOrSnapshot.routingEndpointUrl,
      status: envOrSnapshot.routingEndpointUrl ? 'Configured' : 'Missing',
    },
    {
      name: 'Weather API',
      url: envOrSnapshot.weatherEndpointUrl,
      status: envOrSnapshot.weatherEndpointUrl ? 'Configured' : 'Missing',
    },
  ];
}

async function probePlatformApi(apiBaseUrl) {
  const normalizedUrl = String(apiBaseUrl || '').trim();

  if (!normalizedUrl) {
    return {
      status: 'Missing',
      detail: 'Platform API base URL is not configured.',
    };
  }

  const startTime = window.performance?.now?.() ?? Date.now();

  try {
    const response = await fetch(`${normalizedUrl.replace(/\/$/, '')}/incidents/active-count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const endTime = window.performance?.now?.() ?? Date.now();
    const durationMs = Math.max(0, Math.round(endTime - startTime));

    if (!response.ok) {
      return {
        status: 'Degraded',
        detail: `Platform API responded with HTTP ${response.status}.`,
      };
    }

    return {
      status: 'Connected',
      detail: `Platform API reachable in ${durationMs}ms.`,
    };
  } catch (_error) {
    return {
      status: 'Unreachable',
      detail: 'Platform API could not be reached from the current frontend runtime.',
    };
  }
}

function buildRuntimeSummary(snapshot, platformProbe) {
  const configuredApis = Array.isArray(snapshot.linkedApis)
    ? snapshot.linkedApis.filter((api) => api.url).length
    : 0;

  const badge = platformProbe?.status || snapshot.configSource || 'Ready';
  const copy = [
    `${snapshot.environment} environment`,
    `${configuredApis}/3 APIs configured`,
    platformProbe?.detail || 'Runtime configuration loaded.',
  ].join(' | ');

  return {
    badge,
    copy,
  };
}

async function loadEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = { ...DEFAULT_ENV };

  try {
    const response = await fetch('/.env', { cache: 'no-cache' });

    if (response.ok) {
      const text = await response.text();
      text.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (match?.[1]) {
          cachedEnv[match[1]] = match[2];
        }
      });
    }
  } catch (error) {
    console.warn('Could not load .env for system settings defaults.', error);
  }

  if (!cachedEnv.WEATHER_API_KEY) {
    cachedEnv.WEATHER_API_KEY = WEATHER_API_FALLBACK_KEY;
  }

  return cachedEnv;
}

function buildDefaults(env) {
  const apiBaseUrl = window.AppConfig?.API_BASE_URL || '';

  return {
    platformName: DEFAULT_PLATFORM_NAME,
    primaryLanguage: DEFAULT_PRIMARY_LANGUAGE,
    timezone: mapTimezoneToOptionLabel(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    accessTokenExpiry: env.JWT_EXPIRES_IN || DEFAULT_ENV.JWT_EXPIRES_IN,
    refreshTokenExpiry:
      env.JWT_REFRESH_EXPIRES_IN || DEFAULT_ENV.JWT_REFRESH_EXPIRES_IN,
    minPasswordLength:
      env.MIN_PASSWORD_LENGTH || DEFAULT_ENV.MIN_PASSWORD_LENGTH,
    requireMixedCase: true,
    requireNumeric: true,
    requireSpecialCharacters: true,
    apiBaseUrl,
    environment: inferEnvironment(apiBaseUrl),
    configSource: 'App Defaults',
    routingEndpointUrl: env.ROUTING_API_URL || DEFAULT_ENV.ROUTING_API_URL,
    routingApiKey: env.ROUTING_API_KEY || '',
    routingTimeout: env.ROUTING_API_TIMEOUT || DEFAULT_ENV.ROUTING_API_TIMEOUT,
    routingCacheTtl:
      env.ROUTING_API_CACHE_TTL || DEFAULT_ENV.ROUTING_API_CACHE_TTL,
    weatherEndpointUrl: env.WEATHER_API_URL || DEFAULT_ENV.WEATHER_API_URL,
    weatherApiKey: env.WEATHER_API_KEY || '',
    weatherTimeout: env.WEATHER_API_TIMEOUT || DEFAULT_ENV.WEATHER_API_TIMEOUT,
    weatherCacheTtl:
      env.WEATHER_API_CACHE_TTL || DEFAULT_ENV.WEATHER_API_CACHE_TTL,
    weatherFallbackCoords:
      env.WEATHER_FALLBACK_COORDS || DEFAULT_ENV.WEATHER_FALLBACK_COORDS,
    linkedApis: buildLinkedApis(apiBaseUrl, {
      routingEndpointUrl: env.ROUTING_API_URL || DEFAULT_ENV.ROUTING_API_URL,
      weatherEndpointUrl: env.WEATHER_API_URL || DEFAULT_ENV.WEATHER_API_URL,
    }),
  };
}

function applyApiBaseUrl(apiBaseUrl) {
  const normalizedUrl = String(apiBaseUrl || '').trim();
  if (!normalizedUrl) {
    return;
  }

  if (!window.AppConfig) {
    window.AppConfig = {};
  }

  window.AppConfig.API_BASE_URL = normalizedUrl;

  if (window.authApi?.defaults) {
    window.authApi.defaults.baseURL = normalizedUrl;
  }

  if (window.appApiClient?.defaults) {
    window.appApiClient.defaults.baseURL = normalizedUrl;
  }

  window.dispatchEvent(
    new CustomEvent('app:config-updated', {
      detail: {
        apiBaseUrl: normalizedUrl,
      },
    }),
  );
}

export async function loadSystemSettingsSnapshot() {
  const env = await loadEnv();
  const defaults = buildDefaults(env);
  const persistedGeneralSettings = await loadPersistedGeneralSettings();
  const appliedConfig = readJsonStorage(APPLIED_STORAGE_KEY);
  const draft = readJsonStorage(DRAFT_STORAGE_KEY);

  const baseSnapshot = appliedConfig
    ? {
      ...defaults,
      ...appliedConfig,
      ...(persistedGeneralSettings || {}),
      configSource: 'Saved Runtime Override',
      environment: inferEnvironment(appliedConfig.apiBaseUrl || defaults.apiBaseUrl),
    }
    : {
      ...defaults,
      ...(persistedGeneralSettings || {}),
    };

  const snapshot = draft
    ? {
      ...baseSnapshot,
      ...draft,
      configSource: appliedConfig ? 'Saved Runtime Override + Draft' : 'Draft',
      environment: inferEnvironment(draft.apiBaseUrl || baseSnapshot.apiBaseUrl),
    }
    : baseSnapshot;

  const linkedApis = buildLinkedApis(snapshot.apiBaseUrl, snapshot);
  const platformProbe = await probePlatformApi(snapshot.apiBaseUrl);

  return {
    ...snapshot,
    routingApiKeyMasked: maskSecret(snapshot.routingApiKey),
    weatherApiKeyMasked: maskSecret(snapshot.weatherApiKey),
    linkedApis,
    runtimeStatus: buildRuntimeSummary(
      {
        ...snapshot,
        linkedApis,
      },
      platformProbe,
    ),
  };
}

export function saveSystemSettingsDraft(draft) {
  return writeJsonStorage(DRAFT_STORAGE_KEY, draft);
}

export async function applySystemSettings(snapshot) {
  const persistedGeneralSettings = await persistGeneralSettings(snapshot);
  const appliedSnapshot = {
    ...snapshot,
    ...(persistedGeneralSettings || {}),
    environment: inferEnvironment(snapshot.apiBaseUrl),
    configSource: 'Saved Runtime Override',
    linkedApis: buildLinkedApis(snapshot.apiBaseUrl, snapshot),
    routingApiKeyMasked: maskSecret(snapshot.routingApiKey),
    weatherApiKeyMasked: maskSecret(snapshot.weatherApiKey),
  };

  applyApiBaseUrl(appliedSnapshot.apiBaseUrl);
  writeJsonStorage(APPLIED_STORAGE_KEY, appliedSnapshot);
  window.localStorage?.removeItem(DRAFT_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent('admin:system-settings-updated', {
      detail: appliedSnapshot,
    }),
  );

  return appliedSnapshot;
}

export async function resetSystemSettingsDraft() {
  window.localStorage?.removeItem(DRAFT_STORAGE_KEY);
  return loadSystemSettingsSnapshot();
}
