/**
 * geometryConverters.js - GeoJSON ↔ WKT conversions
 *
 * Converts between GeoJSON geometry objects and Well-Known Text (WKT) format
 * for compatibility with Grist geospatial columns and PostGIS functions.
 */

/**
 * Convert GeoJSON geometry to WKT
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {string|null} WKT string or null if invalid
 */
export function geoJSONToWKT(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return null;
  }

  const { type, coordinates } = geometry;

  switch (type) {
    case 'Point':
      return `POINT(${coordinates[0]} ${coordinates[1]})`;

    case 'LineString':
      return `LINESTRING(${formatCoordinates(coordinates)})`;

    case 'Polygon':
      return `POLYGON((${formatCoordinates(coordinates[0])}))`;

    case 'MultiPoint':
      const points = coordinates.map(c => `(${c[0]} ${c[1]})`).join(', ');
      return `MULTIPOINT(${points})`;

    case 'MultiLineString':
      const lines = coordinates.map(line => `(${formatCoordinates(line)})`).join(', ');
      return `MULTILINESTRING(${lines})`;

    case 'MultiPolygon':
      const polys = coordinates.map(poly =>
        `((${formatCoordinates(poly[0])}))`
      ).join(', ');
      return `MULTIPOLYGON(${polys})`;

    default:
      console.warn(`[geometryConverters] Unsupported geometry type: ${type}`);
      return null;
  }
}

/**
 * Format coordinate array to WKT coordinate string
 * @param {Array} coords - Array of [lon, lat] coordinates
 * @returns {string} Formatted coordinate string (e.g., "2.3 48.8, 2.4 48.9")
 */
function formatCoordinates(coords) {
  return coords.map(c => `${c[0]} ${c[1]}`).join(', ');
}

/**
 * Convert GeoJSON Feature to WKT
 * @param {Object} feature - GeoJSON Feature object
 * @returns {string|null} WKT string or null if invalid
 */
export function featureToWKT(feature) {
  if (!feature || !feature.geometry) {
    return null;
  }
  return geoJSONToWKT(feature.geometry);
}

/**
 * Detect geometry type from WKT string
 * @param {string} wkt - WKT string
 * @returns {string} Geometry type (Point, LineString, Polygon, etc.)
 */
export function detectGeometryTypeFromWKT(wkt) {
  if (!wkt || typeof wkt !== 'string') {
    return 'Unknown';
  }

  const upperWKT = wkt.toUpperCase();

  if (upperWKT.startsWith('POINT')) return 'Point';
  if (upperWKT.startsWith('LINESTRING')) return 'LineString';
  if (upperWKT.startsWith('POLYGON')) return 'Polygon';
  if (upperWKT.startsWith('MULTIPOINT')) return 'MultiPoint';
  if (upperWKT.startsWith('MULTILINESTRING')) return 'MultiLineString';
  if (upperWKT.startsWith('MULTIPOLYGON')) return 'MultiPolygon';
  if (upperWKT.startsWith('GEOMETRYCOLLECTION')) return 'GeometryCollection';

  return 'Unknown';
}

/**
 * Detect geometry type from GeoJSON geometry object
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {string} Geometry type
 */
export function detectGeometryTypeFromGeoJSON(geometry) {
  if (!geometry || !geometry.type) {
    return 'Unknown';
  }
  return geometry.type;
}

/**
 * Validate WKT string (basic check)
 * @param {string} wkt - WKT string
 * @returns {boolean} True if valid
 */
export function isValidWKT(wkt) {
  if (!wkt || typeof wkt !== 'string') {
    return false;
  }

  const validTypes = [
    'POINT', 'LINESTRING', 'POLYGON',
    'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON',
    'GEOMETRYCOLLECTION'
  ];

  const upperWKT = wkt.toUpperCase().trim();
  return validTypes.some(type => upperWKT.startsWith(type));
}

/**
 * Validate GeoJSON geometry object (basic check)
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {boolean} True if valid
 */
export function isValidGeoJSON(geometry) {
  if (!geometry || typeof geometry !== 'object') {
    return false;
  }

  const validTypes = [
    'Point', 'LineString', 'Polygon',
    'MultiPoint', 'MultiLineString', 'MultiPolygon',
    'GeometryCollection'
  ];

  return validTypes.includes(geometry.type) &&
         Array.isArray(geometry.coordinates);
}
