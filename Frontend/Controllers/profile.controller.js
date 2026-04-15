import {
  getCachedProfile,
  loadCurrentProfile,
  saveCurrentProfile,
} from '/Services/profile.service.js';

export function getCurrentProfile() {
  return loadCurrentProfile();
}

export function persistCurrentProfile(profileDraft) {
  return saveCurrentProfile(profileDraft);
}

export function getCachedCurrentProfile() {
  return getCachedProfile();
}

export class ProfileController {
  static getCurrentProfile() {
    return getCurrentProfile();
  }

  static persistCurrentProfile(profileDraft) {
    return persistCurrentProfile(profileDraft);
  }

  static getCachedCurrentProfile() {
    return getCachedCurrentProfile();
  }
}

if (typeof window !== 'undefined') {
  window.ProfileController = ProfileController;
}

export default ProfileController;
