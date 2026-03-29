(function () {
  const PAGE_SELECTOR = '.user-management-page';
  const SEARCH_INPUT_SELECTOR = '[data-users-search-input]';
  const ROLE_FILTER_SELECTOR = '[data-users-role-filter]';
  const STATUS_FILTER_SELECTOR = '[data-users-status-filter]';
  const TABLE_BODY_SELECTOR = '[data-users-table-body]';

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function rowMatchesSearch(row, searchValue) {
    const name = normalizeText(row.querySelector('.user-name')?.textContent);
    const email = normalizeText(row.querySelector('.cell-email')?.textContent);
    const role = normalizeText(row.querySelector('.role-badge')?.textContent);
    const id = normalizeText(row.querySelector('.cell-id')?.textContent);

    return (
      name.includes(searchValue) ||
      email.includes(searchValue) ||
      role.includes(searchValue) ||
      id.includes(searchValue)
    );
  }

  function rowMatchesRole(row, roleValue) {
    if (!roleValue || roleValue === 'all') {
      return true;
    }

    const role = normalizeText(row.querySelector('.role-badge')?.textContent);
    return role.includes(roleValue);
  }

  function rowMatchesStatus(row, statusValue) {
    if (!statusValue || statusValue === 'all') {
      return true;
    }

    const status = normalizeText(row.querySelector('.status-badge')?.textContent);
    return status.includes(statusValue);
  }

  function applyUserManagementFilter() {
    const root = getPageRoot();
    const searchInput = root?.querySelector(SEARCH_INPUT_SELECTOR);
    const roleFilter = root?.querySelector(ROLE_FILTER_SELECTOR);
    const statusFilter = root?.querySelector(STATUS_FILTER_SELECTOR);
    const tableBody = root?.querySelector(TABLE_BODY_SELECTOR);

    if (!root || !searchInput || !roleFilter || !statusFilter || !tableBody) {
      return;
    }

    const searchValue = normalizeText(searchInput.value);
    const roleValue = normalizeText(roleFilter.value);
    const statusValue = normalizeText(statusFilter.value);
    const rows = tableBody.querySelectorAll('tr:not(.empty-state-row)');

    rows.forEach((row) => {
      row.style.display =
        rowMatchesSearch(row, searchValue) &&
          rowMatchesRole(row, roleValue) &&
          rowMatchesStatus(row, statusValue)
          ? ''
          : 'none';
    });
  }

  function initUsersFilter() {
    const root = getPageRoot();
    const searchInput = root?.querySelector(SEARCH_INPUT_SELECTOR);
    const roleFilter = root?.querySelector(ROLE_FILTER_SELECTOR);
    const statusFilter = root?.querySelector(STATUS_FILTER_SELECTOR);

    if (
      !root ||
      !searchInput ||
      !roleFilter ||
      !statusFilter ||
      searchInput.dataset.filterBound === 'true'
    ) {
      return;
    }

    searchInput.dataset.filterBound = 'true';
    searchInput.addEventListener('input', applyUserManagementFilter);
    roleFilter.addEventListener('change', applyUserManagementFilter);
    statusFilter.addEventListener('change', applyUserManagementFilter);
    applyUserManagementFilter();
  }

  window.applyUserManagementFilter = applyUserManagementFilter;

  function observeUserFiltersMount() {
    const mainContainer = document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      const searchInput = root?.querySelector(SEARCH_INPUT_SELECTOR);

      if (root && searchInput && searchInput.dataset.filterBound !== 'true') {
        initUsersFilter();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
    initUsersFilter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeUserFiltersMount);
  } else {
    observeUserFiltersMount();
  }
})();
