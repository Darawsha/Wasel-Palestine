import { getDashboardUserRegistrationBuckets } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const REGISTRATION_CHART_SELECTOR = '[data-dashboard-chart="user-registrations"]';
const BAR_CONTAINER_SELECTOR = '[data-bar-chart="user-registrations"]';

function buildBarHeight(value, maxValue) {
  if (value <= 0 || maxValue <= 0) {
    return '0%';
  }

  return `${Math.max((value / maxValue) * 100, 12)}%`;
}

function createBarColumn(bucket, maxValue) {
  const value = Number(bucket?.value) || 0;
  const column = document.createElement('div');
  column.className = 'bar-col';
  column.style.height = buildBarHeight(value, maxValue);
  column.title = `${value} registrations`;
  column.setAttribute('aria-label', `${bucket.label}: ${value} registrations`);

  const fill = document.createElement('div');
  fill.className = 'bar-fill';

  const label = document.createElement('span');
  label.className = 'bar-label';
  label.textContent = String(bucket?.label || '').toUpperCase();

  column.append(fill, label);
  return column;
}

function renderRegistrationBuckets(container, buckets) {
  const maxValue = Math.max(
    ...buckets.map((bucket) => Number(bucket?.value) || 0),
    0,
  );

  container.replaceChildren(
    ...buckets.map((bucket) => createBarColumn(bucket, maxValue)),
  );
}

async function hydrateUserRegistrationsChart() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const chartCard = dashboardRoot?.querySelector(REGISTRATION_CHART_SELECTOR);
  const barContainer = chartCard?.querySelector(BAR_CONTAINER_SELECTOR);

  if (!dashboardRoot || !chartCard || !barContainer) {
    return;
  }

  if (
    dashboardRoot.dataset.userRegistrationsChartState === 'loading' ||
    dashboardRoot.dataset.userRegistrationsChartState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.userRegistrationsChartState = 'loading';

  try {
    const registrationBuckets = await getDashboardUserRegistrationBuckets();
    const buckets = Array.isArray(registrationBuckets?.buckets)
      ? registrationBuckets.buckets
      : [];

    renderRegistrationBuckets(barContainer, buckets);
    dashboardRoot.dataset.userRegistrationsChartState = 'loaded';
  } catch (error) {
    console.error('Failed to render user registrations chart', error);
    barContainer.replaceChildren();
    dashboardRoot.dataset.userRegistrationsChartState = 'error';
  }
}

observeDashboardMount(hydrateUserRegistrationsChart);
