const OVERLAY_ID = 'checkpointHistoryOverlay';
const ALLOWED_STATUSES = new Set(['OPEN', 'DELAYED', 'CLOSED', 'RESTRICTED']);

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
    case 'OPEN':
      return 'status-open';
    case 'DELAYED':
      return 'status-delayed';
    case 'RESTRICTED':
      return 'status-restricted';
    case 'CLOSED':
      return 'status-closed';
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

  return 'Unable to load checkpoint history.';
}

function closeCheckpointHistoryModal() {
  activeRequestId += 1;
  overlayElement?.classList.remove('show');
}

function ensureOverlay() {
  if (overlayElement && document.body.contains(overlayElement)) {
    return overlayElement;
  }

  overlayElement = document.createElement('div');
  overlayElement.id = OVERLAY_ID;
  overlayElement.className = 'checkpoint-history-overlay';
  overlayElement.innerHTML = `
    <section class="checkpoint-history-modal" role="dialog" aria-modal="true" aria-labelledby="checkpointHistoryTitle">
      <header class="checkpoint-history-header">
        <div>
          <h2 class="checkpoint-history-title" id="checkpointHistoryTitle">Checkpoint History</h2>
          <p class="checkpoint-history-subtitle" data-history-checkpoint-name>Loading...</p>
        </div>
        <button class="checkpoint-history-close" type="button" data-history-close aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="checkpoint-history-summary">
        <div>
          <span class="checkpoint-history-label">Current status</span>
          <span class="status-badge" data-history-current-status>N/A</span>
        </div>
        <div data-history-location-wrap hidden>
          <span class="checkpoint-history-label">Location</span>
          <span class="checkpoint-history-location" data-history-location></span>
        </div>
      </div>
      <div class="checkpoint-history-body" data-history-body></div>
    </section>
  `;
  document.body.appendChild(overlayElement);

  overlayElement.addEventListener('click', (event) => {
    if (
      event.target === overlayElement ||
      event.target.closest('[data-history-close]')
    ) {
      closeCheckpointHistoryModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlayElement?.classList.contains('show')) {
      closeCheckpointHistoryModal();
    }
  });

  return overlayElement;
}

function setHeader(overlay, checkpoint, response = {}) {
  const name =
    response.checkpointName ||
    checkpoint?.name ||
    `Checkpoint #${checkpoint?.id ?? response.checkpointId ?? '--'}`;
  const status = normalizeStatus(
    response.currentStatus || checkpoint?.currentStatus || checkpoint?.status,
  );
  const location = String(response.location || checkpoint?.location || '').trim();
  const statusElement = overlay.querySelector('[data-history-current-status]');
  const locationWrap = overlay.querySelector('[data-history-location-wrap]');
  const locationElement = overlay.querySelector('[data-history-location]');

  overlay.querySelector('[data-history-checkpoint-name]').textContent = name;

  if (statusElement) {
    statusElement.textContent = status;
    statusElement.className = `status-badge ${getStatusBadgeClass(status)}`.trim();
  }

  if (locationWrap && locationElement) {
    locationWrap.hidden = !location;
    locationElement.textContent = location;
  }
}

function renderMessage(overlay, message, className = '') {
  const body = overlay.querySelector('[data-history-body]');
  if (!body) {
    return;
  }

  body.innerHTML = `
    <div class="checkpoint-history-state ${escapeHtml(className)}">
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
      'No history records available for this checkpoint.',
      'is-empty',
    );
    return;
  }

  body.innerHTML = history
    .map((record) => {
      const oldStatus = normalizeStatus(record?.oldStatus);
      const newStatus = normalizeStatus(record?.newStatus);

      return `
        <article class="checkpoint-history-item">
          <div>
            <p class="checkpoint-history-item-title">Status changed</p>
            <p class="checkpoint-history-transition">
              <span class="status-badge ${getStatusBadgeClass(oldStatus)}">${escapeHtml(oldStatus)}</span>
              <span class="checkpoint-history-arrow">&rarr;</span>
              <span class="status-badge ${getStatusBadgeClass(newStatus)}">${escapeHtml(newStatus)}</span>
            </p>
          </div>
          <time class="checkpoint-history-time">${escapeHtml(formatDateTime(record?.changedAt))}</time>
        </article>
      `;
    })
    .join('');
}

function normalizeHistoryResponse(response, checkpoint) {
  if (Array.isArray(response?.history)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return {
      checkpointId: checkpoint?.id,
      checkpointName: checkpoint?.name,
      location: checkpoint?.location,
      currentStatus: checkpoint?.currentStatus || checkpoint?.status,
      history: response.data,
    };
  }

  return {
    checkpointId: checkpoint?.id,
    checkpointName: checkpoint?.name,
    location: checkpoint?.location,
    currentStatus: checkpoint?.currentStatus || checkpoint?.status,
    history: [],
  };
}

export async function openCheckpointHistoryModal(checkpoint) {
  if (!checkpoint?.id) {
    return;
  }

  const overlay = ensureOverlay();
  const requestId = activeRequestId + 1;
  activeRequestId = requestId;

  setHeader(overlay, checkpoint);
  renderMessage(overlay, 'Loading checkpoint history...');
  overlay.classList.add('show');

  try {
    const { getCheckpointHistory } = await import(
      '/Controllers/checkpoint-management.controller.js'
    );
    const response = normalizeHistoryResponse(
      await getCheckpointHistory(checkpoint.id),
      checkpoint,
    );

    if (requestId !== activeRequestId) {
      return;
    }

    setHeader(overlay, checkpoint, response);
    renderHistory(overlay, response.history);
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    console.error('Failed to load checkpoint history:', error);
    renderMessage(overlay, readErrorMessage(error), 'is-error');
  }
}
