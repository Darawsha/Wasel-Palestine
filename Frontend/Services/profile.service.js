import { apiGet, apiPatch } from '/Services/api-client.js';
import { getCurrentUser, setCurrentUser } from '/Services/session.service.js';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitFullName(fullName) {
  const normalizedFullName = normalizeText(fullName);
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
  const firstname = normalizeText(user?.firstname || user?.firstName);
  const lastname = normalizeText(user?.lastname || user?.lastName);
  const directName = normalizeText(user?.fullName || user?.name);

  if (firstname || lastname) {
    return `${firstname} ${lastname}`.trim();
  }

  if (directName) {
    return directName;
  }

  return normalizeText(user?.email).split('@')[0] || 'User';
}

function getInitials(fullName, email) {
  const parts = normalizeText(fullName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]?.toUpperCase() || '').join('');
  }

  const emailPrefix = normalizeText(email).charAt(0).toUpperCase();
  return emailPrefix || 'U';
}

function normalizeProfile(user) {
  const fullName = buildFullName(user);
  const email = normalizeText(user?.email);

  return {
    id: user?.id ?? null,
    firstname: normalizeText(user?.firstname || user?.firstName),
    lastname: normalizeText(user?.lastname || user?.lastName),
    fullName,
    email,
    phone: normalizeText(user?.phone),
    address: normalizeText(user?.address),
    role: normalizeText(user?.role),
    profileImage: user?.profileImage || null,  // ← Do NOT truncate Base64
    provider: normalizeText(user?.provider),
    isVerified: Boolean(user?.isVerified),
    profileImageUpdatedAt: user?.profileImageUpdatedAt || null,
    initials: getInitials(fullName, email),
  };
}

function buildUpdatePayload(profileDraft = {}) {
  const { firstname, lastname } = splitFullName(profileDraft.fullName);
  const payload = {
    firstname,
    lastname,
    phone: normalizeText(profileDraft.phone) || null,
    address: normalizeText(profileDraft.address) || null,
  };

  // Do NOT normalize profileImage - preserve Base64 integrity
  if (Object.prototype.hasOwnProperty.call(profileDraft, 'profileImage')) {
    const image = profileDraft.profileImage;
    payload.profileImage = (typeof image === 'string' && image) ? image : null;
  }

  if (normalizeText(profileDraft.currentPassword)) {
    payload.currentPassword = profileDraft.currentPassword;
  }

  if (normalizeText(profileDraft.newPassword)) {
    payload.newPassword = profileDraft.newPassword;
  }

  return payload;
}

export async function loadCurrentProfile() {
  const profile = await apiGet('/auth/profile');
  setCurrentUser(profile);
  return normalizeProfile(profile);
}

export async function saveCurrentProfile(profileDraft) {
  const updatePayload = buildUpdatePayload(profileDraft);

  try {
    const profile = await apiPatch('/auth/profile', updatePayload);

    setCurrentUser(profile);
    return normalizeProfile(profile);
  } catch (error) {
    throw error;
  }
}

export function getCachedProfile() {
  const currentUser = getCurrentUser();
  return currentUser ? normalizeProfile(currentUser) : null;
}

export { buildFullName, getInitials, normalizeProfile, splitFullName };
