import { options } from '../config/options.mixed.js';
import { getCitizenToken } from '../helpers/auth.js';
import { runMixed } from '../scenarios/mixed.js';

export { options };

export function setup() {
  return { token: getCitizenToken() };
}

export default function (data) {
  runMixed(data.token);
}
