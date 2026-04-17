import {
  getAuditActors,
  getAuditLogPage,
} from '/Services/audit-log.service.js';

const PAGE_SELECTOR = '.audit-page';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

let pageState = {
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
};
let currentRows = [];
let activeRequestId = 0;
let searchTimer = null;
let lastInitializeAt = 0;

function getRoot() {
  return document.querySelector(PAGE_SELECTOR);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAction(action) {
  const normalized = String(action || '').toUpperCase();
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function actionClass(action) {
  switch (String(action || '').toUpperCase()) {
    case 'CREATED':
      return 'action-created';
    case 'UPDATED':
      return 'action-updated';
    case 'DELETED':
      return 'action-deleted';
    case 'APPROVED':
      return 'action-approved';
    case 'REJECTED':
      return 'action-rejected';
    default:
      return 'action-closed';
  }
}

function actorLabel(actor, fallbackId) {
  if (actor?.displayName) return actor.displayName;
  if (actor?.email) return actor.email;
  return fallbackId ? `Admin #${fallbackId}` : 'System';
}

function actorInitial(label) {
  const first = String(label || 'S').trim().charAt(0);
  return first ? first.toUpperCase() : 'S';
}

function getTargetSnapshot(entry) {
  return entry?.workflow?.targetSnapshot || entry?.metadata?.targetSnapshot || {};
}

function isIncidentEntry(entry) {
  return String(entry?.targetType || '').toUpperCase() === 'INCIDENT';
}

function isCheckpointEntry(entry) {
  return String(entry?.targetType || '').toUpperCase() === 'CHECKPOINT';
}

function isReportEntry(entry) {
  return String(entry?.targetType || '').toUpperCase() === 'REPORT';
}

function workflowLabel(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING_CREATE':
      return 'Create action logged';
    case 'PENDING_UPDATE':
      return 'Update action logged';
    case 'PENDING_DELETE':
      return 'Delete action logged';
    default:
      return 'Action logged';
  }
}

function formatStatusLabel(value) {
  const normalized = String(value || '').replaceAll('_', ' ').trim();
  return normalized
    ? normalized.replace(/\b\w/g, (char) => char.toUpperCase())
    : 'N/A';
}

function formatWorkflowValue(entry) {
  if (isReportEntry(entry)) {
    const previousStatus =
      entry?.workflow?.previousStatus || entry?.metadata?.previousStatus;
    const nextStatus =
      entry?.workflow?.nextStatus ||
      entry?.metadata?.nextStatus ||
      entry?.workflow?.reportStatus ||
      entry?.metadata?.reportStatus;
    const decision =
      entry?.workflow?.moderationAction ||
      entry?.metadata?.moderationAction ||
      entry?.action;

    if (previousStatus && nextStatus && previousStatus !== nextStatus) {
      return `${formatAction(decision)} (${formatStatusLabel(previousStatus)} -> ${formatStatusLabel(nextStatus)})`;
    }

    return nextStatus
      ? `${formatAction(decision)} (${formatStatusLabel(nextStatus)})`
      : formatAction(decision);
  }

  const moderationStatus =
    entry?.workflow?.moderationStatus || entry?.metadata?.workflow;

  if (moderationStatus) {
    return workflowLabel(moderationStatus);
  }

  return formatAction(entry?.action);
}

function buildDecisionControls(entry) {
  return `
    <button
      class="btn-review"
      type="button"
      data-audit-review
      data-entry-id="${escapeHtml(entry.id)}"
    >
      Review
    </button>
  `;
}

function buildMessageRow(message) {
  const row = document.createElement('tr');
  row.innerHTML = `<td colspan="7" class="cell-details">${escapeHtml(message)}</td>`;
  return row;
}

function buildAuditRow(entry) {
  const row = document.createElement('tr');
  const userLabel = actorLabel(entry.performedBy, entry.performedByUserId);
  const rowDescription = formatRowDescription(entry);
  const workflowStatus = entry.workflow
    ? `<span class="workflow-state">${escapeHtml(formatWorkflowValue(entry))}</span>`
    : '';
  row.innerHTML = `
    <td class="cell-index">#${escapeHtml(entry.id ?? '--')}</td>
    <td>
      <span class="action-badge ${actionClass(entry.action)}">${escapeHtml(formatAction(entry.action))}</span>
    </td>
    <td>
      <div class="target-stack">
        <span class="type-badge">${escapeHtml(entry.targetType || 'N/A')}</span>
        <span class="cell-target-id">#${escapeHtml(entry.targetId ?? '--')}</span>
      </div>
    </td>
    <td class="cell-details">
      <div>${escapeHtml(rowDescription || entry.details || 'No details recorded.')}</div>
      ${workflowStatus}
    </td>
    <td>
      <div class="user-profile">
        <div class="avatar">${escapeHtml(actorInitial(userLabel))}</div>
        <span class="user-name">${escapeHtml(userLabel)}</span>
      </div>
    </td>
    <td class="cell-time">${escapeHtml(formatDate(entry.createdAt))}</td>
    <td class="cell-decision">${buildDecisionControls(entry)}</td>
  `;
  return row;
}

function renderRows(root, rows) {
  const tableBody = root.querySelector('[data-audit-table-body]');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (!Array.isArray(rows) || rows.length === 0) {
    tableBody.appendChild(buildMessageRow('No audit entries found.'));
    return;
  }

  rows.forEach((entry) => tableBody.appendChild(buildAuditRow(entry)));
}

function updatePaginationSummary(root, meta) {
  const rangeElement = root.querySelector('[data-audit-pagination-range]');
  const totalElement = root.querySelector('[data-audit-pagination-total]');

  if (totalElement) totalElement.textContent = String(meta.total || 0);
  if (!rangeElement) return;

  if (!meta.total) {
    rangeElement.textContent = '0-0';
    return;
  }

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(start + currentRows.length - 1, meta.total);
  rangeElement.textContent = `${start}-${end}`;
}

function renderPagination(root, meta) {
  const container = root.querySelector('[data-audit-pagination-controls]');
  if (!container) return;

  container.innerHTML = '';

  const prev = document.createElement('button');
  prev.className = 'btn-page nav-btn';
  prev.type = 'button';
  prev.textContent = 'PREV';
  prev.disabled = meta.page <= 1;
  prev.addEventListener('click', () => loadAuditPage(meta.page - 1));
  container.appendChild(prev);

  const totalPages = Math.max(meta.totalPages || 0, 1);
  const startPage = Math.max(1, meta.page - 1);
  const endPage = Math.min(totalPages, startPage + 2);

  for (let page = startPage; page <= endPage; page += 1) {
    const button = document.createElement('button');
    button.className = `btn-page${page === meta.page ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = String(page);
    button.disabled = page === meta.page;
    button.addEventListener('click', () => loadAuditPage(page));
    container.appendChild(button);
  }

  const next = document.createElement('button');
  next.className = 'btn-page nav-btn';
  next.type = 'button';
  next.textContent = 'NEXT';
  next.disabled = meta.page >= totalPages;
  next.addEventListener('click', () => loadAuditPage(meta.page + 1));
  container.appendChild(next);
}

function dateRangeFromInput(value) {
  if (!value) {
    return {};
  }

  const start = new Date(`${value}T00:00:00`);
  const end = new Date(`${value}T23:59:59.999`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {};
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function getFilters(root) {
  const dateValue = root.querySelector('[data-audit-date-filter]')?.value || '';
  return {
    search: root.querySelector('[data-audit-search]')?.value?.trim() || undefined,
    action: root.querySelector('[data-audit-action-filter]')?.value || undefined,
    performedByUserId:
      root.querySelector('[data-audit-actor-filter]')?.value || undefined,
    ...dateRangeFromInput(dateValue),
  };
}

async function loadActors(root) {
  const select = root.querySelector('[data-audit-actor-filter]');
  if (!select) return;

  const actors = await getAuditActors();
  const currentValue = select.value;
  select.innerHTML = '<option value="">All Moderators</option>';

  actors.forEach((actor) => {
    const option = document.createElement('option');
    option.value = String(actor.id);
    option.textContent = actor.displayName || actor.email || `Admin #${actor.id}`;
    select.appendChild(option);
  });

  if (currentValue) {
    select.value = currentValue;
  }
}

async function loadAuditPage(page = DEFAULT_PAGE) {
  const root = getRoot();
  if (!root) return;

  const requestId = ++activeRequestId;
  const tableBody = root.querySelector('[data-audit-table-body]');
  if (tableBody) {
    tableBody.innerHTML = '';
    tableBody.appendChild(buildMessageRow('Loading audit log...'));
  }

  try {
    const response = await getAuditLogPage({
      page,
      limit: pageState.limit || DEFAULT_LIMIT,
      ...getFilters(root),
    });

    if (requestId !== activeRequestId) return;

    currentRows = response.data;
    pageState = response.meta;
    renderRows(root, currentRows);
    updatePaginationSummary(root, pageState);
    renderPagination(root, pageState);
  } catch (error) {
    if (requestId !== activeRequestId) return;
    console.error('Failed to load audit log', error);
    if (tableBody) {
      tableBody.innerHTML = '';
      tableBody.appendChild(buildMessageRow('Error loading audit log.'));
    }
  }
}

function formatTargetTitle(entry) {
  const snapshot = getTargetSnapshot(entry);
  if (isReportEntry(entry)) {
    return `Report #${entry?.targetId ?? '--'}`;
  }

  const primaryValue = isIncidentEntry(entry)
    ? snapshot.title
    : snapshot.name;

  if (primaryValue) {
    return `${primaryValue} #${entry?.targetId ?? '--'}`;
  }

  const targetType = String(entry?.targetType || 'Target')
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());

  return `${targetType} #${entry?.targetId ?? '--'}`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'empty';
  }

  return String(value);
}

function getPrimaryLabel(entry) {
  if (isReportEntry(entry)) return 'Category';
  if (isIncidentEntry(entry)) return 'Title';
  if (isCheckpointEntry(entry)) return 'Name';
  return 'Name';
}

function getPrimaryValue(entry) {
  const snapshot = getTargetSnapshot(entry);
  if (isReportEntry(entry)) return formatValue(snapshot.category);

  const value = isIncidentEntry(entry) ? snapshot.title : snapshot.name;
  return value || formatTargetTitle(entry);
}

function getLocationValue(entry) {
  return formatValue(getTargetSnapshot(entry).location);
}

function getStatusValue(entry) {
  const snapshot = getTargetSnapshot(entry);

  if (isReportEntry(entry)) {
    return formatStatusLabel(
      snapshot.status ||
        entry?.workflow?.reportStatus ||
        entry?.metadata?.reportStatus,
    );
  }

  if (isIncidentEntry(entry)) {
    const status = formatValue(snapshot.status);
    const verified =
      snapshot.isVerified === undefined
        ? ''
        : snapshot.isVerified
          ? ' / verified'
          : ' / not verified';

    return `${status}${verified}`;
  }

  return formatValue(snapshot.currentStatus || snapshot.status);
}

function getRecordDescription(entry) {
  const snapshot = getTargetSnapshot(entry);
  return snapshot.description || entry.details || 'No description recorded.';
}

function formatRecordSnapshot(entry) {
  const snapshot = getTargetSnapshot(entry);
  if (isReportEntry(entry)) {
    const lines = [
      `Category: ${formatValue(snapshot.category)}`,
      `Location: ${formatValue(snapshot.location)}`,
      `Status: ${getStatusValue(entry)}`,
      `Reporter: ${formatValue(snapshot.reporterName || (snapshot.submittedByUserId ? `Citizen #${snapshot.submittedByUserId}` : null))}`,
      `Confidence: ${formatValue(snapshot.confidenceScore)}%`,
      `Decision: ${formatAction(entry.action)}`,
      `Moderated by: ${actorLabel(entry.performedBy, entry.performedByUserId)}`,
    ];
    const previousStatus =
      entry?.workflow?.previousStatus || entry?.metadata?.previousStatus;
    const nextStatus =
      entry?.workflow?.nextStatus || entry?.metadata?.nextStatus;
    const notes = entry?.workflow?.notes || entry?.metadata?.notes;

    if (previousStatus || nextStatus) {
      lines.push(
        `Status transition: ${formatStatusLabel(previousStatus)} -> ${formatStatusLabel(nextStatus)}`,
      );
    }

    if (notes) {
      lines.push(`Notes: ${notes}`);
    }

    return lines.join('\n');
  }

  const lines = [
    `${getPrimaryLabel(entry)}: ${formatValue(getPrimaryValue(entry))}`,
    `Location: ${getLocationValue(entry)}`,
    `Status: ${getStatusValue(entry)}`,
  ];

  if (isIncidentEntry(entry)) {
    lines.push(`Type: ${formatValue(snapshot.type)}`);
    lines.push(`Severity: ${formatValue(snapshot.severity)}`);
    if (snapshot.checkpointName || snapshot.checkpointId) {
      lines.push(
        `Checkpoint: ${formatValue(snapshot.checkpointName || `#${snapshot.checkpointId}`)}`,
      );
    }
  }

  if (isCheckpointEntry(entry)) {
    lines.push(`Latitude: ${formatValue(snapshot.latitude)}`);
    lines.push(`Longitude: ${formatValue(snapshot.longitude)}`);
  }

  return lines.join('\n');
}

function formatRowDescription(entry) {
  if (isReportEntry(entry)) {
    return entry.details || formatRecordSnapshot(entry);
  }

  const snapshot = getTargetSnapshot(entry);
  const primary = isIncidentEntry(entry) ? snapshot.title : snapshot.name;
  const location = snapshot.location;
  const status = isIncidentEntry(entry) ? snapshot.status : snapshot.currentStatus;

  if (!primary && !location && !status) {
    return entry.details || '';
  }

  return [primary, location, status].filter(Boolean).join(' - ');
}

function formatPendingChanges(changes, entry) {
  if (isReportEntry(entry)) {
    return formatRecordSnapshot(entry);
  }

  if (
    String(entry?.action || '').toUpperCase() === 'CREATED' &&
    Object.keys(getTargetSnapshot(entry)).length > 0
  ) {
    return formatRecordSnapshot(entry);
  }

  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return 'No pending field changes listed.';
  }

  const entries = Object.entries(changes);
  if (entries.length === 0) {
    return 'No pending field changes listed.';
  }

  return entries
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join('\n');
}

function getLatestAuditNote(entry) {
  const notes = entry?.workflow?.notes || entry?.metadata?.notes;
  if (notes) return notes;

  const reason = entry?.metadata?.reason;
  if (reason) return reason;
  return 'No moderation notes recorded yet.';
}

function ensureReviewModal(root) {
  let modal = root.querySelector('[data-review-modal]');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.className = 'review-modal-backdrop';
  modal.hidden = true;
  modal.dataset.reviewModal = 'true';
  modal.innerHTML = `
    <div class="review-modal" role="dialog" aria-modal="true" aria-labelledby="reviewModalTitle">
      <div class="review-modal-header">
        <div>
          <h3 id="reviewModalTitle" class="review-modal-title" data-review-title></h3>
          <p class="review-modal-subtitle" data-review-subtitle></p>
        </div>
        <button class="review-modal-close" type="button" aria-label="Close review" data-review-close>&times;</button>
      </div>

      <div class="review-modal-body">
        <div class="review-summary-grid">
          <div class="review-field">
            <span class="review-label">Target</span>
            <span class="review-value" data-review-target></span>
          </div>
          <div class="review-field">
            <span class="review-label" data-review-primary-label>Name</span>
            <span class="review-value" data-review-primary-value></span>
          </div>
          <div class="review-field">
            <span class="review-label">Location</span>
            <span class="review-value" data-review-location></span>
          </div>
          <div class="review-field">
            <span class="review-label">Status</span>
            <span class="review-value" data-review-status></span>
          </div>
          <div class="review-field">
            <span class="review-label" data-review-submitted-label>Performed By</span>
            <span class="review-value" data-review-submitted-by></span>
          </div>
          <div class="review-field">
            <span class="review-label">Action</span>
            <span class="review-value" data-review-action></span>
          </div>
          <div class="review-field">
            <span class="review-label">Workflow</span>
            <span class="review-value" data-review-workflow></span>
          </div>
        </div>

        <div class="review-field review-field-full">
          <span class="review-label">Description</span>
          <p class="review-description" data-review-description></p>
        </div>

        <div class="review-field review-field-full">
          <span class="review-label" data-review-pending-label>Pending Changes</span>
          <pre class="review-note-box" data-review-pending-changes></pre>
        </div>

        <div class="review-field review-field-full">
          <span class="review-label">Latest Audit Note</span>
          <div class="review-note-box" data-review-latest-note></div>
        </div>

      </div>

      <div class="review-modal-footer">
        <button class="btn-modal btn-modal-cancel" type="button" data-review-close>Close</button>
      </div>
    </div>
  `;

  root.appendChild(modal);
  return modal;
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function openReviewModal(entry) {
  const root = getRoot();
  if (!root) return;

  const modal = ensureReviewModal(root);
  const submittedBy = actorLabel(entry.performedBy, entry.performedByUserId);

  setText(modal, '[data-review-title]', formatTargetTitle(entry));
  setText(
    modal,
    '[data-review-subtitle]',
    `${formatWorkflowValue(entry)} - ${formatDate(entry.createdAt)}`,
  );
  setText(modal, '[data-review-target]', `${entry.targetType || 'N/A'} #${entry.targetId ?? '--'}`);
  setText(modal, '[data-review-primary-label]', getPrimaryLabel(entry));
  setText(modal, '[data-review-primary-value]', getPrimaryValue(entry));
  setText(modal, '[data-review-location]', getLocationValue(entry));
  setText(modal, '[data-review-status]', getStatusValue(entry));
  setText(
    modal,
    '[data-review-submitted-label]',
    isReportEntry(entry) ? 'Moderated By' : 'Performed By',
  );
  setText(modal, '[data-review-submitted-by]', submittedBy);
  setText(modal, '[data-review-action]', formatAction(entry.action));
  setText(modal, '[data-review-workflow]', formatWorkflowValue(entry));
  setText(modal, '[data-review-description]', getRecordDescription(entry));
  setText(
    modal,
    '[data-review-pending-label]',
    isReportEntry(entry)
      ? 'Report Details'
      : String(entry.action || '').toUpperCase() === 'CREATED'
      ? 'Submitted Record'
      : 'Logged Changes',
  );
  setText(
    modal,
    '[data-review-pending-changes]',
    formatPendingChanges(
      entry.workflow?.pendingChanges || entry.metadata?.changes,
      entry,
    ),
  );
  setText(modal, '[data-review-latest-note]', getLatestAuditNote(entry));

  modal.hidden = false;
  document.body.classList.add('audit-review-open');
  modal.querySelector('[data-review-close]')?.focus();
}

function closeReviewModal() {
  const root = getRoot();
  const modal = root?.querySelector('[data-review-modal]');
  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove('audit-review-open');
}

function handleReviewClick(event) {
  const reviewButton = event.target.closest('[data-audit-review]');
  if (!reviewButton) return;

  const entryId = Number(reviewButton.dataset.entryId);
  const entry = currentRows.find((row) => Number(row.id) === entryId);
  if (!entry) return;

  openReviewModal(entry);
}

function handleModalClick(event) {
  if (event.target.matches('[data-review-modal]')) {
    closeReviewModal();
    return;
  }

  if (event.target.closest('[data-review-close]')) {
    closeReviewModal();
    return;
  }

}

function exportCsv() {
  if (!currentRows.length) return;

  const header = ['Timestamp', 'Action', 'Performed By', 'Target Type', 'Target ID', 'Details'];
  const rows = currentRows.map((entry) => [
    formatDate(entry.createdAt),
    entry.action,
    actorLabel(entry.performedBy, entry.performedByUserId),
    entry.targetType,
    entry.targetId,
    entry.details,
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'audit-log.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindFilters(root) {
  root.querySelector('[data-audit-action-filter]')?.addEventListener('change', () => {
    loadAuditPage(DEFAULT_PAGE);
  });
  root.querySelector('[data-audit-actor-filter]')?.addEventListener('change', () => {
    loadAuditPage(DEFAULT_PAGE);
  });
  root.querySelector('[data-audit-date-filter]')?.addEventListener('change', () => {
    loadAuditPage(DEFAULT_PAGE);
  });
  root.querySelector('[data-audit-search]')?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => loadAuditPage(DEFAULT_PAGE), 250);
  });
  root.querySelector('[data-audit-export]')?.addEventListener('click', exportCsv);
  root
    .querySelector('[data-audit-table-body]')
    ?.addEventListener('click', handleReviewClick);
  root.addEventListener('click', handleModalClick);
}

async function initialize() {
  const root = getRoot();
  if (!root) return;

  const now = Date.now();
  if (now - lastInitializeAt < 100) return;
  lastInitializeAt = now;

  if (root.dataset.auditInitialized !== 'true') {
    root.dataset.auditInitialized = 'true';
    bindFilters(root);
  }

  await loadActors(root);
  await loadAuditPage(DEFAULT_PAGE);
}

function handleAdminRouteLoaded(event) {
  if (event?.detail?.routeKey === 'admin-audit') {
    initialize();
  }
}

window.addEventListener('admin:route-loaded', handleAdminRouteLoaded);
document.addEventListener('admin:checkpoint-updated', initialize);
document.addEventListener('admin:checkpoint-deleted', initialize);
document.addEventListener('admin:incident-updated', initialize);
document.addEventListener('admin:incident-deleted', initialize);
document.addEventListener('admin:report-updated', initialize);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
