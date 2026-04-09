import { getApiMonitorSnapshot } from '/Services/api-monitor.service.js';

export function loadApiMonitor(options = {}) {
  return getApiMonitorSnapshot(options);
}

export class APIMonitorController {
  static loadApiMonitor(options = {}) {
    return loadApiMonitor(options);
  }
}

if (typeof window !== 'undefined') {
  window.APIMonitorController = APIMonitorController;
}

export default APIMonitorController;
