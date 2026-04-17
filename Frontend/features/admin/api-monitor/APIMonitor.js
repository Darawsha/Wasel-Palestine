(function () {
  const PAGE_SELECTOR = '.api-monitor-page';
  const REFRESH_BUTTON_SELECTOR = '.btn-refresh';
  const LAST_UPDATED_SELECTOR = '.last-updated';
  const METRIC_CARD_SELECTOR = '.metric-card';
  const FILTER_SELECT_SELECTOR = '.status-select';
  const TABLE_BODY_SELECTOR = '.monitor-table tbody';
  const PAGINATION_INFO_SELECTOR = '.pagination-info';
  const PREVIOUS_BUTTON_SELECTOR = '.pagination-actions .btn-page:first-child';
  const NEXT_BUTTON_SELECTOR = '.pagination-actions .btn-page:last-child';

  let dependenciesPromise;
  let monitorState = {
    filter: 'all',
    page: 1,
    requestId: 0,
  };

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = import('/Controllers/api-monitor.controller.js');
    }

    return dependenciesPromise;
  }

  function getMetricCards(root) {
    return Array.from(root.querySelectorAll(METRIC_CARD_SELECTOR));
  }

  function getMetricCardByTitle(root, titleText) {
    return (
      getMetricCards(root).find((card) => {
        const title = card.querySelector('.title-details h3');
        return title?.textContent?.trim() === titleText;
      }) || null
    );
  }

  function setRefreshButtonLoading(root, isLoading) {
    const refreshButton = root.querySelector(REFRESH_BUTTON_SELECTOR);
    if (!refreshButton) {
      return;
    }

    refreshButton.disabled = isLoading;
    refreshButton.dataset.loading = isLoading ? 'true' : 'false';
  }

  function updateLastUpdated(root, label) {
    const element = root.querySelector(LAST_UPDATED_SELECTOR);
    if (element) {
      element.textContent = `Last updated: ${label}`;
    }
  }

  function buildTrendIndicatorContent(trend) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined icon';
    icon.textContent =
      trend.direction === 'down'
        ? 'arrow_downward'
        : trend.direction === 'up'
          ? 'arrow_upward'
          : 'remove';

    return [
      icon,
      document.createTextNode(` ${String(trend.deltaLabel || '0ms')}`),
    ];
  }

  function renderPaginationInfo(container, recentCalls) {
    if (!container) {
      return;
    }

    const currentRange = document.createElement('span');
    currentRange.textContent = `${recentCalls.startItem}-${recentCalls.endItem}`;

    const totalCount = document.createElement('span');
    totalCount.textContent = String(recentCalls.total);

    container.replaceChildren(
      document.createTextNode('Showing '),
      currentRange,
      document.createTextNode(' of '),
      totalCount,
      document.createTextNode(' calls'),
    );
  }

  function updateMetricCard(root, metric) {
    const card = getMetricCardByTitle(root, metric.name);
    if (!card) {
      return;
    }

    const statusPill = card.querySelector('.status-pill');
    const lastCallValue = Array.from(card.querySelectorAll('.metric-row'))
      .find((row) => {
        return row
          .querySelector('.metric-label')
          ?.textContent?.includes('Last Successful Call');
      })
      ?.querySelector('.metric-value');
    const responseTimeValue = Array.from(card.querySelectorAll('.metric-row'))
      .find((row) => {
        return row
          .querySelector('.metric-label')
          ?.textContent?.includes('Avg Response Time');
      })
      ?.querySelector('.metric-value.bold');
    const trendIndicator = card.querySelector('.trend-indicator');
    const rateLimitValue = Array.from(
      card.querySelectorAll('.metric-progress-group .metric-row'),
    )
      .find((row) => {
        return row
          .querySelector('.metric-label')
          ?.textContent?.includes('Rate Limit Usage');
      })
      ?.querySelector('.metric-value.bold');
    const progressFill = card.querySelector('.progress-bar-fill');
    const errorRateValue = Array.from(card.querySelectorAll('.metric-row'))
      .find((row) => {
        return row
          .querySelector('.metric-label')
          ?.textContent?.includes('Error Rate');
      })
      ?.querySelector('.metric-value');
    const errorBadge = card.querySelector('.badge');

    if (statusPill) {
      statusPill.classList.remove(
        'status-healthy',
        'status-warning',
        'status-danger',
      );
      if (metric.status === 'Healthy') {
        statusPill.classList.add('status-healthy');
      } else if (metric.status === 'Degraded') {
        statusPill.classList.add('status-warning');
      } else {
        statusPill.classList.add('status-danger');
      }

      const label = statusPill.querySelector('span:last-child');
      if (label) {
        label.textContent = metric.status;
      }
    }

    if (lastCallValue) {
      lastCallValue.textContent = metric.lastSuccessfulCall;
    }

    if (responseTimeValue) {
      responseTimeValue.textContent = metric.averageResponseTime;
    }

    if (trendIndicator) {
      trendIndicator.classList.remove('emerald', 'amber');
      trendIndicator.classList.add(
        metric.trend.direction === 'down' ? 'emerald' : 'amber',
      );
      trendIndicator.replaceChildren(
        ...buildTrendIndicatorContent(metric.trend || {}),
      );
    }

    if (rateLimitValue) {
      rateLimitValue.textContent = `${metric.rateLimit.used} / ${metric.rateLimit.limit}`;
    }

    if (progressFill) {
      progressFill.style.width = `${metric.rateLimit.percent}%`;
    }

    if (errorRateValue) {
      errorRateValue.textContent = metric.errorRate;
    }

    if (errorBadge) {
      errorBadge.textContent = metric.errorBadge;
    }
  }

  function buildTableRow(call) {
    const row = document.createElement('tr');
    row.className = call.statusPresentation.rowTone || '';
    row.innerHTML = `
      <td class="timestamp"></td>
      <td class="api-name font-medium"></td>
      <td class="endpoint mono"></td>
      <td class="response-code bold"></td>
      <td class="response-time"></td>
      <td>
        <span class="status-badge">
          <span class="dot"></span>
          <span class="status-label"></span>
        </span>
      </td>
    `;

    row.querySelector('.timestamp').textContent = call.timestampLabel;

    const apiName = row.querySelector('.api-name');
    apiName.textContent = call.apiName.replace(' API', '');
    apiName.classList.add(
      call.apiId === 'routing' ? 'text-blue' : 'text-purple',
    );

    row.querySelector('.endpoint').textContent = call.endpoint;

    const responseCode = row.querySelector('.response-code');
    responseCode.textContent = String(call.responseCode || '--');
    responseCode.classList.add(
      call.statusPresentation.tone === 'success'
        ? 'emerald'
        : call.statusPresentation.tone === 'warning'
          ? 'amber'
          : 'red',
    );

    const responseTime = row.querySelector('.response-time');
    responseTime.textContent = call.responseTimeLabel;
    if (call.responseTimeLabel === '--') {
      responseTime.classList.add('empty');
    }

    const statusBadge = row.querySelector('.status-badge');
    statusBadge.classList.add(call.statusPresentation.tone);
    row.querySelector('.status-label').textContent =
      call.statusPresentation.label;

    return row;
  }

  function renderTable(root, recentCalls) {
    const tbody = root.querySelector(TABLE_BODY_SELECTOR);
    if (!tbody) {
      return;
    }

    if (recentCalls.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td class="timestamp" colspan="6">No recent API calls are available for this filter yet.</td>
        </tr>
      `;
      return;
    }

    tbody.replaceChildren(
      ...recentCalls.items.map((call) => buildTableRow(call)),
    );
  }

  function renderPagination(root, recentCalls) {
    const info = root.querySelector(PAGINATION_INFO_SELECTOR);
    const previousButton = root.querySelector(PREVIOUS_BUTTON_SELECTOR);
    const nextButton = root.querySelector(NEXT_BUTTON_SELECTOR);

    renderPaginationInfo(info, recentCalls);

    if (previousButton) {
      previousButton.disabled = recentCalls.page <= 1;
    }

    if (nextButton) {
      nextButton.disabled = recentCalls.page >= recentCalls.totalPages;
    }
  }

  function renderFilterOptions(root, filters) {
    const select = root.querySelector(FILTER_SELECT_SELECTOR);
    if (!select) {
      return;
    }

    const currentValue = monitorState.filter;
    select.replaceChildren(
      ...filters.map((filter) => {
        const option = document.createElement('option');
        option.value = filter.value;
        option.textContent = filter.label;
        option.selected = filter.value === currentValue;
        return option;
      }),
    );
  }

  function renderLoadingState(root) {
    updateLastUpdated(root, 'Refreshing...');
  }

  function renderErrorState(root) {
    updateLastUpdated(root, 'Unavailable');

    const tbody = root.querySelector(TABLE_BODY_SELECTOR);
    if (tbody) {
      tbody.innerHTML = `
        <tr class="row-danger">
          <td class="timestamp" colspan="6">External API monitor data could not be refreshed right now.</td>
        </tr>
      `;
    }
  }

  async function hydrateApiMonitor(options = {}) {
    const root = getPageRoot();
    if (!root) {
      return;
    }

    const requestId = ++monitorState.requestId;
    const shouldRefresh = Boolean(options.refresh);
    setRefreshButtonLoading(root, true);
    renderLoadingState(root);

    try {
      const controller = await getDependencies();
      const snapshot = await controller.loadApiMonitor({
        refresh: shouldRefresh,
        apiFilter: monitorState.filter,
        page: monitorState.page,
      });

      if (requestId !== monitorState.requestId) {
        return;
      }

      updateLastUpdated(root, snapshot.lastUpdatedLabel);
      snapshot.metrics.forEach((metric) => updateMetricCard(root, metric));
      renderFilterOptions(root, snapshot.filters);
      renderTable(root, snapshot.recentCalls);
      renderPagination(root, snapshot.recentCalls);
      root.dataset.apiMonitorState = 'loaded';
    } catch (error) {
      if (requestId !== monitorState.requestId) {
        return;
      }

      console.error('Failed to hydrate API monitor page', error);
      root.dataset.apiMonitorState = 'error';
      renderErrorState(root);
    } finally {
      if (requestId === monitorState.requestId) {
        setRefreshButtonLoading(root, false);
      }
    }
  }

  function bindFilter(root) {
    const select = root.querySelector(FILTER_SELECT_SELECTOR);
    if (!select || select.dataset.bound === 'true') {
      return;
    }

    select.dataset.bound = 'true';
    select.addEventListener('change', () => {
      monitorState.filter = select.value;
      monitorState.page = 1;
      void hydrateApiMonitor();
    });
  }

  function bindRefresh(root) {
    const button = root.querySelector(REFRESH_BUTTON_SELECTOR);
    if (!button || button.dataset.bound === 'true') {
      return;
    }

    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      monitorState.page = 1;
      void hydrateApiMonitor({ refresh: true });
    });
  }

  function bindPagination(root) {
    const previousButton = root.querySelector(PREVIOUS_BUTTON_SELECTOR);
    const nextButton = root.querySelector(NEXT_BUTTON_SELECTOR);

    if (previousButton && previousButton.dataset.bound !== 'true') {
      previousButton.dataset.bound = 'true';
      previousButton.addEventListener('click', () => {
        monitorState.page = Math.max(1, monitorState.page - 1);
        void hydrateApiMonitor();
      });
    }

    if (nextButton && nextButton.dataset.bound !== 'true') {
      nextButton.dataset.bound = 'true';
      nextButton.addEventListener('click', () => {
        monitorState.page += 1;
        void hydrateApiMonitor();
      });
    }
  }

  function initializeApiMonitorPage() {
    const root = getPageRoot();
    if (!root || root.dataset.apiMonitorInitialized === 'true') {
      return;
    }

    root.dataset.apiMonitorInitialized = 'true';
    bindRefresh(root);
    bindFilter(root);
    bindPagination(root);
    void hydrateApiMonitor({ refresh: true });
  }

  function observeApiMonitorMount() {
    const mainContainer =
      document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.apiMonitorInitialized !== 'true') {
        initializeApiMonitorPage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
    initializeApiMonitorPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeApiMonitorMount, {
      once: true,
    });
  } else {
    observeApiMonitorMount();
  }
})();
