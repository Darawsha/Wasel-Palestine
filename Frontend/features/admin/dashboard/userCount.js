import { countCitizens } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const CITIZENS_COUNT_SELECTOR = '[data-stat-number="citizens"]';

async function hydrateCitizensCount() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const citizensCountElement = dashboardRoot?.querySelector(CITIZENS_COUNT_SELECTOR);

  if (!dashboardRoot || !citizensCountElement) {
    return;
  }

  if (
    dashboardRoot.dataset.citizensCountState === 'loading' ||
    dashboardRoot.dataset.citizensCountState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.citizensCountState = 'loading';

  try {
    const citizensCount = await countCitizens();
    citizensCountElement.textContent = String(citizensCount);
    dashboardRoot.dataset.citizensCountState = 'loaded';
  } catch (error) {
    console.error('Failed to render citizens count', error);
    citizensCountElement.textContent = '0';
    dashboardRoot.dataset.citizensCountState = 'error';
  }
}

observeDashboardMount(hydrateCitizensCount);
