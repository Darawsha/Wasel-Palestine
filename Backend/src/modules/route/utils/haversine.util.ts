export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateHaversineDistanceKm(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
): number {
  const earthRadiusKm = 6371;

  const latDiff = toRadians(endLatitude - startLatitude);
  const lonDiff = toRadians(endLongitude - startLongitude);

  const startLatRad = toRadians(startLatitude);
  const endLatRad = toRadians(endLatitude);

  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(startLatRad) *
      Math.cos(endLatRad) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}