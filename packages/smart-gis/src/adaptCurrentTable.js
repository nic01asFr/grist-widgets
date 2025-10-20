/**
 * ADAPT CURRENT TABLE
 *
 * Transforme la table courante en table projet Smart GIS
 * en ajoutant les colonnes manquantes
 */

import { PROJECT_TABLE_SCHEMA } from './projectTableManager';

/**
 * Vérifie si une colonne existe dans une table
 */
async function columnExists(docApi, tableId, columnId) {
  try {
    const columns = await docApi.fetchTable('_grist_Tables_column');
    const tables = await docApi.fetchTable('_grist_Tables');

    // Trouver l'ID de la table
    const tableIndex = tables.tableId.indexOf(tableId);
    if (tableIndex === -1) return false;

    const tableRecordId = tables.id[tableIndex];

    // Chercher la colonne dans cette table
    const columnIndex = columns.colId.findIndex((colId, idx) =>
      colId === columnId && columns.parentId[idx] === tableRecordId
    );

    return columnIndex !== -1;
  } catch (error) {
    console.error(`Error checking column ${columnId}:`, error);
    return false;
  }
}

/**
 * Adapte la table courante pour Smart GIS
 * Ajoute les colonnes manquantes du schéma projet
 */
export async function adaptCurrentTable(gristApi, tableId) {
  console.log(`🔧 Adapting current table: ${tableId}`);

  if (!gristApi || !gristApi.docApi) {
    console.error('Grist API not available');
    return { success: false, error: 'Grist API not available' };
  }

  const docApi = gristApi.docApi;
  const missingColumns = [];
  const existingColumns = [];

  try {
    // Vérifier chaque colonne du schéma
    for (const column of PROJECT_TABLE_SCHEMA.columns) {
      const exists = await columnExists(docApi, tableId, column.id);

      if (exists) {
        existingColumns.push(column.id);
      } else {
        missingColumns.push(column);
      }
    }

    console.log(`  ✓ Found ${existingColumns.length} existing columns`);
    console.log(`  + Need to add ${missingColumns.length} columns`);

    // Ajouter les colonnes manquantes
    if (missingColumns.length > 0) {
      for (const column of missingColumns) {
        try {
          const colInfo = {
            type: column.type
          };

          // Ajouter widgetOptions si présent (pour Choice par exemple)
          if (column.widgetOptions) {
            colInfo.widgetOptions = column.widgetOptions;
          }

          await docApi.applyUserActions([
            ['AddColumn', tableId, column.id, colInfo]
          ]);

          console.log(`    ✓ Added column: ${column.id} (${column.type})`);
        } catch (err) {
          console.warn(`    ⚠️ Could not add column ${column.id}:`, err.message);
        }
      }
    }

    // Ajouter les formules si définies
    if (PROJECT_TABLE_SCHEMA.formulas && missingColumns.some(c => PROJECT_TABLE_SCHEMA.formulas[c.id])) {
      console.log('  📐 Adding formulas...');

      for (const [colId, formula] of Object.entries(PROJECT_TABLE_SCHEMA.formulas)) {
        if (missingColumns.some(c => c.id === colId)) {
          try {
            await docApi.applyUserActions([
              ['ModifyColumn', tableId, colId, { formula }]
            ]);
            console.log(`    ✓ Formula set for ${colId}`);
          } catch (err) {
            console.warn(`    ⚠️ Could not set formula for ${colId}:`, err.message);
          }
        }
      }
    }

    console.log(`✅ Table ${tableId} adapted for Smart GIS`);

    return {
      success: true,
      tableId,
      missingColumns: missingColumns.length,
      existingColumns: existingColumns.length,
      adapted: missingColumns.length > 0
    };

  } catch (error) {
    console.error('Error adapting table:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
