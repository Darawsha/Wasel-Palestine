(function () {
  const PAGE_SELECTOR = '.perf-page';
  const TAB_SELECTOR = '.perf-tabs .tab-btn';
  const METRIC_CARD_SELECTOR = '.metric-card';
  const CHART_CARD_SELECTOR = '.chart-card';
  const ANALYSIS_LIST_SELECTOR = '.analysis-list';
  const COMPARISON_BODY_SELECTOR = '.comparison-table tbody';
  const SVG_WIDTH = 400;
  const CHART_TOP = 24;
  const CHART_BOTTOM = 160;
  const EMPTY_CHART_PATH = 'M0,150 L400,150';

  let dependenciesPromise;
  let activeDays = 30;
  let activeRequestId = 0;

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = import('/Controllers/performance-reports.controller.js');
    }

    return dependenciesPromise;
  }

  function getMetricCards(root) {
    return Array.from(root.querySelectorAll(METRIC_CARD_SELECTOR));
  }

  function getChartCards(root) {
    return Array.from(root.querySelectorAll(CHART_CARD_SELECTOR));
  }

  function getMetricCardByLabel(root, labelText) {
    return getMetricCards(root).find((card) => {
      const label = card.querySelector('.metric-label');
      return label?.textContent?.trim() === labelText;
    }) || null;
  }

  function getChartCardByTitle(root, titleText) {
    return getChartCards(root).find((card) => {
      const title = card.querySelector('.chart-title');
      return title?.textContent?.trim() === titleText;
    }) || null;
  }

  function renameMetricCard(root, previousLabel, nextLabel) {
    const labelElement = getMetricCardByLabel(root, previousLabel)?.querySelector('.metric-label');
    if (labelElement) {
      labelElement.textContent = nextLabel;
    }
  }

  function setCardMetric(root, labelText, valueText, statusText) {
    const card = getMetricCardByLabel(root, labelText);
    if (!card) {
      return;
    }

    const valueElement = card.querySelector('.metric-value');
    const statusElement = card.querySelector('.status-badge');

    if (valueElement) {
      valueElement.textContent = valueText;
    }

    if (statusElement) {
      statusElement.textContent = statusText;
      statusElement.classList.remove('status-good', 'status-fair', 'status-normal');

      if (statusText === 'Good' || statusText === 'Normal' || statusText === 'Live') {
        statusElement.classList.add('status-good');
      } else if (statusText === 'Fair' || statusText === 'Watch' || statusText === 'Queue') {
        statusElement.classList.add('status-fair');
      } else {
        statusElement.classList.add('status-normal');
      }
    }
  }

  function renameChartCard(root, previousTitle, nextTitle, nextLegend) {
    const card = getChartCardByTitle(root, previousTitle);
    if (!card) {
      return;
    }

    const titleElement = card.querySelector('.chart-title');
    const legendElement = card.querySelector('.legend-label');

    if (titleElement) {
      titleElement.textContent = nextTitle;
    }

    if (legendElement) {
      legendElement.textContent = nextLegend;
    }
  }

  function configureStaticText(root) {
    const subtitle = root.querySelector('.subtitle');
    const analysisTitle = root.querySelector('.analysis-title');
    const comparisonTitle = root.querySelector('.comparison-title');
    const comparisonHeaders = root.querySelectorAll('.comparison-table thead th');

    if (subtitle) {
      subtitle.textContent = 'Live operational reads from incidents, reports, users, and checkpoints APIs';
    }

    if (analysisTitle) {
      analysisTitle.textContent = 'Operational Insights';
    }

    if (comparisonTitle) {
      comparisonTitle.textContent = 'Period Comparison';
    }

    if (comparisonHeaders.length >= 4) {
      comparisonHeaders[1].textContent = 'Previous';
      comparisonHeaders[2].textContent = 'Current';
      comparisonHeaders[3].textContent = 'Change';
    }

    renameChartCard(
      root,
      'Response Time Over Test Duration',
      'Incidents Over Selected Period',
      'Incidents',
    );
    renameChartCard(
      root,
      'Throughput Over Test Duration',
      'Citizen Registrations',
      'Registrations',
    );
  }

  function getDefaultActiveTab(root) {
    return root.querySelector('.perf-tabs .tab-btn.active')
      || root.querySelector('.perf-tabs .tab-btn');
  }

  function buildChartPath(points) {
    if (!Array.isArray(points) || points.length === 0) {
      return EMPTY_CHART_PATH;
    }

    const maxValue = Math.max(...points.map((point) => Number(point?.value) || 0), 1);
    const chartHeight = CHART_BOTTOM - CHART_TOP;

    return points
      .map((point, index) => {
        const x = points.length === 1
          ? 0
          : (index / (points.length - 1)) * SVG_WIDTH;
        const y = CHART_BOTTOM - (((Number(point?.value) || 0) / maxValue) * chartHeight);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${Math.max(CHART_TOP, y).toFixed(2)}`;
      })
      .join(' ');
  }

  function resetPrimaryChart(root, annotationText = '') {
    const card = getChartCardByTitle(root, 'Incidents Over Selected Period');
    const svg = card?.querySelector('.chart-svg');
    if (!svg) {
      return;
    }

    const mainPath = svg.querySelector('path');
    const thresholdLine = svg.querySelector('line');
    const annotation = svg.querySelector('text');

    if (mainPath) {
      mainPath.setAttribute('d', EMPTY_CHART_PATH);
    }

    if (thresholdLine) {
      thresholdLine.setAttribute('y1', '100');
      thresholdLine.setAttribute('y2', '100');
    }

    if (annotation) {
      annotation.textContent = annotationText;
    }
  }

  function resetSecondaryChart(root) {
    const card = getChartCardByTitle(root, 'Citizen Registrations');
    const svg = card?.querySelector('.chart-svg');
    if (!svg) {
      return;
    }

    const mainPath = svg.querySelector('path');
    if (mainPath) {
      mainPath.setAttribute('d', EMPTY_CHART_PATH);
    }
  }

  function renderPrimaryChart(root, report) {
    const card = getChartCardByTitle(root, 'Incidents Over Selected Period');
    const svg = card?.querySelector('.chart-svg');
    if (!svg) {
      return;
    }

    const mainPath = svg.querySelector('path');
    const thresholdLine = svg.querySelector('line');
    const annotation = svg.querySelector('text');

    if (mainPath) {
      mainPath.setAttribute('d', buildChartPath(report.charts.primary));
    }

    if (thresholdLine) {
      const values = report.charts.primary.map((point) => Number(point?.value) || 0);
      const thresholdValue = Math.max(Number(report.metadata.reportsQueue) || 0, 1);
      const maxValue = Math.max(...values, thresholdValue, 1);
      const thresholdY =
        CHART_BOTTOM - (thresholdValue / maxValue) * (CHART_BOTTOM - CHART_TOP);
      thresholdLine.setAttribute('y1', String(thresholdY.toFixed(2)));
      thresholdLine.setAttribute('y2', String(thresholdY.toFixed(2)));
    }

    if (annotation) {
      annotation.textContent = report.charts.thresholdLabel;
    }

    card.title = `Loaded for ${report.metadata.periodLabel}`;
  }

  function renderSecondaryChart(root, report) {
    const card = getChartCardByTitle(root, 'Citizen Registrations');
    const svg = card?.querySelector('.chart-svg');
    if (!svg) {
      return;
    }

    const mainPath = svg.querySelector('path');
    if (mainPath) {
      mainPath.setAttribute('d', buildChartPath(report.charts.secondary));
    }

    card.title = `${report.metadata.currentPeriodIncidents} incidents in ${report.metadata.periodLabel}`;
  }

  function buildInsightItem(insight) {
    const listItem = document.createElement('li');
    listItem.className = 'analysis-item';
    listItem.innerHTML = `
      <div class="bullet-orange"></div>
      <div class="item-content">
        <p class="item-title"></p>
        <p class="item-desc"></p>
      </div>
    `;

    listItem.querySelector('.item-title').textContent = insight.title;
    listItem.querySelector('.item-desc').textContent = insight.description;

    return listItem;
  }

  function renderInsights(root, report) {
    const list = root.querySelector(ANALYSIS_LIST_SELECTOR);
    if (!list) {
      return;
    }

    list.replaceChildren(
      ...report.insights.map((insight) => buildInsightItem(insight)),
    );
  }

  function buildComparisonRow(row) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="metric-name"></td>
      <td class="val-before text-danger"></td>
      <td class="val-after text-emerald"></td>
      <td><span class="improvement-badge"></span></td>
    `;

    tr.querySelector('.metric-name').textContent = row.metric;
    tr.querySelector('.val-before').textContent = row.before;
    tr.querySelector('.val-after').textContent = row.after;
    tr.querySelector('.improvement-badge').textContent = row.improvement;

    return tr;
  }

  function renderComparison(root, report) {
    const tbody = root.querySelector(COMPARISON_BODY_SELECTOR);
    if (!tbody) {
      return;
    }

    tbody.replaceChildren(
      ...report.comparisonRows.map((row) => buildComparisonRow(row)),
    );
  }

  function renderLoadingInsights(root) {
    const list = root.querySelector(ANALYSIS_LIST_SELECTOR);
    if (!list) {
      return;
    }

    list.innerHTML = `
      <li class="analysis-item">
        <div class="bullet-orange"></div>
        <div class="item-content">
          <p class="item-title">Loading operational data</p>
          <p class="item-desc">Refreshing incidents, reports, citizens, and checkpoints metrics.</p>
        </div>
      </li>
    `;
  }

  function renderComparisonMessage(root, metric, before, after, improvement) {
    const tbody = root.querySelector(COMPARISON_BODY_SELECTOR);
    if (!tbody) {
      return;
    }

    tbody.replaceChildren(
      buildComparisonRow({
        metric,
        before,
        after,
        improvement,
      }),
    );
  }

  function renderSummary(root, report) {
    renameMetricCard(root, 'Avg Response Time', report.summary.primaryMetric.label);
    renameMetricCard(root, 'P95 Latency', report.summary.secondaryMetric.label);
    renameMetricCard(root, 'Throughput', report.summary.throughputMetric.label);
    renameMetricCard(root, 'Error Rate', report.summary.rateMetric.label);

    setCardMetric(
      root,
      report.summary.primaryMetric.label,
      report.summary.primaryMetric.value,
      report.summary.primaryMetric.status,
    );
    setCardMetric(
      root,
      report.summary.secondaryMetric.label,
      report.summary.secondaryMetric.value,
      report.summary.secondaryMetric.status,
    );
    setCardMetric(
      root,
      report.summary.throughputMetric.label,
      report.summary.throughputMetric.value,
      report.summary.throughputMetric.status,
    );
    setCardMetric(
      root,
      report.summary.rateMetric.label,
      report.summary.rateMetric.value,
      report.summary.rateMetric.status,
    );
  }

  function renderLoadingState(root) {
    configureStaticText(root);
    renameMetricCard(root, 'Avg Response Time', 'Active Incidents');
    renameMetricCard(root, 'P95 Latency', 'Reports Queue');
    renameMetricCard(root, 'Throughput', 'New Citizens');
    renameMetricCard(root, 'Error Rate', 'Resolution Rate');
    setCardMetric(root, 'Active Incidents', '...', 'Live');
    setCardMetric(root, 'Reports Queue', '...', 'Queue');
    setCardMetric(root, 'New Citizens', '...', 'Good');
    setCardMetric(root, 'Resolution Rate', '...', 'Normal');
    resetPrimaryChart(root, 'Loading live queue threshold...');
    resetSecondaryChart(root);
    renderLoadingInsights(root);
    renderComparisonMessage(root, 'Loading', '...', '...', '...');
  }

  function renderErrorState(root) {
    setCardMetric(root, 'Active Incidents', 'N/A', 'Fair');
    setCardMetric(root, 'Reports Queue', 'N/A', 'Fair');
    setCardMetric(root, 'New Citizens', 'N/A', 'Fair');
    setCardMetric(root, 'Resolution Rate', 'N/A', 'Watch');
    resetPrimaryChart(root, 'Live threshold unavailable');
    resetSecondaryChart(root);
    renderComparisonMessage(root, 'API data unavailable', 'N/A', 'N/A', 'Retry');

    const list = root.querySelector(ANALYSIS_LIST_SELECTOR);
    if (list) {
      list.innerHTML = `
        <li class="analysis-item">
          <div class="bullet-orange"></div>
          <div class="item-content">
            <p class="item-title">API data unavailable</p>
            <p class="item-desc">The performance page could not load the latest live metrics right now.</p>
          </div>
        </li>
      `;
    }
  }

  function setTabState(root, activeButton) {
    root.querySelectorAll(TAB_SELECTOR).forEach((button) => {
      button.classList.toggle('active', button === activeButton);
    });
  }

  async function hydratePerformanceReport(days = activeDays) {
    const root = getPageRoot();
    if (!root) {
      return;
    }

    const requestId = ++activeRequestId;
    root.dataset.performanceState = 'loading';
    renderLoadingState(root);

    try {
      const controller = await getDependencies();
      const report = await controller.loadPerformanceReport(days);

      if (requestId !== activeRequestId) {
        return;
      }

      configureStaticText(root);
      renderSummary(root, report);
      renderPrimaryChart(root, report);
      renderSecondaryChart(root, report);
      renderInsights(root, report);
      renderComparison(root, report);
      root.dataset.performanceState = 'loaded';
    } catch (error) {
      if (requestId !== activeRequestId) {
        return;
      }

      console.error('Failed to hydrate performance reports page', error);
      root.dataset.performanceState = 'error';
      renderErrorState(root);
    }
  }

  async function handleTabClick(button) {
    const root = getPageRoot();
    if (!root || !button) {
      return;
    }

    const controller = await getDependencies();
    const nextDays = controller.getPerformanceTabPeriod(button.textContent.trim());

    activeDays = nextDays;
    setTabState(root, button);
    void hydratePerformanceReport(nextDays);
  }

  function bindTabs(root) {
    root.querySelectorAll(TAB_SELECTOR).forEach((button) => {
      if (button.dataset.bound === 'true') {
        return;
      }

      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        void handleTabClick(button);
      });
    });
  }

  function initializePerformancePage() {
    const root = getPageRoot();
    if (!root || root.dataset.performanceInitialized === 'true') {
      return;
    }

    const defaultActiveTab = getDefaultActiveTab(root);
    if (defaultActiveTab) {
      defaultActiveTab.classList.add('active');
    }

    root.dataset.performanceInitialized = 'true';
    bindTabs(root);
    if (defaultActiveTab) {
      void handleTabClick(defaultActiveTab);
      return;
    }

    void hydratePerformanceReport(activeDays);
  }

  function observePerformancePageMount() {
    const mainContainer = document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.performanceInitialized !== 'true') {
        initializePerformancePage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
    initializePerformancePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observePerformancePageMount, {
      once: true,
    });
  } else {
    observePerformancePageMount();
  }
})();
