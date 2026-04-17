import { getReportCategorySummary } from '/Controllers/admin_dashboard.controller.js';
import { observeDashboardMount } from '/features/admin/dashboard/dashboardMount.js';

const DASHBOARD_SELECTOR = '.dashboard-wrapper';
const CHART_SELECTOR = '[data-dashboard-chart="reports-by-category"]';
const TOTAL_SELECTOR = '[data-stat-number="reports"]';
const SVG_SELECTOR = '[data-report-category-segments]';
const LEGEND_SELECTOR = '[data-report-category-legend]';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const CIRCLE_RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const CATEGORY_META = {
  road_closure: {
    label: 'Closure',
    dotClass: 'dot-closure',
    colorVariable: '--closure',
    fallbackColor: '#3b82f6',
  },
  delay: {
    label: 'Delay',
    dotClass: 'dot-delay',
    colorVariable: '--emerald',
    fallbackColor: '#10b981',
  },
  accident: {
    label: 'Accident',
    dotClass: 'dot-accident',
    colorVariable: '--amber',
    fallbackColor: '#f59e0b',
  },
  hazard: {
    label: 'Weather',
    dotClass: 'dot-weather',
    colorVariable: '--weather',
    fallbackColor: '#f87171',
  },
  checkpoint_issue: {
    label: 'Checkpoint Issue',
    dotClass: 'dot-checkpoint',
    colorVariable: '--accent',
    fallbackColor: '#6366f1',
  },
  other: {
    label: 'Other',
    dotClass: 'dot-other',
    colorVariable: '--text-muted',
    fallbackColor: '#94a3b8',
  },
};

const CATEGORY_ORDER = [
  'road_closure',
  'delay',
  'accident',
  'hazard',
  'checkpoint_issue',
  'other',
];

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatCount(value) {
  return NUMBER_FORMATTER.format(Number(value) || 0);
}

function formatPercentage(value) {
  const percentage = Number(value);

  if (!Number.isFinite(percentage) || percentage <= 0) {
    return '0%';
  }

  return `${percentage.toFixed(1).replace(/\.0$/, '')}%`;
}

function getCategoryMeta(category) {
  return CATEGORY_META[category] || {
    label: category
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Other',
    dotClass: 'dot-other',
    colorVariable: '--text-muted',
    fallbackColor: '#94a3b8',
  };
}

function resolveCssColor(colorVariable, fallbackColor) {
  const resolvedColor = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(colorVariable)
    .trim();

  return resolvedColor || fallbackColor;
}

function normalizeCategories(summary) {
  const categoriesByKey = new Map(
    (Array.isArray(summary?.categories) ? summary.categories : [])
      .map((item) => {
        const category = String(item?.category || '').trim();
        const count = Number(item?.count);
        const percentage = Number(item?.percentage);

        if (!category) {
          return null;
        }

        return [
          category,
          {
            category,
            label: String(item?.label || getCategoryMeta(category).label).trim(),
            count: Number.isFinite(count) && count >= 0 ? count : 0,
            percentage:
              Number.isFinite(percentage) && percentage >= 0 ? percentage : 0,
          },
        ];
      })
      .filter(Boolean),
  );

  CATEGORY_ORDER.forEach((category) => {
    if (!categoriesByKey.has(category)) {
      categoriesByKey.set(category, {
        category,
        label: getCategoryMeta(category).label,
        count: 0,
        percentage: 0,
      });
    }
  });

  return [
    ...CATEGORY_ORDER.map((category) => categoriesByKey.get(category)),
    ...Array.from(categoriesByKey.values()).filter(
      (item) => !CATEGORY_ORDER.includes(item.category),
    ),
  ].filter(Boolean);
}

function renderDonutSegments(svgElement, categories, total) {
  const existingSegments = svgElement.querySelectorAll('.donut-segment');
  existingSegments.forEach((segment) => segment.remove());

  if (!Number.isFinite(total) || total <= 0) {
    return;
  }

  let offset = 0;

  categories
    .filter((item) => item.count > 0)
    .forEach((item) => {
      const meta = getCategoryMeta(item.category);
      const circle = document.createElementNS(SVG_NAMESPACE, 'circle');
      const segmentLength = (item.count / total) * CIRCUMFERENCE;

      circle.classList.add('donut-segment');
      circle.setAttribute('cx', '50');
      circle.setAttribute('cy', '50');
      circle.setAttribute('r', String(CIRCLE_RADIUS));
      circle.setAttribute('stroke-dasharray', `${segmentLength} ${CIRCUMFERENCE}`);
      circle.setAttribute('stroke-dashoffset', String(-offset));
      circle.style.stroke = resolveCssColor(
        meta.colorVariable,
        meta.fallbackColor,
      );

      svgElement.appendChild(circle);
      offset += segmentLength;
    });
}

function renderLegend(legendElement, categories) {
  const legendItems = categories.map((item) => {
    const meta = getCategoryMeta(item.category);
    const itemElement = document.createElement('div');
    const infoElement = document.createElement('div');
    const dotElement = document.createElement('div');
    const nameElement = document.createElement('span');
    const valueElement = document.createElement('span');

    itemElement.className = 'legend-item';
    infoElement.className = 'legend-info';
    dotElement.className = `legend-dot ${meta.dotClass}`;
    nameElement.className = 'legend-name';
    valueElement.className = 'legend-val';
    nameElement.textContent = item.label || meta.label;
    valueElement.textContent = formatPercentage(item.percentage);

    infoElement.append(dotElement, nameElement);
    itemElement.append(infoElement, valueElement);
    return itemElement;
  });

  legendElement.replaceChildren(...legendItems);
}

async function hydrateReportsByCategoryChart() {
  const dashboardRoot = document.querySelector(DASHBOARD_SELECTOR);
  const chartCard = dashboardRoot?.querySelector(CHART_SELECTOR);
  const totalElement = chartCard?.querySelector(TOTAL_SELECTOR);
  const svgElement = chartCard?.querySelector(SVG_SELECTOR);
  const legendElement = chartCard?.querySelector(LEGEND_SELECTOR);

  if (!dashboardRoot || !chartCard || !totalElement || !svgElement || !legendElement) {
    return;
  }

  if (
    dashboardRoot.dataset.reportsCategoryState === 'loading' ||
    dashboardRoot.dataset.reportsCategoryState === 'loaded'
  ) {
    return;
  }

  dashboardRoot.dataset.reportsCategoryState = 'loading';

  try {
    const summary = await getReportCategorySummary();
    const total = Number(summary?.total) || 0;
    const categories = normalizeCategories(summary);

    totalElement.textContent = formatCount(total);
    renderDonutSegments(svgElement, categories, total);
    renderLegend(legendElement, categories);
    dashboardRoot.dataset.reportsCategoryState = 'loaded';
  } catch (error) {
    console.error('Failed to render reports by category chart', error);
    totalElement.textContent = '0';
    renderDonutSegments(svgElement, [], 0);
    renderLegend(legendElement, normalizeCategories({ categories: [] }));
    dashboardRoot.dataset.reportsCategoryState = 'error';
  }
}

observeDashboardMount(hydrateReportsByCategoryChart);
