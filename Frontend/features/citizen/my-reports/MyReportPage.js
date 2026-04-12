(function (global) {
  const PAGE_SELECTOR = '#spa-page-myreports';

  let dependenciesPromise = null;
  let pageState = null;
  let activeRenderId = 0;

  function getPageRoot() {
    return global.document.querySelector(PAGE_SELECTOR);
  }

  function applyTheme(root) {
    if (!root) {
      return;
    }

    root.classList.toggle(
      'dark',
      global.localStorage?.getItem('darkmode') === 'enabled',
    );
  }

  function notify(type, message) {
    if (type === 'success' && typeof global.showSuccess === 'function') {
      global.showSuccess(message);
      return;
    }

    if (type === 'error' && typeof global.showError === 'function') {
      global.showError(message);
      return;
    }

    global.alert(message);
  }

  function readErrorMessage(error) {
    const responseData = error?.response?.data;

    if (Array.isArray(responseData?.message)) {
      return responseData.message.join('\n');
    }

    if (typeof responseData?.message === 'string') {
      return responseData.message;
    }

    if (typeof responseData === 'string') {
      return responseData;
    }

    return error?.message || 'Unable to complete this request.';
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Controllers/reports.controller.js'),
        import('./reports-state.js'),
        import('./reports-ui-renderer.js'),
        import('./reports-event-handlers.js'),
      ]).then(
        ([
          controllerModule,
          stateModule,
          rendererModule,
          eventHandlersModule,
        ]) => ({
          controller: controllerModule,
          state: stateModule,
          renderer: rendererModule,
          bindReportsPageEvents: eventHandlersModule.bindReportsPageEvents,
        }),
      );
    }

    return dependenciesPromise;
  }

  function requestCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!global.navigator?.geolocation) {
        reject(new Error('Geolocation is not available in this browser.'));
        return;
      }

      global.navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });
    });
  }

  async function ensureCommunityLocation(forceRefresh = false) {
    const { state } = await getDependencies();

    if (!pageState) {
      return;
    }

    if (
      !forceRefresh &&
      pageState.community.location.status === 'ready' &&
      typeof pageState.community.location.latitude === 'number' &&
      typeof pageState.community.location.longitude === 'number'
    ) {
      return;
    }

    state.setCommunityLocation(pageState, {
      status: 'loading',
      latitude: null,
      longitude: null,
    });

    try {
      const position = await requestCurrentPosition();
      state.setCommunityLocation(pageState, {
        status: 'ready',
        latitude: Number(position.coords.latitude),
        longitude: Number(position.coords.longitude),
      });
    } catch (error) {
      const denied =
        error?.code === 1 || /denied|permission/i.test(String(error?.message || ''));
      state.setCommunityLocation(pageState, {
        status: denied ? 'denied' : 'error',
        latitude: null,
        longitude: null,
      });
    }
  }

  async function loadMyReports() {
    const root = getPageRoot();
    if (!root || !pageState) {
      return;
    }

    const requestId = ++activeRenderId;
    const { controller, state, renderer } = await getDependencies();

    renderer.renderReportsLoading(root, pageState, 'Loading your reports...');

    let payload;
    try {
      payload = await controller.loadMyReportsPage({
        tab: pageState.myReports.tab,
        page: pageState.myReports.page,
        limit: pageState.myReports.limit,
      });
    } catch (error) {
      if (requestId !== activeRenderId) {
        return;
      }

      renderer.renderReportsError(root, pageState, readErrorMessage(error));
      return;
    }

    if (requestId !== activeRenderId) {
      return;
    }

    state.setMyReportsPayload(pageState, payload);
    renderer.renderMyReports(root, pageState, payload.data);
  }

  async function loadCommunityReports(forceRefreshLocation = false) {
    const root = getPageRoot();
    if (!root || !pageState) {
      return;
    }

    const requestId = ++activeRenderId;
    const { controller, state, renderer } = await getDependencies();

    renderer.renderReportsLoading(
      root,
      pageState,
      'Loading community reports...',
    );

    await ensureCommunityLocation(forceRefreshLocation);

    const query = {
      page: pageState.community.page,
      limit: pageState.community.limit,
      radiusKm: pageState.community.radiusKm,
    };

    if (
      pageState.community.location.status === 'ready' &&
      typeof pageState.community.location.latitude === 'number' &&
      typeof pageState.community.location.longitude === 'number'
    ) {
      query.latitude = pageState.community.location.latitude;
      query.longitude = pageState.community.location.longitude;
    }

    let payload;
    try {
      payload = await controller.loadCommunityReportsPage(query);
    } catch (error) {
      if (requestId !== activeRenderId) {
        return;
      }

      renderer.renderReportsError(root, pageState, readErrorMessage(error));
      return;
    }

    if (requestId !== activeRenderId) {
      return;
    }

    state.setCommunityPayload(pageState, payload);
    renderer.renderCommunityReports(root, pageState, payload.data);
  }

  async function renderCurrentView(options = {}) {
    const root = getPageRoot();
    if (!root || !pageState) {
      return;
    }

    applyTheme(root);

    if (pageState.view === 'community') {
      await loadCommunityReports(Boolean(options.forceRefreshLocation));
      return;
    }

    await loadMyReports();
  }

  async function initializeMyReportsPage() {
    const root = getPageRoot();
    if (!root || root.dataset.myReportsInitialized === 'true') {
      return;
    }

    const dependencies = await getDependencies();
    pageState = dependencies.state.createReportsState();
    root.dataset.myReportsInitialized = 'true';

    dependencies.bindReportsPageEvents(root, {
      onViewChange: async (view) => {
        if (!pageState || pageState.view === view) {
          return;
        }

        dependencies.state.setReportsView(pageState, view);

        if (view === 'community') {
          dependencies.state.resetCommunityPage(pageState);
        }

        await renderCurrentView();
      },
      onStatusChange: async (tab) => {
        if (!pageState || pageState.myReports.tab === tab) {
          return;
        }

        dependencies.state.setMyReportsTab(pageState, tab);
        await loadMyReports();
      },
      onPageChange: async (view, page) => {
        if (!pageState) {
          return;
        }

        if (view === 'community') {
          dependencies.state.setCommunityPage(pageState, page);
          await loadCommunityReports();
          return;
        }

        dependencies.state.setMyReportsPage(pageState, page);
        await loadMyReports();
      },
      onCommunityRefresh: async () => {
        if (!pageState) {
          return;
        }

        dependencies.state.resetCommunityPage(pageState);
        await renderCurrentView({ forceRefreshLocation: true });
      },
      onCommunityAction: async (action, reportId) => {
        try {
          if (action === 'support') {
            await dependencies.controller.supportCommunityReport(reportId);
            notify('success', 'Community support added.');
          } else if (action === 'confirm') {
            await dependencies.controller.confirmCommunityReport(reportId);
            notify('success', 'Report confirmed successfully.');
          }

          await loadCommunityReports();
        } catch (error) {
          notify('error', readErrorMessage(error));
          await loadCommunityReports();
        }
      },
    });

    global.document.addEventListener('citizen:report-created', () => {
      if (!pageState) {
        return;
      }

      dependencies.state.setMyReportsPage(pageState, 1);
      void renderCurrentView();
    });

    await renderCurrentView();
  }

  function observePageMount() {
    const mainContainer =
      global.document.getElementById('flexible_main') || global.document.body;

    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.myReportsInitialized !== 'true') {
        void initializeMyReportsPage();
      }
    });

    observer.observe(mainContainer, {
      childList: true,
      subtree: true,
    });

    if (getPageRoot()) {
      void initializeMyReportsPage();
    }
  }

  observePageMount();
})(window);
