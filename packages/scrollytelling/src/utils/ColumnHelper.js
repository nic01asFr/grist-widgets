/**
 * ColumnHelper - Safe access to mapped columns
 * Prevents undefined errors when accessing Grist columns
 */
export class ColumnHelper {
  constructor(mappings = {}) {
    this.mappings = mappings;
  }

  updateMappings(mappings) {
    this.mappings = mappings || {};
  }

  getValue(record, columnName, defaultValue = null) {
    if (!record || !this.mappings[columnName]) {
      return defaultValue;
    }
    const value = record[this.mappings[columnName]];
    return value !== undefined && value !== null ? value : defaultValue;
  }

  hasColumn(columnName) {
    return !!this.mappings[columnName];
  }

  getColumnName(columnName) {
    return this.mappings[columnName] || null;
  }
}
