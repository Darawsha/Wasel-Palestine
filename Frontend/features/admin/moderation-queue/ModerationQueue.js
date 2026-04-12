(function (global) {
  const PAGE_SELECTOR = '.mq-page';

  let dependenciesPromise = null;
  let pageState = null;
  let localReports = [];
  let activeRequestId = 0;
  const lockedReviewReportIds = new Set();

  function getPageRoot() {
    return global.document.querySelector(PAGE_SELECTOR);
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

    return error?.message || 'Unable to update this report.';
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Controllers/reports.controller.js'),
        import('./moderation-queue-state.js'),
        import('./moderation-queue-ui-renderer.js'),
        import('./moderation-queue-event-handlers.js'),
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
          bindModerationQueueEvents:
            eventHandlersModule.bindModerationQueueEvents,
        }),
      );
    }

    return dependenciesPromise;
  }

  async function loadModerationQueue() {
    const root = getPageRoot();
    if (!root || !pageState) {
      return;
    }

    const requestId = ++activeRequestId;
    const requestedPage = pageState.page;
    const { controller, renderer, state } = await getDependencies();

    renderer.renderModerationLoading(root, pageState);

    let payload;
    try {
      payload = await controller.loadModerationQueuePage({
        page: pageState.page,
        limit: pageState.limit,
        search: pageState.search,
        category: pageState.category,
        duplicateOnly: pageState.duplicateOnly,
        sort: pageState.sort.field,
        sortOrder: pageState.sort.order,
      });
    } catch (error) {
      if (requestId !== activeRequestId) {
        return;
      }

      renderer.renderModerationError(root, pageState, readErrorMessage(error));
      return;
    }

    if (requestId !== activeRequestId) {
      return;
    }

    localReports = Array.isArray(payload.data) ? payload.data : [];
    state.setModerationMeta(pageState, payload.meta);
    state.setModerationCounts(pageState, payload.counts);

    const resolvedPage = Number(payload?.meta?.page);
    if (
      Number.isFinite(resolvedPage) &&
      resolvedPage > 0 &&
      resolvedPage !== requestedPage
    ) {
      state.setModerationPage(pageState, resolvedPage);
      await loadModerationQueue();
      return;
    }

    renderer.renderModerationQueue(root, pageState, localReports);

    if (pageState.selectedReportId) {
      const selectedReport = getReportById(pageState.selectedReportId);
      if (selectedReport) {
        renderer.openModerationModal(root, selectedReport);
      } else {
        state.setSelectedModerationReport(pageState, null);
        renderer.closeModerationModal(root);
      }
    }
  }

  function getReportById(reportId) {
    return localReports.find((report) => report.id === Number(reportId)) || null;
  }

  function replaceLocalReport(updatedReport) {
    const reportId = Number(updatedReport?.id);

    if (!Number.isFinite(reportId)) {
      return;
    }

    const index = localReports.findIndex((report) => report.id === reportId);
    if (index === -1) {
      return;
    }

    localReports[index] = updatedReport;
  }

  function isAlreadyUnderReviewError(error) {
    return /already under review/i.test(readErrorMessage(error));
  }

  async function initializeModerationQueuePage() {
    const root = getPageRoot();
    if (!root || root.dataset.moderationQueueInitialized === 'true') {
      return;
    }

    const dependencies = await getDependencies();
    pageState = dependencies.state.createModerationQueueState();
    root.dataset.moderationQueueInitialized = 'true';

    dependencies.bindModerationQueueEvents(root, {
      onSearchChange: async (value) => {
        dependencies.state.setModerationSearch(pageState, value);
        await loadModerationQueue();
      },
      onCategoryChange: async (value) => {
        dependencies.state.setModerationCategory(pageState, value);
        await loadModerationQueue();
      },
      onSortChange: async (value) => {
        dependencies.state.setModerationSort(pageState, value);
        await loadModerationQueue();
      },
      onDuplicateToggle: async () => {
        dependencies.state.toggleDuplicateOnly(pageState);
        await loadModerationQueue();
      },
      onClearFilters: async () => {
        dependencies.state.setModerationSearch(pageState, '');
        dependencies.state.setModerationCategory(pageState, '');
        dependencies.state.setModerationSort(pageState, 'createdAt:DESC');

        if (pageState.duplicateOnly) {
          dependencies.state.toggleDuplicateOnly(pageState);
        }

        const currentRoot = getPageRoot();
        const searchInput = currentRoot?.querySelector('[data-moderation-search]');
        if (searchInput) searchInput.value = '';

        const categorySelect = currentRoot?.querySelector('[data-moderation-category]');
        if (categorySelect) categorySelect.value = '';

        const sortSelect = currentRoot?.querySelector('[data-moderation-sort]');
        if (sortSelect) sortSelect.value = 'createdAt:DESC';

        await loadModerationQueue();
      },
      onPageChange: async (page) => {
        dependencies.state.setModerationPage(pageState, page);
        await loadModerationQueue();
      },
      onOpenReview: async (reportId) => {
        const normalizedReportId = Number(reportId);
        let report = getReportById(normalizedReportId);

        if (!report) {
          return;
        }

        try {
          if (report.status === 'pending') {
            if (lockedReviewReportIds.has(normalizedReportId)) {
              return;
            }

            lockedReviewReportIds.add(normalizedReportId);

            const updatedReport =
              await dependencies.controller.startModerationReview(
                normalizedReportId,
              );

            if (updatedReport) {
              replaceLocalReport(updatedReport);
              report = updatedReport;
              dependencies.renderer.renderModerationQueue(
                root,
                pageState,
                localReports,
              );
            }
          }
        } catch (error) {
          if (!isAlreadyUnderReviewError(error)) {
            notify('error', readErrorMessage(error));
            await loadModerationQueue();
            return;
          }

          report = {
            ...report,
            status: 'under_review',
            statusLabel: 'Under Review',
          };

          replaceLocalReport(report);
          dependencies.renderer.renderModerationQueue(
            root,
            pageState,
            localReports,
          );
        } finally {
          lockedReviewReportIds.delete(normalizedReportId);
        }

        dependencies.state.setSelectedModerationReport(
          pageState,
          normalizedReportId,
        );
        dependencies.renderer.openModerationModal(root, report);
      },
      onCloseReview: () => {
        dependencies.state.setSelectedModerationReport(pageState, null);
        dependencies.renderer.closeModerationModal(root);
      },
      onDecision: async (decision, reportId, notes) => {
        try {
          if (decision === 'approve') {
            await dependencies.controller.approveModerationReport(
              reportId,
              notes,
            );
            notify('success', 'Report approved successfully.');
          } else if (decision === 'reject') {
            await dependencies.controller.rejectModerationReport(
              reportId,
              notes,
            );
            notify('success', 'Report rejected successfully.');
          }

          dependencies.state.setSelectedModerationReport(pageState, null);
          dependencies.renderer.closeModerationModal(root);
          await loadModerationQueue();
        } catch (error) {
          notify('error', readErrorMessage(error));
        }
      },
    });

    await loadModerationQueue();
  }

  function observePageMount() {
    const mainContainer =
      global.document.getElementById('flexible_main') || global.document.body;

    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.moderationQueueInitialized !== 'true') {
        void initializeModerationQueuePage();
      }
    });

    observer.observe(mainContainer, {
      childList: true,
      subtree: true,
    });

    if (getPageRoot()) {
      void initializeModerationQueuePage();
    }
  }

  observePageMount();
})(window);