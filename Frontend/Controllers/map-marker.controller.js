import {
  getDynamicIcon,
  toCheckpointStatusKey,
} from '/utils/map-constants.js';

function normalizeCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function getPosition(entity) {
  const latitude = normalizeCoordinate(entity?.latitude);
  const longitude = normalizeCoordinate(entity?.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return [latitude, longitude];
}

function getCheckpointStatusLabel(status) {
  const statusKey = toCheckpointStatusKey(status);

  if (statusKey === 'OPEN') return 'Open';
  if (statusKey === 'DELAYED') return 'Delayed';
  if (statusKey === 'RESTRICTED') return 'Restricted';
  if (statusKey === 'CLOSED') return 'Closed';

  return statusKey;
}

export class MapMarkerController {
  constructor(mapProvider) {
    this.mapProvider = mapProvider;
    this.layerGroup = null;
  }

  resolveMap() {
    return typeof this.mapProvider === 'function' ? this.mapProvider() : null;
  }

  clearMarkers() {
    if (!this.layerGroup) return;

    this.layerGroup.clearLayers();

    const map = this.resolveMap();
    if (map && map.hasLayer(this.layerGroup)) {
      map.removeLayer(this.layerGroup);
    }

    this.layerGroup = null;
  }

  ensureLayerGroup() {
    const map = this.resolveMap();
    if (!map || typeof window.L === 'undefined') {
      return null;
    }

    if (!this.layerGroup || this.layerGroup._map !== map) {
      if (this.layerGroup) {
        this.layerGroup.clearLayers();
      }
      this.layerGroup = window.L.layerGroup().addTo(map);
    }

    return this.layerGroup;
  }

  renderMapData(data = {}) {
    const layerGroup = this.ensureLayerGroup();
    if (!layerGroup) return;

    layerGroup.clearLayers();

    const checkpoints = Array.isArray(data.checkpoints) ? data.checkpoints : [];
    const incidents = Array.isArray(data.incidents) ? data.incidents : [];
    const reports = Array.isArray(data.reports) ? data.reports : [];

    checkpoints.forEach((checkpoint) => {
      const position = getPosition(checkpoint);
      if (!position) return;

      const icon = getDynamicIcon('CHECKPOINT', checkpoint.currentStatus || checkpoint.status);
      if (!icon) return;

      const marker = window.L.marker(position, { icon }).addTo(layerGroup);
      marker.bindPopup(`
        <div style="font-family: Arial; text-align: right; direction: rtl;">
          <h4 style="margin: 0 0 5px 0; color: #2563eb;">${checkpoint.name || 'Checkpoint'}</h4>
          <p style="margin: 0; font-size: 13px;"><strong>الموقع:</strong> ${checkpoint.location || '-'}</p>
          <p style="margin: 0; font-size: 13px;"><strong>الحالة:</strong> ${getCheckpointStatusLabel(checkpoint.currentStatus || checkpoint.status)}</p>
        </div>
      `);
    });

    incidents.forEach((incident) => {
      const position = getPosition(incident);
      if (!position) return;

      const icon = getDynamicIcon('INCIDENT', incident.type);
      if (!icon) return;

      const marker = window.L.marker(position, { icon }).addTo(layerGroup);
      marker.bindPopup(`
        <div style="font-family: Arial; text-align: right; direction: rtl;">
          <h4 style="margin: 0 0 5px 0; color: #f97316;">${incident.title || ''}</h4>
          <p style="margin: 0; font-size: 13px;"><strong>النوع:</strong> ${incident.type || '-'}</p>
          <p style="margin: 0; font-size: 13px;"><strong>الخطورة:</strong> ${incident.severity || '-'}</p>
          ${incident.description ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #555;">${incident.description}</p>` : ''}
        </div>
      `);
    });

    reports.forEach((report) => {
      const position = getPosition(report);
      if (!position) return;

      const icon = getDynamicIcon('REPORT', report.category);
      if (!icon) return;

      const marker = window.L.marker(position, { icon }).addTo(layerGroup);
      marker.bindPopup(`
        <div style="font-family: Arial; text-align: left;">
          <h4 style="margin: 0 0 5px 0; color: #2563eb;">Report</h4>
          <p style="margin: 0; font-size: 13px;"><strong>Location:</strong> ${report.location || '-'}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Category:</strong> ${report.category || '-'}</p>
          ${report.description ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #555;">${report.description}</p>` : ''}
        </div>
      `);
    });
  }
}
