(function () {
  const PAGE_SELECTOR = '.incidents-page';
  const TABLE_BODY_SELECTOR = '[data-incidents-table-body]';
  const PAGINATION_RANGE_SELECTOR = '[data-incidents-pagination-range]';
  const PAGINATION_TOTAL_SELECTOR = '[data-incidents-pagination-total]';

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

  let localIncidents = [];

  function getIncidentById(id) {
    return localIncidents.find((incident) => incident.id === Number(id)) || null;
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
    const reportedTotalPages = Number(meta.totalPages);
    const totalPages =
      total > 0
        ? Math.max(
          Number.isFinite(reportedTotalPages) && reportedTotalPages > 0
            ? Math.floor(reportedTotalPages)
            : 0,
          Math.ceil(total / limit),
        )
        : 0;
    const page =
      totalPages > 0
        ? Math.min(
          normalizePositiveInteger(meta.page, DEFAULT_PAGE),
          totalPages,
        )
        : DEFAULT_PAGE;

    return { total, page, limit, totalPages };
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
    });
  }

  function formatIncidentTypeLabel(type) {
    switch (type) {
      case 'CLOSURE':
        return 'Closure';
      case 'DELAY':
        return 'Delay';
      case 'ACCIDENT':
        return 'Accident';
      case 'WEATHER_HAZARD':
        return 'Weather';
      default:
        return 'N/A';
    }
  }

  function formatSeverityLabel(severity) {
    switch (severity) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
      case 'CRITICAL':
        return 'Critical';
      default:
        return 'N/A';
    }
  }

  function formatStatusLabel(status) {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'VERIFIED':
        return 'Verified';
      case 'CLOSED':
        return 'Closed';
      default:
        return 'N/A';
    }
  }

  function getTypeBadgeClass(type) {
    switch (type) {
      case 'CLOSURE':
        return 'badge-closure';
      case 'DELAY':
        return 'badge-delay';
      case 'ACCIDENT':
        return 'badge-accident';
      case 'WEATHER_HAZARD':
        return 'badge-weather';
      default:
        return '';
    }
  }

  function getSeverityBadgeClass(severity) {
    switch (severity) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      default:
        return '';
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'ACTIVE':
        return 'badge-active';
      case 'VERIFIED':
        return 'badge-verified';
      case 'CLOSED':
        return 'badge-closed';
      default:
        return '';
    }
  }

  function buildIncidentRow(incident) {
    const row = document.createElement('tr');
    const location = incident?.location || 'N/A';

    row.innerHTML = `
      <td class="cell-id">#${escapeHtml(incident?.id ?? '--')}</td>
      <td class="cell-title">${escapeHtml(incident?.title || 'N/A')}</td>
      <td>
        <span class="type-badge ${getTypeBadgeClass(incident?.type)}">${escapeHtml(formatIncidentTypeLabel(incident?.type))}</span>
      </td>
      <td>
        <span class="severity-badge ${getSeverityBadgeClass(incident?.severity)}">${escapeHtml(formatSeverityLabel(incident?.severity))}</span>
      </td>
      <td class="cell-location">${escapeHtml(location)}</td>
      <td>
        <span class="status-badge ${getStatusBadgeClass(incident?.status)}">${escapeHtml(formatStatusLabel(incident?.status))}</span>
      </td>
      <td class="cell-date text-center">${escapeHtml(formatDate(incident?.createdAt))}</td>
      <td class="cell-date text-center">${escapeHtml(formatDate(incident?.updatedAt))}</td>
      <td class="cell-actions text-right">
        <button class="btn-menu" type="button" data-incident-actions-trigger="true" data-incident-id="${escapeHtml(incident?.id ?? '')}" aria-label="Open incident actions">
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </td>
    `;
    return row;
  }

  function buildMessageRow(message) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="9" class="text-center">${escapeHtml(message)}</td>`;
    return row;
  }

  function renderIncidents(root, incidents) {
    const tableBody = root.querySelector(TABLE_BODY_SELECTOR);
    if (!tableBody) return 0;

    tableBody.innerHTML = '';

    if (!Array.isArray(incidents) || incidents.length === 0) {
      tableBody.appendChild(buildMessageRow('No incidents to display.'));
      return 0;
    }

    incidents.forEach((incident) => {
      tableBody.appendChild(buildIncidentRow(incident));
    });

    return incidents.length;
  }

  function updateDisplayedTotals(root, meta = {}) {
    root.dataset.incidentsTotal = String(meta.total || 0);
    root.dataset.incidentsPage = String(meta.page || DEFAULT_PAGE);
    root.dataset.incidentsLimit = String(meta.limit || DEFAULT_LIMIT);
    root.dataset.incidentsTotalPages = String(meta.totalPages || 0);

    const totalElement = root.querySelector(PAGINATION_TOTAL_SELECTOR);
    if (totalElement) {
      totalElement.textContent = String(meta.total || 0);
    }
  }

  function updateDisplayedRange(root, meta = {}, visibleRows = 0) {
    const rangeElement = root.querySelector(PAGINATION_RANGE_SELECTOR);
    if (!rangeElement) return;

    if (!meta.total || visibleRows === 0) {
      rangeElement.textContent = '0-0';
      return;
    }

    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(start + visibleRows - 1, meta.total);
    rangeElement.textContent = `${start}-${end}`;
  }



  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Controllers/incidents.controller.js'),
        import('./incidents_filter.js'),
        import('./pagination.js'),
        import('./incident_actions.js')
      ]).then(([controllerModule, filterModule, paginationModule, actionMenuModule]) => ({
        loadIncidentsPage: controllerModule.loadIncidentsPage,
        getFilters: filterModule.getFilters,
        bindFilters: filterModule.bindFilters,
        bindFrontendSearch: filterModule.bindFrontendSearch,
        renderPagination: paginationModule.renderPagination,
        bindIncidentActionMenus: actionMenuModule.bindIncidentActionMenus,
      }));
    }
    return dependenciesPromise;
  }

  async function loadIncidentPage(page = DEFAULT_PAGE) {
    const root = getPageRoot();
    if (!root) return;

    const requestId = ++activeRequestId;
    const requestedPage = normalizePositiveInteger(page, DEFAULT_PAGE);
    const tableBody = root.querySelector(TABLE_BODY_SELECTOR);

    if (tableBody) {
      tableBody.innerHTML = '';
      tableBody.appendChild(buildMessageRow('Loading incidents...'));
    }

    root.dataset.incidentsState = 'loading';

    try {
      const { loadIncidentsPage, getFilters, renderPagination } = await getDependencies();

      const response = await loadIncidentsPage({
        page: requestedPage,
        limit: pageState.limit || DEFAULT_LIMIT,
        ...getFilters(root),
      });

      if (requestId !== activeRequestId) return;

      const meta = normalizeMeta(response?.meta);
      localIncidents = Array.isArray(response?.data) ? response.data : [];
      const visibleRows = renderIncidents(root, localIncidents);

      pageState = meta;
      updateDisplayedTotals(root, meta);
      updateDisplayedRange(root, meta, visibleRows);
      renderPagination(root, meta, handlePageChange);
      root.dataset.incidentsState = 'loaded';
    } catch (error) {
      if (requestId !== activeRequestId) return;
      console.error('Failed to load incidents data', error);
      if (tableBody) {
        tableBody.innerHTML = '';
        tableBody.appendChild(buildMessageRow('Error loading incidents data.'));
      }
      root.dataset.incidentsState = 'error';
    }
  }

  function handlePageChange(nextPage) {
    if (nextPage === pageState.page) return;
    loadIncidentPage(nextPage);
  }

  // أصبحت هذه الدالة async لكي تستطيع جلب الـ dependencies
  async function initializeIncidentsPage() {
    const root = getPageRoot();
    if (!root || root.dataset.incidentsInitialized === 'true') {
      return;
    }
    root.dataset.incidentsInitialized = 'true';


    const { bindFilters, bindFrontendSearch, bindIncidentActionMenus } = await getDependencies();
    bindFrontendSearch(root, TABLE_BODY_SELECTOR);

    bindIncidentActionMenus(root, { getIncidentById });

    bindFilters(root, () => {
      pageState = {
        ...pageState,
        page: DEFAULT_PAGE,
      };
      loadIncidentPage(DEFAULT_PAGE);
    });

    loadIncidentPage(DEFAULT_PAGE);
  }

  function observePageMount() {
    const mainContainer =
      document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.incidentsInitialized !== 'true') {
        initializeIncidentsPage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });

    document.addEventListener('admin:incident-created', () => {
      loadIncidentPage(DEFAULT_PAGE);
    });

    document.addEventListener('admin:incident-updated', () => {
      loadIncidentPage(pageState.page);
    });

    document.addEventListener('admin:incident-deleted', () => {
      loadIncidentPage(pageState.page);
    });

    initializeIncidentsPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observePageMount);
  } else {
    observePageMount();
  }
})();
