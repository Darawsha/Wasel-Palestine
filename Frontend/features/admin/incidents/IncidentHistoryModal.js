const OVERLAY_ID = 'incidentHistoryOverlay';
const ALLOWED_STATUSES = new Set(['ACTIVE', 'CLOSED']);

let overlayElement = null;
let activeRequestId = 0;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  return ALLOWED_STATUSES.has(normalized) ? normalized : 'N/A';
}

function getStatusBadgeClass(status) {
  switch (normalizeStatus(status)) {
    case 'ACTIVE':
      return 'badge-active';
    case 'CLOSED':
      return 'badge-closed';
    default:
      return '';
  }
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return 'N/A';
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readErrorMessage(error) {
  const responseMessage = error?.response?.data?.message;

  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return String(responseMessage[0]);
  }

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return 'Unable to load incident history.';
}

function closeIncidentHistoryModal() {
  activeRequestId += 1;
  overlayElement?.classList.remove('show');
}

function ensureOverlay() {
  if (overlayElement && document.body.contains(overlayElement)) {
    return overlayElement;
  }

  overlayElement = document.createElement('div');
  overlayElement.id = OVERLAY_ID;
  overlayElement.className = 'incident-history-overlay';
  overlayElement.innerHTML = `
    <section class="incident-history-modal" role="dialog" aria-modal="true" aria-labelledby="incidentHistoryTitle">
      <header class="incident-history-header">
        <div>
          <h2 class="incident-history-title" id="incidentHistoryTitle">Incident History</h2>
          <p class="incident-history-subtitle" data-history-incident-title>Loading...</p>
        </div>
        <button class="incident-history-close" type="button" data-history-close aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="incident-history-summary">
        <div>
          <span class="incident-history-label">Current status</span>
          <span class="status-badge" data-history-current-status>N/A</span>
        </div>
        <div data-history-location-wrap hidden>
          <span class="incident-history-label">Location</span>
          <span class="incident-history-location" data-history-location></span>
        </div>
        <div data-history-checkpoint-wrap hidden>
          <span class="incident-history-label">Checkpoint</span>
          <span class="incident-history-location" data-history-checkpoint></span>
        </div>
      </div>
      <div class="incident-history-body" data-history-body></div>
    </section>
  `;
  document.body.appendChild(overlayElement);

  overlayElement.addEventListener('click', (event) => {
    if (
      event.target === overlayElement ||
      event.target.closest('[data-history-close]')
    ) {
      closeIncidentHistoryModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlayElement?.classList.contains('show')) {
      closeIncidentHistoryModal();
    }
  });

  return overlayElement;
}

function setHeader(overlay, incident, response = {}) {
  const title =
    response.incidentTitle ||
    incident?.title ||
    `Incident #${incident?.id ?? response.incidentId ?? '--'}`;
  const status = normalizeStatus(response.currentStatus || incident?.status);
  const location = String(response.location || incident?.location || '').trim();
  const checkpointName = String(
    response.checkpointName || incident?.checkpoint?.name || '',
  ).trim();
  const statusElement = overlay.querySelector('[data-history-current-status]');
  const locationWrap = overlay.querySelector('[data-history-location-wrap]');
  const locationElement = overlay.querySelector('[data-history-location]');
  const checkpointWrap = overlay.querySelector('[data-history-checkpoint-wrap]');
  const checkpointElement = overlay.querySelector('[data-history-checkpoint]');

  overlay.querySelector('[data-history-incident-title]').textContent = title;

  if (statusElement) {
    statusElement.textContent = status;
    statusElement.className = `status-badge ${getStatusBadgeClass(status)}`.trim();
  }

  if (locationWrap && locationElement) {
    locationWrap.hidden = !location;
    locationElement.textContent = location;
  }

  if (checkpointWrap && checkpointElement) {
    checkpointWrap.hidden = !checkpointName;
    checkpointElement.textContent = checkpointName;
  }
}

function renderMessage(overlay, message, className = '') {
  const body = overlay.querySelector('[data-history-body]');
  if (!body) {
    return;
  }

  body.innerHTML = `
    <div class="incident-history-state ${escapeHtml(className)}">
      ${escapeHtml(message)}
    </div>
  `;
}

function renderHistory(overlay, history) {
  const body = overlay.querySelector('[data-history-body]');
  if (!body) {
    return;
  }

  if (!Array.isArray(history) || history.length === 0) {
    renderMessage(
      overlay,
      'No history records available for this incident.',
      'is-empty',
    );
    return;
  }

  body.innerHTML = history
    .map((record) => {
      const oldStatus = normalizeStatus(record?.oldStatus);
      const newStatus = normalizeStatus(record?.newStatus);

      return `
        <article class="incident-history-item">
          <div>
            <p class="incident-history-item-title">Status changed</p>
            <p class="incident-history-transition">
              <span class="status-badge ${getStatusBadgeClass(oldStatus)}">${escapeHtml(oldStatus)}</span>
              <span class="incident-history-arrow">&rarr;</span>
              <span class="status-badge ${getStatusBadgeClass(newStatus)}">${escapeHtml(newStatus)}</span>
            </p>
          </div>
          <time class="incident-history-time">${escapeHtml(formatDateTime(record?.changedAt))}</time>
        </article>
      `;
    })
    .join('');
}

function normalizeHistoryResponse(response, incident) {
  if (Array.isArray(response?.history)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return {
      incidentId: incident?.id,
      incidentTitle: incident?.title,
      location: incident?.location,
      currentStatus: incident?.status,
      checkpointName: incident?.checkpoint?.name,
      history: response.data,
    };
  }

  return {
    incidentId: incident?.id,
    incidentTitle: incident?.title,
    location: incident?.location,
    currentStatus: incident?.status,
    checkpointName: incident?.checkpoint?.name,
    history: [],
  };
}

export async function openIncidentHistoryModal(incident) {
  if (!incident?.id) {
    return;
  }

  const overlay = ensureOverlay();
  const requestId = activeRequestId + 1;
  activeRequestId = requestId;

  setHeader(overlay, incident);
  renderMessage(overlay, 'Loading incident history...');
  overlay.classList.add('show');

  try {
    const { getExistingIncidentHistory } = await import(
      '/Controllers/incidentActions.controller.js'
    );
    const response = normalizeHistoryResponse(
      await getExistingIncidentHistory(incident.id),
      incident,
    );

    if (requestId !== activeRequestId) {
      return;
    }

    setHeader(overlay, incident, response);
    renderHistory(overlay, response.history);
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    console.error('Failed to load incident history:', error);
    renderMessage(overlay, readErrorMessage(error), 'is-error');
  }
}
