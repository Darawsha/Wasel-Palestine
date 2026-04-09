import { countPendingReports } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const PENDING_REPORTS_SELECTOR = '[data-stat-number="pending-reports"]';

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

async function hydratePendingReportsCount() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const pendingReportsElement = dashboardRoot?.querySelector(PENDING_REPORTS_SELECTOR);

  if (!dashboardRoot || !pendingReportsElement) {
    return;
  }

  if (
    dashboardRoot.dataset.pendingReportsCountState === 'loading' ||
    dashboardRoot.dataset.pendingReportsCountState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.pendingReportsCountState = 'loading';

  try {
    const pendingReportsCount = await countPendingReports();
    pendingReportsElement.textContent = formatCount(pendingReportsCount);
    dashboardRoot.dataset.pendingReportsCountState = 'loaded';
  } catch (error) {
    console.error('Failed to render pending reports count', error);
    pendingReportsElement.textContent = '0';
    dashboardRoot.dataset.pendingReportsCountState = 'error';
  }
}

observeDashboardMount(hydratePendingReportsCount);
