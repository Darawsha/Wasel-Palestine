(function (global) {
  const WEATHER_WIDGET_SELECTOR = '#spa-page-home .weather-widget';
  const GEOLOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  const weatherState = {
    watchId: null,
    requestToken: 0,
    lastCoordinatesKey: '',
  };

  function getWeatherWidget() {
    return document.querySelector(WEATHER_WIDGET_SELECTOR);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getWeatherIcon(conditionText, isDay) {
    const mainWeather = String(conditionText || '').toLowerCase();

    if (mainWeather.includes('cloud') || mainWeather.includes('overcast')) {
      return isDay ? 'cloud' : 'nights_stay';
    }

    if (
      mainWeather.includes('rain') ||
      mainWeather.includes('drizzle') ||
      mainWeather.includes('shower')
    ) {
      return 'rainy';
    }

    if (
      mainWeather.includes('snow') ||
      mainWeather.includes('ice') ||
      mainWeather.includes('sleet')
    ) {
      return 'ac_unit';
    }

    if (mainWeather.includes('thunder')) {
      return 'thunderstorm';
    }

    return isDay ? 'wb_sunny' : 'dark_mode';
  }

  function renderWidgetState(message, icon) {
    const weather = getWeatherWidget();
    if (!weather) return;

    weather.innerHTML = `
      <div class="weather-top">
        <span class="material-symbols-outlined weather-icon fill-1" aria-hidden="true">${icon}</span>
        <span class="weather-temp">--</span>
      </div>
      <div class="weather-desc">${escapeHtml(message)}</div>
      <div class="weather-wind">
        <span class="material-symbols-outlined" aria-hidden="true">air</span>
        <span>-- km/h</span>
      </div>
    `;
  }

  function renderWeather(data) {
    const weather = getWeatherWidget();
    if (!weather) return;

    const conditionText = String(data?.conditionText || '').trim();
    const temperatureCelsius = Number(data?.temperatureCelsius);
    const windKph = Number(data?.windKph);
    const isDay = Boolean(data?.isDay);

    if (
      !conditionText ||
      !Number.isFinite(temperatureCelsius) ||
      !Number.isFinite(windKph)
    ) {
      renderWidgetState('Unable to load weather for your current location.', 'error');
      return;
    }

    const icon = getWeatherIcon(conditionText, isDay);

    weather.innerHTML = `
      <div class="weather-top">
        <span class="material-symbols-outlined weather-icon fill-1" aria-hidden="true">${icon}</span>
        <span class="weather-temp">${Math.round(temperatureCelsius)}&deg;C</span>
      </div>
      <div class="weather-desc">${escapeHtml(conditionText)}</div>
      <div class="weather-wind">
        <span class="material-symbols-outlined" aria-hidden="true">air</span>
        <span>${Math.round(windKph)} km/h</span>
      </div>
    `;
  }

  function buildApiBaseUrl() {
    return global.AppConfig?.API_BASE_URL || `${global.location.origin}/api/v1`;
  }

  function buildWeatherUrl(latitude, longitude) {
    const baseUrl = buildApiBaseUrl();
    const url = new URL(
      'weather/current',
      baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
    );

    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));

    return url.toString();
  }

  function buildRequestHeaders() {
    const headers = {
      Accept: 'application/json',
    };
    const token =
      global.localStorage?.getItem('token') ||
      global.localStorage?.getItem('jwtToken');

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async function fetchCurrentWeather(latitude, longitude, requestToken) {
    const response = await global.fetch(buildWeatherUrl(latitude, longitude), {
      method: 'GET',
      headers: buildRequestHeaders(),
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (requestToken !== weatherState.requestToken) {
      return;
    }

    if (!response.ok) {
      const message =
        String(payload?.message || '').trim() ||
        'Unable to load weather for your current location.';
      throw new Error(message);
    }

    renderWeather(payload);
  }

  function clearWeatherWatch() {
    if (
      weatherState.watchId !== null &&
      'geolocation' in navigator &&
      typeof navigator.geolocation.clearWatch === 'function'
    ) {
      navigator.geolocation.clearWatch(weatherState.watchId);
    }

    weatherState.watchId = null;
  }

  function destroyWeatherWidget() {
    weatherState.requestToken += 1;
    weatherState.lastCoordinatesKey = '';
    clearWeatherWatch();
  }

  function formatGeolocationError(error) {
    if (error?.code === 1) {
      return 'Location permission denied. Weather unavailable.';
    }

    if (error?.code === 2) {
      return 'Current location unavailable. Weather unavailable.';
    }

    if (error?.code === 3) {
      return 'Location request timed out. Weather unavailable.';
    }

    return 'Current location unavailable. Weather unavailable.';
  }

  function handlePosition(position) {
    const weather = getWeatherWidget();
    if (!weather) {
      destroyWeatherWidget();
      return;
    }

    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      weatherState.requestToken += 1;
      weatherState.lastCoordinatesKey = '';
      renderWidgetState('Current location unavailable. Weather unavailable.', 'error');
      return;
    }

    const coordinatesKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    if (coordinatesKey === weatherState.lastCoordinatesKey) {
      return;
    }

    weatherState.lastCoordinatesKey = coordinatesKey;
    const requestToken = ++weatherState.requestToken;

    renderWidgetState('Updating weather for your current location...', 'near_me');
    void fetchCurrentWeather(latitude, longitude, requestToken).catch((error) => {
      if (requestToken !== weatherState.requestToken) {
        return;
      }

      console.error('Weather API Error:', error);
      renderWidgetState(
        String(error?.message || 'Unable to load weather for your current location.'),
        'error',
      );
    });
  }

  function handlePositionError(error) {
    weatherState.requestToken += 1;
    weatherState.lastCoordinatesKey = '';
    renderWidgetState(formatGeolocationError(error), 'location_off');
  }

  function initWeatherWidget() {
    const weather = getWeatherWidget();
    if (!weather) {
      destroyWeatherWidget();
      return;
    }

    destroyWeatherWidget();
    renderWidgetState('Detecting your current location...', 'my_location');

    if (
      !('geolocation' in navigator) ||
      typeof navigator.geolocation.watchPosition !== 'function'
    ) {
      renderWidgetState(
        'Geolocation is not supported in this browser.',
        'location_off',
      );
      return;
    }

    weatherState.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handlePositionError,
      GEOLOCATION_OPTIONS,
    );
  }

  global.initWeatherWidget = initWeatherWidget;
  global.destroyWeatherWidget = destroyWeatherWidget;
})(window);
