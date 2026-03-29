import { getIncidentTimeline } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const INCIDENTS_CHART_SELECTOR = '[data-dashboard-chart="incidents-timeline"]';
const LINE_PATH_SELECTOR = '[data-line-path="incidents-timeline"]';
const FILL_PATH_SELECTOR = '[data-line-fill="incidents-timeline"]';
const AXIS_SELECTOR = '[data-line-axis="incidents-timeline"]';
const SUBTITLE_SELECTOR = '[data-chart-subtitle="incidents-timeline"]';
const CHART_WIDTH = 400;
const CHART_FILL_BASELINE = 100;
const CHART_LINE_BASELINE = 90;
const CHART_TOP_PADDING = 12;
const CHART_DRAW_HEIGHT = 70;

function buildChartCoordinates(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const maxValue = Math.max(
    ...points.map((point) => Number(point?.value) || 0),
    1,
  );

  return points.map((point, index) => {
    const normalizedValue = Number(point?.value) || 0;
    const x = points.length === 1
      ? 0
      : (index / (points.length - 1)) * CHART_WIDTH;
    const y =
      CHART_LINE_BASELINE - (normalizedValue / maxValue) * CHART_DRAW_HEIGHT;

    return {
      x: Number(x.toFixed(2)),
      y: Number(Math.max(CHART_TOP_PADDING, y).toFixed(2)),
    };
  });
}

function buildLinePath(coordinates) {
  if (coordinates.length === 0) {
    return `M0,${CHART_LINE_BASELINE} L${CHART_WIDTH},${CHART_LINE_BASELINE}`;
  }

  return coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');
}

function buildFillPath(coordinates) {
  if (coordinates.length === 0) {
    return (
      `M0,${CHART_LINE_BASELINE} ` +
      `L${CHART_WIDTH},${CHART_LINE_BASELINE} ` +
      `L${CHART_WIDTH},${CHART_FILL_BASELINE} ` +
      `L0,${CHART_FILL_BASELINE} Z`
    );
  }

  const linePath = buildLinePath(coordinates);
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    `${linePath} ` +
    `L${lastPoint.x},${CHART_FILL_BASELINE} ` +
    `L${firstPoint.x},${CHART_FILL_BASELINE} Z`
  );
}

function getAxisLabels(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const candidateIndexes = [
    0,
    Math.floor((points.length - 1) / 3),
    Math.floor(((points.length - 1) * 2) / 3),
    points.length - 1,
  ];
  const seenIndexes = new Set();

  return candidateIndexes
    .filter((index) => {
      if (seenIndexes.has(index)) {
        return false;
      }

      seenIndexes.add(index);
      return true;
    })
    .map((index) => String(points[index]?.label || '').toUpperCase())
    .filter(Boolean);
}

function renderAxisLabels(axisElement, labels) {
  axisElement.replaceChildren(
    ...labels.map((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      return span;
    }),
  );
}

async function hydrateIncidentsTimelineChart() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const chartCard = dashboardRoot?.querySelector(INCIDENTS_CHART_SELECTOR);
  const linePathElement = chartCard?.querySelector(LINE_PATH_SELECTOR);
  const fillPathElement = chartCard?.querySelector(FILL_PATH_SELECTOR);
  const axisElement = chartCard?.querySelector(AXIS_SELECTOR);
  const subtitleElement = chartCard?.querySelector(SUBTITLE_SELECTOR);

  if (
    !dashboardRoot ||
    !chartCard ||
    !linePathElement ||
    !fillPathElement ||
    !axisElement ||
    !subtitleElement
  ) {
    return;
  }

  if (
    dashboardRoot.dataset.incidentsTimelineState === 'loading' ||
    dashboardRoot.dataset.incidentsTimelineState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.incidentsTimelineState = 'loading';

  try {
    const timeline = await getIncidentTimeline();
    const points = Array.isArray(timeline?.points) ? timeline.points : [];
    const coordinates = buildChartCoordinates(points);

    linePathElement.setAttribute('d', buildLinePath(coordinates));
    fillPathElement.setAttribute('d', buildFillPath(coordinates));
    renderAxisLabels(axisElement, getAxisLabels(points));
    subtitleElement.textContent = `Activity trend for the last ${timeline.periodDays || 30} days`;
    dashboardRoot.dataset.incidentsTimelineState = 'loaded';
  } catch (error) {
    console.error('Failed to render incidents timeline chart', error);
    linePathElement.setAttribute(
      'd',
      buildLinePath([]),
    );
    fillPathElement.setAttribute(
      'd',
      buildFillPath([]),
    );
    renderAxisLabels(axisElement, ['DAY 1', 'DAY 10', 'DAY 20', 'DAY 30']);
    subtitleElement.textContent = 'Activity trend for the last 30 days';
    dashboardRoot.dataset.incidentsTimelineState = 'error';
  }
}

observeDashboardMount(hydrateIncidentsTimelineChart);

