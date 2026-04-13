export function bindReportsPageEvents(root, handlers = {}) {
  if (!root || root.dataset.reportsEventsBound === 'true') {
    return;
  }

  root.dataset.reportsEventsBound = 'true';

  root.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-reports-view]');
    if (viewButton && root.contains(viewButton)) {
      const view = viewButton.dataset.reportsView;
      if (typeof handlers.onViewChange === 'function') {
        await handlers.onViewChange(view);
      }
      return;
    }

    const statusButton = event.target.closest('[data-report-status-tab]');
    if (statusButton && root.contains(statusButton)) {
      const tab = statusButton.dataset.reportStatusTab;
      if (typeof handlers.onStatusChange === 'function') {
        await handlers.onStatusChange(tab);
      }
      return;
    }

    const refreshButton = event.target.closest('[data-community-refresh-location]');
    if (refreshButton && root.contains(refreshButton)) {
      if (typeof handlers.onCommunityRefresh === 'function') {
        await handlers.onCommunityRefresh();
      }
      return;
    }

    const paginationButton = event.target.closest('[data-reports-page]');
    if (paginationButton && root.contains(paginationButton)) {
      const page = Number(paginationButton.dataset.reportsPage);
      const view = paginationButton.dataset.reportsPageView;
      if (Number.isFinite(page) && typeof handlers.onPageChange === 'function') {
        await handlers.onPageChange(view, page);
      }
      return;
    }

    const actionButton = event.target.closest('[data-report-action][data-report-id]');
    if (!actionButton || !root.contains(actionButton)) {
      return;
    }

    const reportId = Number(actionButton.dataset.reportId);
    if (!Number.isFinite(reportId)) {
      return;
    }

    const action = actionButton.dataset.reportAction;
    if (typeof handlers.onReportAction !== 'function') {
      return;
    }

    actionButton.disabled = true;
    try {
      await handlers.onReportAction(action, reportId);
    } finally {
      actionButton.disabled = false;
    }
  });
}
