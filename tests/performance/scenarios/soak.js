import { chance } from '../helpers/random.js';
import { runReadHeavy } from './read-heavy.js';
import { runWriteHeavy } from './write-heavy.js';

export function runSoak(token) {
  if (chance(0.85)) {
    runReadHeavy(token);
    return;
  }

  runWriteHeavy(token);
}
