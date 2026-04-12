import {
  getModerationQueuePage,
  moderateReport,
  PAGE_SIZE,
} from '/Services/moderation-queue.service.js';

export function loadModerationQueuePage(params = {}) {
  return getModerationQueuePage(params);
}

export function performModerationAction(reportId, action, notes = '') {
  return moderateReport(reportId, action, notes);
}

export { PAGE_SIZE };

export class ModerationQueueController {
  static loadModerationQueuePage(params = {}) {
    return loadModerationQueuePage(params);
  }

  static performModerationAction(reportId, action, notes = '') {
    return performModerationAction(reportId, action, notes);
  }
}

if (typeof window !== 'undefined') {
  window.ModerationQueueController = ModerationQueueController;
}

export default ModerationQueueController;
