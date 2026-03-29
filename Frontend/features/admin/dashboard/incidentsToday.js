import { countIncidentsCreatedToday } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const INCIDENTS_TREND_SELECTOR = '[data-stat-card="incidents"] [data-stat-trend="incidents-today"]';

function formatIncidentsToday(count) {
  const normalizedCount = Number.isFinite(Number(count)) ? Number(count) : 0;

  if (normalizedCount > 0) {
    return `+${normalizedCount} today`;
  }

  return `${normalizedCount} today`;
}

async function hydrateIncidentsToday() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const incidentsTodayElement = dashboardRoot?.querySelector(INCIDENTS_TREND_SELECTOR);

  if (!dashboardRoot || !incidentsTodayElement) {
    return;
  }

  if (
    dashboardRoot.dataset.incidentsTodayState === 'loading' ||
    dashboardRoot.dataset.incidentsTodayState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.incidentsTodayState = 'loading';

  try {
    const incidentsTodayCount = await countIncidentsCreatedToday();
    incidentsTodayElement.textContent = formatIncidentsToday(incidentsTodayCount);
    dashboardRoot.dataset.incidentsTodayState = 'loaded';
  } catch (error) {
    console.error('Failed to render incidents created today count', error);
    incidentsTodayElement.textContent = '0 today';
    dashboardRoot.dataset.incidentsTodayState = 'error';
  }
}

observeDashboardMount(hydrateIncidentsToday);
