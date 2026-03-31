import { updateExistingIncident } from '/Controllers/incidentActions.controller.js';
import {
  applyEditValidationErrors,
  clearEditValidationErrors,
  collectEditIncidentFormData,
  validateEditIncidentPayload,
} from '/features/admin/incidents/edit_validation.js';

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

  return 'Failed to update incident.';
}

function setButtonState(button, isSaving) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent || 'Save Changes';
  }

  button.disabled = isSaving;
  button.textContent = isSaving ? 'Saving...' : button.dataset.defaultLabel;
}

export function bindEditIncidentSave(overlay, options = {}) {
  const form = overlay?.querySelector('#editIncidentForm');
  const saveButton = overlay?.querySelector('#editIncidentSaveBtn');

  if (!form) {
    return;
  }

  form.__editIncidentContext = {
    incident: options.incident || null,
    onClose: options.onClose,
  };

  clearEditValidationErrors(form);
  setButtonState(saveButton, false);

  if (form.dataset.saveBound === 'true') {
    return;
  }

  form.dataset.saveBound = 'true';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const incident = form.__editIncidentContext?.incident;
    if (!incident?.id) {
      notifyError('Incident information is missing.');
      return;
    }

    clearEditValidationErrors(form);

    setButtonState(saveButton, true);

    const payload = collectEditIncidentFormData(form);

    const checkpointId = parseInt(payload.location) || undefined;
    payload.checkpointId = checkpointId;

    const validationResult = await validateEditIncidentPayload(payload);

    if (!validationResult.isValid) {
      applyEditValidationErrors(form, validationResult.errors);
      if (validationResult.messages[0]) {
        notifyError(validationResult.messages[0]);
      }
      setButtonState(saveButton, false);
      return;
    }

    try {
      const updatedIncident = await updateExistingIncident(
        incident.id,
        payload,
      );

      document.dispatchEvent(
        new CustomEvent('admin:incident-updated', {
          detail: updatedIncident,
        }),
      );

      clearEditValidationErrors(form);
      form.__editIncidentContext?.onClose?.();
      notifySuccess('Incident updated successfully.');
    } catch (error) {
      console.error('Failed to update incident', error);
      notifyError(readErrorMessage(error));
    } finally {
      setButtonState(saveButton, false);
    }
  });
}
