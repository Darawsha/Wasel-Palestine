(function () {
  const PAGE_SELECTOR = '#checkpointPageRoot';
  const TABLE_BODY_SELECTOR = '[data-checkpoint-table-body]';
  const PAGINATION_RANGE_SELECTOR = '[data-checkpoint-pagination-range]';
  const PAGINATION_TOTAL_SELECTOR = '[data-checkpoint-pagination-total]';

  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 10;

  let dependenciesPromise;
  let activeRequestId = 0;
  let pageState = {
    total: 0,
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    totalPages: 0,
  };

  let localCheckpoints = [];

  function getCheckpointById(id) {
    return localCheckpoints.find((cp) => cp.id === Number(id)) || null;
  }

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function normalizePositiveInteger(value, fallback) {
    const normalizedValue = Number(value);
    return Number.isFinite(normalizedValue) && normalizedValue > 0
      ? Math.floor(normalizedValue)
      : fallback;
  }

  function normalizeMeta(meta = {}) {
    const total = Math.max(Number(meta.total) || 0, 0);
    const limit = normalizePositiveInteger(meta.limit, DEFAULT_LIMIT);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const page =
      totalPages > 0
        ? Math.min(
            normalizePositiveInteger(meta.page, DEFAULT_PAGE),
            totalPages,
          )
        : DEFAULT_PAGE;

    return { total, page, limit, totalPages };
  }

  function resolveCheckpointStatus(checkpoint) {
    return checkpoint?.currentStatus || checkpoint?.status || '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return 'N/A';
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatStatusLabel(status) {
    switch (status) {
      case 'ACTIVE':
        return 'Open';
      case 'DELAYED':
        return 'Delayed';
      case 'RESTRICTED':
        return 'Restricted';
      case 'CLOSED':
        return 'Closed';
      default:
        return 'N/A';
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'ACTIVE':
        return 'status-open';
      case 'DELAYED':
        return 'status-delayed';
      case 'RESTRICTED':
        return 'status-restricted';
      case 'CLOSED':
        return 'status-closed';
      default:
        return '';
    }
  }

  function buildCheckpointRow(checkpoint) {
    const row = document.createElement('tr');
    const status = resolveCheckpointStatus(checkpoint);

    row.innerHTML = `
      <td class="cell-id">#${escapeHtml(checkpoint?.id ?? '--')}</td>
      <td class="cell-name">${escapeHtml(checkpoint?.name || 'N/A')}</td>
      <td class="cell-location">${escapeHtml(checkpoint?.location || 'N/A')}</td>
      <td>
        <span class="status-badge ${getStatusBadgeClass(status)}">${escapeHtml(formatStatusLabel(status))}</span>
      </td>
      <td class="cell-date">${escapeHtml(formatDate(checkpoint?.updatedAt))}</td>
      <td class="cell-actions text-right">
        <button class="btn-menu" type="button" data-checkpoint-actions-trigger="true" data-checkpoint-id="${escapeHtml(checkpoint?.id ?? '')}" aria-label="Open actions">
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </td>
    `;
    return row;
  }

  function buildMessageRow(message) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" class="text-center">${escapeHtml(message)}</td>`;
    return row;
  }

  function renderCheckpoints(root, checkpoints) {
    const tableBody = root.querySelector(TABLE_BODY_SELECTOR);
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (checkpoints.length === 0) {
      tableBody.appendChild(buildMessageRow('No checkpoints found.'));
      return;
    }

    checkpoints.forEach((cp) => {
      tableBody.appendChild(buildCheckpointRow(cp));
    });
  }

  function updatePaginationUI(root, meta) {
    const rangeElement = root.querySelector(PAGINATION_RANGE_SELECTOR);
    const totalElement = root.querySelector(PAGINATION_TOTAL_SELECTOR);

    if (totalElement) totalElement.textContent = meta.total;
    if (rangeElement) {
      const start = meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
      const end = Math.min(start + meta.limit - 1, meta.total);
      rangeElement.textContent = `${start}-${end}`;
    }
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Controllers/checkpoint-management.controller.js'),
        import('./checkpoint_filter.js'),
        import('./pagination.js'),
        import('./checkpoint_action.js'),
      ]).then(
        ([
          controllerModule,
          filterModule,
          paginationModule,
          actionMenuModule,
        ]) => ({
          loadCheckpointsPage: controllerModule.loadCheckpointsPage,
          getFilters: filterModule.getFilters,
          bindFilters: filterModule.bindFilters,
          bindFrontendSearch: filterModule.bindFrontendSearch,
          renderPagination: paginationModule.renderPagination,
          bindCheckpointActionMenus: actionMenuModule.bindCheckpointActionMenus,
        }),
      );
    }
    return dependenciesPromise;
  }

  async function loadCheckpointPage(page = DEFAULT_PAGE) {
    const root = getPageRoot();
    if (!root) return;

    const requestId = ++activeRequestId;
    const requestedPage = normalizePositiveInteger(page, DEFAULT_PAGE);
    const tableBody = root.querySelector(TABLE_BODY_SELECTOR);

    if (tableBody) {
      tableBody.innerHTML = '';
      tableBody.appendChild(buildMessageRow('Loading checkpoints...'));
    }

    try {
      const { loadCheckpointsPage, getFilters, renderPagination } =
        await getDependencies();

      const response = await loadCheckpointsPage({
        page: requestedPage,
        limit: pageState.limit || DEFAULT_LIMIT,
        ...getFilters(root),
      });

      if (requestId !== activeRequestId) return;

      const meta = normalizeMeta(response.meta);
      pageState = { ...pageState, ...meta };
      localCheckpoints = response.data;

      renderCheckpoints(root, localCheckpoints);
      updatePaginationUI(root, pageState);

      const paginationContainer = root.querySelector(
        '[data-checkpoint-pagination-controls]',
      );
      if (paginationContainer) {
        renderPagination(paginationContainer, pageState, (p) =>
          loadCheckpointPage(p),
        );
      }
    } catch (error) {
      if (requestId !== activeRequestId) return;
      console.error('Failed to load checkpoints', error);
      if (tableBody) {
        tableBody.innerHTML = '';
        tableBody.appendChild(buildMessageRow('Error loading checkpoints.'));
      }
    }
  }

  async function initializeCheckpointsPage() {
    const root = getPageRoot();
    if (!root || root.dataset.checkpointsInitialized === 'true') return;
    root.dataset.checkpointsInitialized = 'true';

    const { bindFilters, bindFrontendSearch, bindCheckpointActionMenus } =
      await getDependencies();

    bindFrontendSearch(root, TABLE_BODY_SELECTOR);
    bindCheckpointActionMenus(root, { getCheckpointById });

    bindFilters(root, () => {
      pageState.page = DEFAULT_PAGE;
      loadCheckpointPage(DEFAULT_PAGE);
    });

    // Event listeners for global refresh with a small delay
    const refresh = () => {
      setTimeout(() => loadCheckpointPage(pageState.page), 500);
    };
    document.addEventListener('admin:checkpoint-created', refresh);
    document.addEventListener('admin:checkpoint-updated', refresh);
    document.addEventListener('admin:checkpoint-deleted', refresh);

    loadCheckpointPage(DEFAULT_PAGE);
  }

  function observePageMount() {
    const mainContainer =
      document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.checkpointsInitialized !== 'true') {
        initializeCheckpointsPage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });

    // Initial check
    if (getPageRoot()) initializeCheckpointsPage();
  }

  observePageMount();
})();
