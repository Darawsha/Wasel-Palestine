import { apiGet } from '/Services/api-client.js';

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});

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
  if (Number.isFinite(metaTotal)) {
    return Math.max(metaTotal, 0);
  }

  if (Array.isArray(response?.data)) {
    return response.data.length;
  }

  if (Array.isArray(response)) {
    return response.length;
  }

  return 0;
}

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function buildRegistrationTrendFallback(days = 7) {
  const periodDays = normalizePositiveInteger(days, 7);

  return {
    percentageChange: 0,
    currentPeriodCount: 0,
    previousPeriodCount: 0,
    periodDays,
  };
}

function normalizeRegistrationTrend(response, days = 7) {
  const fallback = buildRegistrationTrendFallback(days);
  const percentageChange = Number(response?.percentageChange);
  const currentPeriodCount = Number(response?.currentPeriodCount);
  const previousPeriodCount = Number(response?.previousPeriodCount);
  const periodDays = Number(response?.periodDays);

  return {
    percentageChange: Number.isFinite(percentageChange)
      ? percentageChange
      : fallback.percentageChange,
    currentPeriodCount: Number.isFinite(currentPeriodCount)
      ? currentPeriodCount
      : fallback.currentPeriodCount,
    previousPeriodCount: Number.isFinite(previousPeriodCount)
      ? previousPeriodCount
      : fallback.previousPeriodCount,
    periodDays:
      Number.isFinite(periodDays) && periodDays > 0
        ? periodDays
        : fallback.periodDays,
  };
}

function readSeriesValue(value) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue >= 0
    ? normalizedValue
    : 0;
}

function normalizeSeriesPoints(rawPoints, fallbackPoints) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    return fallbackPoints;
  }

  return rawPoints.map((point, index) => ({
    label:
      typeof point?.label === 'string' && point.label.trim()
        ? point.label.trim()
        : fallbackPoints[index]?.label || `Point ${index + 1}`,
    value: readSeriesValue(point?.value),
  }));
}

function buildIncidentsTimelineFallback(days = 30) {
  const periodDays = normalizePositiveInteger(days, 30);
  const points = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = periodDays - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(today);
    bucketDate.setDate(bucketDate.getDate() - offset);
    points.push({
      label: DAY_LABEL_FORMATTER.format(bucketDate),
      value: 0,
    });
  }

  return {
    periodDays,
    points,
  };
}

function normalizeIncidentsTimeline(response, days = 30) {
  const fallback = buildIncidentsTimelineFallback(days);
  const rawPoints = Array.isArray(response?.points)
    ? response.points
    : Array.isArray(response?.data)
      ? response.data
      : [];
  const periodDays = normalizePositiveInteger(response?.periodDays, fallback.periodDays);

  return {
    periodDays,
    points: normalizeSeriesPoints(rawPoints, fallback.points),
  };
}

function buildUserRegistrationBucketsFallback(months = 6) {
  const periodMonths = normalizePositiveInteger(months, 6);
  const buckets = [];
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  for (let offset = periodMonths - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(currentMonth);
    bucketDate.setMonth(bucketDate.getMonth() - offset);
    buckets.push({
      label: MONTH_LABEL_FORMATTER.format(bucketDate),
      value: 0,
    });
  }

  return {
    periodMonths,
    buckets,
  };
}

function formatResponseTime(value) {
  const normalizedValue = Number(value);
  const safeValue = Number.isFinite(normalizedValue) && normalizedValue >= 0
    ? normalizedValue
    : 0;

  return Math.round(safeValue);
}

function normalizeUserRegistrationBuckets(response, months = 6) {
  const fallback = buildUserRegistrationBucketsFallback(months);
  const rawBuckets = Array.isArray(response?.buckets)
    ? response.buckets
    : Array.isArray(response?.data)
      ? response.data
      : [];
  const periodMonths = normalizePositiveInteger(
    response?.periodMonths,
    fallback.periodMonths,
  );

  return {
    periodMonths,
    buckets: normalizeSeriesPoints(rawBuckets, fallback.buckets),
  };
}

export async function getCitizensCount() {
  try {
    const response = await apiGet('/users/counts');
    return readCount(response);
  } catch (err) {
    console.error('Failed to fetch citizens count', err);
    return 0;
  }
}

export async function getIncidentsCount() {
  try {
    const response = await apiGet('/incidents/active-count');
    return readCount(response);
  } catch (err) {
    console.error('Failed to fetch incidents count', err);
    return 0;
  }
}

export async function getIncidentsCreatedTodayCount() {
  try {
    const response = await apiGet('/incidents/today-count');
    return readCount(response);
  } catch (err) {
    console.error('Failed to fetch incidents created today count', err);
    return 0;
  }
}

export async function getCheckpointsCount() {
  try {
    const response = await apiGet('/checkpoints/active-count');
    return readCount(response);
  } catch (err) {
    console.error('Failed to fetch checkpoints count', err);
    return 0;
  }
}

export async function getPendingReportsCount() {
  try {
    const response = await apiGet('/reports', {
      params: {
        page: 1,
        limit: 1,
        status: 'pending',
      },
    });

    return readTotal(response);
  } catch (err) {
    console.error('Failed to fetch pending reports count', err);
    return 0;
  }
}

export async function getSubscriptionsCount() {
  try {
    const response = await apiGet('/subscriptions', {
      params: {
        page: 1,
        limit: 1,
      },
    });

    return readTotal(response);
  } catch (err) {
    console.error('Failed to fetch subscriptions count', err);
    return 0;
  }
}

export async function getCitizensRegistrationTrend(days = 7) {
  try {
    const response = await apiGet('/users/registration-trend', {
      params: { days: normalizePositiveInteger(days, 7) },
    });

    return normalizeRegistrationTrend(response, days);
  } catch (err) {
    console.error('Failed to fetch citizens registration trend', err);
    return buildRegistrationTrendFallback(days);
  }
}

export async function getIncidentsTimeline(days = 30) {
  try {
    const response = await apiGet('/incidents/timeline', {
      params: { days: normalizePositiveInteger(days, 30) },
    });

    return normalizeIncidentsTimeline(response, days);
  } catch (err) {
    console.error('Failed to fetch incidents timeline', err);
    return buildIncidentsTimelineFallback(days);
  }
}

export async function getUserRegistrationBuckets(months = 6) {
  try {
    const response = await apiGet('/users/registration-buckets', {
      params: { months: normalizePositiveInteger(months, 6) },
    });

    return normalizeUserRegistrationBuckets(response, months);
  } catch (err) {
    console.error('Failed to fetch user registration buckets', err);
    return buildUserRegistrationBucketsFallback(months);
  }
}

export async function getDashboardResponseTime() {
  const requestStartedAt = window.performance?.now?.() ?? Date.now();

  try {
    await apiGet('/incidents/active-count');
    const requestFinishedAt = window.performance?.now?.() ?? Date.now();
    return formatResponseTime(requestFinishedAt - requestStartedAt);
  } catch (err) {
    console.error('Failed to fetch dashboard response time', err);
    return 0;
  }
}
