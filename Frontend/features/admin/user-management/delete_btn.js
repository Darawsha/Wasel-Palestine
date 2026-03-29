import { deleteExistingUser } from '/Controllers/userActions.controller.js';

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

  return 'Failed to delete user.';
}

async function confirmDelete(user) {
  const fullName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'this user';

  if (window.Swal) {
    const styles = getComputedStyle(document.documentElement);
    const confirmButtonColor =
      styles.getPropertyValue('--um-alert-strong').trim() || '#ef4444';
    const cancelButtonColor =
      styles.getPropertyValue('--text-light').trim() || '#94a3b8';
    const background = styles.getPropertyValue('--surface-bg').trim() || '#ffffff';
    const color = styles.getPropertyValue('--text-dark').trim() || '#0f172a';

    const result = await window.Swal.fire({
      title: 'Delete user?',
      text: `This will permanently remove ${fullName}.`,
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

  return window.confirm(`Delete ${fullName}?`);
}

export async function confirmAndDeleteUser(user) {
  if (!user?.id) {
    return;
  }

  const isConfirmed = await confirmDelete(user);
  if (!isConfirmed) {
    return;
  }

  try {
    await deleteExistingUser(user.id);

    document.dispatchEvent(
      new CustomEvent('admin:user-deleted', {
        detail: { userId: user.id },
      }),
    );

    notifySuccess('User deleted successfully.');
  } catch (error) {
    console.error('Failed to delete user', error);
    notifyError(readErrorMessage(error));
  }
}
