export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const CITIZEN_EMAIL =
  __ENV.CITIZEN_EMAIL || 'mohammadawwad069@gmail.com';
export const CITIZEN_PASSWORD = __ENV.CITIZEN_PASSWORD || 'Mm12218103';

export const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'mohammadawwad044@gmail.com';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Mm123456789';

export function apiUrl(path) {
  return `${BASE_URL}${path}`;
}
