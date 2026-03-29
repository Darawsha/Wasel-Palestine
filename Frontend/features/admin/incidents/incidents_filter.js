// incidents_filters.js

const TYPE_FILTER_SELECTOR = '[data-incidents-type-filter]';
const SEVERITY_FILTER_SELECTOR = '[data-incidents-severity-filter]';
const STATUS_FILTER_SELECTOR = '[data-incidents-status-filter]';
const SEARCH_FILTER_SELECTOR = '[data-incidents-search-filter]';

/**
 * 
 */
export function getFilters(root) {
  return {
    type: root.querySelector(TYPE_FILTER_SELECTOR)?.value || '',
    severity: root.querySelector(SEVERITY_FILTER_SELECTOR)?.value || '',
    status: root.querySelector(STATUS_FILTER_SELECTOR)?.value || '',
    search: root.querySelector(SEARCH_FILTER_SELECTOR)?.value || '',

  };
}

/**
 * 
 * @param {HTMLElement} root 
 * @param {Function} onChangeCallback 
 */
export function bindFilters(root, onChangeCallback) {
  if (!root || root.dataset.incidentsFiltersBound === 'true') {
    return;
  }

  const filterElements = [
    root.querySelector(TYPE_FILTER_SELECTOR),
    root.querySelector(SEVERITY_FILTER_SELECTOR),
    root.querySelector(STATUS_FILTER_SELECTOR),
  ].filter(Boolean);

  filterElements.forEach((element) => {
    element.addEventListener('change', () => {
     
      if (typeof onChangeCallback === 'function') {
        onChangeCallback();
      }
    });
  });


  
  root.dataset.incidentsFiltersBound = 'true';
}

export function bindFrontendSearch(root, tableBodySelector) {
  const searchInput = root.querySelector(SEARCH_FILTER_SELECTOR);
  const tableBody = root.querySelector(tableBodySelector);

  if (!searchInput || !tableBody || root.dataset.searchBound === 'true') {
    return;
  }

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach((row) => {
   
      if (row.querySelector('td')?.colSpan > 1) return;

      const rowText = row.textContent.toLowerCase();
      
      if (rowText.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
  root.dataset.searchBound = 'true';
}