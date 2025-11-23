/**
 * GeoJSON Parser - Parse Grist ST_AsGeoJSON output → Leaflet coordinates
 *
 * This function reads the `geojson` column (calculated by Grist ST_AsGeoJSON formula)
 * and converts it to Leaflet-compatible coordinates.
 *
 * Architecture:
 * - Grist calculates: geojson = ST_AsGeoJSON($geometry_wgs84)
 * - Widget reads: JSON.parse(record.geojson)
 * - Widget extracts coordinates for Leaflet display
 *
 * IMPORTANT: GeoJSON uses [longitude, latitude]
 *            Leaflet uses [latitude, longitude]
 */

/**
 * Parse GeoJSON string from Grist ST_AsGeoJSON column
 * @param {string} geoJSONString - GeoJSON string from ST_AsGeoJSON formula
 * @returns {Object} { type, coordinates } - Leaflet-compatible format
 */
export function parseGeoJSON(geoJSONString) {
  if (!geoJSONString || typeof geoJSONString !== 'string') {
    return { type: null, coordinates: [] };
  }

  try {
    const geojson = JSON.parse(geoJSONString);

    if (!geojson || !geojson.type || !geojson.coordinates) {
      return { type: null, coordinates: [] };
    }

    const { type, coordinates } = geojson;

    switch (type) {
      case 'Point':
        return parsePointCoords(coordinates);

      case 'LineString':
        return parseLineStringCoords(coordinates);

      case 'Polygon':
        return parsePolygonCoords(coordinates);

      case 'MultiPoint':
        return parseMultiPointCoords(coordinates);

      case 'MultiLineString':
        return parseMultiLineStringCoords(coordinates);

      case 'MultiPolygon':
        return parseMultiPolygonCoords(coordinates);

      default:
        console.warn(`Unsupported geometry type: ${type}`);
        return { type: null, coordinates: [] };
    }

  } catch (error) {
    console.error('[geoJSONParser] Parsing error:', error, geoJSONString);
    return { type: null, coordinates: [] };
  }
}

/**
 * Convert GeoJSON Point coordinates to Leaflet format
 * GeoJSON: [lng, lat] → Leaflet: [lat, lng]
 */
function parsePointCoords(coords) {
  const [lng, lat] = coords;
  return {
    type: 'Point',
    coordinates: [lat, lng]  // Leaflet format
  };
}

/**
 * Convert GeoJSON LineString coordinates to Leaflet format
 * GeoJSON: [[lng, lat], ...] → Leaflet: [[lat, lng], ...]
 */
function parseLineStringCoords(coords) {
  const leafletCoords = coords.map(([lng, lat]) => [lat, lng]);
  return {
    type: 'LineString',
    coordinates: leafletCoords
  };
}

/**
 * Convert GeoJSON Polygon coordinates to Leaflet format
 * GeoJSON: [[[lng, lat], ...], ...] → Leaflet: [[[lat, lng], ...], ...]
 */
function parsePolygonCoords(coords) {
  const leafletCoords = coords.map(ring =>
    ring.map(([lng, lat]) => [lat, lng])
  );
  return {
    type: 'Polygon',
    coordinates: leafletCoords
  };
}

/**
 * Convert GeoJSON MultiPoint coordinates to Leaflet format
 */
function parseMultiPointCoords(coords) {
  const leafletCoords = coords.map(([lng, lat]) => [lat, lng]);
  return {
    type: 'MultiPoint',
    coordinates: leafletCoords
  };
}

/**
 * Convert GeoJSON MultiLineString coordinates to Leaflet format
 */
function parseMultiLineStringCoords(coords) {
  const leafletCoords = coords.map(lineString =>
    lineString.map(([lng, lat]) => [lat, lng])
  );
  return {
    type: 'MultiLineString',
    coordinates: leafletCoords
  };
}

/**
 * Convert GeoJSON MultiPolygon coordinates to Leaflet format
 */
function parseMultiPolygonCoords(coords) {
  const leafletCoords = coords.map(polygon =>
    polygon.map(ring =>
      ring.map(([lng, lat]) => [lat, lng])
    )
  );
  return {
    type: 'MultiPolygon',
    coordinates: leafletCoords
  };
}

/**
 * Calculate bounding box from GeoJSON string
 * @param {string} geoJSONString - GeoJSON string from ST_AsGeoJSON
 * @returns {Object|null} { minLat, maxLat, minLng, maxLng }
 */
export function calculateBoundsFromGeoJSON(geoJSONString) {
  const parsed = parseGeoJSON(geoJSONString);

  if (!parsed.coordinates || parsed.coordinates.length === 0) {
    return null;
  }

  const allCoords = flattenCoordinates(parsed.coordinates);

  const lats = allCoords.map(c => c[0]);
  const lngs = allCoords.map(c => c[1]);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
}

/**
 * Flatten nested coordinate arrays
 */
function flattenCoordinates(coords, depth = 0) {
  if (depth > 10) return [];  // Safety limit

  const result = [];

  for (const item of coords) {
    if (Array.isArray(item[0])) {
      // Still nested, continue recursion
      result.push(...flattenCoordinates(item, depth + 1));
    } else if (typeof item[0] === 'number' && typeof item[1] === 'number') {
      // It's a coordinate [lat, lng] in Leaflet format
      result.push(item);
    }
  }

  return result;
}
