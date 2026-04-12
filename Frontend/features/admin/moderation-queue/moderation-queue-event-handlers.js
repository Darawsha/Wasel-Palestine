const SEARCH_SELECTOR = '[data-moderation-search]';
const CATEGORY_SELECTOR = '[data-moderation-category]';
const SORT_SELECTOR = '[data-moderation-sort]';
const DUPLICATE_TOGGLE_SELECTOR = '[data-moderation-duplicates-toggle]';
const CLEAR_FILTERS_SELECTOR = '[data-moderation-clear-filters]';
const MODAL_SELECTOR = '[data-moderation-modal]';
const NOTES_SELECTOR = '[data-moderation-notes]';

export function bindModerationQueueEvents(root, handlers = {}) {
  if (!root || root.dataset.moderationEventsBound === 'true') {
    return;
  }

  root.dataset.moderationEventsBound = 'true';
  root.dataset.moderationModalOpen = 'false';

  let searchDebounceTimer = null;

  const searchInput = root.querySelector(SEARCH_SELECTOR);
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      globalThis.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = globalThis.setTimeout(() => {
        if (typeof handlers.onSearchChange === 'function') {
          handlers.onSearchChange(searchInput.value);
        }
      }, 250);
    });
  }

  const categorySelect = root.querySelector(CATEGORY_SELECTOR);
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      if (typeof handlers.onCategoryChange === 'function') {
        handlers.onCategoryChange(categorySelect.value);
      }
    });
  }

  const sortSelect = root.querySelector(SORT_SELECTOR);
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      if (typeof handlers.onSortChange === 'function') {
        handlers.onSortChange(sortSelect.value);
      }
    });
  }

  const duplicateToggle = root.querySelector(DUPLICATE_TOGGLE_SELECTOR);
  if (duplicateToggle) {
    duplicateToggle.addEventListener('click', () => {
      if (typeof handlers.onDuplicateToggle === 'function') {
        handlers.onDuplicateToggle();
      }
    });
  }

  const clearFiltersBtn = root.querySelector(CLEAR_FILTERS_SELECTOR);
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (typeof handlers.onClearFilters === 'function') {
        handlers.onClearFilters();
      }
    });
  }

  root.addEventListener('click', async (event) => {
    const reviewButton = event.target.closest('[data-moderation-review-report]');
    if (reviewButton && root.contains(reviewButton)) {
      const reportId = Number(reviewButton.dataset.moderationReviewReport);
      if (
        Number.isFinite(reportId) &&
        typeof handlers.onOpenReview === 'function'
      ) {
        await handlers.onOpenReview(reportId);
      }
      return;
    }

    const paginationButton = event.target.closest('[data-moderation-page]');
    if (paginationButton && root.contains(paginationButton)) {
      const nextPage = Number(paginationButton.dataset.moderationPage);
      if (
        Number.isFinite(nextPage) &&
        typeof handlers.onPageChange === 'function'
      ) {
        await handlers.onPageChange(nextPage);
      }
      return;
    }

    const closeButton = event.target.closest('[data-moderation-close]');
    if (closeButton && root.contains(closeButton)) {
      if (typeof handlers.onCloseReview === 'function') {
        handlers.onCloseReview();
      }
      return;
    }

    const decisionButton = event.target.closest('[data-moderation-decision]');
    if (decisionButton && root.contains(decisionButton)) {
      const modal = root.querySelector(MODAL_SELECTOR);
      const reportId = Number(modal?.dataset.reportId);
      const notes = modal?.querySelector(NOTES_SELECTOR)?.value?.trim() || '';
      const decision = decisionButton.dataset.moderationDecision;

      if (
        Number.isFinite(reportId) &&
        typeof handlers.onDecision === 'function'
      ) {
        decisionButton.disabled = true;
        try {
          await handlers.onDecision(decision, reportId, notes);
        } finally {
          decisionButton.disabled = false;
        }
      }
      return;
    }

    const modal = root.querySelector(MODAL_SELECTOR);
    if (modal && event.target === modal && typeof handlers.onCloseReview === 'function') {
      handlers.onCloseReview();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      root.dataset.moderationModalOpen === 'true' &&
      typeof handlers.onCloseReview === 'function'
    ) {
      handlers.onCloseReview();
    }
  });
}
