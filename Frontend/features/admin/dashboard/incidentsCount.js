import { countIncidents } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const INCIDENTS_COUNT_SELECTOR = '[data-stat-number="incidents"]';

async function hydrateIncidentsCount() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const incidentsCountElement = dashboardRoot?.querySelector(INCIDENTS_COUNT_SELECTOR);

  if (!dashboardRoot || !incidentsCountElement) {
    return;
  }

  if (
    dashboardRoot.dataset.incidentsCountState === 'loading' ||
    dashboardRoot.dataset.incidentsCountState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.incidentsCountState = 'loading';

  try {
    const incidentsCount = await countIncidents();
    incidentsCountElement.textContent = String(incidentsCount);
    dashboardRoot.dataset.incidentsCountState = 'loaded';
  } catch (error) {
    console.error('Failed to render incidents count', error);
    incidentsCountElement.textContent = '0';
    dashboardRoot.dataset.incidentsCountState = 'error';
  }
}

observeDashboardMount(hydrateIncidentsCount);
