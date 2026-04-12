(function (global) {
  const routing = (global.Routing = global.Routing || {});
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  const SHARED_MAP_RUNTIME_JS = "/core/map/map.shared.js";
  const MAP_GEOLOCATION_RUNTIME_JS = "/core/map/map.geolocation.js";
  const MAP_WIDGETS_RUNTIME_JS = "/core/map/map.widgets.js";
  const ROUTE_PLANNER_LOGIC_JS =
    "/features/citizen/route-planner/RoutePlannerPage.js";
  const ROUTE_PLANNER_LIFECYCLE_JS =
    "/features/citizen/route-planner/RoutePlannerPage.lifecycle.js";

  function getMapWidgets() {
    return global.AppMapWidgets || {};
  }

  function cleanupMapRuntime() {
    getMapWidgets().destroyAllMaps?.();
    global.destroyWeatherWidget?.();
    global.RoutePlannerPage?.destroy?.();
  }

  function ensureScript(src) {
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      return Promise.resolve(existing);
    }

    const script = document.createElement("script");
    script.src = src;

    return new Promise((resolve, reject) => {
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error("Unable to load script: " + src));
      document.body.appendChild(script);
    });
  }

  function ensureStyle(href) {
    const existing = document.querySelector(
      'link[rel="stylesheet"][href="' + href + '"]',
    );
    if (existing) {
      return Promise.resolve(existing);
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;

    return new Promise((resolve, reject) => {
      link.onload = () => resolve(link);
      link.onerror = () =>
        reject(new Error("Unable to load stylesheet: " + href));
      document.head.appendChild(link);
    });
  }

  async function loadPageAssets(assets) {
    if (!assets) return;

    const styles = Array.isArray(assets.styles) ? assets.styles : [];
    const scripts = Array.isArray(assets.scripts) ? assets.scripts : [];

    for (const href of styles) {
      await ensureStyle(href);
    }

    for (const src of scripts) {
      await ensureScript(src);
    }
  }

  async function initHomeRuntime() {
    await ensureScript(LEAFLET_JS);
    await ensureScript(SHARED_MAP_RUNTIME_JS);
    await ensureScript(MAP_GEOLOCATION_RUNTIME_JS);
    await ensureScript(MAP_WIDGETS_RUNTIME_JS);
    await ensureScript("/core/api/Weather.js");

    if (typeof global.initWeatherWidget === "function") {
      global.initWeatherWidget();
    }

    getMapWidgets().initMapForRoute?.("home");
  }

  function cleanupRoutePlannerRuntime() {
    getMapWidgets().destroyMapForRoute?.("route-planner");
    global.RoutePlannerPage?.destroy?.();
  }

  async function initRoutePlannerRuntime() {
    await ensureScript(LEAFLET_JS);
    await ensureScript(SHARED_MAP_RUNTIME_JS);
    await ensureScript(MAP_WIDGETS_RUNTIME_JS);
    getMapWidgets().initMapForRoute?.("route-planner");
    await ensureScript(ROUTE_PLANNER_LOGIC_JS);
    await ensureScript(ROUTE_PLANNER_LIFECYCLE_JS);
    global.RoutePlannerPage?.init?.();
  }

  function applyPageChrome(routeKey) {
    global.scrollTo(0, 0);
    document.body.style.overflowY = routeKey === "home" ? "hidden" : "auto";
  }

  routing.runtime = {
    cleanupMapRuntime,
    cleanupRoutePlannerRuntime,
    initHomeRuntime,
    initRoutePlannerRuntime,
    loadPageAssets,
    applyPageChrome,
  };
})(window);

