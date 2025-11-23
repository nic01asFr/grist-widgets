/**
 * TableSchema - Gestion du schéma des tables GIS
 *
 * Inspiré de geo-map v1 projectTableManager.js
 * Assure que les tables GIS ont toutes les colonnes requises
 */

/**
 * Schéma standard pour GIS_WorkSpace
 *
 * Colonnes essentielles pour stocker les données géographiques
 * Utilise les fonctions ST_* de Grist pour tous les calculs géométriques
 *
 * Voir: https://github.com/nic01asFr/grist-core/tree/feature/sqlite-extensions
 */
export const GIS_WORKSPACE_SCHEMA = {
  tableName: 'GIS_WorkSpace',
  columns: [
    // === Données de base ===
    { id: 'layer_name', type: 'Text', label: 'Layer Name' },
    { id: 'geometry_wgs84', type: 'Text', label: 'Geometry (WKT)' },
    { id: 'properties', type: 'Text', label: 'Properties (JSON)' },
    { id: 'feature_name', type: 'Text', label: 'Feature Name' },
    { id: 'import_session', type: 'Int', label: 'Import Session' },

    // === Colonnes calculées (formules Grist ST_*) ===
    // Ces colonnes utilisent les fonctions géospatiales de Grist
    // Le widget les LIT, ne les CALCULE PAS

    // Type de géométrie (calculé par ST_*)
    {
      id: 'geometry_type',
      type: 'Text',
      label: 'Geometry Type',
      formula: 'GEOMETRY_TYPE($geometry_wgs84)'
    },

    // Centroïde (point central)
    {
      id: 'centroid',
      type: 'Text',
      label: 'Centroid (WKT)',
      formula: 'ST_CENTROID($geometry_wgs84)'
    },

    // Latitude du centroïde
    {
      id: 'center_lat',
      type: 'Numeric',
      label: 'Center Latitude',
      formula: 'ST_Y(ST_CENTROID($geometry_wgs84))'
    },

    // Longitude du centroïde
    {
      id: 'center_lon',
      type: 'Numeric',
      label: 'Center Longitude',
      formula: 'ST_X(ST_CENTROID($geometry_wgs84))'
    },

    // Aire (km²) - pour polygones
    {
      id: 'area_km2',
      type: 'Numeric',
      label: 'Area (km²)',
      formula: 'ST_AREA($geometry_wgs84, "km2") if GEOMETRY_TYPE($geometry_wgs84) in ["Polygon", "MultiPolygon"] else None'
    },

    // Périmètre (km) - pour polygones
    {
      id: 'perimeter_km',
      type: 'Numeric',
      label: 'Perimeter (km)',
      formula: 'ST_PERIMETER($geometry_wgs84, "km") if GEOMETRY_TYPE($geometry_wgs84) in ["Polygon", "MultiPolygon"] else None'
    },

    // Longueur (km) - pour lignes
    {
      id: 'length_km',
      type: 'Numeric',
      label: 'Length (km)',
      formula: 'ST_LENGTH($geometry_wgs84, "km") if GEOMETRY_TYPE($geometry_wgs84) in ["LineString", "MultiLineString"] else None'
    },

    // Validation géométrie
    {
      id: 'is_valid_geom',
      type: 'Bool',
      label: 'Valid Geometry',
      formula: 'IS_VALID($geometry_wgs84)'
    },

    // GeoJSON (pour export/API)
    {
      id: 'geojson',
      type: 'Text',
      label: 'GeoJSON',
      formula: 'ST_AsGeoJSON($geometry_wgs84)'
    },

    // === Affichage et style ===
    { id: 'is_visible', type: 'Bool', label: 'Visible' },
    { id: 'z_index', type: 'Int', label: 'Z-Index' }
  ]
};

/**
 * Vérifie quelles colonnes existent dans une table
 *
 * @param {Object} docApi - Grist docApi
 * @param {string} tableName - Nom de la table
 * @returns {Promise<string[]>} Liste des colonnes existantes
 */
export async function getTableColumns(docApi, tableName) {
  try {
    const tables = await docApi.fetchTable('_grist_Tables');
    const tableIndex = tables.tableId.indexOf(tableName);

    if (tableIndex === -1) {
      return [];
    }

    const columns = await docApi.fetchTable('_grist_Tables_column');
    const tableId = tables.id[tableIndex];

    return columns.colId.filter((_, i) => columns.parentId[i] === tableId);
  } catch (error) {
    console.error('Error getting table columns:', error);
    return [];
  }
}

/**
 * Ajoute les colonnes manquantes à une table
 *
 * @param {Object} docApi - Grist docApi
 * @param {string} tableName - Nom de la table
 * @param {Object} schema - Schéma de la table
 * @returns {Promise<{added: string[], errors: string[]}>}
 */
export async function ensureTableColumns(docApi, tableName, schema = GIS_WORKSPACE_SCHEMA) {
  const added = [];
  const errors = [];

  try {
    console.log(`[TableSchema] 🔍 Checking columns for table: ${tableName}`);

    if (!docApi) {
      throw new Error('docApi is null or undefined');
    }

    // Get existing columns
    const existingColumns = await getTableColumns(docApi, tableName);

    console.log(`[TableSchema] Existing columns in ${tableName}:`, existingColumns);
    console.log(`[TableSchema] Required columns:`, schema.columns.map(c => c.id));

    // Add missing columns
    for (const col of schema.columns) {
      if (!existingColumns.includes(col.id)) {
        console.log(`[TableSchema] ⏳ Adding missing column: ${col.id} (${col.type})`);
        try {
          // Préparer les options de colonne
          const colInfo = { type: col.type };

          // Ajouter la formule si elle existe (pour colonnes calculées ST_*)
          if (col.formula) {
            colInfo.formula = col.formula;
            console.log(`[TableSchema]   → With formula: ${col.formula}`);
          }

          // Créer la colonne
          await docApi.applyUserActions([
            ['AddColumn', tableName, col.id, colInfo]
          ]);

          added.push(col.id);
          console.log(`[TableSchema] ✓ Successfully added column: ${col.id}`);
        } catch (err) {
          errors.push(`${col.id}: ${err.message}`);
          console.error(`[TableSchema] ✗ Failed to add column ${col.id}:`, err);
          console.error(`[TableSchema] Error details:`, err);
        }
      } else {
        console.log(`[TableSchema] ✓ Column already exists: ${col.id}`);
      }
    }

    if (added.length > 0) {
      console.log(`[TableSchema] ✅ Added ${added.length} columns to ${tableName}:`, added);
    } else {
      console.log(`[TableSchema] ✅ All columns already exist in ${tableName}`);
    }

    return { added, errors };
  } catch (error) {
    console.error('[TableSchema] ❌ Error ensuring table columns:', error);
    return { added, errors: [error.message] };
  }
}

/**
 * Crée une nouvelle table avec le schéma complet
 *
 * @param {Object} docApi - Grist docApi
 * @param {string} tableName - Nom de la table
 * @param {Object} schema - Schéma de la table
 * @returns {Promise<{success: boolean, tableName: string, created: boolean}>}
 */
export async function createTableWithSchema(docApi, tableName, schema = GIS_WORKSPACE_SCHEMA) {
  try {
    console.log(`[TableSchema] Creating table: ${tableName}`);

    // Check if table already exists
    const tables = await docApi.fetchTable('_grist_Tables');
    if (tables.tableId.includes(tableName)) {
      console.log(`[TableSchema] Table ${tableName} already exists`);
      return { success: true, tableName, created: false };
    }

    // Create table with columns
    const columns = schema.columns.map(col => ({
      id: col.id,
      type: col.type
    }));

    await docApi.applyUserActions([
      ['AddTable', tableName, columns]
    ]);

    console.log(`[TableSchema] ✓ Table ${tableName} created with ${columns.length} columns`);

    return { success: true, tableName, created: true };
  } catch (error) {
    console.error('[TableSchema] Error creating table:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialise une table GIS (crée ou ajoute colonnes manquantes)
 *
 * @param {Object} docApi - Grist docApi
 * @param {string} tableName - Nom de la table
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function initializeGISTable(docApi, tableName = 'GIS_WorkSpace') {
  try {
    // Check if table exists
    const tables = await docApi.fetchTable('_grist_Tables');
    const tableExists = tables.tableId.includes(tableName);

    if (!tableExists) {
      // Create new table
      const result = await createTableWithSchema(docApi, tableName);
      if (!result.success) {
        return { success: false, message: `Failed to create table: ${result.error}` };
      }
      return { success: true, message: `Created table ${tableName} with complete schema` };
    }

    // Table exists, ensure all columns
    const { added, errors } = await ensureTableColumns(docApi, tableName);

    if (errors.length > 0) {
      return {
        success: false,
        message: `Added ${added.length} columns, but ${errors.length} failed: ${errors.join(', ')}`
      };
    }

    if (added.length > 0) {
      return {
        success: true,
        message: `Added ${added.length} missing columns: ${added.join(', ')}`
      };
    }

    return { success: true, message: 'Table already has all required columns' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
