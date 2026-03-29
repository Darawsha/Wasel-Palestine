import { deleteExistingCheckpoint } from '/Controllers/checkpoint-management.controller.js';

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

  return 'Failed to delete checkpoint.';
}

async function confirmDelete(checkpoint) {
  const name = checkpoint?.name?.trim() || 'this checkpoint';

  if (window.Swal) {
    const styles = getComputedStyle(document.documentElement);
    const confirmButtonColor = styles.getPropertyValue('--um-alert-strong').trim() || '#ef4444';
    const cancelButtonColor = styles.getPropertyValue('--text-light').trim() || '#94a3b8';
    const background = styles.getPropertyValue('--surface-bg').trim() || '#ffffff';
    const color = styles.getPropertyValue('--text-dark').trim() || '#0f172a';

    const result = await window.Swal.fire({
      title: 'Delete checkpoint?',
      text: `This will permanently remove "${name}".`,
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

  return window.confirm(`Delete "${name}"?`);
}

/**
 * Confirms with the user and then deletes a checkpoint.
 * 
 * @param {Object} checkpoint - The checkpoint object to delete.
 */
export async function confirmAndDeleteCheckpoint(checkpoint) {
  if (!checkpoint?.id) {
    return;
  }

  const isConfirmed = await confirmDelete(checkpoint);
  if (!isConfirmed) {
    return;
  }

  try {
    await deleteExistingCheckpoint(checkpoint.id);

    // Dispatch event to refresh the table or handle UI updates
    document.dispatchEvent(
      new CustomEvent('admin:checkpoint-deleted', {
        detail: { checkpointId: checkpoint.id },
      })
    );

    notifySuccess('Checkpoint deleted successfully.');
  } catch (error) {
    console.error('Failed to delete checkpoint:', error);
    notifyError(readErrorMessage(error));
  }
}
