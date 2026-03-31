function fillEditIncidentForm(overlay, incident) {
  const form = overlay?.querySelector('#editIncidentForm');
  if (!form || !incident) {
    return;
  }

  form.querySelector('#editIncidentTitle').value = incident.title || '';

  form.querySelector('#editIncidentDescription').value =
    incident.description || '';
  form.querySelector('#editIncidentType').value = incident.type || '';
  form.querySelector('#editIncidentSeverity').value = incident.severity || '';

  form.querySelector('#editIncidentLocation').value =
    incident.location ||
    incident.checkpoint?.name ||
    incident.checkpointId ||
    '';

  form.querySelector('#editIncidentStatus').value = incident.status || 'ACTIVE';
}

function closeModal(overlay) {
  overlay.classList.remove('show');
}

async function ensureEditIncidentOverlay() {
  let overlay = document.getElementById('editIncidentOverlay');

  if (overlay) {
    return overlay;
  }

  const response = await fetch('/features/admin/incidents/EditIncident.html');
  if (!response.ok) {
    throw new Error('Failed to load Edit Incident modal');
  }

  const html = await response.text();

  overlay = document.createElement('div');
  overlay.className = 'edit-incident-overlay';
  overlay.id = 'editIncidentOverlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  if (!document.querySelector('link[href*="EditIncident.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      '/features/admin/incidents/EditIncident.css?v=' + new Date().getTime();
    document.head.appendChild(link);
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal(overlay);
    }
  });

  const closeButton = overlay.querySelector('#editIncidentCloseBtn');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeModal(overlay);
    });
  }

  const cancelButton = overlay.querySelector('#editIncidentCancelBtn');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      closeModal(overlay);
    });
  }

  return overlay;
}

export async function openEditIncidentModal(incident) {
  if (!incident?.id) {
    return;
  }

  const overlay = await ensureEditIncidentOverlay();
  fillEditIncidentForm(overlay, incident);

  const { bindEditIncidentSave } =
    await import('/features/admin/incidents/update_btn.js');
  bindEditIncidentSave(overlay, {
    incident,
    onClose: () => closeModal(overlay),
  });

  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
}
