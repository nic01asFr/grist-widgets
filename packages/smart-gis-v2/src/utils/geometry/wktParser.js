/**
 * WKT Parser - Parse WKT → Leaflet coordinates
 *
 * Formats supported:
 * - POINT(lng lat)
 * - LINESTRING(lng lat, lng lat, ...)
 * - POLYGON((lng lat, lng lat, ...))
 * - MULTIPOINT, MULTILINESTRING, MULTIPOLYGON
 *
 * IMPORTANT: WKT uses (longitude latitude)
 *            Leaflet uses [latitude, longitude]
 */

export function parseWKT(wkt) {
  if (!wkt || typeof wkt !== 'string') {
    return { type: null, coordinates: [] };
  }

  try {
    // Remove SRID if present
    let cleanWkt = wkt;
    if (wkt.includes('SRID=')) {
      cleanWkt = wkt.split(';')[1];
    }

    // Detect geometry type
    const typeMatch = cleanWkt.match(/^([A-Z]+)/i);
    if (!typeMatch) return { type: null, coordinates: [] };

    const type = typeMatch[1].toUpperCase();

    // Extract content between parentheses
    const coordsString = cleanWkt
      .replace(/^[A-Z]+\s*\(/i, '')
      .replace(/\)$/, '');

    switch (type) {
      case 'POINT':
        return parsePoint(coordsString);

      case 'LINESTRING':
        return parseLineString(coordsString);

      case 'POLYGON':
        return parsePolygon(coordsString);

      case 'MULTIPOINT':
        return parseMultiPoint(coordsString);

      case 'MULTILINESTRING':
        return parseMultiLineString(coordsString);

      case 'MULTIPOLYGON':
        return parseMultiPolygon(coordsString);

      default:
        console.warn(`Unsupported geometry type: ${type}`);
        return { type: null, coordinates: [] };
    }

  } catch (error) {
    console.error('WKT parsing error:', error, wkt);
    return { type: null, coordinates: [] };
  }
}

function parsePoint(coordsString) {
  const [lng, lat] = coordsString.trim().split(/\s+/).map(Number);
  return {
    type: 'Point',
    coordinates: [lat, lng]  // Leaflet: [lat, lng]
  };
}

function parseLineString(coordsString) {
  const coords = coordsString.split(',').map(pair => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lat, lng];
  });

  return {
    type: 'LineString',
    coordinates: coords
  };
}

function parsePolygon(coordsString) {
  // Polygon can have multiple rings (outer + holes)
  const rings = coordsString.split('),(').map(ring => {
    const cleaned = ring.replace(/^\(|\)$/g, '');
    return cleaned.split(',').map(pair => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lat, lng];
    });
  });

  return {
    type: 'Polygon',
    coordinates: rings
  };
}

function parseMultiPoint(coordsString) {
  const points = coordsString.split(',').map(point => {
    const cleaned = point.replace(/[()]/g, '').trim();
    const [lng, lat] = cleaned.split(/\s+/).map(Number);
    return [lat, lng];
  });

  return {
    type: 'MultiPoint',
    coordinates: points
  };
}

function parseMultiLineString(coordsString) {
  const lines = coordsString.split('),(').map(line => {
    const cleaned = line.replace(/^\(|\)$/g, '');
    return cleaned.split(',').map(pair => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lat, lng];
    });
  });

  return {
    type: 'MultiLineString',
    coordinates: lines
  };
}

function parseMultiPolygon(coordsString) {
  // MultiPolygon: (((ring1)), ((ring2)))
  const polygons = coordsString.split(')),((').map(polygon => {
    const rings = polygon.replace(/^\(+|\)+$/g, '').split('),(');
    return rings.map(ring => {
      return ring.split(',').map(pair => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lat, lng];
      });
    });
  });

  return {
    type: 'MultiPolygon',
    coordinates: polygons
  };
}

/**
 * Extract SRID from EWKT
 */
export function extractSRID(wkt) {
  if (!wkt || !wkt.includes('SRID=')) {
    return 4326;  // Default WGS84
  }

  const match = wkt.match(/SRID=(\d+);/);
  return match ? parseInt(match[1]) : 4326;
}

/**
 * Calculate bounding box from WKT
 */
export function calculateBounds(wkt) {
  const parsed = parseWKT(wkt);
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

function flattenCoordinates(coords, depth = 0) {
  if (depth > 10) return [];  // Safety recursion

  const result = [];

  for (const item of coords) {
    if (Array.isArray(item[0])) {
      // Still arrays, continue recursion
      result.push(...flattenCoordinates(item, depth + 1));
    } else if (typeof item[0] === 'number' && typeof item[1] === 'number') {
      // It's a coordinate [lat, lng]
      result.push(item);
    }
  }

  return result;
}
