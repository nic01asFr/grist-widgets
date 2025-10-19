/**
 * PROJECT TABLE MANAGER
 *
 * Gère la table projet courante selon le paradigme:
 * 1 Table = 1 Projet Cartographique Multi-Sources
 *
 * Chaque ligne = 1 entité géographique (vecteur ou raster)
 * Colonnes clés:
 * - layer_name: Nom de la couche logique (comme Photoshop layers)
 * - layer_type: "vector" | "raster" | "wms" | "wfs"
 * - z_index: Ordre d'affichage
 * - is_visible: Visibilité de l'élément
 * - geometry: WKT pour vecteur
 * - raster_url: URL tuiles pour raster
 */

// Schéma de la table projet (utilisé pour auto-création)
export const PROJECT_TABLE_SCHEMA = {
  tableName: 'GeoMap_Project_Default',
  columns: [
    { id: 'layer_name', type: 'Text' },
    { id: 'layer_type', type: 'Choice' },
    { id: 'source_catalog', type: 'Ref:GIS_Catalogs' },
    { id: 'geometry', type: 'Text' }, // Type Geometry si disponible
    { id: 'raster_url', type: 'Text' },
    { id: 'bbox', type: 'Text' }, // JSON
    { id: 'properties', type: 'Text' }, // JSON
    { id: 'nom', type: 'Text' },
    { id: 'type', type: 'Text' },
    { id: 'style_config', type: 'Text' }, // JSON Leaflet style
    { id: 'z_index', type: 'Int' },
    { id: 'is_visible', type: 'Bool' },
    { id: 'import_session', type: 'Int' },
    { id: 'element_vector', type: 'Text' } // Type Vector si disponible
  ],
  formulas: {
    // Auto-génération du vecteur sémantique si colonne properties existe
    element_vector: '=CREATE_VECTOR($properties)'
  }
};

/**
 * Détecte si une table est une table projet valide
 * (contient au minimum les colonnes: layer_name, geometry, layer_type)
 */
export async function isProjectTable(docApi, tableName) {
  try {
    const tables = await docApi.fetchTable('_grist_Tables');
    const tableIndex = tables.tableId.indexOf(tableName);

    if (tableIndex === -1) return false;

    // Vérifier présence colonnes essentielles
    const columns = await docApi.fetchTable('_grist_Tables_column');
    const tableId = tables.id[tableIndex];

    const requiredColumns = ['layer_name', 'layer_type'];
    const tableColumns = columns.colId.filter((_, i) => columns.parentId[i] === tableId);

    return requiredColumns.every(col => tableColumns.includes(col));
  } catch (error) {
    console.error('Error checking if table is project table:', error);
    return false;
  }
}

/**
 * Récupère le nom de la table projet courante
 * Priorité:
 * 1. Table configurée dans GIS_Config (clé: current_project_table)
 * 2. Table par défaut: GeoMap_Project_Default
 */
export async function getCurrentProjectTable(docApi) {
  try {
    // Essayer de lire la config
    const configTables = await docApi.fetchTable('_grist_Tables');
    if (configTables.tableId.includes('GIS_Config')) {
      const config = await docApi.fetchTable('GIS_Config');
      const currentTableIndex = config.config_key.indexOf('current_project_table');

      if (currentTableIndex !== -1) {
        const tableName = config.config_value[currentTableIndex];
        if (await isProjectTable(docApi, tableName)) {
          return tableName;
        }
      }
    }
  } catch (error) {
    console.warn('Could not read current_project_table from config:', error);
  }

  // Retourner table par défaut
  return 'GeoMap_Project_Default';
}

/**
 * Crée une nouvelle table projet avec le schéma standard
 */
export async function createProjectTable(docApi, tableName = 'GeoMap_Project_Default') {
  try {
    console.log(`📋 Creating project table: ${tableName}`);

    // Vérifier si table existe déjà
    const tables = await docApi.fetchTable('_grist_Tables');
    if (tables.tableId.includes(tableName)) {
      console.log(`✓ Table ${tableName} already exists`);
      return { success: true, tableName, created: false };
    }

    // Créer la table avec colonnes
    const columns = PROJECT_TABLE_SCHEMA.columns.map(col => ({
      id: col.id,
      type: col.type
    }));

    await docApi.applyUserActions([
      ['AddTable', tableName, columns]
    ]);

    console.log(`✓ Table ${tableName} created`);

    // Ajouter les formules si disponibles
    if (PROJECT_TABLE_SCHEMA.formulas) {
      for (const [colId, formula] of Object.entries(PROJECT_TABLE_SCHEMA.formulas)) {
        try {
          await docApi.applyUserActions([
            ['ModifyColumn', tableName, colId, { formula }]
          ]);
          console.log(`✓ Formula set for ${colId}`);
        } catch (err) {
          console.warn(`Could not set formula for ${colId}:`, err.message);
        }
      }
    }

    return { success: true, tableName, created: true };
  } catch (error) {
    console.error('Error creating project table:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Groupe les données par couches (layer_name)
 * Retourne un objet: { layerName: { features: [...], visible: bool, zIndex: number } }
 */
export function groupByLayers(records) {
  const layers = {};

  records.forEach(record => {
    const layerName = record.layer_name || 'Default Layer';

    if (!layers[layerName]) {
      layers[layerName] = {
        name: layerName,
        features: [],
        visible: true, // Par défaut visible
        zIndex: 0,
        type: record.layer_type || 'vector'
      };
    }

    // Déterminer visibilité de la couche (si au moins 1 élément visible)
    if (record.is_visible !== false) {
      layers[layerName].visible = true;
    }

    // z_index max de la couche
    if (record.z_index && record.z_index > layers[layerName].zIndex) {
      layers[layerName].zIndex = record.z_index;
    }

    // Ajouter feature
    layers[layerName].features.push(record);
  });

  return layers;
}

/**
 * Trie les couches par z_index pour rendu correct
 */
export function sortLayersByZIndex(layers) {
  return Object.entries(layers)
    .sort(([, a], [, b]) => (a.zIndex || 0) - (b.zIndex || 0))
    .map(([name, layer]) => ({ name, ...layer }));
}

/**
 * Filtre les features visibles d'une couche
 */
export function getVisibleFeatures(layer) {
  if (!layer.visible) return [];
  return layer.features.filter(f => f.is_visible !== false);
}

/**
 * Configure la table projet courante dans GIS_Config
 */
export async function setCurrentProjectTable(docApi, tableName) {
  try {
    const config = await docApi.fetchTable('GIS_Config');
    const keyIndex = config.config_key.indexOf('current_project_table');

    if (keyIndex !== -1) {
      // Mettre à jour valeur existante
      await docApi.applyUserActions([
        ['UpdateRecord', 'GIS_Config', config.id[keyIndex], {
          config_value: tableName
        }]
      ]);
    } else {
      // Créer nouvelle entrée
      await docApi.applyUserActions([
        ['AddRecord', 'GIS_Config', null, {
          config_key: 'current_project_table',
          config_value: tableName,
          config_type: 'string'
        }]
      ]);
    }

    console.log(`✓ Current project table set to: ${tableName}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting current project table:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialise le système de tables projet
 * - Crée table par défaut si nécessaire
 * - Configure comme table courante
 */
export async function initializeProjectSystem(docApi) {
  try {
    console.log('🗂️ Initializing project table system...');

    // Créer table par défaut si nécessaire
    const createResult = await createProjectTable(docApi);

    if (!createResult.success) {
      return createResult;
    }

    // Configurer comme table courante
    await setCurrentProjectTable(docApi, createResult.tableName);

    console.log('✅ Project system initialized');

    return {
      success: true,
      projectTable: createResult.tableName,
      created: createResult.created
    };
  } catch (error) {
    console.error('Error initializing project system:', error);
    return { success: false, error: error.message };
  }
}
