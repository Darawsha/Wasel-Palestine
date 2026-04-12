import { apiGet } from '/Services/api-client.js';
import { getCurrentUser, setCurrentUser } from '/Services/session.service.js';

const PROFILE_OVERRIDES_KEY = 'wasel.admin.profile.overrides';

function readJsonStorage(key) {
  try {
    const rawValue = window.localStorage?.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (_error) {
    return null;
  }
}

function writeJsonStorage(key, value) {
  window.localStorage?.setItem(key, JSON.stringify(value));
  return value;
}

function splitFullName(fullName) {
  const normalizedFullName = String(fullName || '').trim();
  if (!normalizedFullName) {
    return {
      firstname: '',
      lastname: '',
    };
  }

  const segments = normalizedFullName.split(/\s+/);
  return {
    firstname: segments.shift() || '',
    lastname: segments.join(' '),
  };
}

function buildFullName(user) {
  const firstName = String(user?.firstname || user?.firstName || '').trim();
  const lastName = String(user?.lastname || user?.lastName || '').trim();
  const directName = String(user?.fullName || user?.name || '').trim();

  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  return directName;
}

function getInitials(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'AD';
  }

  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

function normalizeProfile(user, overrides = null) {
  const mergedProfile = {
    ...user,
    ...(overrides || {}),
  };
  const fullName = overrides?.fullName || buildFullName(mergedProfile) || 'Admin User';

  return {
    fullName,
    email: String(mergedProfile?.email || '').trim(),
    phone: String(mergedProfile?.phone || '').trim(),
    role: String(mergedProfile?.role || 'admin').trim(),
    initials: getInitials(fullName),
  };
}

export async function loadAdminProfile() {
  const overrides = readJsonStorage(PROFILE_OVERRIDES_KEY);

  try {
    const profile = await apiGet('/auth/profile');
    const normalizedProfile = normalizeProfile(profile, overrides);
    setCurrentUser(
      {
        ...profile,
        firstname: splitFullName(normalizedProfile.fullName).firstname,
        lastname: splitFullName(normalizedProfile.fullName).lastname,
        phone: normalizedProfile.phone,
      },
    );
    return normalizedProfile;
  } catch (error) {
    console.error('Failed to fetch admin profile from API', error);
    return normalizeProfile(getCurrentUser(), overrides);
  }
}

export function saveAdminProfile(profileDraft) {
  const currentUser = getCurrentUser() || {};
  const { firstname, lastname } = splitFullName(profileDraft.fullName);
  const nextUser = {
    ...currentUser,
    firstname,
    lastname,
    fullName: profileDraft.fullName,
    name: profileDraft.fullName,
    phone: profileDraft.phone,
  };

  writeJsonStorage(PROFILE_OVERRIDES_KEY, {
    fullName: profileDraft.fullName,
    phone: profileDraft.phone,
  });
  setCurrentUser(nextUser);

  return normalizeProfile(nextUser);
}
