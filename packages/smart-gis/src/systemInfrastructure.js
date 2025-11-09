/**
 * System Infrastructure Setup for Smart GIS Widget
 *
 * Auto-creates and initializes system tables:
 * - GIS_Catalogs: External data sources (IGN, OSM, etc.)
 * - GIS_Styles: Reusable style library
 * - GIS_Config: Widget configuration
 * - GIS_SearchQueries: Semantic search with VECTOR_SEARCH (Phase 8)
 */

// System table schemas
const SYSTEM_TABLES = {
  GIS_Catalogs: {
    columns: [
      { id: 'source_type', type: 'Choice', widgetOptions: JSON.stringify({
        choices: ['IGN', 'OSM', 'WFS', 'WMS', 'Custom'],
        choiceOptions: {}
      })},
      { id: 'dataset_id', type: 'Text' },
      { id: 'title', type: 'Text' },
      { id: 'description', type: 'Text' },
      { id: 'keywords', type: 'Text' },
      { id: 'endpoint_url', type: 'Text' },
      { id: 'layer_name', type: 'Text' },
      { id: 'layer_type', type: 'Choice', widgetOptions: JSON.stringify({
        choices: ['vector', 'raster', 'wms', 'wfs'],
        choiceOptions: {}
      })},
      { id: 'geometry_type', type: 'Choice', widgetOptions: JSON.stringify({
        choices: ['Point', 'LineString', 'Polygon', 'Multi'],
        choiceOptions: {}
      })},
      { id: 'crs', type: 'Text' },
      { id: 'license', type: 'Text' },
      { id: 'attribution', type: 'Text' },
      { id: 'usage_count', type: 'Int' },
      { id: 'is_favorite', type: 'Bool' },
      { id: 'catalog_vector', type: 'Any' } // Vector type if available, else Any
    ],
    formulas: {
      catalog_vector: 'grist.CREATE_VECTOR("Dataset: " + $title, "Source: " + $source_type, "Keywords: " + $keywords, "Description: " + $description)'
    }
  },

  GIS_Styles: {
    columns: [
      { id: 'style_name', type: 'Text' },
      { id: 'style_type', type: 'Choice', widgetOptions: JSON.stringify({
        choices: ['Point', 'Line', 'Polygon'],
        choiceOptions: {}
      })},
      { id: 'style_config', type: 'Text' }, // JSON Leaflet style
      { id: 'is_system', type: 'Bool' },
      { id: 'usage_count', type: 'Int' }
    ]
  },

  GIS_Config: {
    columns: [
      { id: 'config_key', type: 'Text' },
      { id: 'config_value', type: 'Text' },
      { id: 'config_type', type: 'Choice', widgetOptions: JSON.stringify({
        choices: ['string', 'number', 'json', 'bool'],
        choiceOptions: {}
      })}
    ]
  },

  GIS_SearchQueries: {
    columns: [
      { id: 'search_query', type: 'Text' },
      { id: 'search_mode', type: 'Choice', widgetOptions: JSON.stringify({
        choices: ['Catalogs', 'Elements'],
        choiceOptions: {}
      })},
      { id: 'workspace_table', type: 'Text' }, // Name of workspace table to search
      { id: 'catalog_results', type: 'Any' }, // RefList:GIS_Catalogs
      { id: 'element_results', type: 'Any' }, // RefList to workspace table
      { id: 'timestamp', type: 'DateTime', isFormula: true, formula: 'NOW()' }
    ],
    formulas: {
      catalog_results: 'grist.VECTOR_SEARCH(GIS_Catalogs, $search_query, embedding_column="catalog_vector", threshold=0.7, limit=10) if $search_mode == "Catalogs" else []',
      element_results: 'grist.VECTOR_SEARCH($workspace_table, $search_query, embedding_column="element_vector", threshold=0.6, limit=20) if $search_mode == "Elements" and $workspace_table else []'
    }
  }
};

// Pre-configured IGN catalogs
const IGN_CATALOGS = [
  {
    source_type: 'IGN',
    dataset_id: 'BDTOPO_V3:batiment',
    title: 'BD TOPO® - Bâtiments',
    description: 'Emprise au sol des bâtiments (IGN)',
    keywords: 'bâti, construction, IGN, cadastre, urbanisme, bâtiment',
    endpoint_url: 'https://data.geopf.fr/wfs/ows',
    layer_name: 'BDTOPO_V3:batiment',
    layer_type: 'vector',
    geometry_type: 'Polygon',
    crs: 'EPSG:4326',
    license: 'Licence Ouverte',
    attribution: '© IGN',
    usage_count: 0,
    is_favorite: false
  },
  {
    source_type: 'IGN',
    dataset_id: 'BDTOPO_V3:troncon_de_route',
    title: 'BD TOPO® - Routes',
    description: 'Réseau routier français complet',
    keywords: 'routes, voirie, transport, réseau, infrastructure, circulation',
    endpoint_url: 'https://data.geopf.fr/wfs/ows',
    layer_name: 'BDTOPO_V3:troncon_de_route',
    layer_type: 'vector',
    geometry_type: 'LineString',
    crs: 'EPSG:4326',
    license: 'Licence Ouverte',
    attribution: '© IGN',
    usage_count: 0,
    is_favorite: false
  },
  {
    source_type: 'IGN',
    dataset_id: 'ADMINEXPRESS-COG.LATEST:commune',
    title: 'ADMIN EXPRESS - Communes',
    description: 'Limites administratives des communes françaises',
    keywords: 'communes, administratif, limites, COG, INSEE, territoire',
    endpoint_url: 'https://data.geopf.fr/wfs/ows',
    layer_name: 'ADMINEXPRESS-COG.LATEST:commune',
    layer_type: 'vector',
    geometry_type: 'Polygon',
    crs: 'EPSG:4326',
    license: 'Licence Ouverte',
    attribution: '© IGN',
    usage_count: 0,
    is_favorite: false
  },
  {
    source_type: 'IGN',
    dataset_id: 'BDTOPO_V3:troncon_hydrographique',
    title: 'BD TOPO® - Hydrographie',
    description: 'Cours d\'eau et réseau hydrographique',
    keywords: 'eau, rivière, hydrographie, environnement, fleuve, cours d\'eau',
    endpoint_url: 'https://data.geopf.fr/wfs/ows',
    layer_name: 'BDTOPO_V3:troncon_hydrographique',
    layer_type: 'vector',
    geometry_type: 'LineString',
    crs: 'EPSG:4326',
    license: 'Licence Ouverte',
    attribution: '© IGN',
    usage_count: 0,
    is_favorite: false
  },
  {
    source_type: 'IGN',
    dataset_id: 'HR.ORTHOIMAGERY.ORTHOPHOTOS',
    title: 'IGN - Orthophotographie',
    description: 'Photographies aériennes orthorectifiées',
    keywords: 'orthophoto, satellite, imagerie, aérien, fond de carte',
    endpoint_url: 'https://wxs.ign.fr/essentiels/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=HR.ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',
    layer_name: 'HR.ORTHOIMAGERY.ORTHOPHOTOS',
    layer_type: 'raster',
    geometry_type: null, // Raster
    crs: 'EPSG:3857',
    license: 'Licence Ouverte',
    attribution: '© IGN',
    usage_count: 0,
    is_favorite: false
  }
];

// Pre-configured OSM catalogs
const OSM_CATALOGS = [
  {
    source_type: 'OSM',
    dataset_id: 'osm_buildings',
    title: 'OpenStreetMap - Bâtiments',
    description: 'Bâtiments contributifs OpenStreetMap',
    keywords: 'OSM, bâti, contributif, crowdsourcing, building',
    endpoint_url: 'https://overpass-api.de/api/interpreter',
    layer_name: 'way["building"]',
    layer_type: 'vector',
    geometry_type: 'Polygon',
    crs: 'EPSG:4326',
    license: 'ODbL',
    attribution: '© OpenStreetMap contributors',
    usage_count: 0,
    is_favorite: false
  },
  {
    source_type: 'OSM',
    dataset_id: 'osm_roads',
    title: 'OpenStreetMap - Routes',
    description: 'Réseau routier OpenStreetMap',
    keywords: 'OSM, routes, voirie, navigation, highway',
    endpoint_url: 'https://overpass-api.de/api/interpreter',
    layer_name: 'way["highway"]',
    layer_type: 'vector',
    geometry_type: 'LineString',
    crs: 'EPSG:4326',
    license: 'ODbL',
    attribution: '© OpenStreetMap contributors',
    usage_count: 0,
    is_favorite: false
  },
  {
    source_type: 'OSM',
    dataset_id: 'osm_pois',
    title: 'OpenStreetMap - Points d\'intérêt',
    description: 'POI: commerces, services, équipements publics',
    keywords: 'POI, amenities, services, commerces, équipements, restaurant',
    endpoint_url: 'https://overpass-api.de/api/interpreter',
    layer_name: 'node["amenity"]',
    layer_type: 'vector',
    geometry_type: 'Point',
    crs: 'EPSG:4326',
    license: 'ODbL',
    attribution: '© OpenStreetMap contributors',
    usage_count: 0,
    is_favorite: false
  }
];

// Raster catalogs (tile layers)
const RASTER_CATALOGS = [
  {
    source_type: 'IGN',
    dataset_id: 'ign_ortho_hr',
    title: 'IGN - Orthophotographie HR',
    description: 'Photographies aériennes haute résolution de l\'IGN',
    keywords: 'orthophoto, satellite, aérien, IGN, photo',
    endpoint_url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',
    layer_type: 'raster',
    geometry_type: null,
    is_active: true
  },
  {
    source_type: 'IGN',
    dataset_id: 'ign_plan_ign',
    title: 'IGN - Plan IGN',
    description: 'Carte topographique Plan IGN (anciennement SCAN25)',
    keywords: 'carte, topographie, IGN, scan',
    endpoint_url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
    layer_type: 'raster',
    geometry_type: null,
    is_active: true
  },
  {
    source_type: 'OSM',
    dataset_id: 'osm_standard',
    title: 'OpenStreetMap - Standard',
    description: 'Fond de carte OpenStreetMap standard',
    keywords: 'osm, openstreetmap, carte, base',
    endpoint_url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    layer_type: 'raster',
    geometry_type: null,
    is_active: true
  },
  {
    source_type: 'Stamen',
    dataset_id: 'stamen_terrain',
    title: 'Stamen - Terrain',
    description: 'Carte Stamen Terrain avec relief',
    keywords: 'stamen, terrain, relief, topographie',
    endpoint_url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    layer_type: 'raster',
    geometry_type: null,
    is_active: true
  },
  {
    source_type: 'CartoDB',
    dataset_id: 'carto_positron',
    title: 'CartoDB - Positron (Light)',
    description: 'Fond de carte clair CartoDB Positron',
    keywords: 'cartodb, clair, minimaliste, light',
    endpoint_url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    layer_type: 'raster',
    geometry_type: null,
    is_active: true
  }
];

// System styles presets
const SYSTEM_STYLES = [
  {
    style_name: 'Marker Bleu (défaut)',
    style_type: 'Point',
    style_config: JSON.stringify({
      color: '#3388ff',
      fillColor: '#3388ff',
      fillOpacity: 0.6,
      weight: 2,
      radius: 8
    }),
    is_system: true,
    usage_count: 0
  },
  {
    style_name: 'Route Principale',
    style_type: 'Line',
    style_config: JSON.stringify({
      color: '#ff6600',
      weight: 4,
      opacity: 0.8
    }),
    is_system: true,
    usage_count: 0
  },
  {
    style_name: 'Zone Urbaine',
    style_type: 'Polygon',
    style_config: JSON.stringify({
      color: '#ffd700',
      fillColor: '#ffd700',
      fillOpacity: 0.3,
      weight: 2
    }),
    is_system: true,
    usage_count: 0
  },
  {
    style_name: 'Limite Administrative',
    style_type: 'Line',
    style_config: JSON.stringify({
      color: '#000000',
      weight: 2,
      opacity: 0.6,
      dashArray: '5, 10'
    }),
    is_system: true,
    usage_count: 0
  },
  {
    style_name: 'Cours d\'eau',
    style_type: 'Line',
    style_config: JSON.stringify({
      color: '#0066cc',
      weight: 3,
      opacity: 0.7
    }),
    is_system: true,
    usage_count: 0
  }
];

// Default config values
const DEFAULT_CONFIG = [
  { config_key: 'default_basemap', config_value: 'OpenStreetMap', config_type: 'string' },
  { config_key: 'default_zoom', config_value: '6', config_type: 'number' },
  { config_key: 'default_center_lat', config_value: '46.603354', config_type: 'number' },
  { config_key: 'default_center_lon', config_value: '1.888334', config_type: 'number' },
  { config_key: 'import_max_features', config_value: '5000', config_type: 'number' },
  { config_key: 'enable_clustering', config_value: 'true', config_type: 'bool' },
  { config_key: 'cluster_threshold', config_value: '100', config_type: 'number' }
];

/**
 * Create a system table with its schema
 */
async function createSystemTable(docApi, tableName) {
  console.log(`📋 Creating system table: ${tableName}`);

  const schema = SYSTEM_TABLES[tableName];
  if (!schema) {
    throw new Error(`Unknown system table: ${tableName}`);
  }

  try {
    // Create table with columns
    await docApi.applyUserActions([
      ['AddTable', tableName, schema.columns]
    ]);

    console.log(`✅ Table ${tableName} created with ${schema.columns.length} columns`);

    // Add formulas if defined
    if (schema.formulas) {
      for (const [colId, formula] of Object.entries(schema.formulas)) {
        try {
          await docApi.applyUserActions([
            ['ModifyColumn', tableName, colId, { formula }]
          ]);
          console.log(`  ✅ Formula added to ${tableName}.${colId}`);
        } catch (formulaError) {
          // Non-blocking: formulas may fail if Vector type not available
          console.warn(`  ⚠️ Could not add formula to ${tableName}.${colId}:`, formulaError.message);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error creating ${tableName}:`, error);
    throw error;
  }
}

/**
 * Initialize catalogs with pre-configured datasets
 */
async function initializeCatalogs(docApi) {
  console.log('📚 Initializing data catalogs...');

  try {
    // Check if already initialized
    const catalogsData = await docApi.fetchTable('GIS_Catalogs');
    if (catalogsData.id && catalogsData.id.length > 0) {
      console.log(`  ℹ️ Catalogs already initialized (${catalogsData.id.length} entries)`);
      return;
    }

    // Combine all catalogs (vector + raster)
    const allCatalogs = [...IGN_CATALOGS, ...OSM_CATALOGS, ...RASTER_CATALOGS];

    // Bulk insert
    await docApi.applyUserActions([
      ['BulkAddRecord', 'GIS_Catalogs', allCatalogs.map(() => null), {
        source_type: allCatalogs.map(c => c.source_type),
        dataset_id: allCatalogs.map(c => c.dataset_id),
        title: allCatalogs.map(c => c.title),
        description: allCatalogs.map(c => c.description),
        keywords: allCatalogs.map(c => c.keywords),
        endpoint_url: allCatalogs.map(c => c.endpoint_url),
        layer_name: allCatalogs.map(c => c.layer_name),
        layer_type: allCatalogs.map(c => c.layer_type || 'vector'),
        geometry_type: allCatalogs.map(c => c.geometry_type),
        crs: allCatalogs.map(c => c.crs),
        license: allCatalogs.map(c => c.license),
        attribution: allCatalogs.map(c => c.attribution),
        usage_count: allCatalogs.map(c => c.usage_count),
        is_favorite: allCatalogs.map(c => c.is_favorite)
      }]
    ]);

    console.log(`✅ Initialized ${allCatalogs.length} catalogs (${IGN_CATALOGS.length} IGN + ${OSM_CATALOGS.length} OSM + ${RASTER_CATALOGS.length} Raster)`);
  } catch (error) {
    console.error('❌ Error initializing catalogs:', error);
    throw error;
  }
}

/**
 * Initialize system styles
 */
async function initializeStyles(docApi) {
  console.log('🎨 Initializing system styles...');

  try {
    // Check if already initialized
    const stylesData = await docApi.fetchTable('GIS_Styles');
    if (stylesData.id && stylesData.id.length > 0) {
      console.log(`  ℹ️ Styles already initialized (${stylesData.id.length} entries)`);
      return;
    }

    // Bulk insert
    await docApi.applyUserActions([
      ['BulkAddRecord', 'GIS_Styles', SYSTEM_STYLES.map(() => null), {
        style_name: SYSTEM_STYLES.map(s => s.style_name),
        style_type: SYSTEM_STYLES.map(s => s.style_type),
        style_config: SYSTEM_STYLES.map(s => s.style_config),
        is_system: SYSTEM_STYLES.map(s => s.is_system),
        usage_count: SYSTEM_STYLES.map(s => s.usage_count)
      }]
    ]);

    console.log(`✅ Initialized ${SYSTEM_STYLES.length} system styles`);
  } catch (error) {
    console.error('❌ Error initializing styles:', error);
    throw error;
  }
}

/**
 * Initialize configuration
 */
async function initializeConfig(docApi) {
  console.log('⚙️ Initializing configuration...');

  try {
    // Check if already initialized
    const configData = await docApi.fetchTable('GIS_Config');
    if (configData.id && configData.id.length > 0) {
      console.log(`  ℹ️ Config already initialized (${configData.id.length} entries)`);
      return;
    }

    // Bulk insert
    await docApi.applyUserActions([
      ['BulkAddRecord', 'GIS_Config', DEFAULT_CONFIG.map(() => null), {
        config_key: DEFAULT_CONFIG.map(c => c.config_key),
        config_value: DEFAULT_CONFIG.map(c => c.config_value),
        config_type: DEFAULT_CONFIG.map(c => c.config_type)
      }]
    ]);

    console.log(`✅ Initialized ${DEFAULT_CONFIG.length} config values`);
  } catch (error) {
    console.error('❌ Error initializing config:', error);
    throw error;
  }
}

/**
 * Main setup function - ensures all system infrastructure is ready
 */
export async function setupSystemInfrastructure(grist) {
  console.log('🚀 Setting up Smart GIS system infrastructure...');

  if (!grist || !grist.docApi) {
    console.warn('⚠️ Grist API not available, skipping infrastructure setup');
    return { success: false, error: 'Grist API not available' };
  }

  const docApi = grist.docApi;

  try {
    const systemTables = ['GIS_Catalogs', 'GIS_Styles', 'GIS_Config', 'GIS_SearchQueries'];

    // OPTIMIZATION: Fast-path check - verify all tables exist in ONE request
    console.log('⚡ Fast-checking infrastructure...');
    const tablesData = await docApi.fetchTable('_grist_Tables');
    const existingTables = new Set(tablesData.tableId);
    const allTablesExist = systemTables.every(t => existingTables.has(t));

    if (allTablesExist) {
      // All tables exist - check if already initialized via quick config check
      try {
        const configData = await docApi.fetchTable('GIS_Config');
        const isInitialized = configData.id && configData.id.length > 0;

        if (isInitialized) {
          console.log('✅ Infrastructure already initialized (fast-path)');
          return {
            success: true,
            tables: systemTables,
            catalogCount: IGN_CATALOGS.length + OSM_CATALOGS.length,
            styleCount: SYSTEM_STYLES.length,
            configCount: DEFAULT_CONFIG.length,
            fastPath: true
          };
        }
      } catch (e) {
        // Config table exists but might be empty, continue with full init
        console.log('⚠️ Config table empty, continuing initialization...');
      }
    }

    // SLOW PATH: Full initialization needed
    console.log('\n📋 Step 1/4: Checking system tables...');

    for (const tableName of systemTables) {
      const exists = existingTables.has(tableName);
      if (!exists) {
        await createSystemTable(docApi, tableName);
      } else {
        console.log(`  ✓ Table ${tableName} already exists`);
      }
    }

    // Step 2: Initialize catalogs
    console.log('\n📚 Step 2/4: Initializing data catalogs...');
    await initializeCatalogs(docApi);

    // Step 3: Initialize styles
    console.log('\n🎨 Step 3/4: Initializing styles...');
    await initializeStyles(docApi);

    // Step 4: Initialize config
    console.log('\n⚙️ Step 4/4: Initializing configuration...');
    await initializeConfig(docApi);

    console.log('\n✅ Smart GIS infrastructure setup complete!\n');

    return {
      success: true,
      tables: systemTables,
      catalogCount: IGN_CATALOGS.length + OSM_CATALOGS.length,
      styleCount: SYSTEM_STYLES.length,
      configCount: DEFAULT_CONFIG.length
    };

  } catch (error) {
    console.error('\n❌ Infrastructure setup failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get configuration value
 */
export async function getConfig(docApi, key, defaultValue = null) {
  try {
    const configData = await docApi.fetchTable('GIS_Config');
    const idx = configData.config_key.indexOf(key);

    if (idx === -1) return defaultValue;

    const value = configData.config_value[idx];
    const type = configData.config_type[idx];

    // Convert based on type
    if (type === 'number') return parseFloat(value);
    if (type === 'bool') return value === 'true';
    if (type === 'json') return JSON.parse(value);
    return value;
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set configuration value
 */
export async function setConfig(docApi, key, value, type = 'string') {
  try {
    const configData = await docApi.fetchTable('GIS_Config');
    const idx = configData.config_key.indexOf(key);

    const stringValue = type === 'json' ? JSON.stringify(value) : String(value);

    if (idx === -1) {
      // Create new config
      await docApi.applyUserActions([
        ['AddRecord', 'GIS_Config', null, {
          config_key: key,
          config_value: stringValue,
          config_type: type
        }]
      ]);
    } else {
      // Update existing
      const recordId = configData.id[idx];
      await docApi.applyUserActions([
        ['UpdateRecord', 'GIS_Config', recordId, {
          config_value: stringValue,
          config_type: type
        }]
      ]);
    }

    return true;
  } catch (error) {
    console.error(`Error setting config ${key}:`, error);
    return false;
  }
}

/**
 * PHASE 8: SEMANTIC SEARCH FUNCTIONS
 *
 * Search catalogs and elements using VECTOR_SEARCH via GIS_SearchQueries table
 */

/**
 * Search catalogs using semantic search (VECTOR_SEARCH)
 * @param {Object} docApi - Grist docApi
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of catalog records sorted by relevance
 */
export async function searchCatalogsSemantic(docApi, query) {
  if (!query || query.trim() === '') {
    return { success: false, catalogs: [], error: 'Empty query' };
  }

  try {
    console.log(`🔍 Semantic search catalogs: "${query}"`);

    // Create search query record (Grist will calculate VECTOR_SEARCH via formula)
    const result = await docApi.applyUserActions([
      ['AddRecord', 'GIS_SearchQueries', null, {
        search_query: query.trim(),
        search_mode: 'Catalogs',
        workspace_table: '' // Not needed for catalog search
      }]
    ]);

    const queryRecordId = result.retValues[0];

    // Wait for Grist to calculate VECTOR_SEARCH formula (1.5s delay)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch the record with calculated results
    const searchData = await docApi.fetchTable('GIS_SearchQueries');
    const idx = searchData.id.indexOf(queryRecordId);

    if (idx === -1) {
      throw new Error('Search record not found');
    }

    const catalogResultIds = searchData.catalog_results[idx];

    // If no results from VECTOR_SEARCH, return empty
    if (!catalogResultIds || catalogResultIds.length === 0) {
      console.log('  ℹ️ No results from VECTOR_SEARCH');

      // Clean up search record
      await docApi.applyUserActions([
        ['RemoveRecord', 'GIS_SearchQueries', queryRecordId]
      ]);

      return { success: true, catalogs: [], method: 'semantic', count: 0 };
    }

    // Fetch catalog details
    const catalogsData = await docApi.fetchTable('GIS_Catalogs');
    const catalogs = catalogResultIds.map(catalogId => {
      const catalogIdx = catalogsData.id.indexOf(catalogId);
      if (catalogIdx === -1) return null;

      return {
        id: catalogsData.id[catalogIdx],
        source_type: catalogsData.source_type[catalogIdx],
        dataset_id: catalogsData.dataset_id[catalogIdx],
        title: catalogsData.title[catalogIdx],
        description: catalogsData.description[catalogIdx],
        keywords: catalogsData.keywords[catalogIdx],
        endpoint_url: catalogsData.endpoint_url[catalogIdx],
        layer_name: catalogsData.layer_name[catalogIdx],
        layer_type: catalogsData.layer_type[catalogIdx],
        geometry_type: catalogsData.geometry_type[catalogIdx],
        crs: catalogsData.crs[catalogIdx],
        license: catalogsData.license[catalogIdx],
        attribution: catalogsData.attribution[catalogIdx],
        usage_count: catalogsData.usage_count[catalogIdx],
        is_favorite: catalogsData.is_favorite[catalogIdx]
      };
    }).filter(Boolean); // Remove null entries

    // Clean up search record
    await docApi.applyUserActions([
      ['RemoveRecord', 'GIS_SearchQueries', queryRecordId]
    ]);

    console.log(`  ✅ Found ${catalogs.length} catalogs via VECTOR_SEARCH`);

    return {
      success: true,
      catalogs,
      method: 'semantic',
      count: catalogs.length
    };

  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return {
      success: false,
      catalogs: [],
      error: error.message || 'Search failed',
      method: 'semantic'
    };
  }
}

/**
 * Search elements in workspace table using semantic search (VECTOR_SEARCH)
 * @param {Object} docApi - Grist docApi
 * @param {string} workspaceTable - Name of workspace table to search
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of element record IDs sorted by relevance
 */
export async function searchElementsSemantic(docApi, workspaceTable, query) {
  if (!query || query.trim() === '') {
    return { success: false, elementIds: [], error: 'Empty query' };
  }

  if (!workspaceTable) {
    return { success: false, elementIds: [], error: 'No workspace table specified' };
  }

  try {
    console.log(`🔍 Semantic search elements in "${workspaceTable}": "${query}"`);

    // Create search query record
    const result = await docApi.applyUserActions([
      ['AddRecord', 'GIS_SearchQueries', null, {
        search_query: query.trim(),
        search_mode: 'Elements',
        workspace_table: workspaceTable
      }]
    ]);

    const queryRecordId = result.retValues[0];

    // Wait for Grist to calculate VECTOR_SEARCH formula
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch the record with calculated results
    const searchData = await docApi.fetchTable('GIS_SearchQueries');
    const idx = searchData.id.indexOf(queryRecordId);

    if (idx === -1) {
      throw new Error('Search record not found');
    }

    const elementResultIds = searchData.element_results[idx];

    // If no results from VECTOR_SEARCH, return empty
    if (!elementResultIds || elementResultIds.length === 0) {
      console.log('  ℹ️ No results from VECTOR_SEARCH');

      // Clean up search record
      await docApi.applyUserActions([
        ['RemoveRecord', 'GIS_SearchQueries', queryRecordId]
      ]);

      return { success: true, elementIds: [], method: 'semantic', count: 0 };
    }

    // Clean up search record
    await docApi.applyUserActions([
      ['RemoveRecord', 'GIS_SearchQueries', queryRecordId]
    ]);

    console.log(`  ✅ Found ${elementResultIds.length} elements via VECTOR_SEARCH`);

    return {
      success: true,
      elementIds: elementResultIds, // Array of IDs sorted by relevance
      method: 'semantic',
      count: elementResultIds.length
    };

  } catch (error) {
    console.error('❌ Semantic search elements failed:', error);
    return {
      success: false,
      elementIds: [],
      error: error.message || 'Search failed',
      method: 'semantic'
    };
  }
}

/**
 * Fallback: Search catalogs using text matching (when VECTOR_SEARCH unavailable)
 * @param {Array} catalogs - Array of all catalog records
 * @param {string} query - Search query
 * @returns {Array} - Filtered catalogs
 */
export function searchCatalogsTextual(catalogs, query) {
  if (!query || query.trim() === '') {
    return catalogs;
  }

  const lower = query.toLowerCase();
  return catalogs.filter(catalog => {
    const searchText = `${catalog.title} ${catalog.description || ''} ${catalog.keywords || ''}`.toLowerCase();
    return searchText.includes(lower);
  });
}
