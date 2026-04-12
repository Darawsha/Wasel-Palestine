(function () {
  const defaultConfig = {
    API_BASE_URL: 'http://localhost:3000/api/v1',
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
