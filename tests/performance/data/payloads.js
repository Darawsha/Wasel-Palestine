import { pick, randomText } from '../helpers/random.js';

const categories = ['road_closure', 'delay', 'accident', 'hazard', 'checkpoint_issue'];
const locations = ['Nablus Downtown', 'Ramallah Center', 'Hebron Gate', 'Jenin Road'];

function randomCoordinate(base, spread) {
  return Number((base + (Math.random() - 0.5) * spread).toFixed(6));
}

export function buildRouteEstimatePayload() {
  return {
    startLatitude: 32.2211,
    startLongitude: 35.2544,
    endLatitude: 31.7683,
    endLongitude: 35.2137,
    avoidCheckpoints: false,
    avoidIncidents: false,
  };
}

export function buildReportPayload() {
  return {
    latitude: randomCoordinate(32.2211, 0.2),
    longitude: randomCoordinate(35.2544, 0.2),
    location: `${pick(locations)} ${randomText('loc')}`,
    category: pick(categories),
    description: `Performance report ${randomText('desc')} for load testing.`,
  };
}

export function buildReportUpdatePayload(basePayload = {}) {
  return {
    ...buildReportPayload(),
    latitude: basePayload.latitude ?? randomCoordinate(32.2211, 0.1),
    longitude: basePayload.longitude ?? randomCoordinate(35.2544, 0.1),
  };
}
