(function () {
  const PAGE_SELECTOR = '.mq-page';
  const PENDING_BADGE_SELECTOR = '.mq-header-title-group .badge';
  const EXPORT_BUTTON_SELECTOR = '.btn-export';
  const SEARCH_SELECTOR = '.filter-input';
  const CATEGORY_SELECTOR = '.filter-select';
  const DATE_RANGE_SELECTOR = '.filter-date-input';
  const DUPLICATES_TOGGLE_SELECTOR = '.toggle-btn';
  const SORT_SELECTOR = '.filter-col:last-child .filter-select';
  const TABLE_BODY_SELECTOR = '.mq-table tbody';
  const PAGINATION_INFO_SELECTOR = '.pagination-info';
  const PAGINATION_CONTROLS_SELECTOR = '.pagination-controls';

  let dependenciesPromise;
  let queueState = {
    search: '',
    category: '',
    dateRange: '',
    duplicatesOnly: true,
    sortBy: 'newest',
    page: 1,
    requestId: 0,
  };

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = import('/Controllers/moderation-queue.controller.js');
    }

    return dependenciesPromise;
  }

  function getCategoryBadgeClass(category) {
    switch (String(category || '').toUpperCase()) {
      case 'CLOSURE':
        return 'cat-red';
      case 'DELAY':
        return 'cat-yellow';
      case 'ACCIDENT':
        return 'cat-orange';
      case 'WEATHER':
        return 'cat-blue';
      default:
        return 'cat-blue';
    }
  }

  function truncateText(text, maxLength = 32) {
    const normalized = String(text || '').trim();
    return normalized.length > maxLength
      ? `${normalized.slice(0, maxLength - 3)}...`
      : normalized;
  }

  function matchesDateFilter(report, dateRange) {
    if (!dateRange) {
      return true;
    }

    const normalizedRange = String(dateRange).trim().toLowerCase();
    const now = Date.now();
    const reportTimestamp = Date.now() - (
      normalizedRange.includes('today')
        ? 0
        : 0
    );

    if (normalizedRange === 'today') {
      return String(report.timeAgo).includes('min') || String(report.timeAgo).includes('hour') || String(report.timeAgo) === 'Just now';
    }

    if (normalizedRange === 'last 7 days') {
      return now - reportTimestamp <= 7 * 24 * 60 * 60 * 1000;
    }

    return true;
  }

  function buildDisplayedRows(data) {
    return data.filter((report) => {
      if (queueState.duplicatesOnly && !report.hasFlags) {
        return false;
      }

      return matchesDateFilter(report, queueState.dateRange);
    });
  }

  function buildTableRow(report) {
    const row = document.createElement('tr');
    row.className = report.hasFlags ? 'row-warning' : '';
    row.innerHTML = `
      <td class="cell-id"></td>
      <td><span class="category-badge"></span></td>
      <td class="cell-location"></td>
      <td class="cell-desc"></td>
      <td class="cell-user"></td>
      <td class="cell-time"></td>
      <td class="cell-score text-center"></td>
      <td class="text-center"></td>
      <td class="text-right">
        <button class="btn-review">Review</button>
      </td>
    `;

    row.querySelector('.cell-id').textContent = String(report.id);

    const categoryBadge = row.querySelector('.category-badge');
    categoryBadge.textContent = report.categoryLabel;
    categoryBadge.classList.add(getCategoryBadgeClass(report.category));

    row.querySelector('.cell-location').textContent = report.location || '--';
    row.querySelector('.cell-desc').textContent = truncateText(report.description);
    row.querySelector('.cell-user').textContent = report.submittedBy;
    row.querySelector('.cell-time').textContent = report.timeAgo;
    row.querySelector('.cell-score').textContent = report.score;

    const flagsCell = row.querySelector('.text-center');
    if (report.hasFlags) {
      flagsCell.classList.add('text-orange');
      flagsCell.innerHTML = '<span class="material-symbols-outlined icon-flag">warning</span>';
    } else {
      flagsCell.textContent = '';
    }

    const reviewButton = row.querySelector('.btn-review');
    reviewButton.dataset.reportId = String(report.id);
    reviewButton.dataset.action = report.status === 'UNDER_REVIEW' ? 'approve' : 'review';
    reviewButton.textContent = report.status === 'UNDER_REVIEW' ? 'Approve' : 'Review';

    return row;
  }

  function renderTable(root, reports) {
    const tbody = root.querySelector(TABLE_BODY_SELECTOR);
    if (!tbody) {
      return;
    }

    if (reports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="cell-desc">No reports match the current moderation filters.</td>
        </tr>
      `;
      return;
    }

    tbody.replaceChildren(...reports.map((report) => buildTableRow(report)));
  }

  function renderPendingBadge(root, total) {
    const badge = root.querySelector(PENDING_BADGE_SELECTOR);
    if (badge) {
      badge.textContent = `${total} pending`;
    }
  }

  function renderPagination(root, meta) {
    const info = root.querySelector(PAGINATION_INFO_SELECTOR);
    const controls = root.querySelector(PAGINATION_CONTROLS_SELECTOR);

    const start = meta.total === 0 ? 0 : ((meta.page - 1) * meta.limit) + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);

    if (info) {
      info.textContent = `Showing ${start}-${end} of ${meta.total}`;
    }

    if (!controls) {
      return;
    }

    const totalPages = Math.max(1, meta.totalPages || 1);
    controls.replaceChildren(
      createPageButton('prev', meta.page <= 1, () => {
        queueState.page = Math.max(1, queueState.page - 1);
        void hydrateModerationQueue();
      }),
      ...Array.from({ length: totalPages }, (_, index) => createPageButton(
        String(index + 1),
        false,
        () => {
          queueState.page = index + 1;
          void hydrateModerationQueue();
        },
        index + 1 === meta.page,
      )),
      createPageButton('next', meta.page >= totalPages, () => {
        queueState.page = Math.min(totalPages, queueState.page + 1);
        void hydrateModerationQueue();
      }),
    );
  }

  function createPageButton(label, disabled, onClick, active = false) {
    const button = document.createElement('button');
    button.className = `btn-page${active ? ' active' : ''}${label === 'prev' || label === 'next' ? ' nav-btn' : ''}`;
    button.disabled = disabled;

    if (label === 'prev') {
      button.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    } else if (label === 'next') {
      button.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    } else {
      button.textContent = label;
    }

    button.addEventListener('click', onClick);
    return button;
  }

  function resolveRequestParams() {
    return {
      page: queueState.page,
      search: queueState.search,
      category: queueState.category || undefined,
      sort: queueState.sortBy === 'score' ? 'confidenceScore' : 'createdAt',
      sortOrder: queueState.sortBy === 'oldest' ? 'ASC' : 'DESC',
      status: 'PENDING',
    };
  }

  async function hydrateModerationQueue() {
    const root = getPageRoot();
    if (!root) {
      return;
    }

    const requestId = ++queueState.requestId;

    try {
      const controller = await getDependencies();
      const response = await controller.loadModerationQueuePage(resolveRequestParams());

      if (requestId !== queueState.requestId) {
        return;
      }

      const visibleRows = buildDisplayedRows(response.data);
      renderPendingBadge(root, response.meta.total);
      renderTable(root, visibleRows);
      renderPagination(root, response.meta);
      root.dataset.moderationQueueState = 'loaded';
    } catch (error) {
      if (requestId !== queueState.requestId) {
        return;
      }

      console.error('Failed to hydrate moderation queue', error);
      renderTable(root, []);
      root.dataset.moderationQueueState = 'error';
    }
  }

  async function handleReviewAction(button) {
    const reportId = Number(button.dataset.reportId);
    const action = button.dataset.action || 'review';

    if (!reportId) {
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = action === 'approve' ? 'Approving...' : 'Reviewing...';

    try {
      const controller = await getDependencies();
      await controller.performModerationAction(reportId, action);
      await hydrateModerationQueue();
    } catch (error) {
      console.error('Failed to perform moderation action', error);
      button.disabled = false;
      button.textContent = 'Retry';
      return;
    }

    button.disabled = false;
    button.textContent = originalText;
  }

  function bindControls(root) {
    const searchInput = root.querySelector(SEARCH_SELECTOR);
    const selects = root.querySelectorAll('.filter-select');
    const categorySelect = selects[0] || null;
    const sortSelect = selects[1] || root.querySelector(SORT_SELECTOR);
    const dateInput = root.querySelector(DATE_RANGE_SELECTOR);
    const duplicatesToggle = root.querySelector(DUPLICATES_TOGGLE_SELECTOR);
    const exportButton = root.querySelector(EXPORT_BUTTON_SELECTOR);

    if (searchInput && searchInput.dataset.bound !== 'true') {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => {
        queueState.search = searchInput.value.trim();
        queueState.page = 1;
        void hydrateModerationQueue();
      });
    }

    if (categorySelect && categorySelect.dataset.bound !== 'true') {
      categorySelect.dataset.bound = 'true';
      categorySelect.addEventListener('change', () => {
        const value = categorySelect.value.trim().toUpperCase();
        queueState.category = value.startsWith('ALL') ? '' : value;
        queueState.page = 1;
        void hydrateModerationQueue();
      });
    }

    if (sortSelect && sortSelect.dataset.bound !== 'true') {
      sortSelect.dataset.bound = 'true';
      sortSelect.addEventListener('change', () => {
        const value = sortSelect.value.trim().toLowerCase();
        queueState.sortBy = value.includes('oldest')
          ? 'oldest'
          : value.includes('score')
            ? 'score'
            : 'newest';
        queueState.page = 1;
        void hydrateModerationQueue();
      });
    }

    if (dateInput && dateInput.dataset.bound !== 'true') {
      dateInput.dataset.bound = 'true';
      dateInput.addEventListener('input', () => {
        queueState.dateRange = dateInput.value.trim();
        queueState.page = 1;
        void hydrateModerationQueue();
      });
    }

    if (duplicatesToggle && duplicatesToggle.dataset.bound !== 'true') {
      duplicatesToggle.dataset.bound = 'true';
      duplicatesToggle.addEventListener('click', () => {
        queueState.duplicatesOnly = !queueState.duplicatesOnly;
        duplicatesToggle.classList.toggle('toggle-active', queueState.duplicatesOnly);
        queueState.page = 1;
        void hydrateModerationQueue();
      });
    }

    if (exportButton && exportButton.dataset.bound !== 'true') {
      exportButton.dataset.bound = 'true';
      exportButton.addEventListener('click', () => {
        const rootPage = getPageRoot();
        const rows = Array.from(rootPage?.querySelectorAll('.mq-table tbody tr') || []);
        const csv = rows.map((row) => Array.from(row.children).slice(0, 8).map((cell) => `"${cell.textContent.trim().replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'moderation-queue.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
    }

    const tbody = root.querySelector(TABLE_BODY_SELECTOR);
    if (tbody && tbody.dataset.bound !== 'true') {
      tbody.dataset.bound = 'true';
      tbody.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest('.btn-review') : null;
        if (!button) {
          return;
        }

        void handleReviewAction(button);
      });
    }
  }

  function initializeModerationQueuePage() {
    const root = getPageRoot();
    if (!root || root.dataset.moderationQueueInitialized === 'true') {
      return;
    }

    root.dataset.moderationQueueInitialized = 'true';
    bindControls(root);
    void hydrateModerationQueue();
  }

  function observeModerationQueueMount() {
    const mainContainer = document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.moderationQueueInitialized !== 'true') {
        initializeModerationQueuePage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
    initializeModerationQueuePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeModerationQueueMount, { once: true });
  } else {
    observeModerationQueueMount();
  }
})();
