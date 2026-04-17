import { apiGet } from '/Services/api-client.js';

const USER_KEY = 'user';
const TOKEN_KEY = 'token';
const LEGACY_TOKEN_KEY = 'jwtToken';
const PROFILE_IMAGE_KEY = 'profileImage';
const USER_LANGUAGE_KEY = 'wasel.user.language';
const LEGACY_PROFILE_OVERRIDES_KEY = 'wasel.admin.profile.overrides';
const SIGN_IN_PATH = '/features/public/auth/signin_signup.html';
const ALLOWED_LANGUAGES = new Set(['English', 'Arabic']);

function normalizeLanguage(value) {
  const normalizedValue = String(value || '').trim();
  return ALLOWED_LANGUAGES.has(normalizedValue) ? normalizedValue : '';
}

function getUserLanguage(user) {
  return normalizeLanguage(user?.language || user?.preferredLanguage);
}

function notifyUserUpdated(user) {
  window.dispatchEvent(
    new CustomEvent('wasel:user-updated', {
      detail: {
        user,
        language: getUserLanguage(user) || null,
      },
    }),
  );
}

export function setCurrentUser(user, token) {
  if (user) {
    window.localStorage?.setItem(USER_KEY, JSON.stringify(user));

    const profileImage = String(user.profileImage || '').trim();
    if (profileImage) {
      window.localStorage?.setItem(PROFILE_IMAGE_KEY, profileImage);
    } else {
      window.localStorage?.removeItem(PROFILE_IMAGE_KEY);
    }

    const language = getUserLanguage(user);
    if (language) {
      window.localStorage?.setItem(USER_LANGUAGE_KEY, language);
    } else {
      window.localStorage?.removeItem(USER_LANGUAGE_KEY);
    }

    notifyUserUpdated(user);
  }

  if (token) {
    window.localStorage?.setItem(TOKEN_KEY, token);
    window.localStorage?.removeItem(LEGACY_TOKEN_KEY);
  }
}

export function getCurrentUser() {
  const user = window.localStorage?.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function getAuthToken() {
  return window.localStorage?.getItem(TOKEN_KEY) || null;
}

export function hasAuthToken() {
  return !!getAuthToken();
}

export function clearCurrentUser() {
  window.localStorage?.removeItem(USER_KEY);
  window.localStorage?.removeItem(TOKEN_KEY);
  window.localStorage?.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage?.removeItem(PROFILE_IMAGE_KEY);
  window.localStorage?.removeItem(USER_LANGUAGE_KEY);
  window.localStorage?.removeItem(LEGACY_PROFILE_OVERRIDES_KEY);
}

export function redirectToSignIn() {
  window.location.href = SIGN_IN_PATH;
}

export async function validateSession() {
  const token = getAuthToken();
  const user = getCurrentUser();

  if (!token || !user) {
    return false;
  }

  try {
    const profile = await apiGet('/auth/profile');
    setCurrentUser(profile);
    return true;
  } catch (error) {
    console.error('Failed to validate session', error);
    return false;
  }
}

export function logoutUser() {
  clearCurrentUser();
  redirectToSignIn();
}

function getHomePathForRole(role) {
  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === 'admin') {
    return '/views/admin/header/header.html#admin-dashboard';
  }

  if (normalizedRole === 'citizen' || normalizedRole === 'user') {
    return '/views/citizen/header/header.html#home';
  }

  return null;
}

export async function redirectUser() {
  try {
    const user = getCurrentUser();
    const targetPath = user ? getHomePathForRole(user.role) : null;

    if (!targetPath) {
      if (user?.role) {
        console.warn('Unknown user role:', user.role);
      }

      redirectToSignIn();
      return;
    }

    window.location.href = targetPath;
  } catch (error) {
    console.error('Failed to check user identity', error);
    redirectToSignIn();
  }
}
