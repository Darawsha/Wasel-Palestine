import { saveUser } from '/Controllers/userManagement.controller.js';
import {
  applyValidationErrors,
  clearValidationErrors,
  collectAddUserFormData,
  validateAddUserPayload,
} from '/features/admin/user-management/validation.js';

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

  return 'Failed to save user.';
}

function setButtonState(button, isSaving) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent || 'Add User';
  }

  button.disabled = isSaving;
  button.textContent = isSaving ? 'Saving...' : button.dataset.defaultLabel;
}

export function bindAddUserSave(overlay, options = {}) {
  const form = overlay?.querySelector('#addUserForm');
  const saveButton = overlay?.querySelector('#addUserSaveBtn');

  if (!form) {
    return;
  }

  form.__addUserOnClose = options.onClose;
  clearValidationErrors(form);
  setButtonState(saveButton, false);

  if (form.dataset.saveBound === 'true') {
    return;
  }

  form.dataset.saveBound = 'true';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearValidationErrors(form);

    const payload = collectAddUserFormData(form);
    const validationResult = validateAddUserPayload(payload);

    if (!validationResult.isValid) {
      applyValidationErrors(form, validationResult.errors);
      const firstValidationMessage = Object.values(validationResult.errors)[0];
      if (firstValidationMessage) {
        notifyError(firstValidationMessage);
      }
      return;
    }

    setButtonState(saveButton, true);

    try {
      const createdUser = await saveUser(payload);

      document.dispatchEvent(
        new CustomEvent('admin:user-created', {
          detail: createdUser,
        }),
      );

      form.reset();
      clearValidationErrors(form);
      form.__addUserOnClose?.();
      notifySuccess('User added successfully.');
    } catch (error) {
      console.error('Failed to save user', error);
      notifyError(readErrorMessage(error));
    } finally {
      setButtonState(saveButton, false);
    }
  });
}
