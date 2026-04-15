import {
  getPerformanceReport,
  resolvePerformancePeriod,
} from '/Services/performance-reports.service.js';

export function loadPerformanceReport(days = 30) {
  return getPerformanceReport(days);
}

export function getPerformanceTabPeriod(tabLabel) {
  return resolvePerformancePeriod(tabLabel);
}

export class PerformanceReportsController {
  static loadPerformanceReport(days = 30) {
    return loadPerformanceReport(days);
  }

  static getPerformanceTabPeriod(tabLabel) {
    return getPerformanceTabPeriod(tabLabel);
  }
}

if (typeof window !== 'undefined') {
  window.PerformanceReportsController = PerformanceReportsController;
}

export default PerformanceReportsController;
