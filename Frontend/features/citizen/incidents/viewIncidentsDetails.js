(function (global) {
  const OVERLAY_ID = 'incident-details-overlay';
  const TEMPLATE_PATH = '/features/citizen/incidents/viewIncidentsDetails.html';
  const STYLESHEET_PATH = '/features/citizen/incidents/viewIncidentsDetails.css';

  let overlayElement = null;
  let isCloseBindingAttached = false;

  function ensureStylesheet() {
    const existing = document.querySelector(
      `link[rel="stylesheet"][href="${STYLESHEET_PATH}"]`,
    );

    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLESHEET_PATH;
    document.head.appendChild(link);
  }

  function setText(container, selector, value) {
    const target = container.querySelector(selector);
    if (!target) return;
    target.textContent = value ?? '-';
  }

  function formatDateTime(dateValue) {
    if (!dateValue) return '-';

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return '-';

    return parsedDate.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatStatus(incident) {
    if (incident?.status === 'CLOSED') {
      return 'Closed';
    }

    if (incident?.isVerified) {
      return 'Verified';
    }

    return 'Active';
  }

  function formatType(type) {
    const normalized = String(type || '').trim().toUpperCase();

    if (normalized === 'CLOSURE') return 'Road Closure';
    if (normalized === 'DELAY') return 'Delay';
    if (normalized === 'ACCIDENT') return 'Accident';
    if (normalized === 'WEATHER_HAZARD') return 'Weather Hazard';

    return normalized || '-';
  }

  function formatSeverity(severity) {
    const normalized = String(severity || '').trim().toUpperCase();
    return normalized || '-';
  }

  function formatCheckpointStatus(status) {
    const normalized = String(status || '').trim().toUpperCase();

    if (normalized === 'ACTIVE') return 'Open';
    if (normalized === 'DELAYED') return 'Delayed';
    if (normalized === 'RESTRICTED') return 'Restricted';
    if (normalized === 'CLOSED') return 'Closed';

    return normalized || '-';
  }

  function formatCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return '-';
    }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function closeIncidentDetails() {
    if (!overlayElement) {
      return;
    }

    overlayElement.classList.remove('show');
  }

  function setLoadingState(container) {
    setText(container, '[data-incident-title]', 'Loading...');
    setText(container, '[data-incident-type]', 'Type: -');
    setText(container, '[data-incident-severity]', 'Severity: -');
    setText(container, '[data-incident-status]', 'Status: -');
    setText(container, '[data-incident-location]', '-');
    setText(container, '[data-incident-created]', '-');
    setText(container, '[data-incident-updated]', '-');
    setText(container, '[data-incident-description]', 'Loading details...');

    const checkpointSection = container.querySelector(
      '[data-incident-checkpoint-section]',
    );
    if (checkpointSection) {
      checkpointSection.hidden = true;
    }
  }

  function renderIncidentDetails(container, incident) {
    setText(container, '[data-incident-title]', incident?.title || 'Untitled incident');
    setText(container, '[data-incident-type]', `Type: ${formatType(incident?.type)}`);
    setText(
      container,
      '[data-incident-severity]',
      `Severity: ${formatSeverity(incident?.severity)}`,
    );
    setText(container, '[data-incident-status]', `Status: ${formatStatus(incident)}`);
    setText(
      container,
      '[data-incident-location]',
      incident?.location || incident?.checkpoint?.location || '-',
    );
    setText(
      container,
      '[data-incident-created]',
      formatDateTime(incident?.createdAt),
    );
    setText(
      container,
      '[data-incident-updated]',
      formatDateTime(incident?.updatedAt),
    );
    setText(
      container,
      '[data-incident-description]',
      incident?.description || 'No description provided.',
    );

    const checkpointSection = container.querySelector(
      '[data-incident-checkpoint-section]',
    );
    const checkpoint = incident?.checkpoint;

    if (!checkpointSection) {
      return;
    }

    if (!checkpoint || !checkpoint.id) {
      checkpointSection.hidden = true;
      return;
    }

    checkpointSection.hidden = false;

    setText(container, '[data-checkpoint-name]', checkpoint?.name || '-');
    setText(container, '[data-checkpoint-location]', checkpoint?.location || '-');
    setText(
      container,
      '[data-checkpoint-status]',
      formatCheckpointStatus(checkpoint?.currentStatus),
    );
    setText(
      container,
      '[data-checkpoint-coordinates]',
      formatCoordinates(checkpoint?.latitude, checkpoint?.longitude),
    );
  }

  function renderErrorState(container, message) {
    setText(container, '[data-incident-title]', 'Unable to load details');
    setText(container, '[data-incident-type]', 'Type: -');
    setText(container, '[data-incident-severity]', 'Severity: -');
    setText(container, '[data-incident-status]', 'Status: -');
    setText(container, '[data-incident-location]', '-');
    setText(container, '[data-incident-created]', '-');
    setText(container, '[data-incident-updated]', '-');
    setText(container, '[data-incident-description]', message);

    const checkpointSection = container.querySelector(
      '[data-incident-checkpoint-section]',
    );
    if (checkpointSection) {
      checkpointSection.hidden = true;
    }
  }

  async function loadIncidentDetailsById(incidentId) {
    const module = await import('/Controllers/incidents.controller.js');

    if (typeof module.loadIncidentDetails === 'function') {
      return module.loadIncidentDetails(incidentId);
    }

    if (typeof module.getIncidentDetailsById === 'function') {
      return module.getIncidentDetailsById(incidentId);
    }

    throw new Error('Incident details controller method is unavailable.');
  }

  async function ensureOverlay() {
    if (overlayElement && document.body.contains(overlayElement)) {
      return overlayElement;
    }

    ensureStylesheet();

    const response = await fetch(TEMPLATE_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load details template (${response.status}).`);
    }

    const templateHtml = await response.text();
    overlayElement = document.createElement('div');
    overlayElement.id = OVERLAY_ID;
    overlayElement.className = 'incident-details-overlay';
    overlayElement.innerHTML = templateHtml;
    document.body.appendChild(overlayElement);

    if (!isCloseBindingAttached) {
      isCloseBindingAttached = true;

      overlayElement.addEventListener('click', (event) => {
        if (event.target === overlayElement) {
          closeIncidentDetails();
        }
      });

      const closeButton = overlayElement.querySelector('[data-incident-details-close]');
      if (closeButton) {
        closeButton.addEventListener('click', closeIncidentDetails);
      }

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlayElement?.classList.contains('show')) {
          closeIncidentDetails();
        }
      });
    }

    return overlayElement;
  }

  async function openViewIncidentDetails(incidentId) {
    const normalizedIncidentId = Number(incidentId);

    if (!Number.isFinite(normalizedIncidentId) || normalizedIncidentId <= 0) {
      return;
    }

    const overlay = await ensureOverlay();
    setLoadingState(overlay);
    overlay.classList.add('show');

    try {
      const incident = await loadIncidentDetailsById(normalizedIncidentId);
      renderIncidentDetails(overlay, incident);
    } catch (error) {
      console.error('Failed to load incident details', error);
      renderErrorState(
        overlay,
        'Unable to fetch incident details right now. Please try again.',
      );
    }
  }

  global.CitizenIncidentDetails = {
    openViewIncidentDetails,
    closeViewIncidentDetails: closeIncidentDetails,
  };
})(window);