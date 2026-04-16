import { options } from '../config/options.read.js';
import { getCitizenToken } from '../helpers/auth.js';
import { runReadHeavy } from '../scenarios/read-heavy.js';

export { options };

export function setup() {
  return { token: getCitizenToken() };
}

export default function (data) {
  runReadHeavy(data.token);
}
