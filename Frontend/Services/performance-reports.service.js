import { apiGet } from '/Services/api-client.js';
import {
  getCitizensRegistrationTrend,
  getIncidentsTimeline,
  getUserRegistrationBuckets,
} from '/Services/admin_dashboard.service.js';

const TAB_PERIODS = {
  'Read-Heavy': 7,
  'Write-Heavy': 14,
  Mixed: 30,
  Spike: 90,
  Soak: 180,
};

const PERIOD_LABELS = {
  7: 'last 7 days',
  14: 'last 14 days',
  30: 'last 30 days',
  90: 'last 90 days',
  180: 'last 180 days',
};

function readCount(response) {
  const count = Number(response?.count);
  return Number.isFinite(count) ? count : 0;
}

function readTotal(response) {
  const total = Number(response?.total);
  if (Number.isFinite(total)) {
    return Math.max(total, 0);
  }

  const metaTotal = Number(response?.meta?.total);
  return Number.isFinite(metaTotal) ? Math.max(metaTotal, 0) : 0;
}

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function formatPercentage(value) {
  const numericValue = Number(value) || 0;
  const rounded = Math.abs(numericValue) >= 10
    ? Math.round(numericValue)
    : Number(numericValue.toFixed(1));

  return `${rounded}%`;
}

function formatSignedPercentage(value) {
  const numericValue = Number(value) || 0;
  const sign = numericValue > 0 ? '+' : '';
  return `${sign}${formatPercentage(numericValue)}`;
}

function buildDateRange(days, periodOffset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - ((days - 1) + periodOffset * days));

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - periodOffset * days);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function calculateChange(currentValue, previousValue) {
  const current = Number(currentValue) || 0;
  const previous = Number(previousValue) || 0;

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

function getStatusTone(value, thresholds) {
  if (value <= thresholds.good) {
    return 'Good';
  }

  if (value <= thresholds.fair) {
    return 'Fair';
  }

  return 'Watch';
}

async function getCount(path) {
  try {
    const response = await apiGet(path);
    return readCount(response);
  } catch (error) {
    console.error(`Failed to fetch count from ${path}`, error);
    return 0;
  }
}

async function getReportsTotalByStatus(status) {
  try {
    const response = await apiGet('/reports', {
      params: {
        page: 1,
        limit: 1,
        status,
      },
    });

    return readTotal(response);
  } catch (error) {
    console.error(`Failed to fetch reports with status "${status}"`, error);
    return 0;
  }
}

async function getTotalReportsCount() {
  try {
    const response = await apiGet('/reports', {
      params: {
        page: 1,
        limit: 1,
      },
    });

    return readTotal(response);
  } catch (error) {
    console.error('Failed to fetch total reports count', error);
    return 0;
  }
}

async function getIncidentCountForPeriod(days, offset = 0) {
  const { startDate, endDate } = buildDateRange(days, offset);

  try {
    const response = await apiGet('/incidents', {
      params: {
        page: 1,
        limit: 1,
        startDate,
        endDate,
      },
    });

    return readTotal(response);
  } catch (error) {
    console.error('Failed to fetch incidents for period', error);
    return 0;
  }
}

function buildSummary({
  activeIncidents,
  reportsQueue,
  trend,
  activeCheckpoints,
  moderationRate,
}) {
  return {
    primaryMetric: {
      label: 'Active Incidents',
      value: formatCount(activeIncidents),
      status: getStatusTone(activeIncidents, { good: 5, fair: 15 }),
    },
    secondaryMetric: {
      label: 'Reports Queue',
      value: formatCount(reportsQueue),
      status: getStatusTone(reportsQueue, { good: 10, fair: 25 }),
    },
    throughputMetric: {
      label: 'New Citizens',
      value: formatCount(trend.currentPeriodCount),
      status: trend.percentageChange >= 0 ? 'Good' : 'Fair',
    },
    rateMetric: {
      label: 'Resolution Rate',
      value: formatPercentage(moderationRate),
      status: moderationRate >= 60 ? 'Good' : moderationRate >= 35 ? 'Fair' : 'Watch',
    },
    extraMeta: {
      checkpointsLabel: 'Active Checkpoints',
      checkpointsValue: formatCount(activeCheckpoints),
    },
  };
}

function buildInsights({
  periodLabel,
  activeIncidents,
  incidentsToday,
  reportsQueue,
  resolvedReports,
  totalReports,
  trend,
  activeCheckpoints,
}) {
  return [
    {
      title: 'Live Incident Load',
      description: `${activeIncidents} incidents are currently active, and ${incidentsToday} were created today.`,
    },
    {
      title: 'Moderation Queue',
      description: `${reportsQueue} reports are waiting in the queue, while ${resolvedReports} of ${totalReports} total reports are already resolved.`,
    },
    {
      title: 'Citizen Growth',
      description: `${trend.currentPeriodCount} citizens registered over ${periodLabel} (${formatSignedPercentage(trend.percentageChange)} versus the previous period).`,
    },
    {
      title: 'Checkpoint Coverage',
      description: `${activeCheckpoints} checkpoints are active and contributing live operational coverage.`,
    },
  ];
}

function buildComparisonRows({
  currentPeriodIncidents,
  previousPeriodIncidents,
  trend,
  pendingReports,
  underReviewReports,
  resolvedReports,
  activeCheckpoints,
}) {
  const reportsQueue = pendingReports + underReviewReports;

  return [
    {
      metric: 'Incidents Created',
      before: formatCount(previousPeriodIncidents),
      after: formatCount(currentPeriodIncidents),
      improvement: formatSignedPercentage(
        calculateChange(currentPeriodIncidents, previousPeriodIncidents),
      ),
    },
    {
      metric: 'Citizen Registrations',
      before: formatCount(trend.previousPeriodCount),
      after: formatCount(trend.currentPeriodCount),
      improvement: formatSignedPercentage(trend.percentageChange),
    },
    {
      metric: 'Pending Reports',
      before: formatCount(pendingReports),
      after: formatCount(reportsQueue),
      improvement: formatSignedPercentage(
        calculateChange(reportsQueue, pendingReports),
      ),
    },
    {
      metric: 'Resolved Reports',
      before: '0',
      after: formatCount(resolvedReports),
      improvement: formatSignedPercentage(resolvedReports > 0 ? 100 : 0),
    },
    {
      metric: 'Active Checkpoints',
      before: '-',
      after: formatCount(activeCheckpoints),
      improvement: 'Live',
    },
  ];
}

export function resolvePerformancePeriod(tabLabel) {
  return TAB_PERIODS[tabLabel] || TAB_PERIODS.Mixed;
}

export async function getPerformanceReport(days = 30) {
  const periodLabel = PERIOD_LABELS[days] || `${days} days`;
  const [
    incidentsTimeline,
    registrationBuckets,
    trend,
    activeIncidents,
    incidentsToday,
    activeCheckpoints,
    totalReports,
    pendingReports,
    underReviewReports,
    resolvedReports,
    currentPeriodIncidents,
    previousPeriodIncidents,
  ] = await Promise.all([
    getIncidentsTimeline(days),
    getUserRegistrationBuckets(days >= 180 ? 6 : days >= 90 ? 4 : days >= 30 ? 3 : 2),
    getCitizensRegistrationTrend(days),
    getCount('/incidents/active-count'),
    getCount('/incidents/today-count'),
    getCount('/checkpoints/active-count'),
    getTotalReportsCount(),
    getReportsTotalByStatus('pending'),
    getReportsTotalByStatus('under_review'),
    getReportsTotalByStatus('resolved'),
    getIncidentCountForPeriod(days, 0),
    getIncidentCountForPeriod(days, 1),
  ]);

  const reportsQueue = pendingReports + underReviewReports;
  const moderationRate = totalReports > 0
    ? (resolvedReports / totalReports) * 100
    : 0;

  return {
    summary: buildSummary({
      activeIncidents,
      reportsQueue,
      trend,
      activeCheckpoints,
      moderationRate,
    }),
    charts: {
      primary: Array.isArray(incidentsTimeline?.points) ? incidentsTimeline.points : [],
      secondary: Array.isArray(registrationBuckets?.buckets)
        ? registrationBuckets.buckets
        : [],
      thresholdLabel: `${formatCount(reportsQueue)} queued reports`,
    },
    insights: buildInsights({
      periodLabel,
      activeIncidents,
      incidentsToday,
      reportsQueue,
      resolvedReports,
      totalReports,
      trend,
      activeCheckpoints,
    }),
    comparisonRows: buildComparisonRows({
      currentPeriodIncidents,
      previousPeriodIncidents,
      trend,
      pendingReports,
      underReviewReports,
      resolvedReports,
      activeCheckpoints,
    }),
    metadata: {
      periodDays: days,
      periodLabel,
      currentPeriodIncidents,
      previousPeriodIncidents,
      activeCheckpoints,
      reportsQueue,
    },
  };
}
