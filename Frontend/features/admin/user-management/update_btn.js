import { updateExistingUser } from '/Controllers/userActions.controller.js';
import {
  applyEditValidationErrors,
  clearEditValidationErrors,
  collectEditUserFormData,
  validateEditUserPayload,
} from '/features/admin/user-management/edit_validation.js';

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

  return 'Failed to update user.';
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

export function bindEditUserSave(overlay, options = {}) {
  const form = overlay?.querySelector('#editUserForm');
  const saveButton = overlay?.querySelector('#editUserSaveBtn');

  if (!form) {
    return;
  }

  form.__editUserContext = {
    user: options.user || null,
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

    const user = form.__editUserContext?.user;
    if (!user?.id) {
      notifyError('User information is missing.');
      return;
    }

    clearEditValidationErrors(form);

    const payload = collectEditUserFormData(form);
    const validationResult = validateEditUserPayload(payload);

    if (!validationResult.isValid) {
      applyEditValidationErrors(form, validationResult.errors);
      if (validationResult.messages[0]) {
        notifyError(validationResult.messages[0]);
      }
      return;
    }

    setButtonState(saveButton, true);

    try {
      const updatedUser = await updateExistingUser(user.id, payload);

      document.dispatchEvent(
        new CustomEvent('admin:user-updated', {
          detail: updatedUser,
        }),
      );

      clearEditValidationErrors(form);
      form.__editUserContext?.onClose?.();
      notifySuccess('User updated successfully.');
    } catch (error) {
      console.error('Failed to update user', error);
      notifyError(readErrorMessage(error));
    } finally {
      setButtonState(saveButton, false);
    }
  });
}
