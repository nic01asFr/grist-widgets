/**
 * Import Methods Configuration
 *
 * Defines all supported import methods with their parameters,
 * validation rules, and processing logic.
 */

import { geoJSONToWKT } from '../utils/geometryConverters';

/**
 * Pagination helper for IGN WFS (max 5000 features per request)
 * @param {string} baseUrl - Base WFS URL with all parameters except startIndex
 * @param {number} maxTotal - Maximum total features to retrieve
 * @param {number} pageSize - Features per request (max 5000)
 * @returns {Promise<Array>} All features combined
 */
async function fetchWithPagination(baseUrl, maxTotal = 10000, pageSize = 5000) {
  const allFeatures = [];
  let startIndex = 0;
  let hasMore = true;

  console.log(`[Pagination] Starting paginated fetch (max ${maxTotal} features, ${pageSize} per page)`);

  while (hasMore && allFeatures.length < maxTotal) {
    // Add startIndex parameter
    const url = `${baseUrl}&startIndex=${startIndex}`;

    console.log(`[Pagination] Fetching page ${Math.floor(startIndex / pageSize) + 1} (startIndex=${startIndex})...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur IGN (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const geojson = await response.json();

      if (!geojson.features || geojson.features.length === 0) {
        // No more features
        hasMore = false;
        console.log(`[Pagination] No more features at startIndex=${startIndex}`);
        break;
      }

      allFeatures.push(...geojson.features);
      console.log(`[Pagination] Received ${geojson.features.length} features (total so far: ${allFeatures.length})`);

      // If we got less than pageSize, there are no more features
      if (geojson.features.length < pageSize) {
        hasMore = false;
        console.log(`[Pagination] Last page (received ${geojson.features.length} < ${pageSize})`);
        break;
      }

      startIndex += pageSize;

      // Small delay to respect API rate limits (30 req/s = ~33ms between requests)
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error(`[Pagination] Error at startIndex=${startIndex}:`, error);
      throw error;
    }
  }

  console.log(`[Pagination] Complete! Total features: ${allFeatures.length}`);
  return allFeatures;
}

export const IMPORT_METHODS = {
  geojson: {
    id: 'geojson',
    label: 'GeoJSON',
    icon: '📦',
    description: 'Importer un fichier GeoJSON standard',
    color: '#10b981',

    accepts: '.geojson,.json',
    maxSize: 10 * 1024 * 1024, // 10MB

    steps: [
      {
        id: 'upload',
        label: 'Sélectionner le fichier',
        component: 'FileUpload'
      },
      {
        id: 'preview',
        label: 'Aperçu',
        component: 'PreviewData'
      },
      {
        id: 'config',
        label: 'Configuration',
        component: 'ImportConfig',
        fields: [
          {
            name: 'layer_name',
            label: 'Nom du layer',
            type: 'text',
            required: true,
            defaultValue: 'Import GeoJSON'
          },
          {
            name: 'target_srid',
            label: 'Système de coordonnées cible',
            type: 'choice',
            options: [
              { value: '4326', label: 'WGS84 (4326)' },
              { value: '2154', label: 'Lambert93 (2154)' },
              { value: '3857', label: 'Web Mercator (3857)' }
            ],
            defaultValue: '4326'
          }
        ]
      }
    ],

    validate: (file) => {
      if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };
      if (!file.name.match(/\.(geojson|json)$/i)) {
        return { valid: false, error: 'Format invalide. Attendu: .geojson ou .json' };
      }
      if (file.size > 10 * 1024 * 1024) {
        return { valid: false, error: 'Fichier trop volumineux (max 10MB)' };
      }
      return { valid: true };
    },

    parse: async (file) => {
      const text = await file.text();
      const geojson = JSON.parse(text);

      if (!geojson.type || (geojson.type !== 'FeatureCollection' && geojson.type !== 'Feature')) {
        throw new Error('GeoJSON invalide: doit être Feature ou FeatureCollection');
      }

      const features = geojson.type === 'FeatureCollection'
        ? geojson.features
        : [geojson];

      return features.map((feature, idx) => {
        // Convert GeoJSON geometry to WKT format
        const wkt = geoJSONToWKT(feature.geometry);
        if (!wkt) {
          console.warn(`[GeoJSON Import] Failed to convert geometry for feature ${idx}`);
        }
        return {
          geometry: wkt,  // WKT format for geometry_wgs84 column
          properties: feature.properties || {},
          feature_index: idx
        };
      });
    }
  },

  csv_latlon: {
    id: 'csv_latlon',
    label: 'CSV (Lat/Lon)',
    icon: '📊',
    description: 'Importer un CSV avec colonnes latitude/longitude',
    color: '#3b82f6',

    accepts: '.csv,.txt',
    maxSize: 5 * 1024 * 1024, // 5MB

    steps: [
      {
        id: 'upload',
        label: 'Sélectionner le fichier',
        component: 'FileUpload'
      },
      {
        id: 'mapping',
        label: 'Mapper les colonnes',
        component: 'ColumnMapping',
        fields: [
          {
            name: 'lat_column',
            label: 'Colonne Latitude',
            type: 'column_select',
            required: true
          },
          {
            name: 'lon_column',
            label: 'Colonne Longitude',
            type: 'column_select',
            required: true
          },
          {
            name: 'name_column',
            label: 'Colonne Nom (optionnel)',
            type: 'column_select',
            required: false
          }
        ]
      },
      {
        id: 'preview',
        label: 'Aperçu',
        component: 'PreviewData'
      },
      {
        id: 'config',
        label: 'Configuration',
        component: 'ImportConfig',
        fields: [
          {
            name: 'layer_name',
            label: 'Nom du layer',
            type: 'text',
            required: true,
            defaultValue: 'Import CSV'
          },
          {
            name: 'delimiter',
            label: 'Séparateur',
            type: 'choice',
            options: [
              { value: ',', label: 'Virgule (,)' },
              { value: ';', label: 'Point-virgule (;)' },
              { value: '\t', label: 'Tabulation' }
            ],
            defaultValue: ','
          }
        ]
      }
    ],

    validate: (file) => {
      if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };
      if (!file.name.match(/\.(csv|txt)$/i)) {
        return { valid: false, error: 'Format invalide. Attendu: .csv ou .txt' };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { valid: false, error: 'Fichier trop volumineux (max 5MB)' };
      }
      return { valid: true };
    },

    parse: async (file, config) => {
      const text = await file.text();
      const delimiter = config.delimiter || ',';
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV vide ou invalide');
      }

      // Parse header
      const headers = lines[0].split(delimiter).map(h => h.trim());

      // Parse rows
      const rows = lines.slice(1).map(line => {
        const values = line.split(delimiter);
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim() || '';
        });
        return row;
      });

      // Convert to points
      const latCol = config.lat_column;
      const lonCol = config.lon_column;

      if (!headers.includes(latCol) || !headers.includes(lonCol)) {
        throw new Error('Colonnes lat/lon introuvables dans le CSV');
      }

      return rows.map((row, idx) => {
        const lat = parseFloat(row[latCol]);
        const lon = parseFloat(row[lonCol]);

        if (isNaN(lat) || isNaN(lon)) {
          throw new Error(`Ligne ${idx + 2}: coordonnées invalides`);
        }

        return {
          geometry: `POINT(${lon} ${lat})`,
          properties: row,
          feature_index: idx
        };
      });
    }
  },

  csv_wkt: {
    id: 'csv_wkt',
    label: 'CSV (WKT)',
    icon: '📄',
    description: 'Importer un CSV avec colonne WKT/EWKT',
    color: '#8b5cf6',

    accepts: '.csv,.txt',
    maxSize: 5 * 1024 * 1024, // 5MB

    steps: [
      {
        id: 'upload',
        label: 'Sélectionner le fichier',
        component: 'FileUpload'
      },
      {
        id: 'mapping',
        label: 'Mapper les colonnes',
        component: 'ColumnMapping',
        fields: [
          {
            name: 'wkt_column',
            label: 'Colonne WKT',
            type: 'column_select',
            required: true
          },
          {
            name: 'name_column',
            label: 'Colonne Nom (optionnel)',
            type: 'column_select',
            required: false
          }
        ]
      },
      {
        id: 'preview',
        label: 'Aperçu',
        component: 'PreviewData'
      },
      {
        id: 'config',
        label: 'Configuration',
        component: 'ImportConfig',
        fields: [
          {
            name: 'layer_name',
            label: 'Nom du layer',
            type: 'text',
            required: true,
            defaultValue: 'Import CSV WKT'
          },
          {
            name: 'delimiter',
            label: 'Séparateur',
            type: 'choice',
            options: [
              { value: ',', label: 'Virgule (,)' },
              { value: ';', label: 'Point-virgule (;)' },
              { value: '\t', label: 'Tabulation' }
            ],
            defaultValue: ','
          }
        ]
      }
    ],

    validate: (file) => {
      if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };
      if (!file.name.match(/\.(csv|txt)$/i)) {
        return { valid: false, error: 'Format invalide. Attendu: .csv ou .txt' };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { valid: false, error: 'Fichier trop volumineux (max 5MB)' };
      }
      return { valid: true };
    },

    parse: async (file, config) => {
      const text = await file.text();
      const delimiter = config.delimiter || ',';
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV vide ou invalide');
      }

      // Parse header
      const headers = lines[0].split(delimiter).map(h => h.trim());

      // Parse rows
      const rows = lines.slice(1).map(line => {
        const values = line.split(delimiter);
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim() || '';
        });
        return row;
      });

      // Extract WKT
      const wktCol = config.wkt_column;

      if (!headers.includes(wktCol)) {
        throw new Error('Colonne WKT introuvable dans le CSV');
      }

      return rows.map((row, idx) => {
        const wkt = row[wktCol];

        if (!wkt || !wkt.match(/^(SRID=\d+;)?(POINT|LINESTRING|POLYGON|MULTI)/i)) {
          throw new Error(`Ligne ${idx + 2}: WKT invalide`);
        }

        return {
          geometry: wkt,
          properties: row,
          feature_index: idx
        };
      });
    }
  },

  ign_geoplateforme: {
    id: 'ign_geoplateforme',
    label: 'IGN Géoplateforme',
    icon: '🇫🇷',
    description: 'Données géographiques officielles françaises (IGN)',
    color: '#0ea5e9',

    // Enable dynamic field discovery and filtering
    supportsDynamicFilters: true,
    wfsServiceUrl: 'https://data.geopf.fr/wfs',

    steps: [
      {
        id: 'config',
        label: 'Configuration',
        component: 'ImportConfig',
        fields: [
          {
            name: 'ign_layer',
            label: 'Couche IGN',
            type: 'choice',
            required: true,
            options: [
              { value: 'BDTOPO_V3:commune', label: '🏘️ Communes' },
              { value: 'BDTOPO_V3:departement', label: '🗺️ Départements' },
              { value: 'BDTOPO_V3:region', label: '🌍 Régions' },
              { value: 'ADMINEXPRESS-COG-CARTO.LATEST:arrondissement', label: '🏙️ Arrondissements' },
              { value: 'BDTOPO_V3:batiment', label: '🏢 Bâtiments' },
              { value: 'BDTOPO_V3:troncon_de_route', label: '🛣️ Routes' },
              { value: 'BDTOPO_V3:troncon_hydrographique', label: '💧 Cours d\'eau' },
              { value: 'BDTOPO_V3:zone_de_vegetation', label: '🌳 Végétation' }
            ],
            defaultValue: 'BDTOPO_V3:commune'
          },
          {
            name: 'filter_mode',
            label: 'Mode de filtrage',
            type: 'choice',
            options: [
              { value: 'all', label: 'Tout (aucun filtre)' },
              { value: 'name', label: 'Par nom (recherche texte)' },
              { value: 'territory', label: 'Par territoire (codes INSEE)' },
              { value: 'bbox', label: 'Par zone géographique (BBOX)' },
              { value: 'advanced', label: 'Filtrage avancé (CQL)' }
            ],
            defaultValue: 'name',
            help: 'Sélectionnez comment filtrer les résultats'
          },
          {
            name: 'search_text',
            label: '📝 Recherche par nom',
            type: 'text',
            placeholder: 'Ex: Paris, Lyon, Île-de-France...',
            help: 'Pour filter_mode=name uniquement'
          },
          {
            name: 'region_code',
            label: '🗺️ Code région INSEE (2 chiffres)',
            type: 'text',
            placeholder: 'Ex: 11 (Île-de-France), 84 (AURA), 93 (PACA)...',
            help: 'Pour filter_mode=territory. Ex: 11=IdF, 84=AURA, 93=PACA'
          },
          {
            name: 'departement_code',
            label: '🏛️ Code département INSEE (2-3 chiffres)',
            type: 'text',
            placeholder: 'Ex: 75 (Paris), 69 (Rhône), 13 (Bouches-du-Rhône)...',
            help: 'Pour filter_mode=territory. Filtrera par département'
          },
          {
            name: 'commune_code',
            label: '🏘️ Code commune INSEE (5 chiffres)',
            type: 'text',
            placeholder: 'Ex: 75056 (Paris), 69123 (Lyon), 13055 (Marseille)...',
            help: 'Pour filter_mode=territory. Code INSEE complet de la commune'
          },
          {
            name: 'bbox',
            label: '📐 BBOX (ouest,sud,est,nord)',
            type: 'text',
            placeholder: 'Ex: 2.2,48.8,2.4,48.9 (Paris)',
            help: 'Pour filter_mode=bbox. Format: minX,minY,maxX,maxY en WGS84'
          },
          {
            name: 'cql_filter',
            label: '⚙️ Filtre CQL personnalisé',
            type: 'text',
            placeholder: 'Ex: population > 100000 AND nom LIKE \'%ville%\'',
            help: 'Pour filter_mode=advanced. Filtre CQL_FILTER complet'
          },
          {
            name: 'sort_by',
            label: '↕️ Trier par',
            type: 'choice',
            options: [
              { value: '', label: 'Pas de tri (ordre par défaut)' },
              { value: 'nom A', label: 'Nom (A→Z)' },
              { value: 'nom D', label: 'Nom (Z→A)' },
              { value: 'population D', label: 'Population (décroissant)' },
              { value: 'population A', label: 'Population (croissant)' },
              { value: 'superficie D', label: 'Superficie (décroissant)' },
              { value: 'superficie A', label: 'Superficie (croissant)' }
            ],
            defaultValue: '',
            help: 'Ordre de tri des résultats (si la couche a ces attributs)'
          },
          {
            name: 'max_features',
            label: 'Nombre max de résultats',
            type: 'number',
            min: 1,
            max: 50000,
            defaultValue: 1000,
            help: 'Si > 5000, utilisera la pagination automatique (plusieurs requêtes)'
          },
          {
            name: 'layer_name',
            label: 'Nom du layer dans Grist',
            type: 'text',
            required: true,
            defaultValue: 'Import IGN'
          }
        ]
      },
      {
        id: 'preview',
        label: 'Aperçu',
        component: 'PreviewData'
      }
    ],

    validate: (config) => {
      if (!config.ign_layer) {
        return { valid: false, error: 'Aucune couche sélectionnée' };
      }
      return { valid: true };
    },

    fetch: async (config) => {
      const {
        ign_layer,
        filter_mode = 'name',
        search_text,
        region_code,
        departement_code,
        commune_code,
        bbox,
        cql_filter,
        sort_by,
        max_features
      } = config;

      const requestedFeatures = max_features || 1000;
      const pageSize = 5000; // IGN WFS max per request

      // Build WFS request (without startIndex, will be added by pagination helper)
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: ign_layer,
        outputFormat: 'application/json',
        count: pageSize
      });

      // Build CQL filter based on mode
      let finalCqlFilter = null;

      if (filter_mode === 'name' && search_text && search_text.trim()) {
        // Simple name search
        const escapedText = search_text.replace(/'/g, "''");
        finalCqlFilter = `nom LIKE '%${escapedText}%'`;
      }
      else if (filter_mode === 'territory') {
        // Hierarchical territory filtering by INSEE codes
        const territoryFilters = [];

        if (commune_code && commune_code.trim()) {
          territoryFilters.push(`insee_com = '${commune_code.trim()}'`);
        } else if (departement_code && departement_code.trim()) {
          territoryFilters.push(`insee_dep = '${departement_code.trim()}'`);
        } else if (region_code && region_code.trim()) {
          territoryFilters.push(`insee_reg = '${region_code.trim()}'`);
        }

        if (territoryFilters.length > 0) {
          finalCqlFilter = territoryFilters.join(' AND ');
        }
      }
      else if (filter_mode === 'bbox' && bbox && bbox.trim()) {
        // BBOX filtering (must be in CQL format for WFS 2.0.0)
        const bboxParts = bbox.trim().split(',').map(s => s.trim());
        if (bboxParts.length === 4) {
          const [minX, minY, maxX, maxY] = bboxParts;
          finalCqlFilter = `BBOX(geometry, ${minX}, ${minY}, ${maxX}, ${maxY}, 'EPSG:4326')`;
        }
      }
      else if (filter_mode === 'advanced' && cql_filter && cql_filter.trim()) {
        // Custom CQL filter
        finalCqlFilter = cql_filter.trim();
      }

      // Add CQL filter if present
      if (finalCqlFilter) {
        params.append('cql_filter', finalCqlFilter);
      }

      // Add sortBy if specified
      if (sort_by && sort_by.trim()) {
        params.append('sortBy', sort_by.trim());
      }

      const baseUrl = `https://data.geopf.fr/wfs?${params.toString()}`;

      console.log('[IGN Advanced] Base URL:', baseUrl);
      console.log('[IGN Advanced] Filter mode:', filter_mode, '| CQL:', finalCqlFilter);
      console.log('[IGN Advanced] Requested features:', requestedFeatures, '| Will use pagination:', requestedFeatures > pageSize);

      // Fetch data (with pagination if needed)
      let allFeatures;

      if (requestedFeatures > pageSize) {
        // Use pagination
        allFeatures = await fetchWithPagination(baseUrl, requestedFeatures, pageSize);
      } else {
        // Single request
        const response = await fetch(baseUrl);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur IGN (${response.status}): ${errorText.substring(0, 200)}`);
        }

        const geojson = await response.json();
        allFeatures = geojson.features || [];
      }

      if (allFeatures.length === 0) {
        throw new Error('Aucune donnée trouvée. Vérifiez vos filtres ou essayez sans filtre.');
      }

      console.log(`[IGN Advanced] Total features received: ${allFeatures.length}`);

      return allFeatures.map((feature, idx) => {
        const wkt = geoJSONToWKT(feature.geometry);
        if (!wkt) {
          console.warn(`[IGN Import] Failed to convert geometry for feature ${idx}`);
        }
        return {
          geometry: wkt,
          properties: feature.properties || {},
          feature_index: idx
        };
      });
    }
  },

  ign_admin_light: {
    id: 'ign_admin_light',
    label: 'IGN Admin (Optimisé)',
    icon: '🇫🇷⚡',
    description: 'Limites administratives légères - 95% plus petit que BDTOPO!',
    color: '#10b981',

    steps: [
      {
        id: 'config',
        label: 'Configuration',
        component: 'ImportConfig',
        fields: [
          {
            name: 'admin_level',
            label: 'Niveau administratif',
            type: 'choice',
            required: true,
            options: [
              { value: 'region', label: '🗺️ Régions (18) - ~8 MB au lieu de 178 MB!' },
              { value: 'departement', label: '🏛️ Départements (101)' },
              { value: 'commune', label: '🏘️ Communes (35k) - Version simplifiée' },
              { value: 'arrondissement', label: '🏙️ Arrondissements' },
              { value: 'epci', label: '🤝 EPCI (intercommunalités)' }
            ],
            defaultValue: 'region'
          },
          {
            name: 'filter_mode',
            label: 'Mode de filtrage',
            type: 'choice',
            options: [
              { value: 'all', label: 'Tout (aucun filtre)' },
              { value: 'name', label: 'Par nom (recherche texte)' },
              { value: 'territory', label: 'Par territoire (codes INSEE)' },
              { value: 'bbox', label: 'Par zone géographique (BBOX)' }
            ],
            defaultValue: 'name',
            help: 'Sélectionnez comment filtrer les résultats'
          },
          {
            name: 'search_text',
            label: '📝 Recherche par nom',
            type: 'text',
            placeholder: 'Ex: Île-de-France, Bretagne...',
            help: 'Pour filter_mode=name uniquement'
          },
          {
            name: 'region_code',
            label: '🗺️ Code région INSEE (2 chiffres)',
            type: 'text',
            placeholder: 'Ex: 11 (Île-de-France), 84 (AURA), 93 (PACA)...',
            help: 'Pour filter_mode=territory'
          },
          {
            name: 'departement_code',
            label: '🏛️ Code département INSEE (2-3 chiffres)',
            type: 'text',
            placeholder: 'Ex: 75 (Paris), 69 (Rhône), 13 (Bouches-du-Rhône)...',
            help: 'Pour filter_mode=territory'
          },
          {
            name: 'bbox',
            label: '📐 BBOX (ouest,sud,est,nord)',
            type: 'text',
            placeholder: 'Ex: 2.2,48.8,2.4,48.9 (Paris)',
            help: 'Pour filter_mode=bbox. Format: minX,minY,maxX,maxY en WGS84'
          },
          {
            name: 'sort_by',
            label: '↕️ Trier par',
            type: 'choice',
            options: [
              { value: '', label: 'Pas de tri (ordre par défaut)' },
              { value: 'nom A', label: 'Nom (A→Z)' },
              { value: 'nom D', label: 'Nom (Z→A)' },
              { value: 'population D', label: 'Population (décroissant)' },
              { value: 'population A', label: 'Population (croissant)' }
            ],
            defaultValue: '',
            help: 'Ordre de tri des résultats'
          },
          {
            name: 'max_features',
            label: 'Nombre max de résultats',
            type: 'number',
            min: 1,
            max: 50000,
            defaultValue: 1000,
            help: 'Si > 5000, utilisera la pagination automatique (plusieurs requêtes)'
          },
          {
            name: 'layer_name',
            label: 'Nom du layer dans Grist',
            type: 'text',
            required: true,
            defaultValue: 'Import IGN Light'
          }
        ]
      },
      {
        id: 'preview',
        label: 'Aperçu',
        component: 'PreviewData'
      }
    ],

    validate: (config) => {
      if (!config.admin_level) {
        return { valid: false, error: 'Aucun niveau administratif sélectionné' };
      }
      return { valid: true };
    },

    fetch: async (config) => {
      const {
        admin_level,
        filter_mode = 'name',
        search_text,
        region_code,
        departement_code,
        bbox,
        sort_by,
        max_features
      } = config;

      const requestedFeatures = max_features || 1000;
      const pageSize = 5000; // IGN WFS max per request

      // Build WFS request for COG-CARTO (lightweight version)
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: `ADMINEXPRESS-COG-CARTO.LATEST:${admin_level}`,
        outputFormat: 'application/json',
        count: pageSize
      });

      // Build CQL filter based on mode
      let finalCqlFilter = null;

      if (filter_mode === 'name' && search_text && search_text.trim()) {
        const escapedText = search_text.replace(/'/g, "''");
        finalCqlFilter = `nom LIKE '%${escapedText}%'`;
      }
      else if (filter_mode === 'territory') {
        const territoryFilters = [];

        if (departement_code && departement_code.trim()) {
          territoryFilters.push(`insee_dep = '${departement_code.trim()}'`);
        } else if (region_code && region_code.trim()) {
          territoryFilters.push(`insee_reg = '${region_code.trim()}'`);
        }

        if (territoryFilters.length > 0) {
          finalCqlFilter = territoryFilters.join(' AND ');
        }
      }
      else if (filter_mode === 'bbox' && bbox && bbox.trim()) {
        const bboxParts = bbox.trim().split(',').map(s => s.trim());
        if (bboxParts.length === 4) {
          const [minX, minY, maxX, maxY] = bboxParts;
          finalCqlFilter = `BBOX(geometry, ${minX}, ${minY}, ${maxX}, ${maxY}, 'EPSG:4326')`;
        }
      }

      // Add CQL filter if present
      if (finalCqlFilter) {
        params.append('cql_filter', finalCqlFilter);
      }

      // Add sortBy if specified
      if (sort_by && sort_by.trim()) {
        params.append('sortBy', sort_by.trim());
      }

      const baseUrl = `https://data.geopf.fr/wfs?${params.toString()}`;

      console.log('[IGN Light Advanced] Base URL:', baseUrl);
      console.log('[IGN Light Advanced] Filter mode:', filter_mode, '| CQL:', finalCqlFilter);
      console.log('[IGN Light Advanced] Requested features:', requestedFeatures, '| Will use pagination:', requestedFeatures > pageSize);

      // Fetch data (with pagination if needed)
      let allFeatures;

      if (requestedFeatures > pageSize) {
        // Use pagination
        allFeatures = await fetchWithPagination(baseUrl, requestedFeatures, pageSize);
      } else {
        // Single request
        const response = await fetch(baseUrl);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur IGN (${response.status}): ${errorText.substring(0, 200)}`);
        }

        const geojson = await response.json();
        allFeatures = geojson.features || [];
      }

      if (allFeatures.length === 0) {
        throw new Error('Aucune donnée trouvée. Vérifiez vos filtres ou essayez sans filtre.');
      }

      console.log(`[IGN Light Advanced] Total features received: ${allFeatures.length} from COG-CARTO`);

      return allFeatures.map((feature, idx) => {
        const wkt = geoJSONToWKT(feature.geometry);
        if (!wkt) {
          console.warn(`[IGN Light] Failed to convert geometry for feature ${idx}`);
        }

        // Calculate rough size for monitoring
        const sizeKB = (JSON.stringify(feature.geometry).length / 1024).toFixed(1);
        if (idx === 0) {
          console.log(`[IGN Light] Sample feature size: ${sizeKB} KB (COG-CARTO optimized)`);
        }

        return {
          geometry: wkt,
          properties: feature.properties || {},
          feature_index: idx
        };
      });
    }
  },

  osm_overpass: {
    id: 'osm_overpass',
    label: 'OpenStreetMap',
    icon: '🗺️',
    description: 'Données OpenStreetMap via Overpass API',
    color: '#22c55e',

    steps: [
      {
        id: 'config',
        label: 'Configuration',
        component: 'ImportConfig',
        fields: [
          {
            name: 'filter_mode',
            label: 'Mode de filtrage spatial',
            type: 'choice',
            options: [
              { value: 'area_name', label: 'Par nom de zone (ville, pays...)' },
              { value: 'area_id', label: 'Par ID de relation OSM (plus précis)' },
              { value: 'bbox', label: 'Par BBOX (coordonnées)' },
              { value: 'global', label: 'Global (attention: peut être très long!)' }
            ],
            defaultValue: 'area_name',
            help: 'Comment délimiter la zone de recherche'
          },
          {
            name: 'osm_type',
            label: 'Type d\'élément OSM',
            type: 'choice',
            required: true,
            options: [
              { value: 'amenity=school', label: '🏫 Écoles' },
              { value: 'amenity=hospital', label: '🏥 Hôpitaux' },
              { value: 'amenity=pharmacy', label: '💊 Pharmacies' },
              { value: 'amenity=restaurant', label: '🍽️ Restaurants' },
              { value: 'amenity=cafe', label: '☕ Cafés' },
              { value: 'amenity=bank', label: '🏦 Banques' },
              { value: 'amenity=post_office', label: '📮 Bureaux de poste' },
              { value: 'amenity=library', label: '📚 Bibliothèques' },
              { value: 'amenity=parking', label: '🅿️ Parkings' },
              { value: 'highway=motorway', label: '🛣️ Autoroutes' },
              { value: 'highway=primary', label: '🛤️ Routes principales' },
              { value: 'highway=residential', label: '🏘️ Rues résidentielles' },
              { value: 'building=yes', label: '🏢 Bâtiments (tous)' },
              { value: 'building=residential', label: '🏠 Bâtiments résidentiels' },
              { value: 'building=commercial', label: '🏬 Bâtiments commerciaux' },
              { value: 'natural=water', label: '💧 Plans d\'eau' },
              { value: 'natural=wood', label: '🌲 Forêts' },
              { value: 'landuse=residential', label: '🏘️ Zones résidentielles' },
              { value: 'landuse=commercial', label: '🏬 Zones commerciales' },
              { value: 'landuse=forest', label: '🌲 Zones forestières' }
            ],
            defaultValue: 'amenity=school'
          },
          {
            name: 'place_name',
            label: '📍 Nom du lieu',
            type: 'text',
            placeholder: 'Ex: Paris, Lyon, Île-de-France, France...',
            help: 'Pour filter_mode=area_name. Zone géographique de recherche'
          },
          {
            name: 'area_id',
            label: '🔢 ID de relation OSM',
            type: 'text',
            placeholder: 'Ex: 3600007444 (Île-de-France)',
            help: 'Pour filter_mode=area_id. Plus précis que nom (trouvez l\'ID sur openstreetmap.org)'
          },
          {
            name: 'bbox',
            label: '📐 BBOX (sud,ouest,nord,est)',
            type: 'text',
            placeholder: 'Ex: 48.8,2.2,48.9,2.4 (Paris)',
            help: 'Pour filter_mode=bbox. Format: minLat,minLon,maxLat,maxLon'
          },
          {
            name: 'additional_tags',
            label: '🏷️ Tags additionnels (optionnel)',
            type: 'text',
            placeholder: 'Ex: ["wheelchair"="yes"]["name"~".*école.*"]',
            help: 'Filtres supplémentaires en syntaxe Overpass. Combiné avec AND'
          },
          {
            name: 'timeout',
            label: 'Timeout (secondes)',
            type: 'number',
            min: 5,
            max: 180,
            defaultValue: 25,
            help: 'Temps max pour la requête Overpass'
          },
          {
            name: 'layer_name',
            label: 'Nom du layer dans Grist',
            type: 'text',
            required: true,
            defaultValue: 'Import OSM'
          }
        ]
      },
      {
        id: 'preview',
        label: 'Aperçu',
        component: 'PreviewData'
      }
    ],

    validate: (config) => {
      if (!config.osm_type) {
        return { valid: false, error: 'Aucun type OSM sélectionné' };
      }

      const { filter_mode, place_name, area_id, bbox } = config;

      if (filter_mode === 'area_name' && (!place_name || !place_name.trim())) {
        return { valid: false, error: 'Nom du lieu requis pour filter_mode=area_name' };
      }
      if (filter_mode === 'area_id' && (!area_id || !area_id.trim())) {
        return { valid: false, error: 'ID de relation requis pour filter_mode=area_id' };
      }
      if (filter_mode === 'bbox' && (!bbox || !bbox.trim())) {
        return { valid: false, error: 'BBOX requis pour filter_mode=bbox' };
      }

      return { valid: true };
    },

    fetch: async (config) => {
      const {
        filter_mode = 'area_name',
        osm_type,
        place_name,
        area_id,
        bbox,
        additional_tags,
        timeout
      } = config;

      // Parse OSM type (e.g., "amenity=school" → tag="amenity", value="school")
      const [tag, value] = osm_type.split('=');

      // Build spatial filter
      let spatialFilter = '';
      let areaDefinition = '';

      if (filter_mode === 'area_name' && place_name) {
        areaDefinition = `area[name="${place_name}"]->.searchArea;`;
        spatialFilter = '(area.searchArea)';
      }
      else if (filter_mode === 'area_id' && area_id) {
        // Convert relation ID to area ID (add 3600000000)
        const relationId = area_id.trim().replace(/^3600/, '');
        const areaIdNum = `3600${relationId}`;
        areaDefinition = `area(${areaIdNum})->.searchArea;`;
        spatialFilter = '(area.searchArea)';
      }
      else if (filter_mode === 'bbox' && bbox) {
        // BBOX format: minLat,minLon,maxLat,maxLon
        spatialFilter = `(${bbox.trim()})`;
      }
      else if (filter_mode === 'global') {
        spatialFilter = ''; // No spatial filter
      }

      // Build tag filter
      const tagFilter = `["${tag}"="${value}"]${additional_tags || ''}`;

      // Build Overpass query
      let overpassQuery = `[out:json][timeout:${timeout || 25}];
${areaDefinition}
(
  node${tagFilter}${spatialFilter};
  way${tagFilter}${spatialFilter};
  relation${tagFilter}${spatialFilter};
);
out geom;`;

      console.log('[OSM Advanced] Overpass query:', overpassQuery);

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });

      if (!response.ok) {
        throw new Error(`Erreur Overpass: ${response.status} ${response.statusText}`);
      }

      const osmData = await response.json();

      if (!osmData.elements || osmData.elements.length === 0) {
        throw new Error('Aucune donnée OSM trouvée. Vérifiez vos filtres.');
      }

      console.log(`[OSM Advanced] Received ${osmData.elements.length} elements`);

      // Convert OSM elements to GeoJSON features
      const features = osmData.elements.map((element, idx) => {
        let geometry;

        if (element.type === 'node') {
          geometry = {
            type: 'Point',
            coordinates: [element.lon, element.lat]
          };
        } else if (element.type === 'way' && element.geometry) {
          const coords = element.geometry.map(point => [point.lon, point.lat]);
          const isClosed = coords.length > 3 &&
                          coords[0][0] === coords[coords.length - 1][0] &&
                          coords[0][1] === coords[coords.length - 1][1];
          geometry = (isClosed || element.tags?.area === 'yes')
            ? { type: 'Polygon', coordinates: [coords] }
            : { type: 'LineString', coordinates: coords };
        } else if (element.type === 'relation' && element.members) {
          // Simplified: treat as point at centroid
          const allCoords = element.members.flatMap(m => m.geometry || []);
          if (allCoords.length > 0) {
            const avgLon = allCoords.reduce((sum, p) => sum + p.lon, 0) / allCoords.length;
            const avgLat = allCoords.reduce((sum, p) => sum + p.lat, 0) / allCoords.length;
            geometry = { type: 'Point', coordinates: [avgLon, avgLat] };
          }
        }

        if (!geometry) {
          return null;
        }

        const wkt = geoJSONToWKT(geometry);
        if (!wkt) {
          console.warn(`[OSM Import] Failed to convert geometry for element ${element.id}`);
          return null;
        }

        return {
          geometry: wkt,
          properties: {
            osm_id: element.id,
            osm_type: element.type,
            ...(element.tags || {})
          },
          feature_index: idx
        };
      }).filter(f => f !== null);

      if (features.length === 0) {
        throw new Error('Aucune géométrie valide trouvée');
      }

      console.log(`[OSM Advanced] Converted ${features.length} valid features`);

      return features;
    }
  },

  shapefile: {
    id: 'shapefile',
    label: 'Shapefile (via QGIS)',
    icon: '🗂️',
    description: 'Convertir un Shapefile via QGIS Desktop',
    color: '#6366f1',

    steps: [
      {
        id: 'instructions',
        label: 'Instructions',
        component: 'ShapefileInstructions',
        content: `
# Import Shapefile via QGIS

Les Shapefiles ne peuvent pas être importés directement dans le navigateur.
Voici la procédure recommandée:

## Étapes:

1. **Ouvrir QGIS Desktop** et charger votre Shapefile
2. **Clic droit sur la couche** → Exporter → Sauvegarder les entités sous...
3. **Format**: Sélectionner "GeoJSON"
4. **Système de coordonnées**: WGS84 (EPSG:4326) recommandé
5. **Sauvegarder** le fichier .geojson
6. **Importer** via la méthode "GeoJSON" dans Smart-GIS v2

## Alternative:

Vous pouvez aussi utiliser la commande ogr2ogr (GDAL):

\`\`\`bash
ogr2ogr -f GeoJSON -t_srs EPSG:4326 output.geojson input.shp
\`\`\`
        `
      }
    ],

    validate: () => {
      return { valid: false, error: 'Utilisez la méthode GeoJSON après conversion QGIS' };
    }
  }
};

/**
 * Get import method by ID
 */
export function getImportMethod(methodId) {
  return IMPORT_METHODS[methodId];
}

/**
 * Get all import methods as array
 */
export function getAllImportMethods() {
  return Object.values(IMPORT_METHODS);
}

/**
 * Get active import methods (exclude shapefile instructions-only)
 */
export function getActiveImportMethods() {
  return Object.values(IMPORT_METHODS).filter(method =>
    method.id !== 'shapefile'
  );
}
