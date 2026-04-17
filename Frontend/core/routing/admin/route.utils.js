(function (global) {
  const routing = (global.AdminRouting = global.AdminRouting || {});
  const config = routing.config || {};

  function normalizeRoute(routeValue, defaultRoute) {
    const fallback = defaultRoute || config.DEFAULT_ROUTE || "admin-dashboard";
    const value = String(routeValue || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase();

    if (!value) return fallback;
    return value;
  }

  function getRoutePath(routeKey) {
    const routePaths = config.ROUTE_PATHS || {};
    return routePaths[routeKey] || routePaths[404] || routePaths[config.DEFAULT_ROUTE];
  }

  function extractPageContent(htmlText, routeKey) {
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const namespaces = config.PAGE_NAMESPACE_SELECTORS || {};
    const namespacedRoot = doc.querySelector(namespaces[routeKey] || "");

    if (namespacedRoot) {
      return namespacedRoot.outerHTML;
    }

    const mainElement = doc.querySelector("main");
    if (mainElement) {
      return mainElement.outerHTML;
    }

    return doc.body ? doc.body.innerHTML : htmlText;
  }

  function extractPageContentFromDoc(doc, routeKey) {
    if (!doc) return "";
    const namespaces = config.PAGE_NAMESPACE_SELECTORS || {};
    const namespacedRoot = doc.querySelector(namespaces[routeKey] || "");
    if (namespacedRoot) return namespacedRoot.outerHTML;
    const mainElement = doc.querySelector("main");
    if (mainElement) return mainElement.outerHTML;
    return doc.body ? doc.body.innerHTML : "";
  }

  function resolveAssetUrl(assetUrl, pagePath) {
    const value = String(assetUrl || "").trim();
    if (!value) return value;

    const isAbsoluteLike =
      value.startsWith("/") ||
      value.startsWith("//") ||
      /^[a-z][a-z0-9+.-]*:/i.test(value);

    if (isAbsoluteLike) {
      return value;
    }

    if (!pagePath) {
      return value;
    }

    try {
      const origin = global.location?.origin || "";
      const baseUrl = new URL(pagePath, origin);
      const resolved = new URL(value, baseUrl);
      return resolved.pathname + resolved.search + resolved.hash;
    } catch (_error) {
      return value;
    }
  }

  function extractPageAssets(htmlText, pagePath) {
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    return extractPageAssetsFromDoc(doc, pagePath);
  }

  function extractPageAssetsFromDoc(doc, pagePath) {
    if (!doc) return { styles: [], scripts: [] };
    const styles = Array.from(
      doc.querySelectorAll('link[rel="stylesheet"][href]'),
    )
      .map((node) => node.getAttribute("href"))
      .filter(Boolean)
      .map((href) => resolveAssetUrl(href, pagePath));

    const scripts = Array.from(doc.querySelectorAll("script[src]"))
      .map((node) => {
        const src = node.getAttribute("src");
        if (!src) return null;

        return {
          src: resolveAssetUrl(src, pagePath),
          type: node.getAttribute("type") || "",
        };
      })
      .filter(Boolean);

    return {
      styles,
      scripts,
    };
  }

  routing.routeUtils = {
    normalizeRoute,
    getRoutePath,
    extractPageContent,
    extractPageContentFromDoc,
    extractPageAssets,
    extractPageAssetsFromDoc,
  };
})(window);
