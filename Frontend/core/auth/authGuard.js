import {
  clearCurrentUser,
  getCurrentUser,
  hasAuthToken,
  redirectToSignIn,
  validateSession,
} from '/Services/session.service.js';

export async function checkAuth() {
  if (window.CitizenPreview?.isActive?.()) {
    window.CitizenPreview.applyShellState?.();
    return true;
  }

  if (!hasAuthToken() || !getCurrentUser()) {
    clearCurrentUser();
    redirectToSignIn();
    return false;
  }

  const isSessionValid = await validateSession();
  if (!isSessionValid) {
    clearCurrentUser();
    redirectToSignIn();
    return false;
  }

  return true;
}
