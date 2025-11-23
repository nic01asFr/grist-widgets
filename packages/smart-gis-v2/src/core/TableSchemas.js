/**
 * System Table Schemas for Smart-GIS v2
 *
 * Defines all required tables and their schemas for the Smart-GIS system:
 * - GIS_WorkSpace: Geospatial features with ST_* calculations
 * - Agent_Queries: Agent-driven natural language queries (n8n integration)
 */

/**
 * GIS_WorkSpace Schema
 * Storage for all geospatial features with auto-calculated ST_* columns
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
    {
      id: 'geometry_type',
      type: 'Text',
      label: 'Geometry Type',
      formula: 'GEOMETRY_TYPE($geometry_wgs84)'
    },
    {
      id: 'centroid',
      type: 'Text',
      label: 'Centroid (WKT)',
      formula: 'ST_CENTROID($geometry_wgs84)'
    },
    {
      id: 'center_lat',
      type: 'Numeric',
      label: 'Center Latitude',
      formula: 'ST_Y(ST_CENTROID($geometry_wgs84))'
    },
    {
      id: 'center_lon',
      type: 'Numeric',
      label: 'Center Longitude',
      formula: 'ST_X(ST_CENTROID($geometry_wgs84))'
    },
    {
      id: 'area_km2',
      type: 'Numeric',
      label: 'Area (km²)',
      formula: 'ST_AREA($geometry_wgs84, "km2") if GEOMETRY_TYPE($geometry_wgs84) in ["Polygon", "MultiPolygon"] else None'
    },
    {
      id: 'perimeter_km',
      type: 'Numeric',
      label: 'Perimeter (km)',
      formula: 'ST_PERIMETER($geometry_wgs84, "km") if GEOMETRY_TYPE($geometry_wgs84) in ["Polygon", "MultiPolygon"] else None'
    },
    {
      id: 'length_km',
      type: 'Numeric',
      label: 'Length (km)',
      formula: 'ST_LENGTH($geometry_wgs84, "km") if GEOMETRY_TYPE($geometry_wgs84) in ["LineString", "MultiLineString"] else None'
    },
    {
      id: 'is_valid_geom',
      type: 'Bool',
      label: 'Valid Geometry',
      formula: 'IS_VALID($geometry_wgs84)'
    },
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
 * Agent_Queries Schema
 * Storage for agent-driven natural language queries (n8n + LLM integration)
 *
 * Workflow:
 * 1. User enters natural language query in interface
 * 2. n8n workflow receives query → LLM parses → structured JSON
 * 3. n8n writes to Agent_Queries table (status='pending')
 * 4. WebhookHandler detects new record → executes query
 * 5. Results written to result_json + displayed on map
 */
export const AGENT_QUERIES_SCHEMA = {
  tableName: 'Agent_Queries',
  columns: [
    // === Query Input ===
    {
      id: 'query_text',
      type: 'Text',
      label: 'Natural Language Query',
      description: 'User query in plain text (e.g., "Toutes les écoles à 500m d\'un hôpital à Paris")'
    },
    {
      id: 'query_json',
      type: 'Text',
      label: 'Structured Query (JSON)',
      description: 'LLM-parsed structured query with zone, reference, treatment, target'
    },

    // === Execution Status ===
    {
      id: 'status',
      type: 'Text',
      label: 'Status',
      description: 'Query execution status: pending, processing, success, error'
    },

    // === Results ===
    {
      id: 'result_json',
      type: 'Text',
      label: 'Result (JSON)',
      description: 'Execution result with feature IDs, counts, metadata'
    },
    {
      id: 'error_message',
      type: 'Text',
      label: 'Error Message',
      description: 'Error details if status=error'
    },

    // === Timestamps ===
    {
      id: 'created_at',
      type: 'DateTime',
      label: 'Created At',
      description: 'Query creation timestamp'
    },
    {
      id: 'executed_at',
      type: 'DateTime',
      label: 'Executed At',
      description: 'Query execution timestamp'
    },

    // === Metadata ===
    {
      id: 'execution_time_ms',
      type: 'Int',
      label: 'Execution Time (ms)',
      description: 'Query execution duration in milliseconds'
    },
    {
      id: 'feature_count',
      type: 'Int',
      label: 'Result Count',
      description: 'Number of features returned by query'
    }
  ]
};

/**
 * All system schemas
 */
export const SYSTEM_SCHEMAS = {
  GIS_WorkSpace: GIS_WORKSPACE_SCHEMA,
  Agent_Queries: AGENT_QUERIES_SCHEMA
};

/**
 * Get table columns (helper for checking existing columns)
 */
export async function getTableColumns(docApi, tableName) {
  try {
    const tables = await docApi.fetchTable('_grist_Tables');
    const table = tables.find(t => t.tableId === tableName);

    if (!table) {
      return [];
    }

    const columns = await docApi.fetchTable('_grist_Tables_column');
    return columns
      .filter(col => col.parentId === table.id)
      .map(col => col.colId);
  } catch (error) {
    console.error(`[TableSchemas] Error fetching columns for ${tableName}:`, error);
    return [];
  }
}

/**
 * Ensure table columns match schema
 * Adds missing columns (including formulas)
 *
 * @param {Object} docApi - Grist document API
 * @param {string} tableName - Table name
 * @param {Object} schema - Table schema definition
 * @returns {Object} { success, added, errors, message }
 */
export async function ensureTableColumns(docApi, tableName, schema) {
  const added = [];
  const errors = [];

  try {
    console.log(`[TableSchemas] 🔍 Checking columns for table: ${tableName}`);

    if (!docApi) {
      throw new Error('docApi is null or undefined');
    }

    const existingColumns = await getTableColumns(docApi, tableName);
    console.log(`[TableSchemas] Existing columns in ${tableName}:`, existingColumns);
    console.log(`[TableSchemas] Required columns:`, schema.columns.map(c => c.id));

    // Add missing columns
    for (const col of schema.columns) {
      if (!existingColumns.includes(col.id)) {
        console.log(`[TableSchemas] ⏳ Adding missing column: ${col.id} (${col.type})`);
        try {
          const colInfo = { type: col.type };

          // Add formula if exists
          if (col.formula) {
            colInfo.formula = col.formula;
            console.log(`[TableSchemas]   → With formula: ${col.formula}`);
          }

          // Add label/description if exists
          if (col.label) colInfo.label = col.label;

          await docApi.applyUserActions([
            ['AddColumn', tableName, col.id, colInfo]
          ]);

          added.push(col.id);
          console.log(`[TableSchemas] ✓ Successfully added column: ${col.id}`);
        } catch (err) {
          errors.push(`${col.id}: ${err.message}`);
          console.error(`[TableSchemas] ✗ Failed to add column ${col.id}:`, err);
        }
      } else {
        console.log(`[TableSchemas] ✓ Column already exists: ${col.id}`);
      }
    }

    if (added.length > 0) {
      console.log(`[TableSchemas] ✅ Added ${added.length} columns to ${tableName}:`, added);
    } else {
      console.log(`[TableSchemas] ✅ All columns exist in ${tableName}`);
    }

    return {
      success: errors.length === 0,
      added,
      errors,
      message: errors.length > 0
        ? `Failed to add some columns: ${errors.join(', ')}`
        : added.length > 0
        ? `Added ${added.length} columns`
        : 'All columns already exist'
    };

  } catch (error) {
    console.error(`[TableSchemas] Fatal error ensuring columns for ${tableName}:`, error);
    return {
      success: false,
      added,
      errors: [error.message],
      message: error.message
    };
  }
}

/**
 * Initialize all system tables
 * Creates tables if needed and ensures all columns exist
 *
 * @param {Object} docApi - Grist document API
 * @param {Array<string>} tableNames - Tables to initialize (default: all)
 * @returns {Object} { success, results }
 */
export async function initializeSystemTables(docApi, tableNames = null) {
  const tablesToInit = tableNames || Object.keys(SYSTEM_SCHEMAS);
  const results = {};

  console.log(`[TableSchemas] 🚀 Initializing ${tablesToInit.length} system tables...`);

  for (const tableName of tablesToInit) {
    const schema = SYSTEM_SCHEMAS[tableName];

    if (!schema) {
      console.warn(`[TableSchemas] ⚠️ No schema found for ${tableName}`);
      results[tableName] = { success: false, error: 'Schema not found' };
      continue;
    }

    try {
      // Check if table exists
      const tables = await docApi.fetchTable('_grist_Tables');
      const tableExists = tables.some(t => t.tableId === tableName);

      if (!tableExists) {
        console.log(`[TableSchemas] 📋 Creating table: ${tableName}`);

        // Create table with first column from schema
        const firstCol = schema.columns[0];
        await docApi.applyUserActions([
          ['AddTable', tableName, [
            { id: firstCol.id, type: firstCol.type }
          ]]
        ]);

        console.log(`[TableSchemas] ✓ Created table: ${tableName}`);
      }

      // Ensure all columns exist
      const columnResult = await ensureTableColumns(docApi, tableName, schema);
      results[tableName] = columnResult;

    } catch (error) {
      console.error(`[TableSchemas] ❌ Failed to initialize ${tableName}:`, error);
      results[tableName] = { success: false, error: error.message };
    }
  }

  const allSuccess = Object.values(results).every(r => r.success);

  console.log(allSuccess
    ? `[TableSchemas] ✅ All system tables initialized successfully`
    : `[TableSchemas] ⚠️ Some tables had issues - check logs`
  );

  return { success: allSuccess, results };
}
