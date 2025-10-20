/**
 * WORKSPACE MANAGER
 *
 * Gère la table de travail GIS_WorkSpace
 * Le widget travaille TOUJOURS dans cette table, indépendamment
 * de la table sur laquelle il est placé
 */

import { PROJECT_TABLE_SCHEMA } from './projectTableManager';

const WORKSPACE_TABLE_NAME = 'GIS_WorkSpace';

/**
 * Vérifie si une table existe
 */
async function tableExists(docApi, tableName) {
  try {
    const tables = await docApi.fetchTable('_grist_Tables');
    const tableNames = tables.tableId || [];
    return tableNames.includes(tableName);
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Crée la table de travail GIS_WorkSpace avec le schéma projet
 */
async function createWorkspaceTable(docApi) {
  console.log(`📋 Creating workspace table: ${WORKSPACE_TABLE_NAME}`);

  try {
    // Créer la table avec colonnes
    const columns = PROJECT_TABLE_SCHEMA.columns.map(col => {
      const colInfo = {
        id: col.id,
        type: col.type
      };

      // Ajouter widgetOptions si présent
      if (col.widgetOptions) {
        colInfo.widgetOptions = col.widgetOptions;
      }

      return colInfo;
    });

    await docApi.applyUserActions([
      ['AddTable', WORKSPACE_TABLE_NAME, columns]
    ]);

    console.log(`✓ Workspace table created: ${WORKSPACE_TABLE_NAME}`);

    // Ajouter les formules si disponibles
    if (PROJECT_TABLE_SCHEMA.formulas) {
      for (const [colId, formula] of Object.entries(PROJECT_TABLE_SCHEMA.formulas)) {
        try {
          await docApi.applyUserActions([
            ['ModifyColumn', WORKSPACE_TABLE_NAME, colId, { formula }]
          ]);
          console.log(`  ✓ Formula set for ${colId}`);
        } catch (err) {
          console.warn(`  ⚠️ Could not set formula for ${colId}:`, err.message);
        }
      }
    }

    return { success: true, tableName: WORKSPACE_TABLE_NAME, created: true };

  } catch (error) {
    console.error('Error creating workspace table:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialise ou récupère la table de travail
 */
export async function initializeWorkspace(docApi) {
  console.log('🗂️ Initializing GIS workspace...');

  try {
    // Vérifier si la table existe
    const exists = await tableExists(docApi, WORKSPACE_TABLE_NAME);

    if (exists) {
      console.log(`  ✓ Workspace table already exists: ${WORKSPACE_TABLE_NAME}`);
      return { success: true, tableName: WORKSPACE_TABLE_NAME, created: false };
    }

    // Créer la table
    const result = await createWorkspaceTable(docApi);

    if (result.success) {
      console.log(`✅ Workspace initialized: ${WORKSPACE_TABLE_NAME}`);
    }

    return result;

  } catch (error) {
    console.error('Error initializing workspace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère toutes les données de la workspace
 */
export async function fetchWorkspaceData(docApi) {
  try {
    const data = await docApi.fetchTable(WORKSPACE_TABLE_NAME);

    // Convertir format Grist en array d'objets
    const records = data.id.map((id, idx) => {
      const record = { id };

      // Ajouter toutes les colonnes
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          record[key] = data[key][idx];
        }
      });

      return record;
    });

    return { success: true, records };

  } catch (error) {
    console.error('Error fetching workspace data:', error);
    return { success: false, error: error.message, records: [] };
  }
}

/**
 * Ajoute un enregistrement dans la workspace
 */
export async function addToWorkspace(docApi, record) {
  try {
    await docApi.applyUserActions([
      ['AddRecord', WORKSPACE_TABLE_NAME, null, record]
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error adding to workspace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ajoute plusieurs enregistrements dans la workspace (bulk)
 */
export async function bulkAddToWorkspace(docApi, records) {
  try {
    // Préparer les données au format Grist
    const colData = {};
    const firstRecord = records[0];

    Object.keys(firstRecord).forEach(key => {
      colData[key] = records.map(r => r[key]);
    });

    await docApi.applyUserActions([
      ['BulkAddRecord', WORKSPACE_TABLE_NAME, records.map(() => null), colData]
    ]);

    return { success: true, count: records.length };
  } catch (error) {
    console.error('Error bulk adding to workspace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour un enregistrement dans la workspace
 */
export async function updateInWorkspace(docApi, recordId, updates) {
  try {
    await docApi.applyUserActions([
      ['UpdateRecord', WORKSPACE_TABLE_NAME, recordId, updates]
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error updating workspace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Supprime un enregistrement de la workspace
 */
export async function deleteFromWorkspace(docApi, recordId) {
  try {
    await docApi.applyUserActions([
      ['RemoveRecord', WORKSPACE_TABLE_NAME, recordId]
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting from workspace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Vide complètement la workspace
 */
export async function clearWorkspace(docApi) {
  try {
    const data = await docApi.fetchTable(WORKSPACE_TABLE_NAME);
    const recordIds = data.id;

    if (recordIds.length > 0) {
      await docApi.applyUserActions([
        ['BulkRemoveRecord', WORKSPACE_TABLE_NAME, recordIds]
      ]);
    }

    return { success: true, deleted: recordIds.length };
  } catch (error) {
    console.error('Error clearing workspace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Duplique la workspace vers une nouvelle table (sauvegarde projet)
 */
export async function saveWorkspaceAs(docApi, projectName) {
  try {
    await docApi.applyUserActions([
      ['DuplicateTable', WORKSPACE_TABLE_NAME, projectName, false]
    ]);

    return { success: true, tableName: projectName };
  } catch (error) {
    console.error('Error saving workspace:', error);
    return { success: false, error: error.message };
  }
}

export { WORKSPACE_TABLE_NAME };
