import * as checkpointService from '/Services/checkpoint-management.service.js';

export async function loadCheckpointsPage(params = {}) {
  return checkpointService.getCheckpointsPage(params);
}

export async function getCheckpoint(id) {
  return checkpointService.getCheckpointById(id);
}

export async function createNewCheckpoint(payload) {
  return checkpointService.createNewCheckpoint(payload);
}

export async function updateExistingCheckpoint(id, payload) {
  return checkpointService.updateExistingCheckpoint(id, payload);
}

export async function deleteExistingCheckpoint(id) {
  return checkpointService.deleteExistingCheckpoint(id);
}
