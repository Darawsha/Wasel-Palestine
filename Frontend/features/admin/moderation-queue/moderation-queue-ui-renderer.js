const TABLE_BODY_SELECTOR = '[data-moderation-table-body]';
const PAGINATION_INFO_SELECTOR = '[data-moderation-pagination-info]';
const PAGINATION_CONTROLS_SELECTOR = '[data-moderation-pagination-controls]';
const PENDING_COUNT_SELECTOR = '[data-moderation-pending-count]';
const SEARCH_SELECTOR = '[data-moderation-search]';
const CATEGORY_SELECTOR = '[data-moderation-category]';
const SORT_SELECTOR = '[data-moderation-sort]';
const CLEAR_FILTERS_SELECTOR = '[data-moderation-clear-filters]';
const DUPLICATE_TOGGLE_SELECTOR = '[data-moderation-duplicates-toggle]';
const MODAL_SELECTOR = '[data-moderation-modal]';

const MAX_VISIBLE_PAGES = 5;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getCategoryClass(category) {
  const normalized = String(category || '').trim().toLowerCase();

  if (normalized === 'road_closure') return 'cat-red';
  if (normalized === 'delay') return 'cat-yellow';
  if (normalized === 'accident') return 'cat-orange';
  if (normalized === 'hazard') return 'cat-blue';
  return 'cat-blue';
}

function buildMessageRow(message) {
  return `
    <tr>
      <td colspan="9" class="text-center">${escapeHtml(message)}</td>
    </tr>
  `;
}

function buildQueueRow(report) {
  const reviewLabel =
    report.status === 'under_review' ? 'Continue Review' : 'Review';

  return `
    <tr class="${report.isDuplicate ? 'row-warning' : ''}">
      <td class="cell-id">#${escapeHtml(report.id)}</td>
      <td>
        <span class="category-badge ${getCategoryClass(report.category)}">${escapeHtml(report.categoryLabel)}</span>
      </td>
      <td class="cell-location">${escapeHtml(report.location)}</td>
      <td class="cell-desc">${escapeHtml(report.description)}</td>
      <td class="cell-user">${escapeHtml(report.reporterName)}</td>
      <td class="cell-time">${escapeHtml(report.relativeTime)}</td>
      <td class="cell-score text-center">${escapeHtml(report.confidenceScore)}%</td>
      <td class="text-center ${report.isDuplicate ? 'text-orange' : ''}">
        ${report.isDuplicate ? '<span class="material-symbols-outlined icon-flag">warning</span>' : ''}
      </td>
      <td class="text-right">
        <button class="btn-review" type="button" data-moderation-review-report="${escapeHtml(report.id)}">
          ${escapeHtml(reviewLabel)}
        </button>
      </td>
    </tr>
  `;
}

function buildPageSequence(currentPage, totalPages) {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

function createPageButton(label, page, isActive, isDisabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn-page${isActive ? ' active' : ''}${label === 'Previous' || label === 'Next' ? ' text-only' : ''}`;
  button.textContent = label;
  button.disabled = Boolean(isDisabled);

  if (Number.isFinite(page)) {
    button.dataset.moderationPage = String(page);
  }

  return button;
}

export function renderModerationChrome(root, state) {
  if (!root || !state) {
    return;
  }

  const pendingCount = root.querySelector(PENDING_COUNT_SELECTOR);
  if (pendingCount) {
    pendingCount.textContent = `${state.counts.pending || state.meta.total || 0} pending`;
  }

  const searchInput = root.querySelector(SEARCH_SELECTOR);
  if (searchInput && searchInput.value !== state.search) {
    searchInput.value = state.search;
  }

  const categorySelect = root.querySelector(CATEGORY_SELECTOR);
  if (categorySelect && categorySelect.value !== state.category) {
    categorySelect.value = state.category;
  }

  const sortSelect = root.querySelector(SORT_SELECTOR);
  const expectedSortValue = `${state.sort.field}:${state.sort.order}`;
  if (sortSelect && sortSelect.value !== expectedSortValue) {
    sortSelect.value = expectedSortValue;
  }

  const duplicatesToggle = root.querySelector(DUPLICATE_TOGGLE_SELECTOR);
  if (duplicatesToggle) {
    duplicatesToggle.classList.toggle('toggle-active', Boolean(state.duplicateOnly));
    duplicatesToggle.setAttribute('aria-pressed', String(Boolean(state.duplicateOnly)));
  }

  // Show/hide the Clear Filters button whenever any filter is active
  const clearFiltersBtn = root.querySelector(CLEAR_FILTERS_SELECTOR);
  if (clearFiltersBtn) {
    const hasActiveFilters =
      String(state.search || '').trim() !== '' ||
      String(state.category || '').trim() !== '' ||
      Boolean(state.duplicateOnly);
    clearFiltersBtn.hidden = !hasActiveFilters;
  }
}

export function renderModerationLoading(root, state) {
  renderModerationChrome(root, state);
  closeModerationModal(root);

  const tableBody = root?.querySelector(TABLE_BODY_SELECTOR);
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = buildMessageRow('Loading moderation queue...');
}

export function renderModerationError(root, state, message) {
  renderModerationChrome(root, state);
  closeModerationModal(root);

  const tableBody = root?.querySelector(TABLE_BODY_SELECTOR);
  const paginationInfo = root?.querySelector(PAGINATION_INFO_SELECTOR);
  const paginationControls = root?.querySelector(PAGINATION_CONTROLS_SELECTOR);

  if (!tableBody || !paginationInfo || !paginationControls) {
    return;
  }

  tableBody.innerHTML = buildMessageRow(
    message || 'Unable to load the moderation queue.',
  );
  paginationInfo.textContent = 'Showing 0 reports';
  paginationControls.innerHTML = '';
}

export function renderModerationQueue(root, state, reports) {
  renderModerationChrome(root, state);

  const tableBody = root?.querySelector(TABLE_BODY_SELECTOR);
  const paginationInfo = root?.querySelector(PAGINATION_INFO_SELECTOR);
  const paginationControls = root?.querySelector(PAGINATION_CONTROLS_SELECTOR);

  if (!tableBody || !paginationInfo || !paginationControls) {
    return;
  }

  if (!Array.isArray(reports) || reports.length === 0) {
    const activeSearch = String(state?.search || '').trim();
    const activeCategory = String(state?.category || '').trim();
    const hasActiveFilters = activeSearch !== '' || activeCategory !== '';

    if (hasActiveFilters) {
      const parts = [];
      if (activeSearch) {
        parts.push(`"${escapeHtml(activeSearch)}"`);
      }
      if (activeCategory) {
        parts.push(`category "${escapeHtml(activeCategory)}"`);
      }
      tableBody.innerHTML = buildMessageRow(
        `No reports found matching ${parts.join(' in ')}. Try clearing the filters.`,
      );
    } else {
      tableBody.innerHTML = buildMessageRow('No reports found in the moderation queue.');
    }
  } else {
    tableBody.innerHTML = reports.map(buildQueueRow).join('');
  }

  const total = Math.max(Number(state?.meta?.total) || 0, 0);
  const page = Math.max(Number(state?.meta?.page) || 1, 1);
  const limit = Math.max(Number(state?.meta?.limit) || 1, 1);
  const totalPages = Math.max(
    Number(state?.meta?.totalPages) || 0,
    total > 0 ? Math.ceil(total / limit) : 0,
  );

  if (total === 0) {
    paginationInfo.textContent = 'Showing 0 reports';
    paginationControls.innerHTML = '';
    return;
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(start + limit - 1, total);
  paginationInfo.textContent = `Showing ${start}-${end} of ${total} reports`;

  paginationControls.innerHTML = '';

  if (totalPages <= 1) {
    return;
  }

  const fragment = document.createDocumentFragment();

  fragment.appendChild(
    createPageButton('Previous', page - 1, false, page <= 1),
  );

  buildPageSequence(page, totalPages).forEach((item) => {
    if (item === 'ellipsis') {
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '...';
      fragment.appendChild(span);
      return;
    }

    fragment.appendChild(createPageButton(String(item), item, item === page, false));
  });

  fragment.appendChild(
    createPageButton('Next', page + 1, false, page >= totalPages),
  );

  paginationControls.appendChild(fragment);
}

export function openModerationModal(root, report) {
  const modal = root?.querySelector(MODAL_SELECTOR);
  if (!modal || !report) {
    return;
  }

  modal.hidden = false;
  modal.dataset.reportId = String(report.id);
  modal.querySelector('[data-moderation-modal-title]').textContent =
    `${report.title} #${report.id}`;
  modal.querySelector('[data-moderation-modal-status]').textContent =
    report.statusLabel;
  modal.querySelector('[data-moderation-modal-location]').textContent =
    report.location;
  modal.querySelector('[data-moderation-modal-reporter]').textContent =
    report.reporterName;
  modal.querySelector('[data-moderation-modal-time]').textContent =
    report.createdAtLabel;
  modal.querySelector('[data-moderation-modal-confidence]').textContent =
    `${report.confidenceScore}%`;
  modal.querySelector('[data-moderation-modal-description]').textContent =
    report.description;
  modal.querySelector('[data-moderation-modal-duplicate]').textContent =
    report.isDuplicate
      ? `Duplicate of report #${report.duplicateOf}`
      : 'No duplicate flag detected';
  modal.querySelector('[data-moderation-notes]').value = '';
  root.dataset.moderationModalOpen = 'true';
}

export function closeModerationModal(root) {
  const modal = root?.querySelector(MODAL_SELECTOR);
  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.dataset.reportId = '';
  root.dataset.moderationModalOpen = 'false';
}
