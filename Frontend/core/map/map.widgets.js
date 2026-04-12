(function (global) {
  const widgetsState = {
    home: {
      map: null,
      watchId: null,
      locationController: null,
    },
    routePlanner: {
      map: null,
    },
  };

  function getShared() {
    return global.AppMapShared || {};
  }

  function getGeolocation() {
    return global.AppMapGeolocation || {};
  }

  function initHomeMapWidget() {
    const mapElement = document.getElementById("map");
    if (!mapElement || typeof global.L === "undefined") return;

    destroyHomeMapWidget();

    const shared = getShared();
    widgetsState.home.map = shared.createMap?.(
      mapElement,
      shared.MAP_VIEWS?.home,
    );
    if (!widgetsState.home.map) return;

    shared.addBaseLayer?.(widgetsState.home.map);

    widgetsState.home.locationController =
      getGeolocation().createHomeLocationController?.(widgetsState.home.map);

    if (
      widgetsState.home.locationController &&
      "geolocation" in navigator &&
      typeof navigator.geolocation.watchPosition === "function"
    ) {
      widgetsState.home.watchId = navigator.geolocation.watchPosition(
        widgetsState.home.locationController.onSuccess,
        widgetsState.home.locationController.onError,
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        },
      );
    }
  }

  function destroyHomeMapWidget() {
    if (
      widgetsState.home.watchId !== null &&
      "geolocation" in navigator &&
      typeof navigator.geolocation.clearWatch === "function"
    ) {
      navigator.geolocation.clearWatch(widgetsState.home.watchId);
      widgetsState.home.watchId = null;
    }

    widgetsState.home.locationController?.teardown?.();
    widgetsState.home.locationController = null;

    if (widgetsState.home.map) {
      getShared().destroyMap?.(widgetsState.home.map);
      widgetsState.home.map = null;
    }
  }

  function initRoutePlannerMapWidget() {
    const mapElement = document.getElementById("static-map");
    if (!mapElement || typeof global.L === "undefined") return;

    destroyRoutePlannerMapWidget();

    const shared = getShared();
    widgetsState.routePlanner.map = shared.createMap?.(
      mapElement,
      shared.MAP_VIEWS?.routePlanner,
      { zoomControl: true },
    );

    if (!widgetsState.routePlanner.map) return;

    shared.addBaseLayer?.(widgetsState.routePlanner.map);
  }

  function destroyRoutePlannerMapWidget() {
    if (!widgetsState.routePlanner.map) return;

    getShared().destroyMap?.(widgetsState.routePlanner.map);
    widgetsState.routePlanner.map = null;
  }

  function initMapForRoute(routeKey) {
    if (routeKey === "home") {
      initHomeMapWidget();
      return;
    }

    if (routeKey === "route-planner") {
      initRoutePlannerMapWidget();
    }
  }

  function destroyMapForRoute(routeKey) {
    if (routeKey === "home") {
      destroyHomeMapWidget();
      return;
    }

    if (routeKey === "route-planner") {
      destroyRoutePlannerMapWidget();
    }
  }

  function destroyAllMaps() {
    destroyHomeMapWidget();
    destroyRoutePlannerMapWidget();
  }

  function getMapForRoute(routeKey) {
    if (routeKey === "home") {
      return widgetsState.home.map;
    }

    if (routeKey === "route-planner") {
      return widgetsState.routePlanner.map;
    }

    return null;
  }

  global.AppMapWidgets = {
    initHomeMapWidget,
    destroyHomeMapWidget,
    initRoutePlannerMapWidget,
    destroyRoutePlannerMapWidget,
    initMapForRoute,
    destroyMapForRoute,
    destroyAllMaps,
    getMapForRoute,
  };
})(window);
