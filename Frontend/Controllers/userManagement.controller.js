import {
  createUser,
  getCitizensPage,
} from '/Services/userManagement.service.js';

export function loadUsersPage(params = {}) {
  return getCitizensPage(params);
}

export function saveUser(payload) {
  return createUser(payload);
}
