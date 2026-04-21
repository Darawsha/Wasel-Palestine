import { loadAlertsUnreadCount } from '/Controllers/alerts.controller.js';

const BADGE_SELECTOR = '[data-alerts-unread-badge]';
const REFRESH_EVENT = 'alerts:unread-refresh';
const NOTIFICATION_REFRESH_EVENT = 'user-notifications:refresh';
const REFRESH_INTERVAL_MS = 30000;

function getBadge() {
  return document.querySelector(BADGE_SELECTOR);
}

function isPreviewMode() {
  return window.CitizenPreview?.isActive?.() === true;
}

function setBadgeCount(count) {
  const badge = getBadge();
  if (!badge) return;

  const unreadCount = Math.max(Number(count) || 0, 0);
  if (isPreviewMode() || unreadCount <= 0) {
    badge.hidden = true;
    badge.textContent = '0';
    return;
  }

  badge.hidden = false;
  badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
}

async function refreshAlertsBadge() {
  if (isPreviewMode()) {
    setBadgeCount(0);
    return;
  }

  try {
    setBadgeCount(await loadAlertsUnreadCount());
  } catch (error) {
    console.warn('Unable to refresh alerts unread count', error);
    setBadgeCount(0);
  }
}

window.addEventListener(REFRESH_EVENT, (event) => {
  if (event?.detail && Number.isFinite(Number(event.detail.unreadCount))) {
    setBadgeCount(event.detail.unreadCount);
    return;
  }

  void refreshAlertsBadge();
});

window.addEventListener(NOTIFICATION_REFRESH_EVENT, () => {
  void refreshAlertsBadge();
});

window.addEventListener('focus', () => {
  void refreshAlertsBadge();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshAlertsBadge);
} else {
  void refreshAlertsBadge();
}

window.setInterval(() => {
  if (document.visibilityState === 'visible') {
    void refreshAlertsBadge();
  }
}, REFRESH_INTERVAL_MS);
