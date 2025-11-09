/**
 * Geometry Utilities
 * Parse WKT geometries and calculate bounds
 */

/**
 * Parse WKT string to extract coordinates
 * @param {string} wkt - WKT geometry string
 * @returns {Array} Array of [lat, lng] coordinates
 */
export const parseWKTCoordinates = (wkt) => {
  if (!wkt || typeof wkt !== 'string') return [];

  try {
    // Remove geometry type prefix (e.g., "POINT(", "LINESTRING(", "POLYGON((")
    const coordsString = wkt
      .replace(/^[A-Z]+\s*\(/i, '')
      .replace(/\)$/, '')
      .replace(/^\(/, '')
      .replace(/\)$/, '');

    // Handle different geometry types
    if (wkt.match(/^POINT/i)) {
      // POINT(lng lat)
      const [lng, lat] = coordsString.split(/\s+/).map(Number);
      return [[lat, lng]];
    } else if (wkt.match(/^LINESTRING/i)) {
      // LINESTRING(lng1 lat1, lng2 lat2, ...)
      return coordsString.split(',').map(pair => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lat, lng];
      });
    } else if (wkt.match(/^POLYGON/i)) {
      // POLYGON((lng1 lat1, lng2 lat2, ...))
      const rings = coordsString.split('),(');
      const outerRing = rings[0].replace(/^\(/, '');
      return outerRing.split(',').map(pair => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lat, lng];
      });
    } else if (wkt.match(/^MULTIPOINT/i)) {
      // MULTIPOINT((lng1 lat1), (lng2 lat2), ...)
      return coordsString.split(/\)\s*,\s*\(/).map(pair => {
        const cleaned = pair.replace(/[()]/g, '');
        const [lng, lat] = cleaned.trim().split(/\s+/).map(Number);
        return [lat, lng];
      });
    } else if (wkt.match(/^MULTILINESTRING/i)) {
      // MULTILINESTRING((lng1 lat1, lng2 lat2), (lng3 lat3, lng4 lat4))
      const lines = coordsString.split(/\)\s*,\s*\(/);
      const allCoords = [];
      lines.forEach(line => {
        const cleaned = line.replace(/[()]/g, '');
        const coords = cleaned.split(',').map(pair => {
          const [lng, lat] = pair.trim().split(/\s+/).map(Number);
          return [lat, lng];
        });
        allCoords.push(...coords);
      });
      return allCoords;
    } else if (wkt.match(/^MULTIPOLYGON/i)) {
      // MULTIPOLYGON(((lng1 lat1, ...)), ((lng2 lat2, ...)))
      const polygons = coordsString.split(/\)\s*\)\s*,\s*\(\s*\(/);
      const allCoords = [];
      polygons.forEach(polygon => {
        const cleaned = polygon.replace(/[()]/g, '');
        const rings = cleaned.split(/\)\s*,\s*\(/);
        const outerRing = rings[0];
        const coords = outerRing.split(',').map(pair => {
          const [lng, lat] = pair.trim().split(/\s+/).map(Number);
          return [lat, lng];
        });
        allCoords.push(...coords);
      });
      return allCoords;
    }

    return [];
  } catch (error) {
    console.error('Error parsing WKT:', error, wkt);
    return [];
  }
};

/**
 * Calculate the center point of a geometry
 * @param {string} wkt - WKT geometry string
 * @returns {Array|null} [lat, lng] or null
 */
export const getGeometryCenter = (wkt) => {
  const coords = parseWKTCoordinates(wkt);
  if (coords.length === 0) return null;

  // Calculate centroid
  const latSum = coords.reduce((sum, coord) => sum + coord[0], 0);
  const lngSum = coords.reduce((sum, coord) => sum + coord[1], 0);

  return [latSum / coords.length, lngSum / coords.length];
};

/**
 * Calculate bounds for an array of geometries
 * @param {Array} geometries - Array of WKT geometry strings
 * @returns {Array|null} [[minLat, minLng], [maxLat, maxLng]] or null
 */
export const calculateBounds = (geometries) => {
  if (!geometries || geometries.length === 0) return null;

  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  geometries.forEach(wkt => {
    const coords = parseWKTCoordinates(wkt);
    coords.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
  });

  if (minLat === Infinity || minLng === Infinity || maxLat === -Infinity || maxLng === -Infinity) {
    return null;
  }

  return [[minLat, minLng], [maxLat, maxLng]];
};

/**
 * Calculate bounds for a single geometry
 * @param {string} wkt - WKT geometry string
 * @returns {Array|null} [[minLat, minLng], [maxLat, maxLng]] or null
 */
export const getGeometryBounds = (wkt) => {
  return calculateBounds([wkt]);
};
