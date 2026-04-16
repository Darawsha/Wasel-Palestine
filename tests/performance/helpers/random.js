export function intBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(items) {
  return items[intBetween(0, items.length - 1)];
}

export function chance(probability = 0.5) {
  return Math.random() < probability;
}

export function randomText(prefix = 'perf') {
  return `${prefix}-${Date.now()}-${intBetween(1000, 9999)}`;
}
