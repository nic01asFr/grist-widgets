/**
 * Wrapper for Grist Plugin API
 *
 * Documentation: https://support.getgrist.com/api/
 *
 * Handles:
 * - Initialization and connection
 * - Table CRUD operations
 * - Columnar data conversion
 * - Event subscriptions
 */

class GristAPI {
  constructor() {
    this.docApi = null;
    this.ready = false;
  }

  /**
   * Initialize connection to Grist
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window.grist === 'undefined') {
          throw new Error('Grist API not available. Running in demo mode.');
        }

        window.grist.ready({
          requiredAccess: 'full',
          allowSelectBy: true,
          columns: []
        });

        this.docApi = window.grist.docApi;
        this.ready = true;

        console.log('✅ Grist API initialized');
        resolve(this.docApi);
      } catch (error) {
        console.error('❌ Grist initialization failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Convert columnar Grist data to array of objects
   *
   * Input:  { id: [1,2], name: ['A','B'], geometry: ['POINT(0 0)', 'POINT(1 1)'] }
   * Output: [{ id: 1, name: 'A', geometry: 'POINT(0 0)' }, { id: 2, ... }]
   */
  convertTableData(tableData) {
    if (!tableData || typeof tableData !== 'object') return [];
    if (Array.isArray(tableData)) return tableData;

    const columns = Object.keys(tableData);
    if (columns.length === 0) return [];

    const rowCount = tableData[columns[0]].length;
    const records = [];

    for (let i = 0; i < rowCount; i++) {
      const record = {};
      columns.forEach(col => {
        record[col] = tableData[col][i];
      });
      records.push(record);
    }

    return records;
  }

  /**
   * Fetch table data
   */
  async fetchTable(tableId) {
    if (!this.ready) {
      throw new Error('Grist not initialized');
    }

    const tableData = await this.docApi.fetchTable(tableId);
    return this.convertTableData(tableData);
  }

  /**
   * List all tables in document
   */
  async listTables() {
    if (!this.ready) return [];
    return await this.docApi.listTables();
  }

  /**
   * Add records (bulk insert)
   *
   * @param {string} tableId - Table name
   * @param {array} records - [{col1: val1, col2: val2}, ...]
   */
  async addRecords(tableId, records) {
    if (!this.ready || records.length === 0) return;

    const columns = Object.keys(records[0]);
    const data = {};

    columns.forEach(col => {
      data[col] = records.map(r => r[col]);
    });

    const ids = records.map(() => null);

    await this.docApi.applyUserActions([
      ['BulkAddRecord', tableId, ids, data]
    ]);
  }

  /**
   * Update records
   *
   * @param {string} tableId
   * @param {array} updates - [{id: 1, col1: newVal}, {id: 2, col2: newVal2}]
   */
  async updateRecords(tableId, updates) {
    if (!this.ready || updates.length === 0) return;

    const ids = updates.map(u => u.id);
    const columns = Object.keys(updates[0]).filter(k => k !== 'id');

    const data = {};
    columns.forEach(col => {
      data[col] = updates.map(u => u[col]);
    });

    await this.docApi.applyUserActions([
      ['BulkUpdateRecord', tableId, ids, data]
    ]);
  }

  /**
   * Delete records
   */
  async deleteRecords(tableId, ids) {
    if (!this.ready || ids.length === 0) return;

    await this.docApi.applyUserActions([
      ['BulkRemoveRecord', tableId, ids]
    ]);
  }

  /**
   * Create table with schema
   */
  async createTable(tableName, schema) {
    if (!this.ready) return;

    await this.docApi.applyUserActions([
      ['AddTable', tableName, schema.columns]
    ]);

    // Add formula columns if present
    if (schema.formulas) {
      for (const [colName, formula] of Object.entries(schema.formulas)) {
        await this.docApi.applyUserActions([
          ['AddColumn', tableName, colName, {
            type: 'Any',
            isFormula: true,
            formula: formula
          }]
        ]);
      }
    }
  }

  /**
   * Listen to cursor selection changes
   */
  onRecordSelect(callback) {
    if (!this.ready) return;

    window.grist.onRecord((record, mappings) => {
      callback(record);
    });
  }

  /**
   * Listen to data changes (all visible rows)
   */
  onRecordsChange(callback) {
    if (!this.ready) return;

    window.grist.onRecords((records, mappings) => {
      const converted = this.convertTableData(records);
      callback(converted);
    });
  }

  /**
   * Set cursor position
   */
  async setCursorPos(rowId) {
    if (!this.ready) return;
    await window.grist.setCursorPos({ rowId });
  }
}

export default new GristAPI();
