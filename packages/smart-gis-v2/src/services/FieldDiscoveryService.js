/**
 * FieldDiscoveryService - Discover and categorize WFS layer fields dynamically
 *
 * Uses WFS DescribeFeatureType to fetch schema information for any layer,
 * then categorizes fields to help users build appropriate filters.
 *
 * Approach:
 * - Query DescribeFeatureType (returns XSD schema)
 * - Parse field names and types
 * - Categorize fields (identifiers, names, geography, demographics, etc.)
 * - Suggest appropriate operators for each field type
 *
 * Benefits:
 * - No hardcoded field names
 * - Works with any WFS layer
 * - Adapts to API changes automatically
 * - User-friendly filter suggestions
 */

class FieldDiscoveryService {
  constructor() {
    this.schemaCache = new Map();
    this.categoryCache = new Map();
  }

  /**
   * Get schema for a WFS layer (with caching)
   *
   * @param {string} serviceUrl - WFS service URL (e.g., 'https://data.geopf.fr/wfs')
   * @param {string} typeName - Layer type name (e.g., 'ADMINEXPRESS-COG-CARTO.LATEST:commune')
   * @returns {Promise<Array>} Array of field objects: [{name, type, xsdType}, ...]
   */
  async getLayerSchema(serviceUrl, typeName) {
    const cacheKey = `${serviceUrl}::${typeName}`;

    // Check cache first
    if (this.schemaCache.has(cacheKey)) {
      console.log('[FieldDiscovery] Using cached schema for:', typeName);
      return this.schemaCache.get(cacheKey);
    }

    console.log('[FieldDiscovery] Fetching schema for:', typeName);

    try {
      const url = `${serviceUrl}?` +
        `service=WFS&` +
        `version=2.0.0&` +
        `request=DescribeFeatureType&` +
        `typeName=${encodeURIComponent(typeName)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`DescribeFeatureType failed: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const fields = this.parseXSDSchema(xmlText);

      // Cache the result
      this.schemaCache.set(cacheKey, fields);

      console.log(`[FieldDiscovery] ✅ Discovered ${fields.length} fields for ${typeName}`);

      return fields;

    } catch (error) {
      console.error('[FieldDiscovery] Error fetching schema:', error);
      throw error;
    }
  }

  /**
   * Parse XSD schema XML to extract field definitions
   *
   * @param {string} xmlText - Raw XSD XML response
   * @returns {Array} Parsed fields
   */
  parseXSDSchema(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const fields = [];
    const elements = xmlDoc.getElementsByTagName('xsd:element');

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const name = element.getAttribute('name');
      const xsdType = element.getAttribute('type');

      // Skip geometry fields (handled separately)
      if (name === 'geometry' || name === 'geom' || name === 'the_geom') {
        continue;
      }

      // Skip if no name
      if (!name) continue;

      // Map XSD type to simple type
      let type = 'string'; // default
      if (xsdType) {
        if (xsdType.includes('int') || xsdType.includes('long') ||
            xsdType.includes('short') || xsdType.includes('decimal') ||
            xsdType.includes('double') || xsdType.includes('float')) {
          type = 'number';
        } else if (xsdType.includes('date') || xsdType.includes('time')) {
          type = 'date';
        } else if (xsdType.includes('boolean')) {
          type = 'boolean';
        }
      }

      fields.push({
        name,
        type,
        xsdType: xsdType || 'unknown'
      });
    }

    return fields;
  }

  /**
   * Categorize fields based on name patterns and types
   *
   * Categories:
   * - identifiers: Unique codes (insee, id, code)
   * - names: Human-readable names (nom, name, label)
   * - geography: Geographic references (postal code, region, department)
   * - demographics: Population, density
   * - measures: Areas, lengths, counts
   * - dates: Creation, modification dates
   * - other: Everything else
   *
   * @param {Array} fields - Field array from getLayerSchema()
   * @returns {Object} Categorized fields
   */
  categorizeFields(fields) {
    const categories = {
      identifiers: [],
      names: [],
      geography: [],
      demographics: [],
      measures: [],
      dates: [],
      other: []
    };

    fields.forEach(field => {
      const nameLower = field.name.toLowerCase();

      // Identifiers: codes, IDs
      if (nameLower.includes('code') || nameLower.includes('insee') ||
          nameLower.includes('_id') || nameLower === 'id' ||
          nameLower.includes('cleabs') || nameLower.includes('gml_id')) {
        categories.identifiers.push(field);
      }
      // Names: human-readable labels
      else if (nameLower.includes('nom') || nameLower.includes('name') ||
               nameLower.includes('label') || nameLower.includes('libelle')) {
        categories.names.push(field);
      }
      // Geography: administrative divisions
      else if (nameLower.includes('postal') || nameLower.includes('region') ||
               nameLower.includes('departement') || nameLower.includes('commune') ||
               nameLower.includes('arrondissement') || nameLower.includes('canton')) {
        categories.geography.push(field);
      }
      // Demographics: population, density
      else if (nameLower.includes('population') || nameLower.includes('habitants') ||
               nameLower.includes('densite') || nameLower.includes('density')) {
        categories.demographics.push(field);
      }
      // Measures: areas, lengths, counts
      else if (nameLower.includes('surface') || nameLower.includes('area') ||
               nameLower.includes('superficie') || nameLower.includes('length') ||
               nameLower.includes('longueur') || nameLower.includes('count') ||
               nameLower.includes('nombre')) {
        categories.measures.push(field);
      }
      // Dates
      else if (field.type === 'date' || nameLower.includes('date') ||
               nameLower.includes('creation') || nameLower.includes('modification')) {
        categories.dates.push(field);
      }
      // Everything else
      else {
        categories.other.push(field);
      }
    });

    return categories;
  }

  /**
   * Get suggested CQL filter operators for a field
   *
   * @param {Object} field - Field object {name, type, xsdType}
   * @returns {Array} Array of operator suggestions
   */
  getSuggestedOperators(field) {
    const operators = [];

    switch (field.type) {
      case 'string':
        operators.push(
          {
            op: 'LIKE',
            label: 'Contient',
            example: `${field.name} LIKE '%Paris%'`,
            needsValue: true,
            valueType: 'text'
          },
          {
            op: '=',
            label: 'Égal à',
            example: `${field.name} = 'Paris'`,
            needsValue: true,
            valueType: 'text'
          },
          {
            op: 'IN',
            label: 'Parmi (liste)',
            example: `${field.name} IN ('Paris', 'Lyon', 'Marseille')`,
            needsValue: true,
            valueType: 'list'
          }
        );
        break;

      case 'number':
        operators.push(
          {
            op: '=',
            label: 'Égal à',
            example: `${field.name} = 100000`,
            needsValue: true,
            valueType: 'number'
          },
          {
            op: '>',
            label: 'Supérieur à',
            example: `${field.name} > 100000`,
            needsValue: true,
            valueType: 'number'
          },
          {
            op: '<',
            label: 'Inférieur à',
            example: `${field.name} < 100000`,
            needsValue: true,
            valueType: 'number'
          },
          {
            op: 'BETWEEN',
            label: 'Entre',
            example: `${field.name} BETWEEN 10000 AND 100000`,
            needsValue: true,
            valueType: 'range'
          }
        );
        break;

      case 'date':
        operators.push(
          {
            op: '>',
            label: 'Après',
            example: `${field.name} > '2020-01-01'`,
            needsValue: true,
            valueType: 'date'
          },
          {
            op: '<',
            label: 'Avant',
            example: `${field.name} < '2020-01-01'`,
            needsValue: true,
            valueType: 'date'
          },
          {
            op: 'BETWEEN',
            label: 'Entre',
            example: `${field.name} BETWEEN '2020-01-01' AND '2021-01-01'`,
            needsValue: true,
            valueType: 'daterange'
          }
        );
        break;

      case 'boolean':
        operators.push(
          {
            op: '=',
            label: 'Égal à',
            example: `${field.name} = true`,
            needsValue: true,
            valueType: 'boolean'
          }
        );
        break;

      default:
        operators.push(
          {
            op: '=',
            label: 'Égal à',
            example: `${field.name} = 'valeur'`,
            needsValue: true,
            valueType: 'text'
          }
        );
    }

    return operators;
  }

  /**
   * Get categorized schema with operators (all-in-one convenience method)
   *
   * @param {string} serviceUrl - WFS service URL
   * @param {string} typeName - Layer type name
   * @returns {Promise<Object>} Categorized fields with operator suggestions
   */
  async getEnrichedSchema(serviceUrl, typeName) {
    const cacheKey = `enriched::${serviceUrl}::${typeName}`;

    // Check cache
    if (this.categoryCache.has(cacheKey)) {
      return this.categoryCache.get(cacheKey);
    }

    // Fetch and parse schema
    const fields = await this.getLayerSchema(serviceUrl, typeName);

    // Categorize
    const categories = this.categorizeFields(fields);

    // Add operators to each field
    const enrichedCategories = {};
    for (const [categoryName, categoryFields] of Object.entries(categories)) {
      enrichedCategories[categoryName] = categoryFields.map(field => ({
        ...field,
        operators: this.getSuggestedOperators(field)
      }));
    }

    // Add summary stats
    const result = {
      typeName,
      totalFields: fields.length,
      categories: enrichedCategories,
      rawFields: fields
    };

    // Cache it
    this.categoryCache.set(cacheKey, result);

    return result;
  }

  /**
   * Build CQL filter string from field, operator, and value
   *
   * @param {string} fieldName - Field name
   * @param {string} operator - CQL operator (=, >, LIKE, etc.)
   * @param {*} value - Filter value(s)
   * @param {string} fieldType - Field type (string, number, date, etc.)
   * @returns {string} CQL filter string
   */
  buildCQLFilter(fieldName, operator, value, fieldType = 'string') {
    if (!value) return '';

    switch (operator) {
      case 'LIKE':
        return `${fieldName} LIKE '%${value}%'`;

      case '=':
        if (fieldType === 'string') {
          return `${fieldName} = '${value}'`;
        }
        return `${fieldName} = ${value}`;

      case '>':
      case '<':
      case '>=':
      case '<=':
        if (fieldType === 'string' || fieldType === 'date') {
          return `${fieldName} ${operator} '${value}'`;
        }
        return `${fieldName} ${operator} ${value}`;

      case 'BETWEEN':
        // value should be [min, max]
        if (Array.isArray(value) && value.length === 2) {
          if (fieldType === 'string' || fieldType === 'date') {
            return `${fieldName} BETWEEN '${value[0]}' AND '${value[1]}'`;
          }
          return `${fieldName} BETWEEN ${value[0]} AND ${value[1]}`;
        }
        return '';

      case 'IN':
        // value should be array
        if (Array.isArray(value)) {
          if (fieldType === 'string') {
            const quotedValues = value.map(v => `'${v}'`).join(', ');
            return `${fieldName} IN (${quotedValues})`;
          }
          return `${fieldName} IN (${value.join(', ')})`;
        }
        return '';

      default:
        return '';
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.schemaCache.clear();
    this.categoryCache.clear();
    console.log('[FieldDiscovery] Cache cleared');
  }
}

export default new FieldDiscoveryService();
