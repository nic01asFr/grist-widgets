/**
 * OSM OVERPASS API SERVICE
 *
 * Service pour interroger OpenStreetMap via l'API Overpass
 * Documentation: https://wiki.openstreetmap.org/wiki/Overpass_API
 *
 * Endpoint: https://overpass-api.de/api/interpreter
 * Format: Overpass QL
 * Output: GeoJSON
 */

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Construire une requête Overpass QL
 *
 * @param {string} query - Requête Overpass QL
 * @returns {string} URL encodée
 */
function buildOverpassQuery(query) {
  return `${OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;
}

/**
 * Convertir bbox [minLon, minLat, maxLon, maxLat] en format Overpass (south,west,north,east)
 */
function bboxToOverpass(bbox) {
  if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
    return null;
  }
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return `${minLat},${minLon},${maxLat},${maxLon}`;
}

/**
 * Interroger les bâtiments OSM
 *
 * @param {Object} options - Options de requête
 * @param {Array<number>} options.bbox - [minLon, minLat, maxLon, maxLat]
 * @param {number} options.limit - Limite de résultats (via timeout/maxsize)
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryBuildings(options = {}) {
  const bboxStr = bboxToOverpass(options.bbox);

  if (!bboxStr) {
    return {
      success: false,
      error: 'Bbox is required for OSM queries',
      data: null
    };
  }

  // Overpass QL query pour buildings
  const query = `
[out:json][timeout:25];
(
  way["building"](${bboxStr});
  relation["building"](${bboxStr});
);
out geom;
  `.trim();

  return executeQuery(query, 'buildings');
}

/**
 * Interroger les routes OSM
 *
 * @param {Object} options - Options de requête
 * @param {Array<number>} options.bbox - [minLon, minLat, maxLon, maxLat]
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryRoads(options = {}) {
  const bboxStr = bboxToOverpass(options.bbox);

  if (!bboxStr) {
    return {
      success: false,
      error: 'Bbox is required for OSM queries',
      data: null
    };
  }

  // Overpass QL query pour highways (routes)
  const query = `
[out:json][timeout:25];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service)$"](${bboxStr});
);
out geom;
  `.trim();

  return executeQuery(query, 'roads');
}

/**
 * Interroger les POIs (Points of Interest) OSM
 *
 * @param {Object} options - Options de requête
 * @param {Array<number>} options.bbox - [minLon, minLat, maxLon, maxLat]
 * @param {string} options.amenity - Type d'amenity (optionnel: restaurant, cafe, hospital, etc.)
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryPOIs(options = {}) {
  const bboxStr = bboxToOverpass(options.bbox);

  if (!bboxStr) {
    return {
      success: false,
      error: 'Bbox is required for OSM queries',
      data: null
    };
  }

  const amenityFilter = options.amenity ? `["amenity"="${options.amenity}"]` : '["amenity"]';

  // Overpass QL query pour POIs
  const query = `
[out:json][timeout:25];
(
  node${amenityFilter}(${bboxStr});
  way${amenityFilter}(${bboxStr});
);
out center;
  `.trim();

  return executeQuery(query, 'POIs');
}

/**
 * Exécuter une requête Overpass QL et convertir en GeoJSON
 *
 * @param {string} query - Requête Overpass QL
 * @param {string} label - Label pour les logs
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
async function executeQuery(query, label = 'query') {
  const url = buildOverpassQuery(query);

  console.log(`🌐 OSM Overpass ${label}:`, query.substring(0, 100) + '...');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const osmJson = await response.json();

    // Convertir OSM JSON en GeoJSON
    const geojson = convertOSMToGeoJSON(osmJson);

    console.log(`✅ OSM returned ${geojson.features.length} features`);

    return {
      success: true,
      data: geojson,
      count: geojson.features.length
    };
  } catch (error) {
    console.error(`OSM ${label} error:`, error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Convertir réponse OSM Overpass JSON en GeoJSON
 *
 * @param {Object} osmData - Données OSM format JSON
 * @returns {Object} GeoJSON FeatureCollection
 */
function convertOSMToGeoJSON(osmData) {
  if (!osmData || !osmData.elements) {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  const features = osmData.elements.map(element => {
    let geometry = null;

    // Node (point)
    if (element.type === 'node' && element.lat && element.lon) {
      geometry = {
        type: 'Point',
        coordinates: [element.lon, element.lat]
      };
    }

    // Way (linestring or polygon)
    if (element.type === 'way' && element.geometry) {
      const coords = element.geometry.map(node => [node.lon, node.lat]);

      // Si premier et dernier point identiques + building tag → Polygon
      if (
        coords.length > 3 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1] &&
        element.tags && element.tags.building
      ) {
        geometry = {
          type: 'Polygon',
          coordinates: [coords]
        };
      } else {
        geometry = {
          type: 'LineString',
          coordinates: coords
        };
      }
    }

    // Relation (multipolygon) - utiliser center si disponible
    if (element.type === 'relation' && element.center) {
      geometry = {
        type: 'Point',
        coordinates: [element.center.lon, element.center.lat]
      };
    }

    // Properties from tags
    const properties = {
      osm_id: element.id,
      osm_type: element.type,
      ...(element.tags || {})
    };

    // Normaliser le nom
    if (properties.name) {
      properties.nom = properties.name;
    }

    return {
      type: 'Feature',
      id: element.id,
      geometry,
      properties
    };
  }).filter(feature => feature.geometry !== null); // Filtrer features sans géométrie

  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * Requête générique Overpass QL
 *
 * @param {string} overpassQL - Requête Overpass QL complète
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function customQuery(overpassQL) {
  return executeQuery(overpassQL, 'custom');
}

/**
 * Exemples de bbox
 */
export const BBOX_PARIS = [2.224, 48.815, 2.469, 48.902];
export const BBOX_LYON = [4.767, 45.707, 4.899, 45.808];
export const BBOX_MARSEILLE = [5.280, 43.230, 5.480, 43.380];

/**
 * Bbox par défaut pour tests (petit secteur Paris 15e)
 */
export const BBOX_DEFAULT = [2.280, 48.835, 2.310, 48.855];
