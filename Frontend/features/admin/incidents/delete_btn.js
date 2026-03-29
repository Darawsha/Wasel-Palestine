import { deleteExistingIncident } from '/Controllers/incidentActions.controller.js';

function notifyError(message) {
  if (typeof window.showError === 'function') {
    window.showError(message);
    return;
  }

  window.alert(message);
}

function notifySuccess(message) {
  if (typeof window.showSuccess === 'function') {
    window.showSuccess(message);
    return;
  }

  window.alert(message);
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

  return 'Failed to delete incident.';
}

async function confirmDelete(incident) {
  const title = incident?.title?.trim() || 'this incident';

  if (window.Swal) {
    const styles = getComputedStyle(document.documentElement);
    const confirmButtonColor =
      styles.getPropertyValue('--um-alert-strong').trim() || '#ef4444';
    const cancelButtonColor =
      styles.getPropertyValue('--text-light').trim() || '#94a3b8';
    const background = styles.getPropertyValue('--surface-bg').trim() || '#ffffff';
    const color = styles.getPropertyValue('--text-dark').trim() || '#0f172a';

    const result = await window.Swal.fire({
      title: 'Delete incident?',
      text: `This will permanently remove "${title}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor,
      cancelButtonColor,
      background,
      color,
    });

    return Boolean(result.isConfirmed);
  }

  return window.confirm(`Delete "${title}"?`);
}

export async function confirmAndDeleteIncident(incident) {
  if (!incident?.id) {
    return;
  }

  const isConfirmed = await confirmDelete(incident);
  if (!isConfirmed) {
    return;
  }

  try {
    await deleteExistingIncident(incident.id);

    document.dispatchEvent(
      new CustomEvent('admin:incident-deleted', {
        detail: { incidentId: incident.id },
      }),
    );

    notifySuccess('Incident deleted successfully.');
  } catch (error) {
    console.error('Failed to delete incident', error);
    notifyError(readErrorMessage(error));
  }
}
