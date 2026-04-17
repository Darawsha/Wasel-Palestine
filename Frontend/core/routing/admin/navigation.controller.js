(function (global) {
  const routing = (global.AdminRouting = global.AdminRouting || {});
  const routeUtils = routing.routeUtils;
  const runtime = routing.runtime;
  const config = routing.config || {};
  let flexibleMain = null;

 async function handleLocation() {
    if (!flexibleMain) return;

    const rawHash = global.location.hash;
    const routeKey = routeUtils.normalizeRoute(rawHash, config.DEFAULT_ROUTE);
    const routePath = routeUtils.getRoutePath(routeKey);

    if (rawHash !== "#" + routeKey) {
        global.history.replaceState({}, "", "#" + routeKey);
    }

    runtime.beginPageTransition?.();
    runtime.applyPageChrome?.(routeKey);

    if (!routePath) {
        flexibleMain.innerHTML = "<h1>Page not found</h1>";
        return;
    }

    try {
        const res = await fetch(routePath);
        if (!res.ok) throw new Error("Failed to fetch route: " + routePath);

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const assets =
            (routeUtils.extractPageAssetsFromDoc &&
                routeUtils.extractPageAssetsFromDoc(doc, routePath)) ||
            routeUtils.extractPageAssets?.(html, routePath);

        // 🔹 1. Hide content
        flexibleMain.style.visibility = "hidden";

        // 🔹 2. Clean old CSS
        runtime.cleanupPageAssets?.();

        // 🔹 3. Load new CSS
        if (assets) await runtime.loadPageStyles?.(assets);

        // 🔹 4. Inject HTML
        flexibleMain.innerHTML =
            routeUtils.extractPageContentFromDoc?.(doc, routeKey) ||
            routeUtils.extractPageContent?.(html, routeKey);

        // 🔹 5. Apply layout / chrome
        runtime.applyPageChrome?.(routeKey);

        // 🔹 6. Load scripts
        if (assets) {
            await runtime
                .loadPageScripts?.(assets)
                ?.catch((err) => console.error("Admin assets load failed:", err));
        }

        global.dispatchEvent(
            new CustomEvent("admin:route-loaded", {
                detail: { routeKey },
            })
        );

        // 🔹 7. Show content (after CSS applied)
        requestAnimationFrame(() => {
            flexibleMain.style.visibility = "visible";
        });

    } catch (err) {
        console.error(err);
        flexibleMain.innerHTML = "<h1>Error loading page</h1>";
    }
}

  function route(event) {
    if (event) {
      event.preventDefault();
    }

    const link = event?.currentTarget || event?.target?.closest("a");
    const href = (link?.getAttribute("href") || "#" + config.DEFAULT_ROUTE).trim();

    const nextRoute = routeUtils.normalizeRoute(href, config.DEFAULT_ROUTE);
    const currentRoute = routeUtils.normalizeRoute(
      global.location.hash,
      config.DEFAULT_ROUTE
    );

    // Prevent duplicate navigation
    if (nextRoute === currentRoute) {
      handleLocation();
      return;
    }

    global.history.pushState({}, "", href);
    handleLocation();
  }

  function attachNavigationEvents() {
    global.onpopstate = handleLocation;
    global.addEventListener("hashchange", handleLocation);
  }

  function initRouter(mainElementId) {
    flexibleMain = document.getElementById(
      mainElementId || "flexible_main"
    );

    if (!flexibleMain) {
      console.warn(
        "Admin router could not find mount element:",
        mainElementId
      );
      return;
    }

    attachNavigationEvents();
    global.adminRoute = route;

    // Initial load
    handleLocation();
  }

  routing.navigation = {
    initRouter,
    handleLocation,
    route,
  };
})(window);
