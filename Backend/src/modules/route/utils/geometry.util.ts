export function metersToLatitudeDegrees(meters: number): number {
  return meters / 111320;
}

export function metersToLongitudeDegrees(
  meters: number,
  latitude: number,
): number {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegree = 111320 * Math.cos(latitudeRadians);

  if (metersPerDegree === 0) {
    return 0;
  }

  return meters / metersPerDegree;
}