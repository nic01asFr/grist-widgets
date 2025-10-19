/**
 * IGN GÉOPLATEFORME SERVICE
 *
 * Service pour interroger les données IGN via WFS (Géoplateforme)
 * Documentation: https://geoservices.ign.fr/services-geoplateforme-diffusion
 *
 * Endpoint WFS: https://data.geopf.fr/wfs/ows
 * Version: 2.0.0
 * Rate limit: 30 req/s
 */

const IGN_WFS_BASE_URL = 'https://data.geopf.fr/wfs/ows';

/**
 * Mapping des datasets vers TypeNames WFS
 */
const DATASET_TO_TYPENAME = {
  'BDTOPO_V3:batiment': 'BDTOPO_V3:batiment',
  'BDTOPO_V3:troncon_de_route': 'BDTOPO_V3:troncon_de_route',
  'BDTOPO_V3:commune': 'BDTOPO_V3:commune',
  'BDTOPO_V3:cours_d_eau': 'BDTOPO_V3:cours_d_eau',
  'BDTOPO_V3:troncon_hydrographique': 'BDTOPO_V3:troncon_hydrographique'
};

/**
 * Construire une requête WFS GetFeature
 */
function buildWFSQuery(typename, options = {}) {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: typename,
    OUTPUTFORMAT: 'application/json', // GeoJSON output
    SRSNAME: 'EPSG:4326' // WGS84
  });

  // Limite de résultats (COUNT en WFS 2.0)
  if (options.limit) {
    params.set('COUNT', options.limit.toString());
  }

  // Bounding box (BBOX)
  if (options.bbox && Array.isArray(options.bbox) && options.bbox.length === 4) {
    const [minLon, minLat, maxLon, maxLat] = options.bbox;
    params.set('BBOX', `${minLat},${minLon},${maxLat},${maxLon},EPSG:4326`);
  }

  // Filtres CQL (optionnel)
  if (options.cqlFilter) {
    params.set('CQL_FILTER', options.cqlFilter);
  }

  return `${IGN_WFS_BASE_URL}?${params.toString()}`;
}

/**
 * Récupérer les capacités du service WFS
 */
export async function getCapabilities() {
  const url = `${IGN_WFS_BASE_URL}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    return { success: true, data: xml };
  } catch (error) {
    console.error('IGN GetCapabilities error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Interroger un dataset IGN
 *
 * @param {string} datasetId - ID du dataset (ex: "BDTOPO_V3:batiment")
 * @param {Object} options - Options de requête
 * @param {Array<number>} options.bbox - [minLon, minLat, maxLon, maxLat]
 * @param {number} options.limit - Nombre max de features (default: 100)
 * @param {string} options.cqlFilter - Filtre CQL optionnel
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryDataset(datasetId, options = {}) {
  const typename = DATASET_TO_TYPENAME[datasetId] || datasetId;

  const url = buildWFSQuery(typename, {
    limit: options.limit || 100,
    bbox: options.bbox,
    cqlFilter: options.cqlFilter
  });

  console.log('🇫🇷 IGN WFS Query:', url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const geojson = await response.json();

    // Vérifier que c'est bien du GeoJSON
    if (!geojson || geojson.type !== 'FeatureCollection') {
      throw new Error('Response is not a valid GeoJSON FeatureCollection');
    }

    console.log(`✅ IGN returned ${geojson.features.length} features`);

    return {
      success: true,
      data: geojson,
      count: geojson.features.length
    };
  } catch (error) {
    console.error('IGN query error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Interroger les bâtiments (BDTOPO V3)
 *
 * @param {Object} options - Options de requête
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryBatiments(options = {}) {
  return queryDataset('BDTOPO_V3:batiment', options);
}

/**
 * Interroger les routes (BDTOPO V3)
 *
 * @param {Object} options - Options de requête
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryRoutes(options = {}) {
  return queryDataset('BDTOPO_V3:troncon_de_route', options);
}

/**
 * Interroger les communes (BDTOPO V3)
 *
 * @param {Object} options - Options de requête
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryCommunes(options = {}) {
  return queryDataset('BDTOPO_V3:commune', options);
}

/**
 * Interroger l'hydrographie (BDTOPO V3)
 *
 * @param {Object} options - Options de requête
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function queryHydrographie(options = {}) {
  return queryDataset('BDTOPO_V3:cours_d_eau', options);
}

/**
 * Exemple de bbox pour Paris
 * [minLon, minLat, maxLon, maxLat]
 */
export const BBOX_PARIS = [2.224, 48.815, 2.469, 48.902];

/**
 * Exemple de bbox pour Lyon
 */
export const BBOX_LYON = [4.767, 45.707, 4.899, 45.808];

/**
 * Exemple de bbox pour Marseille
 */
export const BBOX_MARSEILLE = [5.280, 43.230, 5.480, 43.380];
