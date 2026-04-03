import { FilterController } from '/Controllers/filter.controller.js';
import { MapMarkerController } from '/Controllers/map-marker.controller.js';
import { connectHomeFilterButtons } from '/features/citizen/home/filter_btn.js';

let mainContainerObserver = null;
let markerController = null;
let filterController = null;
let activeHomeRoot = null;
let initializeInProgress = false;

function isHomeRouteActive() {
  const route = String(window.location.hash || '#home')
    .replace(/^#/, '')
    .trim()
    .toLowerCase();

  return route === '' || route === 'home';
}

function getMapInstance() {
  return window.AppMapShared?.getMapInstance?.() || null;
}

function waitForMapInstance(timeoutMs = 8000, stepMs = 100) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    function check() {
      const map = getMapInstance();
      const mapElement = document.getElementById('map');

      if (map && mapElement) {
        resolve(map);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(null);
        return;
      }

      window.setTimeout(check, stepMs);
    }

    check();
  });
}

function getHomeRoot() {
  return document.querySelector('#spa-page-home');
}

async function ensureFilterControllerReady() {
  if (!markerController) {
    markerController = new MapMarkerController(getMapInstance);
  }

  if (!filterController) {
    filterController = new FilterController(markerController);
  }

  const map = await waitForMapInstance();
  return Boolean(map);
}

async function applyHomeFilters(payload) {
  const isReady = await ensureFilterControllerReady();

  if (!isReady || !filterController) {
    console.warn('Home map is not ready yet, skipping filter apply request.');
    return {
      incidents: [],
      checkpoints: [],
    };
  }

  return filterController.applyFilters(payload);
}

async function initializeHomeFiltering() {
  if (!isHomeRouteActive() || initializeInProgress) {
    return;
  }

  const homeRoot = getHomeRoot();
  if (!homeRoot) {
    return;
  }

  initializeInProgress = true;

  try {
    const hasNewHomeRoot = activeHomeRoot !== homeRoot;
    activeHomeRoot = homeRoot;

    const { didBind, filterUI } = connectHomeFilterButtons(homeRoot, {
      onApply: (payload) => {
        void applyHomeFilters(payload);
      },
      onClear: (payload) => {
        void applyHomeFilters(payload);
      },
    });

    if (!didBind || !filterUI) {
      return;
    }

    if (hasNewHomeRoot || homeRoot.dataset.homeFiltersBootstrapped !== 'true') {
      homeRoot.dataset.homeFiltersBootstrapped = 'true';
      await applyHomeFilters(filterUI.readRawFilters());
    }
  } finally {
    initializeInProgress = false;
  }
}

function watchRouteContentChanges() {
  if (mainContainerObserver || typeof window.MutationObserver === 'undefined') {
    return;
  }

  const mainContainer = document.getElementById('flexible_main');
  if (!mainContainer) {
    return;
  }

  mainContainerObserver = new window.MutationObserver(() => {
    void initializeHomeFiltering();
  });

  mainContainerObserver.observe(mainContainer, {
    childList: true,
    subtree: true,
  });
}

export function initHomePage() {
  document.addEventListener('DOMContentLoaded', () => {
    watchRouteContentChanges();
    void initializeHomeFiltering();
  });

  window.addEventListener('hashchange', () => {
    void initializeHomeFiltering();
  });

  window.addEventListener('popstate', () => {
    void initializeHomeFiltering();
  });

  if (document.readyState !== 'loading') {
    watchRouteContentChanges();
    void initializeHomeFiltering();
  }
}
