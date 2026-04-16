import http from 'k6/http';
import { check } from 'k6';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CITIZEN_EMAIL,
  CITIZEN_PASSWORD,
  apiUrl,
} from '../config/env.js';
import { withJsonHeaders } from './headers.js';

function signIn(email, password, label) {
  const response = http.post(
    apiUrl('/auth/signin'),
    JSON.stringify({ email, password }),
    {
      ...withJsonHeaders(),
      responseType: 'text',
    },
  );

  check(response, { [`signin ${label} success`]: (res) => res.status === 200 });
  if (response.status !== 200) throw new Error(`Signin failed for ${label}`);

  const token = response.json('access_token');
  if (!token) throw new Error(`No access_token returned for ${label}`);

  return token;
}

export function getCitizenToken() {
  return signIn(CITIZEN_EMAIL, CITIZEN_PASSWORD, 'citizen');
}

export function getAdminToken() {
  return signIn(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
}
