/**
 * TableSchema - Gestion du schéma des tables GIS
 *
 * Inspiré de geo-map v1 projectTableManager.js
 * Assure que les tables GIS ont toutes les colonnes requises
 */

/**
 * Schéma standard pour GIS_WorkSpace
 * Colonnes essentielles pour stocker les données géographiques
 */
export const GIS_WORKSPACE_SCHEMA = {
  tableName: 'GIS_WorkSpace',
  columns: [
    { id: 'layer_name', type: 'Text', label: 'Layer Name' },
    { id: 'geometry_wgs84', type: 'Text', label: 'Geometry (WKT)' },
    { id: 'properties', type: 'Text', label: 'Properties (JSON)' },
    { id: 'geometry_type', type: 'Text', label: 'Geometry Type' },
    { id: 'is_visible', type: 'Bool', label: 'Visible' },
    { id: 'z_index', type: 'Int', label: 'Z-Index' },
    { id: 'feature_name', type: 'Text', label: 'Feature Name' },
    { id: 'import_session', type: 'Int', label: 'Import Session' }
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
    // Get existing columns
    const existingColumns = await getTableColumns(docApi, tableName);

    console.log(`[TableSchema] Existing columns in ${tableName}:`, existingColumns);

    // Add missing columns
    for (const col of schema.columns) {
      if (!existingColumns.includes(col.id)) {
        try {
          await docApi.applyUserActions([
            ['AddColumn', tableName, col.id, {
              type: col.type,
              label: col.label || col.id
            }]
          ]);
          added.push(col.id);
          console.log(`[TableSchema] ✓ Added column: ${col.id}`);
        } catch (err) {
          errors.push(`${col.id}: ${err.message}`);
          console.error(`[TableSchema] ✗ Failed to add column ${col.id}:`, err);
        }
      }
    }

    if (added.length > 0) {
      console.log(`[TableSchema] Added ${added.length} columns to ${tableName}`);
    } else {
      console.log(`[TableSchema] All columns already exist in ${tableName}`);
    }

    return { added, errors };
  } catch (error) {
    console.error('[TableSchema] Error ensuring table columns:', error);
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
