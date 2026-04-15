import {
  applySystemSettings,
  loadSystemSettingsSnapshot,
  resetSystemSettingsDraft,
  saveSystemSettingsDraft,
} from '/Services/system-settings.service.js';

export function loadSystemSettings() {
  return loadSystemSettingsSnapshot();
}

export function saveSystemSettings(settings) {
  return saveSystemSettingsDraft(settings);
}

export function applySettings(settings) {
  return applySystemSettings(settings);
}

export function resetSystemSettings() {
  return resetSystemSettingsDraft();
}

export class SystemSettingsController {
  static loadSystemSettings() {
    return loadSystemSettings();
  }

  static saveSystemSettings(settings) {
    return saveSystemSettings(settings);
  }

  static applySettings(settings) {
    return applySettings(settings);
  }

  static resetSystemSettings() {
    return resetSystemSettings();
  }
}

if (typeof window !== 'undefined') {
  window.SystemSettingsController = SystemSettingsController;
}

export default SystemSettingsController;
