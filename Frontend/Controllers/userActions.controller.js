import {
  deleteUser,
  updateUser,
} from '/Services/userActions.service.js';

export function updateExistingUser(userId, payload) {
  return updateUser(userId, payload);
}

export function deleteExistingUser(userId) {
  return deleteUser(userId);
}
