/**
 * WebhookHandler - n8n/Agent Query Integration
 *
 * Listens for agent queries from n8n workflow and executes them.
 *
 * Architecture:
 * 1. n8n workflow receives natural language query
 * 2. LLM (OpenAI/Claude) parses query → structured JSON
 * 3. n8n writes to Grist table "AgentQueries" via API
 * 4. WebhookHandler detects new record → executes query
 * 5. Results written back to Grist + displayed on map
 *
 * Table Schema (AgentQueries):
 * - id: Record ID
 * - query_json: Structured query from LLM (JSON string)
 * - status: 'pending' | 'processing' | 'success' | 'error'
 * - result_json: Execution result (JSON string)
 * - error_message: Error details if failed
 * - created_at: Timestamp
 * - executed_at: Timestamp
 */

import queryExecutor from './QueryExecutor';
import StateManager from './StateManager';
import GristAPI from './GristAPI';

class WebhookHandler {
  constructor() {
    this.gristAPI = GristAPI;
    this.queryExecutor = queryExecutor;
    this.isInitialized = false;
    this.queryTableName = 'AgentQueries';
    this.processingIds = new Set(); // Prevent duplicate processing
  }

  /**
   * Initialize webhook handler
   *
   * @param {Object} gristAPI - Initialized GristAPI instance
   * @param {string} queryTableName - Name of the queries table (default: 'AgentQueries')
   */
  async initialize(gristAPI, queryTableName = 'AgentQueries') {
    if (this.isInitialized) {
      console.warn('[WebhookHandler] Already initialized');
      return;
    }

    this.gristAPI = gristAPI;
    this.queryTableName = queryTableName;

    try {
      // Verify table exists
      const tableId = await this.verifyQueryTable();

      if (!tableId) {
        console.warn(`[WebhookHandler] Table "${queryTableName}" not found. Agent queries disabled.`);
        console.info('[WebhookHandler] Create table with columns: query_json, status, result_json, error_message, created_at, executed_at');
        return;
      }

      console.log(`[WebhookHandler] Initialized on table "${queryTableName}"`);
      this.isInitialized = true;

      // Process any pending queries on startup
      await this.processPendingQueries();

    } catch (error) {
      console.error('[WebhookHandler] Initialization error:', error);
    }
  }

  /**
   * Verify query table exists
   * @returns {string|null} Table ID or null if not found
   */
  async verifyQueryTable() {
    try {
      const tables = await this.gristAPI.fetchTable(this.queryTableName);
      return this.queryTableName;
    } catch (error) {
      return null;
    }
  }

  /**
   * Process pending queries on startup
   */
  async processPendingQueries() {
    try {
      const records = await this.gristAPI.fetchTable(this.queryTableName);

      const pending = records.filter(r =>
        r.status === 'pending' && !this.processingIds.has(r.id)
      );

      if (pending.length > 0) {
        console.log(`[WebhookHandler] Found ${pending.length} pending queries`);

        for (const record of pending) {
          await this.processQuery(record);
        }
      }
    } catch (error) {
      console.error('[WebhookHandler] Error processing pending queries:', error);
    }
  }

  /**
   * Handle new records from Grist onRecords event
   *
   * Usage in widget:
   * ```js
   * grist.ready();
   * grist.onRecords((records) => {
   *   webhookHandler.handleRecords(records);
   * });
   * ```
   */
  async handleRecords(records) {
    if (!this.isInitialized) {
      return;
    }

    // Filter pending queries
    const pending = records.filter(r =>
      r.status === 'pending' && !this.processingIds.has(r.id)
    );

    if (pending.length === 0) {
      return;
    }

    console.log(`[WebhookHandler] Processing ${pending.length} new queries`);

    // Process queries sequentially to avoid conflicts
    for (const record of pending) {
      await this.processQuery(record);
    }
  }

  /**
   * Process a single agent query
   *
   * @param {Object} record - Query record from Grist
   */
  async processQuery(record) {
    const queryId = record.id;

    // Prevent duplicate processing
    if (this.processingIds.has(queryId)) {
      return;
    }

    this.processingIds.add(queryId);

    try {
      // Update status to processing
      await this.updateQueryStatus(queryId, 'processing', null, null);

      // Parse query JSON
      const parsedQuery = this.parseQueryJSON(record.query_json);

      if (!parsedQuery) {
        throw new Error('Invalid query_json format');
      }

      console.log('[WebhookHandler] Executing query:', parsedQuery);

      // Execute query via QueryExecutor
      const result = await this.queryExecutor.execute(parsedQuery);

      // Update status to success
      await this.updateQueryStatus(
        queryId,
        'success',
        JSON.stringify(result),
        null
      );

      console.log(`[WebhookHandler] Query ${queryId} completed successfully`);

      // Notify UI
      StateManager.setState('ui.notification', {
        type: 'success',
        message: `Requête agent exécutée avec succès`,
        queryId
      }, 'Agent query completed');

    } catch (error) {
      console.error(`[WebhookHandler] Query ${queryId} failed:`, error);

      // Update status to error
      await this.updateQueryStatus(
        queryId,
        'error',
        null,
        error.message
      );

      // Notify UI
      StateManager.setState('ui.notification', {
        type: 'error',
        message: `Erreur lors de l'exécution: ${error.message}`,
        queryId
      }, 'Agent query failed');

    } finally {
      this.processingIds.delete(queryId);
    }
  }

  /**
   * Parse query JSON from string
   *
   * @param {string} queryJson - JSON string
   * @returns {Object|null} Parsed query or null
   */
  parseQueryJSON(queryJson) {
    try {
      if (typeof queryJson === 'object') {
        return queryJson;
      }

      if (typeof queryJson === 'string') {
        return JSON.parse(queryJson);
      }

      return null;
    } catch (error) {
      console.error('[WebhookHandler] JSON parse error:', error);
      return null;
    }
  }

  /**
   * Update query status in Grist
   *
   * @param {number} queryId - Record ID
   * @param {string} status - New status
   * @param {string|null} resultJson - Result JSON string
   * @param {string|null} errorMessage - Error message
   */
  async updateQueryStatus(queryId, status, resultJson, errorMessage) {
    try {
      const updates = {
        status,
        executed_at: new Date().toISOString()
      };

      if (resultJson) {
        updates.result_json = resultJson;
      }

      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      await this.gristAPI.updateRecord(this.queryTableName, queryId, updates);
    } catch (error) {
      console.error('[WebhookHandler] Failed to update query status:', error);
    }
  }

  /**
   * Manually trigger query execution (for testing)
   *
   * @param {Object} parsedQuery - Structured query object
   * @returns {Object} Execution result
   */
  async executeQuery(parsedQuery) {
    console.log('[WebhookHandler] Manual query execution:', parsedQuery);
    return await this.queryExecutor.execute(parsedQuery);
  }

  /**
   * Get query history
   *
   * @param {number} limit - Max number of queries to return
   * @returns {Array} Query records
   */
  async getQueryHistory(limit = 10) {
    try {
      const records = await this.gristAPI.fetchTable(this.queryTableName);

      return records
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    } catch (error) {
      console.error('[WebhookHandler] Error fetching query history:', error);
      return [];
    }
  }

  /**
   * Clear completed queries older than X days
   *
   * @param {number} daysOld - Age threshold in days
   */
  async cleanupOldQueries(daysOld = 7) {
    try {
      const records = await this.gristAPI.fetchTable(this.queryTableName);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const toDelete = records.filter(r => {
        const createdAt = new Date(r.created_at);
        return (r.status === 'success' || r.status === 'error') &&
               createdAt < cutoffDate;
      });

      if (toDelete.length > 0) {
        console.log(`[WebhookHandler] Cleaning up ${toDelete.length} old queries`);

        for (const record of toDelete) {
          await this.gristAPI.deleteRecord(this.queryTableName, record.id);
        }
      }
    } catch (error) {
      console.error('[WebhookHandler] Cleanup error:', error);
    }
  }

  /**
   * Create query table (helper for setup)
   *
   * @returns {Object} Table creation result
   */
  static getTableSchema() {
    return {
      tableName: 'AgentQueries',
      columns: [
        {
          id: 'query_json',
          label: 'Query JSON',
          type: 'Text',
          description: 'Structured query from n8n/LLM (JSON format)'
        },
        {
          id: 'status',
          label: 'Status',
          type: 'Choice',
          widgetOptions: JSON.stringify({
            choices: ['pending', 'processing', 'success', 'error']
          }),
          description: 'Query execution status'
        },
        {
          id: 'result_json',
          label: 'Result JSON',
          type: 'Text',
          description: 'Execution result (JSON format)'
        },
        {
          id: 'error_message',
          label: 'Error Message',
          type: 'Text',
          description: 'Error details if status=error'
        },
        {
          id: 'created_at',
          label: 'Created At',
          type: 'DateTime',
          formula: 'NOW()',
          description: 'Timestamp when query was created'
        },
        {
          id: 'executed_at',
          label: 'Executed At',
          type: 'DateTime',
          description: 'Timestamp when query was executed'
        }
      ]
    };
  }
}

// Singleton instance
const webhookHandler = new WebhookHandler();

export default webhookHandler;
export { WebhookHandler };
