// src/common/utils/geo.util.ts

/**
 * Returns a raw SQL string for calculating the distance in meters 
 * using the Haversine formula for TypeORM QueryBuilder.
 * * @param tableAlias The alias used in the query builder (e.g., 'incident' or 'checkpoint')
 * @param latParamName The parameter name for the target latitude (default: 'lat')
 * @param lngParamName The parameter name for the target longitude (default: 'lng')
 */
export function getHaversineDistanceSql(
  tableAlias: string,
  latParamName: string = 'lat',
  lngParamName: string = 'lng',
): string {
  return `(6371000 * acos(
    cos(radians(:${latParamName})) *
    cos(radians(${tableAlias}.latitude)) *
    cos(radians(${tableAlias}.longitude) - radians(:${lngParamName})) +
    sin(radians(:${latParamName})) *
    sin(radians(${tableAlias}.latitude))
  ))`;
}