import {
  getCachedAdminProfile,
  loadAdminProfile,
  saveAdminProfile,
} from '/Services/admin-profile.service.js';

export function getAdminProfile() {
  return loadAdminProfile();
}

export function persistAdminProfile(profileDraft) {
  return saveAdminProfile(profileDraft);
}

export function getCachedAdminProfileData() {
  return getCachedAdminProfile();
}

export class AdminProfileController {
  static getAdminProfile() {
    return getAdminProfile();
  }

  static persistAdminProfile(profileDraft) {
    return persistAdminProfile(profileDraft);
  }

  static getCachedAdminProfileData() {
    return getCachedAdminProfileData();
  }
}

if (typeof window !== 'undefined') {
  window.AdminProfileController = AdminProfileController;
}

export default AdminProfileController;
