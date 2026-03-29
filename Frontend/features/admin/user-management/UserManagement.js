(function () {
  const PAGE_SELECTOR = '.user-management-page';
  const TABLE_BODY_SELECTOR = '[data-users-table-body]';
  const TOTAL_COUNT_SELECTOR = '[data-users-total-count]';
  const PAGINATION_RANGE_SELECTOR = '[data-users-pagination-range]';
  const PAGINATION_TOTAL_SELECTOR = '[data-users-pagination-total]';
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 10;

  let dependenciesPromise;
  let activeRequestId = 0;
  let currentUsersById = new Map();
  let pageState = {
    total: 0,
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    totalPages: 0,
  };

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function normalizePositiveInteger(value, fallback) {
    const normalizedValue = Number(value);
    return Number.isFinite(normalizedValue) && normalizedValue > 0
      ? Math.floor(normalizedValue)
      : fallback;
  }

  function formatCount(value) {
    return String(Number(value) || 0);
  }

  function normalizeMeta(meta = {}) {
    const total = Math.max(Number(meta.total) || 0, 0);
    const limit = normalizePositiveInteger(meta.limit, pageState.limit || DEFAULT_LIMIT);
    const reportedTotalPages = Number(meta.totalPages);
    const totalPages = total > 0
      ? Math.max(
        Number.isFinite(reportedTotalPages) && reportedTotalPages > 0
          ? Math.floor(reportedTotalPages)
          : 0,
        Math.ceil(total / limit),
      )
      : 0;
    const page = totalPages > 0
      ? Math.min(normalizePositiveInteger(meta.page, DEFAULT_PAGE), totalPages)
      : DEFAULT_PAGE;

    return {
      total,
      page,
      limit,
      totalPages,
    };
  }

  function getInitials(user) {
    const firstInitial = String(user?.firstname || '').trim().charAt(0).toUpperCase();
    const lastInitial = String(user?.lastname || '').trim().charAt(0).toUpperCase();
    const initials = `${firstInitial}${lastInitial}`.trim();
    return initials || 'U';
  }

  function formatRegisteredDate(dateValue) {
    if (!dateValue) {
      return 'N/A';
    }

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'N/A';
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function formatRoleLabel(role) {
    return role === 'admin' ? 'Admin' : 'Citizen';
  }

  function formatRoleClass(role) {
    return role === 'admin' ? 'role-admin' : 'role-citizen';
  }

  function updateDisplayedTotals(root, meta = {}) {
    root.dataset.usersTotal = String(meta.total || 0);
    root.dataset.usersPage = String(meta.page || DEFAULT_PAGE);
    root.dataset.usersLimit = String(meta.limit || DEFAULT_LIMIT);
    root.dataset.usersTotalPages = String(meta.totalPages || 0);

    const totalCountElement = root.querySelector(TOTAL_COUNT_SELECTOR);
    if (totalCountElement) {
      totalCountElement.textContent = formatCount(meta.total);
    }

    const paginationTotalElement = root.querySelector(PAGINATION_TOTAL_SELECTOR);
    if (paginationTotalElement) {
      paginationTotalElement.textContent = formatCount(meta.total);
    }
  }

  function updateDisplayedRange(root, meta = {}, visibleRows = 0) {
    const rangeElement = root.querySelector(PAGINATION_RANGE_SELECTOR);
    if (!rangeElement) {
      return;
    }

    if (!meta.total || visibleRows === 0) {
      rangeElement.textContent = '0-0';
      return;
    }

    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(start + visibleRows - 1, meta.total);
    rangeElement.textContent = `${start}-${end}`;
  }

  function buildUserRow(user) {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td class="cell-id">#${user?.id ?? '--'}</td>
      <td>
        <div class="user-profile">
          <div class="avatar avatar-blue">${getInitials(user)}</div>
          <span class="user-name">${user?.firstname || ''} ${user?.lastname || ''}</span>
        </div>
      </td>
      <td class="cell-email">${user?.email || 'N/A'}</td>
      <td>
        <span class="role-badge ${formatRoleClass(user?.role)}">${formatRoleLabel(user?.role)}</span>
      </td>
      <td>
        <span class="status-badge status-active">
          <span class="dot"></span> Active
        </span>
      </td>
      <td class="cell-date">${formatRegisteredDate(user?.createdAt)}</td>
      <td class="align-right">
        <button
          class="btn-action-menu"
          type="button"
          data-user-actions-trigger
          data-user-id="${user?.id ?? ''}"
          aria-expanded="false"
          aria-label="Open user actions"
        >
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </td>
    `;

    return row;
  }

  function buildEmptyStateRow() {
    const row = document.createElement('tr');
    row.className = 'empty-state-row';
    row.innerHTML = '<td colspan="7">No users found.</td>';
    return row;
  }

  function renderUsers(root, users) {
    const tableBody = root.querySelector(TABLE_BODY_SELECTOR);
    if (!tableBody) {
      return 0;
    }

    tableBody.innerHTML = '';

    if (!Array.isArray(users) || users.length === 0) {
      currentUsersById = new Map();
      tableBody.appendChild(buildEmptyStateRow());
      return 0;
    }

    currentUsersById = new Map(
      users
        .filter((user) => Number.isFinite(Number(user?.id)))
        .map((user) => [Number(user.id), user]),
    );

    users.forEach((user) => {
      tableBody.appendChild(buildUserRow(user));
    });

    return users.length;
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Controllers/userManagement.controller.js'),
        import('/features/admin/user-management/pagination.js'),
        import('/features/admin/user-management/user_actions.js'),
      ]).then(([controllerModule, paginationModule, userActionsModule]) => ({
        loadUsersPage: controllerModule.loadUsersPage,
        renderUserPagination: paginationModule.renderUserPagination,
        bindUserActionMenus: userActionsModule.bindUserActionMenus,
      }));
    }

    return dependenciesPromise;
  }

  async function loadUserPage(page = DEFAULT_PAGE) {
    const root = getPageRoot();
    if (!root) {
      return;
    }

    const requestId = ++activeRequestId;
    const requestedPage = normalizePositiveInteger(page, DEFAULT_PAGE);

    root.dataset.userManagementState = 'loading';

    try {
      const { loadUsersPage, renderUserPagination, bindUserActionMenus } = await getDependencies();
      const response = await loadUsersPage({
        page: requestedPage,
        limit: pageState.limit || DEFAULT_LIMIT,
      });

      if (requestId !== activeRequestId) {
        return;
      }

      const meta = normalizeMeta(response?.meta);
      const visibleRows = renderUsers(root, response?.data);

      pageState = meta;
      updateDisplayedTotals(root, meta);
      updateDisplayedRange(root, meta, visibleRows);
      renderUserPagination(root, meta, handlePageChange);
      bindUserActionMenus(root, {
        getUserById: (userId) => currentUsersById.get(Number(userId)),
      });
      window.applyUserManagementFilter?.();
      root.dataset.userManagementState = 'loaded';
    } catch (error) {
      if (requestId !== activeRequestId) {
        return;
      }

      console.error('Failed to hydrate user management page', error);
      root.dataset.userManagementState = 'error';
    }
  }

  function handlePageChange(nextPage) {
    if (nextPage === pageState.page) {
      return;
    }

    loadUserPage(nextPage);
  }

  function handleUserCreated() {
    pageState = {
      ...pageState,
      page: DEFAULT_PAGE,
    };

    loadUserPage(DEFAULT_PAGE);
  }

  function handleUserUpdated() {
    loadUserPage(pageState.page || DEFAULT_PAGE);
  }

  function handleUserDeleted() {
    const nextPage =
      currentUsersById.size <= 1 && pageState.page > DEFAULT_PAGE
        ? pageState.page - 1
        : pageState.page;

    loadUserPage(nextPage || DEFAULT_PAGE);
  }

  function initializeUserManagementPage() {
    const root = getPageRoot();
    if (!root || root.dataset.userManagementInitialized === 'true') {
      return;
    }

    root.dataset.userManagementInitialized = 'true';
    loadUserPage(DEFAULT_PAGE);
  }

  if (!document.body.dataset.userManagementEventBound) {
    document.addEventListener('admin:user-created', handleUserCreated);
    document.addEventListener('admin:user-updated', handleUserUpdated);
    document.addEventListener('admin:user-deleted', handleUserDeleted);
    document.body.dataset.userManagementEventBound = 'true';
  }

  function observeUserPageMount() {
    const mainContainer = document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.userManagementInitialized !== 'true') {
        initializeUserManagementPage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
    initializeUserManagementPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeUserPageMount);
  } else {
    observeUserPageMount();
  }
})();
