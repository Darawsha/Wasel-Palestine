(function () {
  const BUTTON_ID = 'headerNotificationsBtn';
  const DROPDOWN_ID = 'notificationsDropdown';
  const BADGE_ID = 'adminNotificationsBadge';
  const LIST_ID = 'adminNotificationsList';
  const MARK_ALL_ID = 'adminNotificationsMarkReadBtn';
  const POLL_INTERVAL_MS = 15000;

  let dependenciesPromise = null;
  let refreshTimerId = null;

  const state = {
    items: [],
    isLoading: false,
    hasLoaded: false,
  };

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.resolve().then(() =>
        import('/Services/alerts.service.js'),
      );
    }

    return dependenciesPromise;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatRelativeTime(dateValue) {
    if (!dateValue) {
      return 'Just now';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    const deltaMinutes = Math.max(
      Math.floor((Date.now() - date.getTime()) / 60000),
      0,
    );

    if (deltaMinutes < 1) {
      return 'Just now';
    }

    if (deltaMinutes < 60) {
      return `${deltaMinutes} min${deltaMinutes === 1 ? '' : 's'} ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) {
      return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;
    }

    const deltaDays = Math.floor(deltaHours / 24);
    return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
  }

  function getPresentation(message = {}) {
    const title = String(message.title || '').trim().toLowerCase();
    const summary = String(message.summary || message.messageBody || '')
      .trim()
      .toLowerCase();
    const haystack = `${title} ${summary}`;

    if (haystack.includes('alert subscription')) {
      return {
        iconName: 'notifications_active',
        iconClass: 'notification-icon notification-icon--subscription',
      };
    }

    if (haystack.includes('resolved')) {
      return {
        iconName: 'check_circle',
        iconClass: 'notification-icon notification-icon--resolved',
      };
    }

    return {
      iconName: 'warning',
      iconClass: 'notification-icon notification-icon--alert',
    };
  }

  function normalizeNotification(record = {}) {
    const message = record?.message || {};
    const presentation = getPresentation(message);

    return {
      id: String(record.id || '').trim(),
      status: String(record.status || '').trim().toUpperCase() || 'PENDING',
      title: String(message.title || '').trim() || 'Notification',
      text:
        String(message.summary || '').trim() ||
        String(message.messageBody || '').trim() ||
        'A new notification is available.',
      createdAt: record.createdAt || message.createdAt || null,
      timeLabel: formatRelativeTime(record.createdAt || message.createdAt),
      iconName: presentation.iconName,
      iconClass: presentation.iconClass,
    };
  }

  function getUnreadCount() {
    return state.items.filter((item) => item.status !== 'READ').length;
  }

  function renderBadge() {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) {
      return;
    }

    const unreadCount = getUnreadCount();
    badge.hidden = unreadCount <= 0;
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  }

  function renderList() {
    const list = document.getElementById(LIST_ID);
    const markAllButton = document.getElementById(MARK_ALL_ID);

    if (!list) {
      return;
    }

    if (state.isLoading && !state.hasLoaded) {
      list.innerHTML =
        '<div class="notification-empty-state">Loading notifications...</div>';
      if (markAllButton) {
        markAllButton.hidden = true;
      }
      return;
    }

    if (state.items.length === 0) {
      list.innerHTML =
        '<div class="notification-empty-state">No notifications yet.</div>';
      if (markAllButton) {
        markAllButton.hidden = true;
      }
      return;
    }

    list.innerHTML = state.items
      .map((item) => {
        const unreadClass = item.status !== 'READ' ? ' unread' : '';

        return `
          <button
            type="button"
            class="notification-item${unreadClass}"
            data-notification-id="${escapeHtml(item.id)}"
          >
            <div class="${escapeHtml(item.iconClass)}">
              <span class="material-symbols-outlined">${escapeHtml(item.iconName)}</span>
            </div>
            <div class="notification-content">
              <p class="notification-title">${escapeHtml(item.title)}</p>
              <p class="notification-text">${escapeHtml(item.text)}</p>
              <span class="notification-time">${escapeHtml(item.timeLabel)}</span>
            </div>
          </button>
        `;
      })
      .join('');

    if (markAllButton) {
      markAllButton.hidden = getUnreadCount() === 0;
    }
  }

  async function loadNotifications(options = {}) {
    if (state.isLoading) {
      return;
    }

    const showLoading = options.showLoading === true;
    state.isLoading = true;

    if (showLoading) {
      renderList();
    }

    try {
      const { getAlertInbox } = await getDependencies();
      const inbox = await getAlertInbox();
      state.items = Array.isArray(inbox) ? inbox.map(normalizeNotification) : [];
      state.hasLoaded = true;
    } catch (error) {
      console.error('Failed to load admin notifications.', error);
      state.items = [];
      state.hasLoaded = true;

      const list = document.getElementById(LIST_ID);
      if (list) {
        list.innerHTML =
          '<div class="notification-empty-state">Unable to load notifications.</div>';
      }
    } finally {
      state.isLoading = false;
      renderBadge();
      renderList();
    }
  }

  async function markAsRead(recordId) {
    const normalizedId = String(recordId || '').trim();
    const notification = state.items.find((item) => item.id === normalizedId);

    if (!normalizedId || !notification || notification.status === 'READ') {
      return;
    }

    try {
      const { markAlertAsRead } = await getDependencies();
      await markAlertAsRead(normalizedId);
      notification.status = 'READ';
      renderBadge();
      renderList();
    } catch (error) {
      console.error('Failed to mark notification as read.', error);
    }
  }

  async function markAllAsRead() {
    const unreadItems = state.items.filter((item) => item.status !== 'READ');
    if (unreadItems.length === 0) {
      return;
    }

    try {
      const { markAlertAsRead } = await getDependencies();
      await Promise.all(unreadItems.map((item) => markAlertAsRead(item.id)));
      unreadItems.forEach((item) => {
        item.status = 'READ';
      });
      renderBadge();
      renderList();
    } catch (error) {
      console.error('Failed to mark all notifications as read.', error);
    }
  }

  function closeDropdown() {
    const button = document.getElementById(BUTTON_ID);
    const dropdown = document.getElementById(DROPDOWN_ID);

    if (!button || !dropdown) {
      return;
    }

    dropdown.classList.remove('show');
  }

  function openDropdown() {
    const dropdown = document.getElementById(DROPDOWN_ID);
    if (!dropdown) {
      return;
    }

    dropdown.classList.add('show');
    void loadNotifications({ showLoading: !state.hasLoaded });
  }

  function startPolling() {
    if (refreshTimerId !== null) {
      return;
    }

    refreshTimerId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    }, POLL_INTERVAL_MS);
  }

  function init() {
    const notificationsBtn = document.getElementById(BUTTON_ID);
    const notificationsDropdown = document.getElementById(DROPDOWN_ID);
    const notificationsList = document.getElementById(LIST_ID);
    const markAllButton = document.getElementById(MARK_ALL_ID);

    if (
      !notificationsBtn ||
      !notificationsDropdown ||
      !notificationsList ||
      notificationsBtn.dataset.notificationsBound === 'true'
    ) {
      return;
    }

    notificationsBtn.dataset.notificationsBound = 'true';

    notificationsBtn.addEventListener('click', (event) => {
      event.stopPropagation();

      if (notificationsDropdown.classList.contains('show')) {
        closeDropdown();
      } else {
        openDropdown();
      }

      const profileDropdown = document.getElementById('profileDropdown');
      if (profileDropdown?.classList.contains('show')) {
        profileDropdown.classList.remove('show');
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        !notificationsBtn.contains(target) &&
        !notificationsDropdown.contains(target)
      ) {
        closeDropdown();
      }
    });

    notificationsDropdown.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    notificationsList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const item = target.closest('[data-notification-id]');
      if (!item) {
        return;
      }

      void markAsRead(item.getAttribute('data-notification-id'));
    });

    markAllButton?.addEventListener('click', () => {
      void markAllAsRead();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    });

    startPolling();
    void loadNotifications({ showLoading: true });
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();
