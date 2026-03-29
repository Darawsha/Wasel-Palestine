// checkpoint_filter.js

const STATUS_FILTER_SELECTOR = '[data-checkpoint-status-filter]';
const SEARCH_FILTER_SELECTOR = '[data-checkpoint-search-filter]';

/**
 * Retrieves the current filter values.
 */
export function getFilters(root) {
  if (!root) return {};
  return {
    status: root.querySelector(STATUS_FILTER_SELECTOR)?.value || '',
    search: root.querySelector(SEARCH_FILTER_SELECTOR)?.value || '',
  };
}

/**
 * Binds change events to the filter elements.
 */
export function bindFilters(root, onChangeCallback) {
  if (!root || root.dataset.checkpointFiltersBound === 'true') {
    return;
  }

  const statusFilter = root.querySelector(STATUS_FILTER_SELECTOR);
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      if (typeof onChangeCallback === 'function') {
        onChangeCallback();
      }
    });
  }

  root.dataset.checkpointFiltersBound = 'true';
}

/**
 * Binds a real-time frontend search listener to the search input.
 */
export function bindFrontendSearch(root, tableBodySelector) {
  const searchInput = root.querySelector(SEARCH_FILTER_SELECTOR);
  const tableBody = root.querySelector(tableBodySelector);

  if (!searchInput || !tableBody || root.dataset.checkpointSearchBound === 'true') {
    return;
  }

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach((row) => {
      // Skip message rows (like "Loading...")
      if (row.querySelector('td')?.colSpan > 1) return;

      const rowText = row.textContent.toLowerCase();
      row.style.display = rowText.includes(searchTerm) ? '' : 'none';
    });
  });

  root.dataset.checkpointSearchBound = 'true';
}
