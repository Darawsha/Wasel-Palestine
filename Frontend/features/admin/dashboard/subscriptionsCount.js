import { countSubscriptions } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const SUBSCRIPTIONS_SELECTOR = '[data-stat-number="subscriptions"]';

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

async function hydrateSubscriptionsCount() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const subscriptionsElement = dashboardRoot?.querySelector(SUBSCRIPTIONS_SELECTOR);

  if (!dashboardRoot || !subscriptionsElement) {
    return;
  }

  if (
    dashboardRoot.dataset.subscriptionsCountState === 'loading' ||
    dashboardRoot.dataset.subscriptionsCountState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.subscriptionsCountState = 'loading';

  try {
    const subscriptionsCount = await countSubscriptions();
    subscriptionsElement.textContent = formatCount(subscriptionsCount);
    dashboardRoot.dataset.subscriptionsCountState = 'loaded';
  } catch (error) {
    console.error('Failed to render subscriptions count', error);
    subscriptionsElement.textContent = '0';
    dashboardRoot.dataset.subscriptionsCountState = 'error';
  }
}

observeDashboardMount(hydrateSubscriptionsCount);
