(function () {
  const fallbackOrigin = 'http://localhost:3000';
  const currentOrigin =
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    window.location.origin !== 'null'
      ? window.location.origin
      : fallbackOrigin;

  const defaultConfig = {
    API_BASE_URL: `${currentOrigin}/api/v1`,
  };

  let savedRuntimeConfig = null;

  try {
    savedRuntimeConfig = JSON.parse(
      window.localStorage?.getItem('wasel.admin.system-settings.applied') || 'null',
    );
  } catch (_error) {
    savedRuntimeConfig = null;
  }

  window.AppConfig = {
    ...defaultConfig,
    ...(savedRuntimeConfig?.apiBaseUrl
      ? { API_BASE_URL: savedRuntimeConfig.apiBaseUrl }
      : {}),
  };
})();
