import { countCheckpoints } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const CHECKPOINTS_COUNT_SELECTOR = '[data-stat-number="checkpoints"]';

async function hydrateCheckpointsCount() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const checkpointsCountElement = dashboardRoot?.querySelector(CHECKPOINTS_COUNT_SELECTOR);

  if (!dashboardRoot || !checkpointsCountElement) {
    return;
  }

  if (
    dashboardRoot.dataset.checkpointsCountState === 'loading' ||
    dashboardRoot.dataset.checkpointsCountState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.checkpointsCountState = 'loading';

  try {
    const checkpointsCount = await countCheckpoints();
    checkpointsCountElement.textContent = String(checkpointsCount);
    dashboardRoot.dataset.checkpointsCountState = 'loaded';
  } catch (error) {
    console.error('Failed to render checkpoints count', error);
    checkpointsCountElement.textContent = '0';
    dashboardRoot.dataset.checkpointsCountState = 'error';
  }
}

observeDashboardMount(hydrateCheckpointsCount);
