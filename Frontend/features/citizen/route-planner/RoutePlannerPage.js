(function (global) {
  const PAGE_SELECTOR = '#spa-page-route-planner';
  const SELECTORS = {
    fromInput: '[data-route-from]',
    toInput: '[data-route-to]',
    avoidCheckpointsInput: '[data-route-avoid-checkpoints]',
    avoidRestrictedInput: '[data-route-avoid-restricted]',
    submitButton: '[data-route-submit]',
    distanceValue: '[data-route-distance]',
    durationValue: '[data-route-duration]',
    factorsContainer: '[data-route-factors]',
    emptyFactors: '[data-route-factors-empty]',
    status: '[data-route-status]',
  };
  const GEOLOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };
  const LOCATION_STATUS = {
    denied: 'Location permission denied. Enter a start location manually.',
    unavailable:
      'Current location unavailable. Enter a start location manually.',
    timeout: 'Location request timed out. Enter a start location manually.',
    unsupported: 'Geolocation is not supported in this browser.',
    unexpected: 'Unable to detect the current location.',
  };
  const ROUTE_PREFERENCE_MODE = {
    NONE: 'none',
    CHECKPOINTS_ONLY: 'checkpoints_only',
    INCIDENTS_ONLY: 'incidents_only',
    BOTH: 'both',
  };
  const ROUTE_COMPLIANCE_CONSTRAINT = {
    CHECKPOINTS: 'AVOID_CHECKPOINTS',
    INCIDENTS: 'AVOID_INCIDENTS',
  };
  const REPORT_CATEGORY = {
    CHECKPOINT_ISSUE: 'checkpoint_issue',
    ROAD_CLOSURE: 'road_closure',
    DELAY: 'delay',
    ACCIDENT: 'accident',
    HAZARD: 'hazard',
  };
  const LOGOUT_MODAL_CSS = '/features/citizen/logout/Logout.css';
  const CONFIRMATION_HOST_SELECTOR = '[data-route-confirmation-host]';

  let dependenciesPromise = null;
  let plannerLayerGroup = null;
  const plannerState = {
    requestToken: 0,
    locationCache: new Map(),
    mapMarkerController: null,
    calculationTimeoutId: null,
    confirmationResolver: null,
    confirmationKeydownHandler: null,
    latestPreferenceKey: '',
  };

  function ensureStyle(href) {
    const existing = document.querySelector(
      'link[rel="stylesheet"][href="' + href + '"]',
    );

    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Services/route-planner.service.js'),
        import('/shared/location_validator.js'),
        import('/Controllers/map-marker.controller.js'),
      ]).then(([serviceModule, locationModule, markerModule]) => ({
        estimateRoute: serviceModule.estimateRoute,
        cancelPendingRouteEstimates: serviceModule.cancelPendingRouteEstimates,
        getRouteContextData: serviceModule.getRouteContextData,
        getCurrentWeather: serviceModule.getCurrentWeather,
        isLocationReal: locationModule.isLocationReal,
        MapMarkerController: markerModule.MapMarkerController,
      }));
    }

    return dependenciesPromise;
  }

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getElements(root = getPageRoot()) {
    if (!root) return null;

    return {
      root,
      fromInput: root.querySelector(SELECTORS.fromInput),
      toInput: root.querySelector(SELECTORS.toInput),
      avoidCheckpointsInput: root.querySelector(SELECTORS.avoidCheckpointsInput),
      avoidRestrictedInput: root.querySelector(SELECTORS.avoidRestrictedInput),
      submitButton: root.querySelector(SELECTORS.submitButton),
      distanceValue: root.querySelector(SELECTORS.distanceValue),
      durationValue: root.querySelector(SELECTORS.durationValue),
      factorsContainer: root.querySelector(SELECTORS.factorsContainer),
      emptyFactors: root.querySelector(SELECTORS.emptyFactors),
      status: root.querySelector(SELECTORS.status),
    };
  }

  function getMap() {
    return (
      global.AppMapWidgets?.getMapForRoute?.('route-planner') ||
      global.AppMapShared?.getMapInstance?.() ||
      null
    );
  }

  async function ensureMapMarkerController() {
    if (plannerState.mapMarkerController) {
      return plannerState.mapMarkerController;
    }

    const { MapMarkerController } = await getDependencies();

    if (typeof MapMarkerController !== 'function') {
      return null;
    }

    plannerState.mapMarkerController = new MapMarkerController(() => getMap());
    return plannerState.mapMarkerController;
  }

  async function loadBackgroundMapMarkers() {
    const map = getMap();
    if (!map) {
      return;
    }

    try {
      const [{ getRouteContextData }, mapMarkerController] = await Promise.all([
        getDependencies(),
        ensureMapMarkerController(),
      ]);

      if (!mapMarkerController || typeof mapMarkerController.renderMapData !== 'function') {
        return;
      }

      const mapData = await getRouteContextData();
      mapMarkerController.renderMapData(mapData);
    } catch (error) {
      console.error('Failed to load Route Planner map markers', error);
    }
  }

  function removeRouteLayers() {
    if (plannerLayerGroup) {
      plannerLayerGroup.remove();
      plannerLayerGroup = null;
    }
  }

  function resetPlannerState() {
    plannerState.requestToken += 1;
    plannerState.latestPreferenceKey = '';
    if (plannerState.calculationTimeoutId !== null) {
      global.clearTimeout(plannerState.calculationTimeoutId);
      plannerState.calculationTimeoutId = null;
    }
    if (dependenciesPromise) {
      void dependenciesPromise
        .then((dependencies) => {
          dependencies.cancelPendingRouteEstimates?.();
        })
        .catch(() => {});
    }
    closeAlternativeRouteConfirmation(false);
    removeRouteLayers();
    plannerState.mapMarkerController?.clearMarkers?.();
    plannerState.mapMarkerController = null;
    setLoadingState(getElements(), false);
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function getErrorMessage(error) {
    const responseMessage = error?.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      return normalizeText(responseMessage.find((value) => normalizeText(value)));
    }

    if (typeof responseMessage === 'string') {
      return normalizeText(responseMessage);
    }

    if (typeof error?.response?.data === 'string') {
      return normalizeText(error.response.data);
    }

    return normalizeText(error?.message);
  }

  function normalizeKey(value) {
    return normalizeText(value).toLowerCase();
  }

  function formatCoordinateLabel(latitude, longitude) {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  function createGeolocationError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function getGeolocationErrorMessage(error) {
    if (error?.code === 1) return LOCATION_STATUS.denied;
    if (error?.code === 2) return LOCATION_STATUS.unavailable;
    if (error?.code === 3) return LOCATION_STATUS.timeout;
    if (error?.code === 'UNSUPPORTED') return LOCATION_STATUS.unsupported;
    return LOCATION_STATUS.unexpected;
  }

  function requestCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (
        !global.navigator?.geolocation ||
        typeof global.navigator.geolocation.getCurrentPosition !== 'function'
      ) {
        reject(
          createGeolocationError(
            'UNSUPPORTED',
            'Geolocation API is unavailable in this browser.',
          ),
        );
        return;
      }

      global.navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = Number(position?.coords?.latitude);
          const longitude = Number(position?.coords?.longitude);

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            reject(
              createGeolocationError(
                2,
                'Geolocation returned invalid coordinates.',
              ),
            );
            return;
          }

          resolve({
            latitude,
            longitude,
            label: 'Current location',
          });
        },
        (error) => {
          reject(error || createGeolocationError(null, LOCATION_STATUS.unexpected));
        },
        GEOLOCATION_OPTIONS,
      );
    });
  }

  function parseCoordinateInput(value) {
    const match = normalizeText(value).match(
      /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
    );

    if (!match) {
      return null;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
      label: formatCoordinateLabel(latitude, longitude),
    };
  }

  function rememberLocation(input, location) {
    if (!input || !location) return;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const label = normalizeText(location.label || input.value);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    if (label) {
      input.value = label;
      input.title = label;
    }

    input.dataset.latitude = String(latitude);
    input.dataset.longitude = String(longitude);
    input.dataset.locationKey = normalizeKey(input.value);

    if (input.dataset.locationKey) {
      plannerState.locationCache.set(input.dataset.locationKey, {
        latitude,
        longitude,
        label: label || formatCoordinateLabel(latitude, longitude),
      });
    }
  }

  function clearStoredLocation(input) {
    if (!input) return;
    delete input.dataset.latitude;
    delete input.dataset.longitude;
    delete input.dataset.locationKey;
  }

  function getStoredLocation(input) {
    if (!input) return null;

    const latitude = Number(input.dataset.latitude);
    const longitude = Number(input.dataset.longitude);
    const valueKey = normalizeKey(input.value);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      (!valueKey || input.dataset.locationKey === valueKey)
    ) {
      return {
        latitude,
        longitude,
        label: normalizeText(input.value) || formatCoordinateLabel(latitude, longitude),
      };
    }

    return null;
  }

  async function resolveLocationInput(input, options = {}) {
    const value = normalizeText(input?.value);
    const parsedCoordinates = parseCoordinateInput(value);

    if (parsedCoordinates) {
      rememberLocation(input, parsedCoordinates);
      return parsedCoordinates;
    }

    const storedLocation = getStoredLocation(input);
    if (storedLocation) {
      return storedLocation;
    }

    if ((!value || /^current location$/i.test(value)) && options.allowCurrentLocation) {
      try {
        const currentLocation = await requestCurrentLocation();
        rememberLocation(input, currentLocation);
        return currentLocation;
      } catch (error) {
        throw new Error(getGeolocationErrorMessage(error));
      }
    }

    if (!value) {
      throw new Error(options.emptyMessage || 'Enter a valid location.');
    }

    const cachedLocation = plannerState.locationCache.get(normalizeKey(value));
    if (cachedLocation) {
      const resolved = {
        latitude: cachedLocation.latitude,
        longitude: cachedLocation.longitude,
        label: value,
      };
      rememberLocation(input, resolved);
      return resolved;
    }

    const { isLocationReal } = await getDependencies();
    const geocodedLocation = await isLocationReal(value, {
      countryCodes: [],
    });

    if (geocodedLocation?.isValid) {
      const resolved = {
        latitude: Number(geocodedLocation.lat),
        longitude: Number(geocodedLocation.lon),
        label: value,
      };

      if (Number.isFinite(resolved.latitude) && Number.isFinite(resolved.longitude)) {
        rememberLocation(input, resolved);
        return resolved;
      }
    }

    throw new Error(options.invalidMessage || `Unable to locate "${value}".`);
  }

  function setLoadingState(elements, isLoading) {
    if (!elements?.submitButton) return;

    elements.submitButton.disabled = isLoading;
    elements.submitButton.textContent = isLoading
      ? 'Calculating...'
      : 'Calculate Route';
  }

  function setStatus(elements, message, tone = 'info') {
    if (!elements?.status) return;

    elements.status.textContent = normalizeText(message);
    elements.status.classList.toggle('is-error', tone === 'error');
  }

  function formatDistance(distanceKm) {
    const normalizedDistance = Number(distanceKm);

    if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0) {
      return '--';
    }

    if (normalizedDistance < 1) {
      return `${Math.max(Math.round(normalizedDistance * 1000), 1)} m`;
    }

    return normalizedDistance >= 10
      ? `${normalizedDistance.toFixed(1)} km`
      : `${normalizedDistance.toFixed(2)} km`;
  }

  function formatDuration(durationMinutes) {
    const totalMinutes = Math.max(Math.round(Number(durationMinutes) || 0), 0);

    if (totalMinutes <= 0) {
      return '--';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} hr ${minutes} min`;
    }

    if (hours > 0) {
      return `${hours} hr`;
    }

    return `${minutes} min`;
  }

  function getOrCreateConfirmationHost(root = getPageRoot()) {
    if (!root) {
      return null;
    }

    let host = root.querySelector(CONFIRMATION_HOST_SELECTOR);
    if (host) {
      return host;
    }

    host = document.createElement('div');
    host.className = 'route-planner-confirmation-host hidden';
    host.dataset.routeConfirmationHost = 'true';
    root.appendChild(host);
    return host;
  }

  function buildConfirmationModalMarkup(route, message, isDarkMode) {
    const scopeClass = isDarkMode
      ? 'logout-page-scope route-planner-confirmation dark'
      : 'logout-page-scope route-planner-confirmation';

    return (
      `<div class="${scopeClass}">` +
      '<div class="modal-overlay">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="routePlannerConfirmationTitle">' +
      '<div class="icon-wrapper route-planner-confirmation__icon-wrapper">' +
      '<span class="material-symbols-outlined route-planner-confirmation__icon">alt_route</span>' +
      '</div>' +
      '<h2 class="modal-title" id="routePlannerConfirmationTitle">Use Alternative Route?</h2>' +
      `<p class="modal-text">${message}</p>` +
      '<div class="route-planner-confirmation__summary" aria-label="Alternative route summary">' +
      '<div class="route-planner-confirmation__metric">' +
      '<span class="route-planner-confirmation__metric-label">Distance</span>' +
      `<strong class="route-planner-confirmation__metric-value">${formatDistance(route?.estimatedDistanceKm)}</strong>` +
      '</div>' +
      '<div class="route-planner-confirmation__metric">' +
      '<span class="route-planner-confirmation__metric-label">Duration</span>' +
      `<strong class="route-planner-confirmation__metric-value">${formatDuration(route?.estimatedDurationMinutes)}</strong>` +
      '</div>' +
      '</div>' +
      '<p class="route-planner-confirmation__note">This alternative route is available because of your selected avoidance preferences.</p>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-cancel" data-route-confirmation-cancel>Cancel</button>' +
      '<button type="button" class="btn btn-logout" data-route-confirmation-confirm>Use Alternative</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function closeAlternativeRouteConfirmation(accepted) {
    const host = getPageRoot()?.querySelector(CONFIRMATION_HOST_SELECTOR);

    if (plannerState.confirmationKeydownHandler) {
      document.removeEventListener('keydown', plannerState.confirmationKeydownHandler);
      plannerState.confirmationKeydownHandler = null;
    }

    if (host) {
      host.classList.add('hidden');
      host.innerHTML = '';
      host.onclick = null;
    }

    const resolver = plannerState.confirmationResolver;
    plannerState.confirmationResolver = null;

    if (typeof resolver === 'function') {
      resolver(Boolean(accepted));
    }
  }

  function promptAlternativeRouteConfirmation(routeResponse) {
    const root = getPageRoot();
    const suggestedRoute = routeResponse?.suggestedRoute;

    if (!root || !isRouteOption(suggestedRoute)) {
      return Promise.resolve(false);
    }

    ensureStyle(LOGOUT_MODAL_CSS);
    closeAlternativeRouteConfirmation(false);

    const host = getOrCreateConfirmationHost(root);
    if (!host) {
      return Promise.resolve(false);
    }

    host.innerHTML = buildConfirmationModalMarkup(
      suggestedRoute,
      normalizeText(routeResponse?.recommendation?.message) ||
        'An alternative route is available, but it adds significant travel time. Do you want to use it?',
      root.classList.contains('dark'),
    );
    host.classList.remove('hidden');
    host.onclick = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target === host || target.closest('[data-route-confirmation-cancel]')) {
        closeAlternativeRouteConfirmation(false);
        return;
      }

      if (target.closest('[data-route-confirmation-confirm]')) {
        closeAlternativeRouteConfirmation(true);
      }
    };

    plannerState.confirmationKeydownHandler = (event) => {
      if (event.key === 'Escape') {
        closeAlternativeRouteConfirmation(false);
      }
    };
    document.addEventListener('keydown', plannerState.confirmationKeydownHandler);

    return new Promise((resolve) => {
      plannerState.confirmationResolver = resolve;
    });
  }

  function renderMetrics(elements, route) {
    if (elements?.distanceValue) {
      elements.distanceValue.textContent = formatDistance(route?.estimatedDistanceKm);
    }

    if (elements?.durationValue) {
      elements.durationValue.textContent = formatDuration(
        route?.estimatedDurationMinutes,
      );
    }
  }

  function clearFactors(elements, emptyMessage) {
    if (elements?.factorsContainer) {
      elements.factorsContainer.innerHTML = '';
    }

    if (elements?.emptyFactors) {
      elements.emptyFactors.hidden = false;
      elements.emptyFactors.textContent =
        normalizeText(emptyMessage) ||
        'Calculate a route to see live conditions for this trip.';
    }
  }

  function clearRenderedRoute(elements, emptyFactorsMessage) {
    removeRouteLayers();
    renderMetrics(elements, null);
    clearFactors(elements, emptyFactorsMessage);
  }

  function normalizeRouteCoordinates(coordinates, endpoints) {
    if (!Array.isArray(coordinates)) {
      return [];
    }

    const normalizedCoordinates = coordinates
      .map((coordinate) => {
        const first = Number(coordinate?.[0]);
        const second = Number(coordinate?.[1]);

        if (!Number.isFinite(first) || !Number.isFinite(second)) {
          return null;
        }

        return [first, second];
      })
      .filter((coordinate) => Array.isArray(coordinate));

    if (!normalizedCoordinates.length) {
      return [];
    }

    if (!shouldSwapRouteCoordinateOrder(normalizedCoordinates, endpoints)) {
      return normalizedCoordinates;
    }

    return normalizedCoordinates.map(([first, second]) => [second, first]);
  }

  function toLeafletCoordinates(coordinates) {
    return normalizeRouteCoordinates(coordinates).map(([longitude, latitude]) => [
      latitude,
      longitude,
    ]);
  }

  function createRouteEndpointIcon(type) {
    const normalizedType = type === 'end' ? 'end' : 'start';
    const badgeLabel = normalizedType === 'start' ? 'A' : 'B';

    return global.L.divIcon({
      className: 'route-endpoint-icon',
      html:
        `<div class="route-endpoint-marker route-endpoint-marker--${normalizedType}" aria-hidden="true">` +
        '<span class="route-endpoint-marker__shape"></span>' +
        '<span class="material-symbols-outlined route-endpoint-marker__icon">navigation</span>' +
        `<span class="route-endpoint-marker__badge">${badgeLabel}</span>` +
        '</div>',
      iconSize: [40, 52],
      iconAnchor: [20, 46],
      popupAnchor: [0, -42],
    });
  }

  function drawRouteOnMap(map, routeCoordinates, fromLocation, toLocation) {
    if (!map || typeof global.L === 'undefined') {
      return;
    }

    const leafletCoordinates = toLeafletCoordinates(routeCoordinates);

    if (leafletCoordinates.length === 0) {
      throw new Error('The selected route did not return a drawable path.');
    }

    removeRouteLayers();
    plannerLayerGroup = global.L.layerGroup().addTo(map);

    const routeLayer = global.L.polyline(leafletCoordinates, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.85,
    }).addTo(plannerLayerGroup);
    routeLayer.bringToFront?.();

    global.L.marker([fromLocation.latitude, fromLocation.longitude], {
      icon: createRouteEndpointIcon('start'),
    })
      .addTo(plannerLayerGroup)
      .bindPopup(fromLocation.label || 'Start');

    global.L.marker([toLocation.latitude, toLocation.longitude], {
      icon: createRouteEndpointIcon('end'),
    })
      .addTo(plannerLayerGroup)
      .bindPopup(toLocation.label || 'Destination');

    map.fitBounds(routeLayer.getBounds(), {
      padding: [28, 28],
    });
  }

  function buildRouteEndpoints(fromLocation, toLocation) {
    const startLatitude = Number(fromLocation?.latitude);
    const startLongitude = Number(fromLocation?.longitude);
    const endLatitude = Number(toLocation?.latitude);
    const endLongitude = Number(toLocation?.longitude);

    if (
      !Number.isFinite(startLatitude) ||
      !Number.isFinite(startLongitude) ||
      !Number.isFinite(endLatitude) ||
      !Number.isFinite(endLongitude)
    ) {
      return null;
    }

    return {
      start: {
        latitude: startLatitude,
        longitude: startLongitude,
      },
      end: {
        latitude: endLatitude,
        longitude: endLongitude,
      },
    };
  }

  function shouldSwapRouteCoordinateOrder(coordinates, endpoints) {
    if (!endpoints || coordinates.length === 0) {
      return false;
    }

    const firstCoordinate = coordinates[0];
    const lastCoordinate = coordinates[coordinates.length - 1];
    const geoJsonScore = Math.min(
      calculateEndpointAlignmentScore(
        firstCoordinate,
        lastCoordinate,
        endpoints,
        false,
      ),
      calculateEndpointAlignmentScore(
        lastCoordinate,
        firstCoordinate,
        endpoints,
        false,
      ),
    );
    const swappedScore = Math.min(
      calculateEndpointAlignmentScore(
        firstCoordinate,
        lastCoordinate,
        endpoints,
        true,
      ),
      calculateEndpointAlignmentScore(
        lastCoordinate,
        firstCoordinate,
        endpoints,
        true,
      ),
    );

    return swappedScore + Number.EPSILON < geoJsonScore;
  }

  function calculateEndpointAlignmentScore(
    firstCoordinate,
    lastCoordinate,
    endpoints,
    shouldSwap,
  ) {
    const [firstLongitude, firstLatitude] = shouldSwap
      ? [firstCoordinate[1], firstCoordinate[0]]
      : [firstCoordinate[0], firstCoordinate[1]];
    const [lastLongitude, lastLatitude] = shouldSwap
      ? [lastCoordinate[1], lastCoordinate[0]]
      : [lastCoordinate[0], lastCoordinate[1]];

    return (
      calculateSquaredCoordinateDistance(
        firstLatitude,
        firstLongitude,
        endpoints.start.latitude,
        endpoints.start.longitude,
      ) +
      calculateSquaredCoordinateDistance(
        lastLatitude,
        lastLongitude,
        endpoints.end.latitude,
        endpoints.end.longitude,
      )
    );
  }

  function calculateSquaredCoordinateDistance(
    leftLatitude,
    leftLongitude,
    rightLatitude,
    rightLongitude,
  ) {
    const latitudeDelta = Number(leftLatitude) - Number(rightLatitude);
    const longitudeDelta = Number(leftLongitude) - Number(rightLongitude);
    return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta;
  }

  function normalizeRouteOptionGeometry(route, fromLocation, toLocation) {
    if (!isRouteOption(route)) {
      return route;
    }

    return {
      ...route,
      geometry: {
        ...route.geometry,
        coordinates: normalizeRouteCoordinates(
          route.geometry.coordinates,
          buildRouteEndpoints(fromLocation, toLocation),
        ),
      },
    };
  }

  function normalizeUpper(value) {
    return normalizeText(value).toUpperCase();
  }

  function buildRoutePreferenceState(input = {}) {
    const avoidCheckpoints = Boolean(input.avoidCheckpoints);
    const avoidIncidents = Boolean(input.avoidIncidents);
    let mode = ROUTE_PREFERENCE_MODE.NONE;

    if (avoidCheckpoints && avoidIncidents) {
      mode = ROUTE_PREFERENCE_MODE.BOTH;
    } else if (avoidCheckpoints) {
      mode = ROUTE_PREFERENCE_MODE.CHECKPOINTS_ONLY;
    } else if (avoidIncidents) {
      mode = ROUTE_PREFERENCE_MODE.INCIDENTS_ONLY;
    }

    return {
      avoidCheckpoints,
      avoidIncidents,
      mode,
      key: `${avoidCheckpoints ? 1 : 0}:${avoidIncidents ? 1 : 0}`,
    };
  }

  function getRoutePreferenceState(elements) {
    return buildRoutePreferenceState({
      avoidCheckpoints: elements?.avoidCheckpointsInput?.checked,
      avoidIncidents: elements?.avoidRestrictedInput?.checked,
    });
  }

  function isRoutePreferenceStateCurrent(preferences) {
    return preferences?.key === plannerState.latestPreferenceKey;
  }

  function buildRoutePayload(fromLocation, toLocation, preferences) {
    return {
      startLatitude: fromLocation.latitude,
      startLongitude: fromLocation.longitude,
      endLatitude: toLocation.latitude,
      endLongitude: toLocation.longitude,
      avoidCheckpoints: preferences.avoidCheckpoints,
      avoidIncidents: preferences.avoidIncidents,
    };
  }

  function getRequestedRouteConstraints(preferences) {
    const constraints = [];

    if (preferences?.avoidCheckpoints) {
      constraints.push(ROUTE_COMPLIANCE_CONSTRAINT.CHECKPOINTS);
    }

    if (preferences?.avoidIncidents) {
      constraints.push(ROUTE_COMPLIANCE_CONSTRAINT.INCIDENTS);
    }

    return constraints;
  }

  function isRouteConstraintSatisfied(route, constraint) {
    const constraintResults = Array.isArray(route?.metadata?.compliance?.constraintResults)
      ? route.metadata.compliance.constraintResults
      : [];
    const matchingResult = constraintResults.find(
      (result) => normalizeUpper(result?.constraint) === constraint,
    );

    return matchingResult ? matchingResult.satisfied === true : false;
  }

  function isRouteCompliantWithPreferences(route, preferences) {
    const requestedConstraints = getRequestedRouteConstraints(preferences);

    if (requestedConstraints.length === 0) {
      return true;
    }

    return requestedConstraints.every((constraint) =>
      isRouteConstraintSatisfied(route, constraint),
    );
  }

  function getNoCompliantRouteMessage(routeResponse) {
    return (
      normalizeText(routeResponse?.recommendation?.message) ||
      'No fully compliant route could be found for the selected avoidance preferences.'
    );
  }

  function renderNoCompliantRouteState(elements, routeResponse) {
    clearRenderedRoute(
      elements,
      'No affecting factors are shown because no fully compliant route is being displayed.',
    );
    setStatus(elements, getNoCompliantRouteMessage(routeResponse), 'error');
  }

  function buildEmptyRouteAnalysis() {
    return { checkpoints: [], incidents: [], restrictions: [] };
  }

  function normalizeRouteAnalysis(analysis) {
    if (!analysis) {
      return buildEmptyRouteAnalysis();
    }

    return {
      checkpoints: Array.isArray(analysis.checkpoints) ? analysis.checkpoints : [],
      incidents: Array.isArray(analysis.incidents) ? analysis.incidents : [],
      restrictions: Array.isArray(analysis.restrictions) ? analysis.restrictions : [],
    };
  }

  function isCheckpointOnlyPreference(preferences) {
    return preferences?.mode === ROUTE_PREFERENCE_MODE.CHECKPOINTS_ONLY;
  }

  function isIncidentOnlyPreference(preferences) {
    return preferences?.mode === ROUTE_PREFERENCE_MODE.INCIDENTS_ONLY;
  }

  function applyPreferenceAnalysis(analysis, preferences) {
    const normalizedAnalysis = normalizeRouteAnalysis(analysis);

    if (isCheckpointOnlyPreference(preferences)) {
      return {
        checkpoints: normalizedAnalysis.checkpoints,
        incidents: [],
        restrictions: normalizedAnalysis.restrictions.filter(
          (restriction) => restriction?.source === 'checkpoint',
        ),
      };
    }

    if (isIncidentOnlyPreference(preferences)) {
      return {
        checkpoints: [],
        incidents: normalizedAnalysis.incidents,
        restrictions: normalizedAnalysis.restrictions.filter(
          (restriction) => restriction?.source === 'incident',
        ),
      };
    }

    return normalizedAnalysis;
  }

  function projectToMeters(latitude, longitude, referenceLatitude) {
    const metersPerLatitudeDegree = 111320;
    const metersPerLongitudeDegree =
      111320 * Math.cos((referenceLatitude * Math.PI) / 180);

    return {
      x: longitude * metersPerLongitudeDegree,
      y: latitude * metersPerLatitudeDegree,
    };
  }

  function distanceToSegmentMeters(point, start, end) {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSquared === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const projection = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
          segmentLengthSquared,
      ),
    );

    const projectedX = start.x + projection * segmentX;
    const projectedY = start.y + projection * segmentY;

    return Math.hypot(point.x - projectedX, point.y - projectedY);
  }

  function buildProjectedRoute(routeCoordinates) {
    const normalizedCoordinates = normalizeRouteCoordinates(routeCoordinates);

    if (normalizedCoordinates.length === 0) {
      return null;
    }

    const referenceLatitude =
      normalizedCoordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) /
      normalizedCoordinates.length;

    return {
      referenceLatitude,
      points: normalizedCoordinates.map(([longitude, latitude]) =>
        projectToMeters(latitude, longitude, referenceLatitude),
      ),
    };
  }

  function distancePointToRouteMeters(latitude, longitude, projectedRoute) {
    if (!projectedRoute || projectedRoute.points.length === 0) {
      return Number.POSITIVE_INFINITY;
    }

    const projectedPoint = projectToMeters(
      latitude,
      longitude,
      projectedRoute.referenceLatitude,
    );

    if (projectedRoute.points.length === 1) {
      const onlyPoint = projectedRoute.points[0];
      return Math.hypot(projectedPoint.x - onlyPoint.x, projectedPoint.y - onlyPoint.y);
    }

    let shortestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < projectedRoute.points.length - 1; index += 1) {
      const segmentDistance = distanceToSegmentMeters(
        projectedPoint,
        projectedRoute.points[index],
        projectedRoute.points[index + 1],
      );

      if (segmentDistance < shortestDistance) {
        shortestDistance = segmentDistance;
      }
    }

    return shortestDistance;
  }

  function normalizeCheckpoint(checkpoint) {
    const latitude = Number(checkpoint?.latitude);
    const longitude = Number(checkpoint?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      id: checkpoint?.id,
      name: normalizeText(checkpoint?.name),
      location: normalizeText(checkpoint?.location),
      status: normalizeUpper(checkpoint?.currentStatus || checkpoint?.status),
      latitude,
      longitude,
    };
  }

  function normalizeIncident(incident) {
    const latitude = Number(incident?.latitude);
    const longitude = Number(incident?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      id: incident?.id,
      title: normalizeText(incident?.title),
      location: normalizeText(
        incident?.location || incident?.checkpoint?.location,
      ),
      type: normalizeUpper(incident?.type),
      severity: normalizeUpper(incident?.severity),
      status: normalizeUpper(incident?.status),
      latitude,
      longitude,
    };
  }

  function normalizeReportCategory(category) {
    return normalizeText(category).toLowerCase().replace(/-/g, '_');
  }

  function isApprovedReport(report) {
    return normalizeText(report?.status).toLowerCase() === 'approved';
  }

  function normalizeCheckpointReport(report) {
    if (
      !isApprovedReport(report) ||
      normalizeReportCategory(report?.category) !==
        REPORT_CATEGORY.CHECKPOINT_ISSUE
    ) {
      return null;
    }

    const latitude = Number(report?.latitude);
    const longitude = Number(report?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      id: report?.reportId,
      name: 'Reported checkpoint issue',
      location: normalizeText(report?.location),
      status: 'REPORTED',
      latitude,
      longitude,
      reported: true,
    };
  }

  function resolveReportIncidentType(category) {
    const normalizedCategory = normalizeReportCategory(category);

    if (normalizedCategory === REPORT_CATEGORY.ROAD_CLOSURE) return 'CLOSURE';
    if (normalizedCategory === REPORT_CATEGORY.DELAY) return 'DELAY';
    if (normalizedCategory === REPORT_CATEGORY.ACCIDENT) return 'ACCIDENT';
    if (normalizedCategory === REPORT_CATEGORY.HAZARD) return 'WEATHER_HAZARD';
    return '';
  }

  function normalizeIncidentReport(report) {
    if (!isApprovedReport(report)) {
      return null;
    }

    const type = resolveReportIncidentType(report?.category);

    if (!type) {
      return null;
    }

    const latitude = Number(report?.latitude);
    const longitude = Number(report?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      id: report?.reportId,
      title: 'Approved report',
      location: normalizeText(report?.location),
      type,
      severity:
        type === 'CLOSURE' || type === 'ACCIDENT' ? 'HIGH' : 'MEDIUM',
      status: 'ACTIVE',
      latitude,
      longitude,
      reported: true,
    };
  }

  function getCheckpointImpactRadiusMeters(checkpoint) {
    if (checkpoint.status === 'CLOSED' || checkpoint.status === 'RESTRICTED') {
      return 850;
    }

    if (checkpoint.status === 'DELAYED') {
      return 650;
    }

    if (checkpoint.status === 'REPORTED') {
      return 650;
    }

    return 420;
  }

  function getIncidentImpactRadiusMeters(incident) {
    let radius = 420;

    if (incident.severity === 'CRITICAL') {
      radius = 1100;
    } else if (incident.severity === 'HIGH') {
      radius = 850;
    } else if (incident.severity === 'MEDIUM') {
      radius = 620;
    }

    if (incident.type === 'CLOSURE') {
      radius = Math.max(radius, 900);
    } else if (incident.type === 'WEATHER_HAZARD') {
      radius = Math.max(radius, 700);
    } else if (incident.type === 'DELAY') {
      radius = Math.max(radius, 560);
    }

    return radius;
  }

  function countBy(items, getKey) {
    return items.reduce((counts, item) => {
      const key = getKey(item);
      if (!key) return counts;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function getIncidentTypeLabel(type) {
    if (type === 'CLOSURE') return 'closure';
    if (type === 'DELAY') return 'delay';
    if (type === 'ACCIDENT') return 'accident';
    if (type === 'WEATHER_HAZARD') return 'weather hazard';
    return 'incident';
  }

  function formatCheckpointMessage(checkpoints) {
    const total = checkpoints.length;
    const statusCounts = countBy(checkpoints, (checkpoint) =>
      checkpoint.status === 'OPEN' ? '' : checkpoint.status,
    );
    const details = [];

    if (statusCounts.CLOSED) details.push(`${statusCounts.CLOSED} closed`);
    if (statusCounts.RESTRICTED) details.push(`${statusCounts.RESTRICTED} restricted`);
    if (statusCounts.DELAYED) details.push(`${statusCounts.DELAYED} delayed`);
    if (statusCounts.REPORTED) details.push(`${statusCounts.REPORTED} reported`);

    if (details.length > 0) {
      return `${total} checkpoints ${total === 1 ? 'affects' : 'affect'} this route (${details.join(', ')})`;
    }

    return `${total} active checkpoint${total === 1 ? '' : 's'} ${total === 1 ? 'affects' : 'affect'} this route`;
  }

  function formatIncidentMessage(incidents) {
    const total = incidents.length;
    const typeCounts = countBy(incidents, (incident) => incident.type);
    const details = Object.entries(typeCounts).map(([type, count]) => {
      const label = getIncidentTypeLabel(type);
      return `${count} ${label}${count === 1 ? '' : 's'}`;
    });

    if (details.length > 0) {
      return `${total} incident${total === 1 ? '' : 's'} ${total === 1 ? 'affects' : 'affect'} this route (${details.join(', ')})`;
    }

    return `${total} incident${total === 1 ? '' : 's'} ${total === 1 ? 'affects' : 'affect'} this route`;
  }

  function formatRestrictedMessage(restrictions) {
    const total = restrictions.length;
    const checkpointRestrictions = restrictions.filter(
      (item) => item.source === 'checkpoint',
    ).length;
    const incidentRestrictions = restrictions.filter(
      (item) => item.source === 'incident',
    ).length;
    const details = [];

    if (checkpointRestrictions > 0) {
      details.push(
        `${checkpointRestrictions} restricted checkpoint${checkpointRestrictions === 1 ? '' : 's'}`,
      );
    }

    if (incidentRestrictions > 0) {
      details.push(
        `${incidentRestrictions} closure${incidentRestrictions === 1 ? '' : 's'}`,
      );
    }

    return `${total} restricted segment${total === 1 ? '' : 's'} ${total === 1 ? 'affects' : 'affect'} this route (${details.join(', ')})`;
  }

  function isWeatherHazard(weather) {
    const condition = normalizeText(weather?.conditionText).toLowerCase();
    const windKph = Number(weather?.windKph);

    return (
      /rain|snow|storm|thunder|fog|hail|drizzle/.test(condition) ||
      (Number.isFinite(windKph) && windKph >= 35)
    );
  }

  function buildWeatherFactor(weather) {
    if (!weather) return null;

    const conditionText = normalizeText(weather.conditionText);
    const temperatureCelsius = Number(weather.temperatureCelsius);
    const windKph = Number(weather.windKph);

    if (!conditionText || !Number.isFinite(temperatureCelsius)) {
      return null;
    }

    const hazardous = isWeatherHazard(weather);
    const parts = [`${conditionText}, ${Math.round(temperatureCelsius)}°C`];

    if (Number.isFinite(windKph)) {
      parts.push(`wind ${Math.round(windKph)} km/h`);
    }

    return {
      icon: hazardous ? 'thunderstorm' : 'cloud',
      className: hazardous ? 'factor-orange' : 'factor-blue',
      message: `${hazardous ? 'Weather may affect this route' : 'Current weather near this route'}: ${parts.join(', ')}`,
    };
  }

  function analyzeRouteFactors(routeCoordinates, contextData) {
    const projectedRoute = buildProjectedRoute(routeCoordinates);

    if (!projectedRoute) {
      return buildEmptyRouteAnalysis();
    }

    const reports = Array.isArray(contextData?.reports)
      ? contextData.reports
      : [];
    const checkpointReports = reports
      .map(normalizeCheckpointReport)
      .filter((checkpoint) => checkpoint !== null);
    const incidentReports = reports
      .map(normalizeIncidentReport)
      .filter((incident) => incident !== null);

    const checkpointData = Array.isArray(contextData?.checkpoints)
      ? contextData.checkpoints
      : [];
    const incidentData = Array.isArray(contextData?.incidents)
      ? contextData.incidents
      : [];

    const checkpoints = [
      ...checkpointData
        .map(normalizeCheckpoint)
        .filter((checkpoint) => checkpoint !== null),
      ...checkpointReports,
    ]
      .map((checkpoint) => ({
        ...checkpoint,
        distanceMeters: distancePointToRouteMeters(
          checkpoint.latitude,
          checkpoint.longitude,
          projectedRoute,
        ),
      }))
      .filter(
        (checkpoint) =>
          checkpoint.distanceMeters <= getCheckpointImpactRadiusMeters(checkpoint),
      )
      .sort((left, right) => left.distanceMeters - right.distanceMeters);

    const incidents = [
      ...incidentData
        .map(normalizeIncident)
        .filter((incident) => incident !== null && incident.status === 'ACTIVE'),
      ...incidentReports,
    ]
      .map((incident) => ({
        ...incident,
        distanceMeters: distancePointToRouteMeters(
          incident.latitude,
          incident.longitude,
          projectedRoute,
        ),
      }))
      .filter(
        (incident) =>
          incident.distanceMeters <= getIncidentImpactRadiusMeters(incident),
      )
      .sort((left, right) => left.distanceMeters - right.distanceMeters);

    const restrictions = [
      ...checkpoints
        .filter(
          (checkpoint) =>
            checkpoint.status === 'RESTRICTED' || checkpoint.status === 'CLOSED',
        )
        .map((checkpoint) => ({
          source: 'checkpoint',
          label: checkpoint.name || checkpoint.location || 'Restricted checkpoint',
        })),
      ...incidents
        .filter((incident) => incident.type === 'CLOSURE')
        .map((incident) => ({
          source: 'incident',
          label: incident.title || incident.location || 'Closure',
        })),
    ];

    return normalizeRouteAnalysis({ checkpoints, incidents, restrictions });
  }

  function appendFactor(container, factor) {
    if (!container || !factor) return;

    const pill = document.createElement('div');
    pill.className = `factor-pill ${factor.className}`;

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = factor.icon;

    const text = document.createElement('p');
    text.textContent = factor.message;

    pill.appendChild(icon);
    pill.appendChild(text);
    container.appendChild(pill);
  }

  function renderFactors(elements, analysis, weather) {
    if (!elements?.factorsContainer) return;

    elements.factorsContainer.innerHTML = '';
    let visibleCount = 0;

    if (analysis.checkpoints.length > 0) {
      appendFactor(elements.factorsContainer, {
        icon: 'security',
        className: 'factor-yellow',
        message: formatCheckpointMessage(analysis.checkpoints),
      });
      visibleCount += 1;
    }

    if (analysis.incidents.length > 0) {
      appendFactor(elements.factorsContainer, {
        icon: 'report_problem',
        className: 'factor-orange',
        message: formatIncidentMessage(analysis.incidents),
      });
      visibleCount += 1;
    }

    if (analysis.restrictions.length > 0) {
      appendFactor(elements.factorsContainer, {
        icon: 'block',
        className: 'factor-orange',
        message: formatRestrictedMessage(analysis.restrictions),
      });
      visibleCount += 1;
    }

    const weatherFactor = buildWeatherFactor(weather);
    if (weatherFactor) {
      appendFactor(elements.factorsContainer, weatherFactor);
      visibleCount += 1;
    }

    if (elements.emptyFactors) {
      elements.emptyFactors.hidden = visibleCount > 0;
    }
  }

  function isRouteOption(route) {
    return Array.isArray(route?.geometry?.coordinates) && route.geometry.coordinates.length > 0;
  }

  function selectRouteOption(routeResponse) {
    if (isRouteOption(routeResponse?.primaryRoute)) {
      return routeResponse.primaryRoute;
    }

    if (isRouteOption(routeResponse?.defaultRoute)) {
      return routeResponse.defaultRoute;
    }

    return isRouteOption(routeResponse) ? routeResponse : null;
  }

  function getWeatherPoint(routeCoordinates, fallbackLocation) {
    const normalizedCoordinates = normalizeRouteCoordinates(routeCoordinates);

    if (normalizedCoordinates.length === 0) {
      return fallbackLocation || null;
    }

    const midpoint = normalizedCoordinates[Math.floor(normalizedCoordinates.length / 2)];
    return { latitude: midpoint[1], longitude: midpoint[0] };
  }

  async function fetchRouteWeather(routeCoordinates, fallbackLocation, dependencies) {
    const weatherPoint = getWeatherPoint(routeCoordinates, fallbackLocation);

    if (!weatherPoint) {
      return null;
    }

    try {
      return await dependencies.getCurrentWeather(
        weatherPoint.latitude,
        weatherPoint.longitude,
      );
    } catch (error) {
      console.warn('Failed to load route weather context:', error);
      return null;
    }
  }

  async function calculateRoute() {
    const elements = getElements();
    const map = getMap();

    if (!elements || !map || typeof global.L === 'undefined') {
      return;
    }

    const dependencies = await getDependencies();
    const requestToken = ++plannerState.requestToken;
    const preferences = getRoutePreferenceState(elements);
    plannerState.latestPreferenceKey = preferences.key;

    setLoadingState(elements, true);
    clearRenderedRoute(elements);
    setStatus(elements, 'Resolving route locations...');

    try {
      const [fromLocation, toLocation] = await Promise.all([
        resolveLocationInput(elements.fromInput, {
          allowCurrentLocation: true,
          emptyMessage: 'Enter a starting location.',
          invalidMessage: 'Unable to resolve the selected starting location.',
        }),
        resolveLocationInput(elements.toInput, {
          emptyMessage: 'Enter a destination.',
          invalidMessage: 'Unable to resolve the selected destination.',
        }),
      ]);

      if (requestToken !== plannerState.requestToken) {
        return;
      }

      if (!isRoutePreferenceStateCurrent(preferences)) {
        return;
      }

      setStatus(elements, 'Calculating route...');

      const routePayload = buildRoutePayload(
        fromLocation,
        toLocation,
        preferences,
      );

      dependencies.cancelPendingRouteEstimates?.({
        keepPayload: routePayload,
      });

      const routeResponse = await dependencies.estimateRoute(routePayload);
      let selectedRoute = null;

      if (
        routeResponse?.recommendation?.requiresUserApproval &&
        isRouteOption(routeResponse?.suggestedRoute)
      ) {
        selectedRoute = routeResponse.suggestedRoute;
      } else {
        selectedRoute = selectRouteOption(routeResponse);
      }

      selectedRoute = normalizeRouteOptionGeometry(
        selectedRoute,
        fromLocation,
        toLocation,
      );

      if (!selectedRoute) {
        throw new Error('No route could be calculated for the selected points.');
      }

      if (requestToken !== plannerState.requestToken) {
        return;
      }

      if (!isRoutePreferenceStateCurrent(preferences)) {
        return;
      }

      if (!isRouteCompliantWithPreferences(selectedRoute, preferences)) {
        renderNoCompliantRouteState(elements, routeResponse);
        return;
      }

      const [contextResult, weatherResult] = await Promise.allSettled([
        dependencies.getRouteContextData(),
        fetchRouteWeather(
          selectedRoute.geometry.coordinates,
          toLocation,
          dependencies,
        ),
      ]);

      if (requestToken !== plannerState.requestToken) {
        return;
      }

      if (!isRoutePreferenceStateCurrent(preferences)) {
        return;
      }

      const finalRouteAnalysis = analyzeRouteFactors(
        selectedRoute.geometry.coordinates,
        contextResult.status === 'fulfilled' ? contextResult.value : null,
      );

      // Backend compliance metadata is the source of truth for whether
      // a checkpoint-only avoided route is valid. Frontend factor analysis
      // remains informational and must not veto drawing the route.
      drawRouteOnMap(
        map,
        selectedRoute.geometry.coordinates,
        fromLocation,
        toLocation,
      );
      renderMetrics(elements, selectedRoute);

      renderFactors(
        elements,
        applyPreferenceAnalysis(finalRouteAnalysis, preferences),
        weatherResult.status === 'fulfilled' ? weatherResult.value : null,
      );

      const warningMessage =
        selectedRoute?.metadata?.warnings?.[0] ||
        routeResponse?.recommendation?.warnings?.[0] ||
        '';
      setStatus(elements, warningMessage);
    } catch (error) {
      if (requestToken !== plannerState.requestToken) {
        return;
      }

      console.error('Failed to calculate route:', error);
      clearRenderedRoute(elements);
      setStatus(
        elements,
        getErrorMessage(error) || 'Unable to calculate the selected route.',
        'error',
      );
    } finally {
      if (requestToken === plannerState.requestToken) {
        setLoadingState(elements, false);
      }
    }
  }

  function requestRouteCalculation(options = {}) {
    const immediate = options.immediate === true;
    const requestedDelayMs = Number(options.delayMs);
    const delayMs =
      Number.isFinite(requestedDelayMs) && requestedDelayMs >= 0
        ? requestedDelayMs
        : 120;
    const elements = getElements();

    plannerState.requestToken += 1;
    plannerState.latestPreferenceKey = getRoutePreferenceState(elements).key;
    closeAlternativeRouteConfirmation(false);

    if (plannerState.calculationTimeoutId !== null) {
      global.clearTimeout(plannerState.calculationTimeoutId);
      plannerState.calculationTimeoutId = null;
    }

    if (immediate) {
      void calculateRoute();
      return;
    }

    plannerState.calculationTimeoutId = global.setTimeout(() => {
      plannerState.calculationTimeoutId = null;
      void calculateRoute();
    }, delayMs);
  }

  function bindInputEvents(input) {
    if (!input || input.dataset.routeInputBound === 'true') {
      return;
    }

    input.dataset.routeInputBound = 'true';

    input.addEventListener('input', () => {
      clearStoredLocation(input);
    });

    input.addEventListener('change', () => {
      requestRouteCalculation();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      requestRouteCalculation({ immediate: true });
    });
  }

  function bindRoutePlanner(root) {
    if (!root || root.dataset.routePlannerBound === 'true') {
      return;
    }

    root.dataset.routePlannerBound = 'true';

    const elements = getElements(root);
    if (!elements) return;

    bindInputEvents(elements.fromInput);
    bindInputEvents(elements.toInput);

    elements.avoidCheckpointsInput?.addEventListener('change', () => {
      requestRouteCalculation();
    });
    elements.avoidRestrictedInput?.addEventListener('change', () => {
      requestRouteCalculation();
    });
    elements.submitButton?.addEventListener('click', () => {
      requestRouteCalculation({ immediate: true });
    });
  }

  async function initRoutePlannerPage() {
    const root = getPageRoot();
    const map = getMap();

    if (!root || !map || root.dataset.routePlannerInitialized === 'true') {
      return;
    }

    root.dataset.routePlannerInitialized = 'true';
    bindRoutePlanner(root);
    renderMetrics(getElements(root), null);
    void loadBackgroundMapMarkers();
    await calculateRoute();
  }

  function destroyRoutePlannerPage() {
    resetPlannerState();
  }

  global.RoutePlannerLogic = {
    drawRouteOnMap: calculateRoute,
    clearRouteLayers: resetPlannerState,
    getMap,
  };

  global.RoutePlannerPage = {
    init: initRoutePlannerPage,
    destroy: destroyRoutePlannerPage,
  };
})(window);
