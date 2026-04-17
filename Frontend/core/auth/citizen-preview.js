(function (global) {
  const STORAGE_KEY = 'wasel.adminCitizenPreview';
  const PREVIEW_QUERY_KEY = 'adminPreview';
  const DASHBOARD_URL = '/views/admin/header/header.html#admin-dashboard';

  function normalizeRoute(routeValue) {
    const route = String(routeValue || '')
      .replace(/^#/, '')
      .split('?')[0]
      .trim()
      .toLowerCase();

    if (!route) return 'home';
    if (route === 'routeplanner') return 'route-planner';
    return route;
  }

  function hasPreviewQuery() {
    try {
      const params = new URLSearchParams(global.location.search || '');
      const value = String(params.get(PREVIEW_QUERY_KEY) || '').toLowerCase();
      return value === '1' || value === 'true' || value === 'yes';
    } catch (_error) {
      return false;
    }
  }

  function persistPreviewFromUrl() {
    if (!hasPreviewQuery()) return false;

    try {
      global.sessionStorage?.setItem(STORAGE_KEY, '1');
    } catch (_error) {
      // Preview mode can still work from the URL when storage is unavailable.
    }

    return true;
  }

  function isActive() {
    if (persistPreviewFromUrl()) {
      return true;
    }

    try {
      return global.sessionStorage?.getItem(STORAGE_KEY) === '1';
    } catch (_error) {
      return false;
    }
  }

  function clearPreview() {
    try {
      global.sessionStorage?.removeItem(STORAGE_KEY);
    } catch (_error) {
      // No-op.
    }
  }

  function isPersonalRoute(routeValue) {
    return false;
  }

  function getRouteLabel(routeValue) {
    const route = normalizeRoute(routeValue);
    const labels = {
      alerts: 'My Alerts',
      logout: 'Logout',
      'my-alerts': 'My Alerts',
      'my-reports': 'My Reports',
      'my-routes': 'My Routes',
      notifications: 'Notifications',
      profile: 'Profile',
      'saved-routes': 'Saved Routes',
    };

    return labels[route] || 'Personal data';
  }

  function exitToDashboard(event) {
    event?.preventDefault?.();
    clearPreview();
    global.location.href = DASHBOARD_URL;
  }

  function renderPersonalRoute(routeValue) {
    const label = getRouteLabel(routeValue);

    return `
      <section class="citizen-preview-empty" id="spa-page-preview-disabled">
        <div class="citizen-preview-empty__icon" aria-hidden="true">
          <span class="material-symbols-outlined">visibility_off</span>
        </div>
        <p class="citizen-preview-empty__eyebrow">Admin Preview Mode</p>
        <h1>${label} is disabled in preview</h1>
        <p>
          This view only shows public citizen-facing data. Personal routes,
          reports, alerts, profile data, and account actions are not loaded.
        </p>
        <div class="citizen-preview-empty__actions">
          <a class="citizen-preview-empty__button" href="#home" onclick="route(event)">Open Home</a>
          <a class="citizen-preview-empty__button citizen-preview-empty__button--secondary" href="${DASHBOARD_URL}" data-admin-preview-exit>Back to Dashboard</a>
        </div>
      </section>
    `;
  }

  function disablePersonalNavigation() {
    document
      .querySelectorAll('[data-route="my-reports"], [data-route="alerts"]')
      .forEach((link) => {
        link.classList.remove('header-component__nav-link--preview-disabled');
        link.removeAttribute('aria-disabled');
        link.setAttribute('title', 'Preview this citizen page');
      });
  }

  function ensurePreviewControls() {
    const actions = document.querySelector('.header-component__actions');
    if (!actions) return;

    let badge = actions.querySelector('[data-admin-preview-badge]');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'header-component__preview-badge';
      badge.dataset.adminPreviewBadge = 'true';
      badge.textContent = 'Admin Preview Mode';
      actions.prepend(badge);
    }

    let exitLink = actions.querySelector('[data-admin-preview-exit]');
    if (!exitLink) {
      exitLink = document.createElement('a');
      exitLink.className = 'header-component__preview-exit';
      exitLink.href = DASHBOARD_URL;
      exitLink.dataset.adminPreviewExit = 'true';
      exitLink.textContent = 'Back to Dashboard';
      actions.prepend(exitLink);
    }

    exitLink.addEventListener('click', exitToDashboard, { once: true });
  }

  function hidePersonalAccountControls() {
    const avatarButton = document.querySelector('.header-component__avatar');
    if (avatarButton) {
      avatarButton.hidden = false;
      avatarButton.removeAttribute('aria-hidden');
      avatarButton.removeAttribute('tabindex');
      avatarButton.setAttribute('title', 'Preview account menu');
      avatarButton.style.backgroundImage = '';
      avatarButton.textContent = 'P';
    }
  }

  function bindExitLinks() {
    document.querySelectorAll('[data-admin-preview-exit]').forEach((link) => {
      if (link.dataset.adminPreviewExitBound === 'true') return;
      link.dataset.adminPreviewExitBound = 'true';
      link.addEventListener('click', exitToDashboard);
    });
  }

  function applyShellState() {
    if (!isActive()) return;

    document.documentElement.dataset.adminPreview = 'true';
    document.body?.classList.add('citizen-preview-mode');
    disablePersonalNavigation();
    ensurePreviewControls();
    hidePersonalAccountControls();
    bindExitLinks();
  }

  function notifyBlockedAction(label) {
    const message = `${label || 'This action'} is preview-only and was not saved.`;

    if (typeof global.showAlert === 'function') {
      global.showAlert('info', message);
      return;
    }

    global.alert?.(message);
  }

  global.CitizenPreview = {
    clearPreview,
    exitToDashboard,
    isActive,
    isPersonalRoute,
    notifyBlockedAction,
    renderPersonalRoute,
    STORAGE_KEY,
    applyShellState,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyShellState);
  } else {
    applyShellState();
  }
})(window);
