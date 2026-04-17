(function (global) {
  const routing = (global.AdminRouting = global.AdminRouting || {});
  const config = routing.config || {};

  let currentPageAssets = { styles: new Set(), inline: new Set(), scripts: new Set() };
  let previousPageAssets = { styles: new Set(), inline: new Set(), scripts: new Set() };

  function ensureScript(scriptAsset) {
    const src =
      typeof scriptAsset === "string" ? scriptAsset : scriptAsset?.src;
    const type =
      typeof scriptAsset === "string" ? "" : scriptAsset?.type || "";

    if (!src) return Promise.resolve();
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      // Only track scripts we created; ignore baseline/global scripts
      if (existing.dataset.adminPageAsset === "script") {
        currentPageAssets.scripts.add(existing);
      }
      return Promise.resolve(existing);
    }

    const script = document.createElement("script");
    script.src = src;
    if (type) {
      script.type = type;
    }
    script.dataset.adminPageAsset = "script";
    currentPageAssets.scripts.add(script);

    return new Promise((resolve, reject) => {
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error("Unable to load script: " + src));
      document.body.appendChild(script);
    });
  }

  function ensureStyle(href) {
    if (!href) return Promise.resolve();
    const existing = document.querySelector('link[rel="stylesheet"][href="' + href + '"]');
    if (existing) {
      // Only track styles we injected; leave baseline head links alone
      if (existing.dataset.adminPageAsset === "style") {
        currentPageAssets.styles.add(existing);
      }
      return Promise.resolve(existing);
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.adminPageAsset = "style";
    currentPageAssets.styles.add(link);

    return new Promise((resolve, reject) => {
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error("Unable to load stylesheet: " + href));
      document.head.appendChild(link);
    });
  }

  async function loadPageAssets(assets) {
    if (!assets) return;
    const styles = Array.isArray(assets.styles) ? assets.styles : [];
    const scripts = Array.isArray(assets.scripts) ? assets.scripts : [];

    await Promise.all(styles.map((href) => ensureStyle(href)));
    await Promise.all(scripts.map((src) => ensureScript(src)));
  }

  async function loadPageStyles(assets) {
    if (!assets) return;
    const styles = Array.isArray(assets.styles) ? assets.styles : [];
    await Promise.all(styles.map((href) => ensureStyle(href)));
  }

  function loadPageScripts(assets) {
    if (!assets) return Promise.resolve();
    const scripts = Array.isArray(assets.scripts) ? assets.scripts : [];
    return Promise.all(scripts.map((src) => ensureScript(src)));
  }

  function formatRouteTitle(routeKey) {
    const titles = config.ROUTE_TITLES || {};
    if (titles[routeKey]) return titles[routeKey];

    const raw = String(routeKey || "")
      .replace(/^admin-/, "")
      .replace(/-/g, " ")
      .trim();

    if (!raw) return "Admin";

    return raw.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function setPageTitle(routeKey) {
    const friendly = formatRouteTitle(routeKey);
    document.title = "Wasel Palestine | " + friendly;

    const titleEl = document.getElementById("current-page-title");
    if (titleEl) {
      titleEl.textContent = friendly;
    }
  }

  function updateActiveNav(routeKey) {
    const routeUtils = routing.routeUtils || {};
    const currentHash = "#" + routeKey;

    // Header nav links
    document.querySelectorAll(".nav-link").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const normalized = routeUtils.normalizeRoute?.(href, config.DEFAULT_ROUTE);
      const isActive = href === currentHash || normalized === routeKey;
      link.classList.toggle("active", !!isActive);
    });

    // Sidebar items
    document.querySelectorAll(".nav-item").forEach((item) => {
      const href =
        item.getAttribute("href") ||
        item.querySelector("a")?.getAttribute("href") ||
        "";
      if (!href || href === "#") {
        item.classList.remove("active-nav");
        return;
      }
      const normalized = routeUtils.normalizeRoute?.(href, config.DEFAULT_ROUTE);
      const isActive = href === currentHash || normalized === routeKey;
      item.classList.toggle("active-nav", !!isActive);
    });
  }

  function applyPageChrome(routeKey) {
    global.scrollTo(0, 0);
    setPageTitle(routeKey);
    updateActiveNav(routeKey);
  }

  function cleanupPageAssets() {
    previousPageAssets.styles.forEach((el) => {
      if (!currentPageAssets.styles.has(el)) {
        el.remove();
      }
    });
    previousPageAssets.inline.forEach((el) => {
      if (!currentPageAssets.inline.has(el)) {
        el.remove();
      }
    });
    previousPageAssets.scripts.forEach((el) => {
      if (!currentPageAssets.scripts.has(el)) {
        el.remove();
      }
    });
    previousPageAssets.styles.clear();
    previousPageAssets.inline.clear();
    previousPageAssets.scripts.clear();
  }

  routing.runtime = {
    beginPageTransition: function beginPageTransition() {
      previousPageAssets = currentPageAssets;
      currentPageAssets = { styles: new Set(), inline: new Set(), scripts: new Set() };
    },
    cleanupPageAssets,
    loadPageAssets,
    loadPageStyles,
    loadPageScripts,
    applyPageChrome,
    formatRouteTitle,
    updateActiveNav,
    injectInlineStyles: function injectInlineStyles() {
      // Disabled: avoid page-level inline styles leaking into shared chrome (sidebar/header)
      return;
    },
  };
})(window);
