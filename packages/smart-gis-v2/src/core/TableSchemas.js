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
      formula: 'ST_ASGEOJSON($geometry_wgs84)'
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
      type: 'Int',
      label: 'Created At',
      description: 'Query creation timestamp (Unix epoch)'
    },
    {
      id: 'executed_at',
      type: 'Int',
      label: 'Executed At',
      description: 'Query execution timestamp (Unix epoch)'
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
    const tablesData = await docApi.fetchTable('_grist_Tables');
    // Convert from columnar format { id: [...], tableId: [...] } to array of objects
    const tables = convertColumnarToArray(tablesData);
    const table = tables.find(t => t.tableId === tableName);

    if (!table) {
      return [];
    }

    const columnsData = await docApi.fetchTable('_grist_Tables_column');
    const columns = convertColumnarToArray(columnsData);
    return columns
      .filter(col => col.parentId === table.id)
      .map(col => col.colId);
  } catch (error) {
    console.error(`[TableSchemas] Error fetching columns for ${tableName}:`, error);
    return [];
  }
}

/**
 * Convert columnar Grist data to array of objects
 * Input:  { id: [1,2], tableId: ['A','B'] }
 * Output: [{ id: 1, tableId: 'A' }, { id: 2, tableId: 'B' }]
 */
function convertColumnarToArray(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data;

  const columns = Object.keys(data);
  if (columns.length === 0) return [];

  const firstCol = data[columns[0]];
  if (!Array.isArray(firstCol)) return [];

  const rowCount = firstCol.length;
  const result = [];

  for (let i = 0; i < rowCount; i++) {
    const row = {};
    columns.forEach(col => {
      row[col] = data[col][i];
    });
    result.push(row);
  }

  return result;
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
          // Step 1: Create column (with isFormula if needed, but no formula yet)
          const colInfo = {
            type: col.type,
            label: col.label
          };
          if (col.formula) {
            colInfo.isFormula = true;
          }

          await docApi.applyUserActions([
            ['AddColumn', tableName, col.id, colInfo]
          ]);

          // Step 2: If formula column, define the formula
          if (col.formula) {
            console.log(`[TableSchemas]   → Defining formula: ${col.formula}`);
            await docApi.applyUserActions([
              ['ModifyColumn', tableName, col.id, {
                formula: col.formula
              }]
            ]);
          }

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
      const tablesData = await docApi.fetchTable('_grist_Tables');
      const tables = convertColumnarToArray(tablesData);
      const tableExists = tables.some(t => t.tableId === tableName);

      if (!tableExists) {
        console.log(`[TableSchemas] 📋 Creating table: ${tableName} with ${schema.columns.length} columns`);

        // Step 1: Create table with ALL columns (formulas will be added after)
        const columnsToCreate = schema.columns.map(col => ({
          id: col.id,
          type: col.type,
          label: col.label
          // Don't include formula or isFormula yet
        }));

        await docApi.applyUserActions([
          ['AddTable', tableName, columnsToCreate]
        ]);

        console.log(`[TableSchemas] ✓ Created table with ${columnsToCreate.length} columns`);

        // Step 2: Configure formula columns
        const formulaColumns = schema.columns.filter(col => col.formula);

        if (formulaColumns.length > 0) {
          console.log(`[TableSchemas] 🔧 Configuring ${formulaColumns.length} formula columns...`);

          for (const col of formulaColumns) {
            try {
              console.log(`[TableSchemas]   → ${col.id}: ${col.formula}`);

              await docApi.applyUserActions([
                ['ModifyColumn', tableName, col.id, {
                  isFormula: true,
                  formula: col.formula
                }]
              ]);

              console.log(`[TableSchemas]   ✓ ${col.id} configured`);
            } catch (err) {
              console.error(`[TableSchemas]   ✗ Failed to configure ${col.id}:`, err);
            }
          }
        }

        console.log(`[TableSchemas] ✅ Table ${tableName} fully initialized`);

        results[tableName] = {
          success: true,
          added: schema.columns.map(c => c.id),
          errors: [],
          message: `Created table with ${schema.columns.length} columns (${formulaColumns.length} formulas configured)`
        };
      } else {
        console.log(`[TableSchemas] ✓ Table ${tableName} already exists, ensuring columns...`);

        // Ensure all columns exist
        const columnResult = await ensureTableColumns(docApi, tableName, schema);
        results[tableName] = columnResult;
      }

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
