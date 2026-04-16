import { chance } from '../helpers/random.js';
import { runReadHeavy } from './read-heavy.js';
import { runWriteHeavy } from './write-heavy.js';

export function runMixed(token) {
  if (chance(0.7)) {
    runReadHeavy(token);
    return;
  }

  runWriteHeavy(token);
}
