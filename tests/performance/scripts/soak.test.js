import { options } from '../config/options.soak.js';
import { getCitizenToken } from '../helpers/auth.js';
import { runSoak } from '../scenarios/soak.js';

export { options };

export function setup() {
  return { token: getCitizenToken() };
}

export default function (data) {
  runSoak(data.token);
}
