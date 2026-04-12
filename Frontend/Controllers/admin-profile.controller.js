import {
  loadAdminProfile,
  saveAdminProfile,
} from '/Services/admin-profile.service.js';

export function getAdminProfile() {
  return loadAdminProfile();
}

export function persistAdminProfile(profileDraft) {
  return saveAdminProfile(profileDraft);
}

export class AdminProfileController {
  static getAdminProfile() {
    return getAdminProfile();
  }

  static persistAdminProfile(profileDraft) {
    return persistAdminProfile(profileDraft);
  }
}

if (typeof window !== 'undefined') {
  window.AdminProfileController = AdminProfileController;
}

export default AdminProfileController;
