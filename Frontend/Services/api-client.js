function createApiClient() {
  if (!window.axios) {
    return null;
  }

  return window.axios.create({
    baseURL: window.AppConfig?.API_BASE_URL || '',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function getApiClient() {
  if (window.appApiClient) {
    return window.appApiClient;
  }

  if (window.authApi) {
    window.appApiClient = window.authApi;
    return window.appApiClient;
  }

  window.appApiClient = createApiClient();
  return window.appApiClient;
}

function isCitizenPreviewActive() {
  if (window.CitizenPreview?.isActive?.()) {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search || '');
    const queryValue = String(params.get('adminPreview') || '').toLowerCase();
    if (queryValue === '1' || queryValue === 'true' || queryValue === 'yes') {
      return true;
    }

    return window.sessionStorage?.getItem('wasel.adminCitizenPreview') === '1';
  } catch (_error) {
    return false;
  }
}

function buildRequestConfig(path, options = {}) {
  const token = window.localStorage?.getItem('token');
  const headers = {
    ...(options.headers || {}),
  };

  if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  if (
    token &&
    options.includeAuth !== false &&
    !isCitizenPreviewActive() &&
    !headers.Authorization
  ) {
    headers.Authorization = 'Bearer ' + token;
  }

  return {
    url: path,
    method: options.method || 'GET',
    data: options.data,
    params: options.params,
    headers,
    signal: options.signal,
  };
}

function buildAbsoluteUrl(path, params) {
  const baseUrl = window.AppConfig?.API_BASE_URL || window.location.origin;

  // Strip the leading slash from the path so it appends correctly to the base URL
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  const url = new URL(cleanPath, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

async function requestWithFetch(config) {
  const response = await window.fetch(buildAbsoluteUrl(config.url, config.params), {
    method: config.method,
    headers: config.headers,
    body: config.data ? JSON.stringify(config.data) : undefined,
    signal: config.signal,
  });

  const text = await response.text();
  let data = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(response.statusText || 'Request failed');
    error.response = {
      status: response.status,
      data,
    };
    throw error;
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const config = buildRequestConfig(path, options);
  const client = getApiClient();

  if (client && typeof client.request === 'function') {
    const response = await client.request(config);
    return response.data;
  }

  return requestWithFetch(config);
}

export function apiGet(path, options = {}) {
  return apiRequest(path, { ...options, method: 'GET' });
}

export function apiPost(path, data, options = {}) {
  return apiRequest(path, { ...options, method: 'POST', data });
}

export function apiPatch(path, data, options = {}) {
  return apiRequest(path, { ...options, method: 'PATCH', data });
}
