/**
 * Import Methods Configuration
 *
 * Defines all supported import methods with their parameters,
 * validation rules, and processing logic.
 */

import { geoJSONToWKT } from '../utils/geometryConverters';

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
            name: 'search_text',
            label: 'Rechercher (nom de commune, département...)',
            type: 'text',
            placeholder: 'Ex: Paris, Lyon, Île-de-France...',
            help: 'Laissez vide pour récupérer toutes les entités (attention: peut être long)'
          },
          {
            name: 'max_features',
            label: 'Nombre max de résultats',
            type: 'number',
            min: 1,
            max: 10000,
            defaultValue: 1000
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
      const { ign_layer, search_text, max_features } = config;

      // Build WFS request
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: ign_layer,
        outputFormat: 'application/json',
        count: max_features || 1000
      });

      // Add simple filter if search text provided
      if (search_text && search_text.trim()) {
        // Use simple LIKE filter on 'nom' property (exists in most layers)
        // Escape single quotes in search text
        const escapedText = search_text.replace(/'/g, "''");
        const cqlFilter = `nom LIKE '%${escapedText}%'`;
        params.append('cql_filter', cqlFilter);
      }

      const url = `https://data.geopf.fr/wfs?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur IGN (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const geojson = await response.json();

      if (!geojson.features || geojson.features.length === 0) {
        throw new Error('Aucune donnée trouvée. Essayez sans filtre ou avec un autre nom.');
      }

      return geojson.features.map((feature, idx) => {
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
            label: 'Nom du lieu (ville, département, pays...)',
            type: 'text',
            required: true,
            placeholder: 'Ex: Paris, Lyon, Île-de-France, France...',
            help: 'Zone géographique où effectuer la recherche'
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
      if (!config.place_name || !config.place_name.trim()) {
        return { valid: false, error: 'Nom du lieu requis' };
      }
      return { valid: true };
    },

    fetch: async (config) => {
      const { osm_type, place_name, timeout } = config;

      // Parse OSM type (e.g., "amenity=school" → tag="amenity", value="school")
      const [tag, value] = osm_type.split('=');

      let overpassQuery = `[out:json][timeout:${timeout || 25}];
area[name="${place_name}"]->.searchArea;
(
  node["${tag}"="${value}"](area.searchArea);
  way["${tag}"="${value}"](area.searchArea);
  relation["${tag}"="${value}"](area.searchArea);
);
out geom;`;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });

      if (!response.ok) {
        throw new Error(`Erreur Overpass: ${response.status} ${response.statusText}`);
      }

      const osmData = await response.json();

      if (!osmData.elements || osmData.elements.length === 0) {
        throw new Error('Aucune donnée OSM trouvée pour cette recherche');
      }

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
