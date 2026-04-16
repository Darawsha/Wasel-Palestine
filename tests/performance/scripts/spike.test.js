import { options } from '../config/options.spike.js';
import { getCitizenToken } from '../helpers/auth.js';
import { runSpike } from '../scenarios/spike.js';

export { options };

export function setup() {
  return { token: getCitizenToken() };
}

export default function (data) {
  runSpike(data.token);
}
