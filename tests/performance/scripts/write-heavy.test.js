import { options } from '../config/options.write.js';
import { getCitizenToken } from '../helpers/auth.js';
import { runWriteHeavy } from '../scenarios/write-heavy.js';

export { options };

export function setup() {
  return { token: getCitizenToken() };
}

export default function (data) {
  runWriteHeavy(data.token);
}
