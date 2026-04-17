(function (global) {
  const routing = (global.Routing = global.Routing || {});
  const routeUtils = routing.routeUtils;
  const runtime = routing.runtime;
  let flexibleMain = null;

  async function handleLocation() {
    if (!flexibleMain) return;

    const path = routeUtils.normalizeRoute(global.location.hash);
    const routePath = routeUtils.getRoutePath(path);

    global.updateActiveLink?.();
    runtime.applyPageChrome(path);
    runtime.cleanupMapRuntime();
    global.CitizenPreview?.applyShellState?.();

    try {
      const res = await fetch(routePath);
      if (!res.ok) {
        throw new Error("Failed to fetch route: " + routePath);
      }

      const html = await res.text();
      const assets = routeUtils.extractPageAssets
        ? routeUtils.extractPageAssets(html, routePath)
        : null;

      if (assets && runtime.loadPageAssets) {
        await runtime.loadPageAssets(assets);
      }

      flexibleMain.innerHTML = routeUtils.extractPageContent(html, path);

      if (path === "home") {
        await runtime.initHomeRuntime();
      } else if (path === "route-planner") {
        await runtime.initRoutePlannerRuntime?.();
      }

      global.WaselUserLanguage?.refreshLanguage?.();
    } catch (err) {
      console.error(err);
      flexibleMain.innerHTML = "<h1>Error loading page</h1>";
    }
  }

  function route(event) {
    event.preventDefault();

    const link = event.currentTarget || event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "#home";
    global.history.pushState({}, "", href);
    handleLocation();
  }

  function attachNavigationEvents() {
    global.onpopstate = handleLocation;
    global.addEventListener("hashchange", handleLocation);
  }

  function initRouter(mainElementId) {
    const targetId = mainElementId || "flexible_main";
    flexibleMain = document.getElementById(targetId);

    attachNavigationEvents();
    global.route = route;

    handleLocation();
  }

  routing.navigation = {
    initRouter,
    handleLocation,
    route,
  };
})(window);
