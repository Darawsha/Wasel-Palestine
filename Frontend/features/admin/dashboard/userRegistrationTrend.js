import { getUserRegistrationTrend } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const CITIZENS_TREND_SELECTOR = '[data-stat-trend="citizens-registration"]';

function formatPercentage(value) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue === 0) {
    return '0%';
  }

  return Number.isInteger(absoluteValue)
    ? `${absoluteValue}%`
    : `${absoluteValue.toFixed(1)}%`;
}

function applyTrendPresentation(trendElement, percentageChange) {
  const normalizedChange = Math.abs(percentageChange) < 0.01 ? 0 : percentageChange;

  trendElement.classList.remove('trend-up', 'trend-negative', 'trend-neutral');

  if (normalizedChange > 0) {
    trendElement.classList.add('trend-up');
    trendElement.textContent = `+ ${formatPercentage(normalizedChange)}`;
    return;
  }

  if (normalizedChange < 0) {
    trendElement.classList.add('trend-negative');
    trendElement.textContent = `- ${formatPercentage(normalizedChange)}`;
    return;
  }

  trendElement.classList.add('trend-neutral');
  trendElement.textContent = formatPercentage(normalizedChange);
}

async function hydrateUserRegistrationTrend() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const trendElement = dashboardRoot?.querySelector(CITIZENS_TREND_SELECTOR);

  if (!dashboardRoot || !trendElement) {
    return;
  }

  if (
    dashboardRoot.dataset.userRegistrationTrendState === 'loading' ||
    dashboardRoot.dataset.userRegistrationTrendState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.userRegistrationTrendState = 'loading';

  try {
    const trend = await getUserRegistrationTrend();
    applyTrendPresentation(trendElement, Number(trend?.percentageChange) || 0);
    dashboardRoot.dataset.userRegistrationTrendState = 'loaded';
  } catch (error) {
    console.error('Failed to render user registration trend', error);
    trendElement.classList.remove('trend-up', 'trend-negative', 'trend-neutral');
    trendElement.classList.add('trend-neutral');
    trendElement.textContent = '0%';
    dashboardRoot.dataset.userRegistrationTrendState = 'error';
  }
}

observeDashboardMount(hydrateUserRegistrationTrend);
