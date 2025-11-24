/**
 * SelectionQueryEngine - Execute attribute queries on features
 *
 * Features:
 * - Multi-condition queries (AND/OR)
 * - Multiple operators (=, !=, >, <, LIKE, IN, BETWEEN, etc.)
 * - Safe evaluation
 * - SQL-like query building
 */

class SelectionQueryEngine {
  /**
   * Execute a query on features
   *
   * @param {Array} features - Array of features to query
   * @param {Object} query - Query object with conditions and operator
   * @returns {Array} Filtered features
   */
  executeQuery(features, query) {
    if (!query || !query.conditions || query.conditions.length === 0) {
      return features;
    }

    return features.filter(feature => {
      return this.evaluateConditions(feature, query.conditions, query.operator || 'AND');
    });
  }

  /**
   * Evaluate all conditions for a feature
   */
  evaluateConditions(feature, conditions, operator) {
    try {
      const properties = typeof feature.properties === 'string'
        ? JSON.parse(feature.properties)
        : (feature.properties || {});

      const results = conditions.map(condition => {
        return this.evaluateCondition(properties, condition);
      });

      return operator === 'AND'
        ? results.every(r => r)
        : results.some(r => r);
    } catch (error) {
      console.error('[SelectionQueryEngine] Error evaluating conditions:', error);
      return false;
    }
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(properties, condition) {
    const { field, operator, value } = condition;
    const fieldValue = properties[field];

    // Handle null/undefined field values
    if (fieldValue == null) {
      return operator === 'IS NULL';
    }

    switch (operator) {
      case '=':
      case '==':
        return this.equals(fieldValue, value);

      case '!=':
      case '<>':
        return !this.equals(fieldValue, value);

      case '>':
        return Number(fieldValue) > Number(value);

      case '<':
        return Number(fieldValue) < Number(value);

      case '>=':
        return Number(fieldValue) >= Number(value);

      case '<=':
        return Number(fieldValue) <= Number(value);

      case 'LIKE':
      case 'CONTAINS':
        return this.contains(fieldValue, value);

      case 'STARTS WITH':
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());

      case 'ENDS WITH':
        return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());

      case 'IN':
        return this.isIn(fieldValue, value);

      case 'NOT IN':
        return !this.isIn(fieldValue, value);

      case 'BETWEEN':
        return this.isBetween(fieldValue, value);

      case 'IS NULL':
        return fieldValue == null;

      case 'IS NOT NULL':
        return fieldValue != null;

      case 'IS EMPTY':
        return fieldValue === '' || fieldValue == null;

      case 'IS NOT EMPTY':
        return fieldValue !== '' && fieldValue != null;

      default:
        console.warn('[SelectionQueryEngine] Unknown operator:', operator);
        return false;
    }
  }

  /**
   * Equality check (type-safe)
   */
  equals(a, b) {
    // String comparison (case-insensitive)
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }

    // Numeric comparison
    if (!isNaN(Number(a)) && !isNaN(Number(b))) {
      return Number(a) === Number(b);
    }

    // Default comparison
    return a == b;
  }

  /**
   * Contains check (case-insensitive)
   */
  contains(haystack, needle) {
    if (haystack == null || needle == null) return false;

    return String(haystack)
      .toLowerCase()
      .includes(String(needle).toLowerCase());
  }

  /**
   * IN operator (value in array)
   */
  isIn(value, array) {
    if (!Array.isArray(array)) {
      array = [array];
    }

    return array.some(item => this.equals(value, item));
  }

  /**
   * BETWEEN operator
   */
  isBetween(value, range) {
    if (!Array.isArray(range) || range.length !== 2) {
      console.warn('[SelectionQueryEngine] BETWEEN requires array of 2 values');
      return false;
    }

    const numValue = Number(value);
    const [min, max] = range.map(Number);

    return !isNaN(numValue) && numValue >= min && numValue <= max;
  }

  /**
   * Get available operators for a field type
   */
  getOperatorsForType(fieldType) {
    const common = [
      { value: '=', label: 'Égal à', needsValue: true },
      { value: '!=', label: 'Différent de', needsValue: true },
      { value: 'IS NULL', label: 'Est vide', needsValue: false },
      { value: 'IS NOT NULL', label: 'N\'est pas vide', needsValue: false }
    ];

    if (fieldType === 'number') {
      return [
        ...common,
        { value: '>', label: 'Supérieur à', needsValue: true },
        { value: '<', label: 'Inférieur à', needsValue: true },
        { value: '>=', label: 'Supérieur ou égal', needsValue: true },
        { value: '<=', label: 'Inférieur ou égal', needsValue: true },
        { value: 'BETWEEN', label: 'Entre', needsValue: true, valueType: 'range' }
      ];
    }

    if (fieldType === 'string') {
      return [
        ...common,
        { value: 'LIKE', label: 'Contient', needsValue: true },
        { value: 'STARTS WITH', label: 'Commence par', needsValue: true },
        { value: 'ENDS WITH', label: 'Finit par', needsValue: true },
        { value: 'IN', label: 'Parmi', needsValue: true, valueType: 'list' },
        { value: 'NOT IN', label: 'Pas parmi', needsValue: true, valueType: 'list' },
        { value: 'IS EMPTY', label: 'Est vide', needsValue: false },
        { value: 'IS NOT EMPTY', label: 'N\'est pas vide', needsValue: false }
      ];
    }

    return common;
  }

  /**
   * Convert query to SQL-like string (for display/debug)
   */
  toSQLString(query) {
    if (!query || !query.conditions || query.conditions.length === 0) {
      return '';
    }

    const conditions = query.conditions.map(c => {
      const { field, operator, value } = c;

      if (operator === 'IS NULL' || operator === 'IS NOT NULL' ||
          operator === 'IS EMPTY' || operator === 'IS NOT EMPTY') {
        return `${field} ${operator}`;
      }

      if (operator === 'LIKE' || operator === 'CONTAINS') {
        return `${field} LIKE '%${value}%'`;
      }

      if (operator === 'STARTS WITH') {
        return `${field} LIKE '${value}%'`;
      }

      if (operator === 'ENDS WITH') {
        return `${field} LIKE '%${value}'`;
      }

      if (operator === 'IN' || operator === 'NOT IN') {
        const values = Array.isArray(value) ? value.join(', ') : value;
        return `${field} ${operator} (${values})`;
      }

      if (operator === 'BETWEEN') {
        const [min, max] = Array.isArray(value) ? value : [value, value];
        return `${field} BETWEEN ${min} AND ${max}`;
      }

      // Default format
      if (typeof value === 'string') {
        return `${field} ${operator} '${value}'`;
      }

      return `${field} ${operator} ${value}`;
    });

    return conditions.join(` ${query.operator || 'AND'} `);
  }

  /**
   * Validate query structure
   */
  validateQuery(query) {
    if (!query) {
      return { valid: false, error: 'Query is required' };
    }

    if (!query.conditions || !Array.isArray(query.conditions)) {
      return { valid: false, error: 'Conditions array is required' };
    }

    if (query.conditions.length === 0) {
      return { valid: false, error: 'At least one condition is required' };
    }

    // Validate each condition
    for (let i = 0; i < query.conditions.length; i++) {
      const condition = query.conditions[i];

      if (!condition.field) {
        return { valid: false, error: `Condition ${i + 1}: Field is required` };
      }

      if (!condition.operator) {
        return { valid: false, error: `Condition ${i + 1}: Operator is required` };
      }

      // Check if value is required for this operator
      const operatorInfo = this.getOperatorsForType('string')
        .concat(this.getOperatorsForType('number'))
        .find(op => op.value === condition.operator);

      if (operatorInfo?.needsValue && condition.value == null) {
        return { valid: false, error: `Condition ${i + 1}: Value is required for operator ${condition.operator}` };
      }
    }

    return { valid: true };
  }

  /**
   * Build a simple query from user-friendly format
   */
  buildQuery(field, operator, value, additionalConditions = []) {
    return {
      conditions: [
        { field, operator, value },
        ...additionalConditions
      ],
      operator: 'AND'
    };
  }
}

export default new SelectionQueryEngine();
