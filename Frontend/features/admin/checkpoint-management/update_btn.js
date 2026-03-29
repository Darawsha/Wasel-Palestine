import { updateExistingCheckpoint } from '/Controllers/checkpoint-management.controller.js';
import {
  applyValidationErrors,
  clearValidationErrors,
  collectCheckpointFormData,
  validateCheckpointPayload,
} from '/features/admin/checkpoint-management/validation.js';

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

  return 'Failed to update checkpoint.';
}

function setButtonState(button, isSaving) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent || 'Save Changes';
  }

  button.disabled = isSaving;
  button.textContent = isSaving ? 'Saving...' : button.dataset.defaultLabel;
}

/**
 * Binds the save logic to the edit checkpoint form.
 * 
 * @param {HTMLElement} overlay - The modal overlay containing the form.
 * @param {Object} options - Context options (checkpoint, onClose callback).
 */
export function bindEditCheckpointSave(overlay, options = {}) {
  const form = overlay?.querySelector('#editCheckpointForm');
  const saveButton = overlay?.querySelector('#editCheckpointSaveBtn');

  if (!form) return;

  // Store context on the form element for access during the submit event
  form.__checkpointContext = {
    checkpoint: options.checkpoint || null,
    onClose: options.onClose,
  };

  clearValidationErrors(form);
  setButtonState(saveButton, false);

  if (form.dataset.saveBound === 'true') return;
  form.dataset.saveBound = 'true';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const checkpoint = form.__checkpointContext?.checkpoint;
    if (!checkpoint?.id) {
      notifyError('Checkpoint information is missing.');
      return;
    }

    clearValidationErrors(form);

    const payload = collectCheckpointFormData(form);
    const validationResult = validateCheckpointPayload(payload);

    if (!validationResult.isValid) {
      applyValidationErrors(form, validationResult.errors);
      if (validationResult.messages[0]) {
        notifyError(validationResult.messages[0]);
      }
      return;
    }

    setButtonState(saveButton, true);

    try {
      const updatedCheckpoint = await updateExistingCheckpoint(checkpoint.id, payload);

      // Dispatch event to notify the page that a checkpoint was updated
      document.dispatchEvent(
        new CustomEvent('admin:checkpoint-updated', {
          detail: updatedCheckpoint,
        })
      );

      clearValidationErrors(form);
      form.__checkpointContext?.onClose?.();
      notifySuccess('Checkpoint updated successfully.');
    } catch (error) {
      console.error('Failed to update checkpoint:', error);
      notifyError(readErrorMessage(error));
    } finally {
      setButtonState(saveButton, false);
    }
  });
}
