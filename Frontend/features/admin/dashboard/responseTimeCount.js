import { getResponseTime } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const RESPONSE_TIME_SELECTOR = '[data-stat-number="response-time"]';

function formatResponseTime(value) {
  const normalizedValue = Number(value);
  const safeValue = Number.isFinite(normalizedValue) && normalizedValue >= 0
    ? Math.round(normalizedValue)
    : 0;

  return `${safeValue}ms`;
}

async function hydrateResponseTimeCount() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const responseTimeElement = dashboardRoot?.querySelector(RESPONSE_TIME_SELECTOR);

  if (!dashboardRoot || !responseTimeElement) {
    return;
  }

  if (
    dashboardRoot.dataset.responseTimeCountState === 'loading' ||
    dashboardRoot.dataset.responseTimeCountState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.responseTimeCountState = 'loading';

  try {
    const responseTime = await getResponseTime();
    responseTimeElement.textContent = formatResponseTime(responseTime);
    dashboardRoot.dataset.responseTimeCountState = 'loaded';
  } catch (error) {
    console.error('Failed to render dashboard response time', error);
    responseTimeElement.textContent = '0ms';
    dashboardRoot.dataset.responseTimeCountState = 'error';
  }
}

observeDashboardMount(hydrateResponseTimeCount);
