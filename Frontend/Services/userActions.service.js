import { apiRequest } from '/Services/api-client.js';

export function updateUser(userId, payload) {
  return apiRequest(`/users/${userId}`, {
    method: 'PATCH',
    data: payload,
  });
}

export function deleteUser(userId) {
  return apiRequest(`/users/${userId}`, {
    method: 'DELETE',
  });
}
