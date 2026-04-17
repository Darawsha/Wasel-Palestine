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

  function isPreviewMode() {
    return global.CitizenPreview?.isActive?.() === true;
  }

  function isManageLockedStatus(status) {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === 'approved' || normalizedStatus === 'resolved';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function getModalElements() {
    const modal = global.document.getElementById('modalOverlay');
    const modalContent = modal?.querySelector('.modalContent');

    if (!modal || !modalContent) {
      return null;
    }

    return {
      modal,
      modalContent,
    };
  }

  function applyModalTheme(scopeRoot) {
    if (!scopeRoot) {
      return;
    }

    scopeRoot.classList.toggle(
      'dark',
      global.localStorage?.getItem('darkmode') === 'enabled',
    );
  }

  function showModalMarkup(markup, onMounted) {
    const modalElements = getModalElements();
    if (!modalElements) {
      return;
    }

    modalElements.modalContent.innerHTML = markup;
    applyModalTheme(
      modalElements.modalContent.querySelector('.report-modal-scope'),
    );
    modalElements.modal.classList.remove('hidden');

    if (typeof onMounted === 'function') {
      onMounted(modalElements.modalContent);
    }
  }

  function openReportDetailsModal(report) {
    showModalMarkup(
      `
        <div class="report-modal-scope report-details-modal">
          <div class="report-details-card">
            <div class="report-details-header">
              <div>
                <p class="report-details-kicker">Report Details</p>
                <h3 class="report-details-title">${escapeHtml(report.title)}</h3>
              </div>
              <button type="button" class="report-details-close" data-report-modal-close>
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="report-details-chip-row">
              <span class="status-pill ${escapeHtml(report.statusClass)}">${escapeHtml(report.statusLabel)}</span>
              <span class="report-details-chip">${escapeHtml(report.categoryLabel)}</span>
              <span class="report-details-chip">${escapeHtml(report.confidenceLabel)}</span>
            </div>
            <div class="report-details-grid">
              <article class="report-details-item">
                <h4>Location</h4>
                <p>${escapeHtml(report.location)}</p>
              </article>
              <article class="report-details-item">
                <h4>Created</h4>
                <p>${escapeHtml(report.createdAtLabel)}</p>
              </article>
              <article class="report-details-item">
                <h4>Updated</h4>
                <p>${escapeHtml(report.updatedAtLabel)}</p>
              </article>
              <article class="report-details-item">
                <h4>Reporter</h4>
                <p>${escapeHtml(report.reporterName)}</p>
              </article>
            </div>
            <article class="report-details-description">
              <h4>Description</h4>
              <p>${escapeHtml(report.description)}</p>
            </article>
          </div>
        </div>
      `,
      (modalContent) => {
        modalContent
          .querySelector('[data-report-modal-close]')
          ?.addEventListener('click', () => {
            global.closeMyReportModal?.();
          });
      },
    );
  }

  function openDeleteConfirmModal(report) {
    return new Promise((resolve) => {
      let settled = false;
      const modalElements = getModalElements();

      const cleanupDismissHandlers = () => {
        modalElements?.modal?.removeEventListener('click', handleBackdropDismiss);
        global.document.removeEventListener('keydown', handleEscapeDismiss);
      };

      const resolveOnce = (value) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanupDismissHandlers();
        resolve(value);
      };

      const handleBackdropDismiss = (event) => {
        if (event.target === modalElements?.modal) {
          resolveOnce(false);
        }
      };

      const handleEscapeDismiss = (event) => {
        if (event.key === 'Escape') {
          global.closeMyReportModal?.();
          resolveOnce(false);
        }
      };

      modalElements?.modal?.addEventListener('click', handleBackdropDismiss);
      global.document.addEventListener('keydown', handleEscapeDismiss);

      showModalMarkup(
        `
          <div class="report-modal-scope report-delete-modal">
            <div class="report-delete-card">
              <div class="report-delete-icon">
                <span class="material-symbols-outlined">delete</span>
              </div>
              <h3 class="report-delete-title">Delete Report</h3>
              <p class="report-delete-copy">
                Are you sure you want to delete your ${escapeHtml(report.categoryLabel)} report?
              </p>
              <div class="report-delete-actions">
                <button type="button" class="btn-outline report-action-btn" data-report-delete-cancel>
                  Cancel
                </button>
                <button type="button" class="btn-outline report-action-btn report-action-btn-danger" data-report-delete-confirm>
                  Delete
                </button>
              </div>
            </div>
          </div>
        `,
        (modalContent) => {
          modalContent
            .querySelector('[data-report-delete-cancel]')
            ?.addEventListener('click', () => {
              global.closeMyReportModal?.();
              resolveOnce(false);
            });

          modalContent
            .querySelector('[data-report-delete-confirm]')
            ?.addEventListener('click', () => {
              global.closeMyReportModal?.();
              resolveOnce(true);
            });
        },
      );
    });
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
      onReportAction: async (action, reportId) => {
        try {
          if (action === 'upvote') {
            await dependencies.controller.voteCommunityReport(reportId, 'UP');
            notify(
              'success',
              isPreviewMode()
                ? 'Preview upvote recorded. Nothing was saved.'
                : 'Upvote recorded.',
            );
            await loadCommunityReports();
            return;
          }

          if (action === 'downvote') {
            await dependencies.controller.voteCommunityReport(reportId, 'DOWN');
            notify(
              'success',
              isPreviewMode()
                ? 'Preview downvote recorded. Nothing was saved.'
                : 'Downvote recorded.',
            );
            await loadCommunityReports();
            return;
          }

          if (action === 'view-details') {
            const report = await dependencies.controller.loadReportDetails(reportId);
            openReportDetailsModal(report);
            return;
          }

          if (action === 'edit-report') {
            const report = await dependencies.controller.loadReportDetails(reportId);
            if (isManageLockedStatus(report.status)) {
              notify('error', 'Approved or resolved reports can no longer be edited.');
              await loadMyReports();
              return;
            }

            await global.openMyReportModal?.({
              mode: 'edit',
              report,
            });
            return;
          }

          if (action === 'delete-report') {
            const report = await dependencies.controller.loadReportDetails(reportId);
            if (isManageLockedStatus(report.status)) {
              notify('error', 'Approved or resolved reports can no longer be deleted.');
              await loadMyReports();
              return;
            }

            const confirmed = await openDeleteConfirmModal(report);
            if (!confirmed) {
              return;
            }

            await dependencies.controller.deleteCitizenReport(reportId);
            notify(
              'success',
              isPreviewMode()
                ? 'Preview report removed. Nothing was saved.'
                : 'Report deleted successfully.',
            );
            global.document.dispatchEvent(
              new global.CustomEvent('citizen:report-deleted'),
            );
            return;
          }
        } catch (error) {
          notify('error', readErrorMessage(error));

          if (pageState?.view === 'community') {
            await loadCommunityReports();
          } else {
            await loadMyReports();
          }
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

    global.document.addEventListener('citizen:report-updated', () => {
      if (!pageState) {
        return;
      }

      void renderCurrentView();
    });

    global.document.addEventListener('citizen:report-deleted', () => {
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
