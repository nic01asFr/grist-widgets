/**
 * Import Methods Configuration
 *
 * Defines all supported import methods with their parameters,
 * validation rules, and processing logic.
 */

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

      return features.map((feature, idx) => ({
        geometry: JSON.stringify(feature.geometry),
        properties: feature.properties || {},
        feature_index: idx
      }));
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

  wfs: {
    id: 'wfs',
    label: 'WFS (Web Feature Service)',
    icon: '🌐',
    description: 'Connexion à un service WFS (IGN, OSM, etc.)',
    color: '#f59e0b',

    steps: [
      {
        id: 'catalog',
        label: 'Sélectionner une source',
        component: 'WFSCatalog',
        catalogs: [
          {
            id: 'ign',
            name: 'IGN Géoplateforme',
            baseUrl: 'https://data.geopf.fr/wfs',
            layers: [
              { id: 'BDTOPO_V3:commune', name: 'Communes' },
              { id: 'BDTOPO_V3:departement', name: 'Départements' },
              { id: 'BDTOPO_V3:region', name: 'Régions' },
              { id: 'ADMINEXPRESS-COG-CARTO.LATEST:arrondissement', name: 'Arrondissements' },
              { id: 'BDTOPO_V3:batiment', name: 'Bâtiments' },
              { id: 'BDTOPO_V3:route', name: 'Routes' },
              { id: 'BDTOPO_V3:cours_d_eau', name: 'Cours d\'eau' }
            ]
          },
          {
            id: 'osm',
            name: 'OpenStreetMap (Overpass)',
            baseUrl: 'https://overpass-api.de/api/interpreter',
            note: 'Requiert une bbox et un type de feature'
          }
        ]
      },
      {
        id: 'filters',
        label: 'Filtres spatiaux',
        component: 'WFSFilters',
        fields: [
          {
            name: 'bbox',
            label: 'Zone géographique (bbox)',
            type: 'bbox_picker',
            help: 'Cliquer sur la carte pour définir une zone'
          },
          {
            name: 'max_features',
            label: 'Nombre max de features',
            type: 'number',
            min: 1,
            max: 10000,
            defaultValue: 1000
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
            defaultValue: 'Import WFS'
          }
        ]
      }
    ],

    validate: (config) => {
      if (!config.catalog) {
        return { valid: false, error: 'Aucun catalogue sélectionné' };
      }
      if (!config.layer) {
        return { valid: false, error: 'Aucune couche sélectionnée' };
      }
      return { valid: true };
    },

    fetch: async (config) => {
      const { catalog, layer, bbox, max_features } = config;

      // Build WFS GetFeature request
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: layer,
        outputFormat: 'application/json',
        count: max_features || 1000
      });

      if (bbox) {
        params.append('bbox', bbox.join(','));
      }

      const url = `${catalog.baseUrl}?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur WFS: ${response.status} ${response.statusText}`);
      }

      const geojson = await response.json();

      if (!geojson.features || geojson.features.length === 0) {
        throw new Error('Aucune feature trouvée dans la zone spécifiée');
      }

      return geojson.features.map((feature, idx) => ({
        geometry: JSON.stringify(feature.geometry),
        properties: feature.properties || {},
        feature_index: idx
      }));
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
