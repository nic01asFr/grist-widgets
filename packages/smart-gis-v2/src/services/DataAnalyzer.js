/**
 * DataAnalyzer - Analyze layer data for styling and querying
 *
 * Features:
 * - Field analysis (type, min/max, unique values, distribution)
 * - Classification methods (quantile, equal interval, natural breaks)
 * - Smart suggestions for styling
 * - Statistics computation
 */

class DataAnalyzer {
  /**
   * Analyze a field across all features in a layer
   */
  analyzeField(features, fieldName) {
    // Extract values from properties
    const values = features
      .map(f => {
        try {
          const props = typeof f.properties === 'string'
            ? JSON.parse(f.properties)
            : (f.properties || {});
          return props[fieldName];
        } catch {
          return null;
        }
      })
      .filter(v => v != null && v !== '');

    if (values.length === 0) {
      return {
        type: 'empty',
        count: 0,
        error: 'No valid values found'
      };
    }

    // Infer type
    const type = this.inferType(values);

    if (type === 'number') {
      return this.analyzeNumericField(values, fieldName);
    }

    if (type === 'string') {
      return this.analyzeStringField(values, fieldName);
    }

    if (type === 'boolean') {
      return this.analyzeBooleanField(values, fieldName);
    }

    return {
      type: 'unknown',
      count: values.length
    };
  }

  /**
   * Analyze numeric field
   */
  analyzeNumericField(values, fieldName) {
    // Convert all values to numbers (they might be strings that look like numbers)
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));

    if (numericValues.length === 0) {
      return {
        type: 'number',
        fieldName,
        count: 0,
        error: 'No valid numeric values'
      };
    }

    const sorted = numericValues.sort((a, b) => a - b);
    const sum = numericValues.reduce((acc, v) => acc + v, 0);
    const mean = sum / numericValues.length;

    // Calculate standard deviation
    const variance = numericValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numericValues.length;
    const stdDev = Math.sqrt(variance);

    // Calculate unique values (useful for categorized styling of numeric fields like IDs, codes, etc.)
    const uniqueValues = [...new Set(numericValues)].sort((a, b) => a - b);

    return {
      type: 'number',
      fieldName,
      count: numericValues.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev,

      // Unique values (for categorized styling)
      uniqueValues,
      uniqueCount: uniqueValues.length,

      // Suggest number of classes based on data distribution
      suggestedClasses: this.suggestClassCount(numericValues.length),

      // Pre-calculate breaks for different methods
      breaks: {
        quantile: this.calculateQuantileBreaks(sorted, 5),
        equalInterval: this.calculateEqualIntervalBreaks(sorted[0], sorted[sorted.length - 1], 5),
        naturalBreaks: this.calculateJenksBreaks(sorted, 5)
      }
    };
  }

  /**
   * Analyze string field
   */
  analyzeStringField(values, fieldName) {
    const unique = [...new Set(values)];
    const distribution = {};

    values.forEach(v => {
      distribution[v] = (distribution[v] || 0) + 1;
    });

    // Sort by frequency
    const sorted = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count, percentage: (count / values.length * 100).toFixed(1) }));

    return {
      type: 'string',
      fieldName,
      count: values.length,
      uniqueCount: unique.length,
      uniqueValues: unique,
      distribution: sorted,

      // Suggest if suitable for categorized styling
      suitableForCategorized: unique.length <= 20,
      topValues: sorted.slice(0, 10)
    };
  }

  /**
   * Analyze boolean field
   */
  analyzeBooleanField(values, fieldName) {
    const trueCount = values.filter(v => v === true || v === 'true' || v === 1).length;
    const falseCount = values.length - trueCount;

    return {
      type: 'boolean',
      fieldName,
      count: values.length,
      trueCount,
      falseCount,
      truePercentage: (trueCount / values.length * 100).toFixed(1),
      falsePercentage: (falseCount / values.length * 100).toFixed(1)
    };
  }

  /**
   * Infer field type from values
   */
  inferType(values) {
    const sample = values.slice(0, Math.min(100, values.length));

    // Check if all are numbers
    if (sample.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
      return 'number';
    }

    // Check if all are booleans
    if (sample.every(v => typeof v === 'boolean' || v === 'true' || v === 'false')) {
      return 'boolean';
    }

    return 'string';
  }

  /**
   * Suggest optimal number of classes based on dataset size
   * Using Sturges' rule: k = 1 + log2(n)
   */
  suggestClassCount(n) {
    const sturges = Math.ceil(1 + Math.log2(n));
    return Math.max(3, Math.min(sturges, 7)); // Between 3 and 7 classes
  }

  /**
   * Calculate quantile breaks (equal count per class)
   */
  calculateQuantileBreaks(sortedValues, numClasses) {
    const breaks = [];
    const n = sortedValues.length;

    for (let i = 1; i < numClasses; i++) {
      const index = Math.floor((i / numClasses) * n);
      breaks.push(sortedValues[index]);
    }

    breaks.push(sortedValues[n - 1]); // Max value

    return breaks;
  }

  /**
   * Calculate equal interval breaks
   */
  calculateEqualIntervalBreaks(min, max, numClasses) {
    const breaks = [];
    const interval = (max - min) / numClasses;

    for (let i = 1; i <= numClasses; i++) {
      breaks.push(min + interval * i);
    }

    return breaks;
  }

  /**
   * Calculate Jenks Natural Breaks (simplified version)
   * For full implementation, would use jenks library
   */
  calculateJenksBreaks(sortedValues, numClasses) {
    // Simplified: Use quantile as approximation
    // For production, consider using 'simple-statistics' library
    return this.calculateQuantileBreaks(sortedValues, numClasses);
  }

  /**
   * Get suggested color schemes based on data type and range
   */
  getSuggestedColorSchemes(analysis) {
    if (analysis.type === 'number') {
      // For numeric data, suggest sequential color schemes
      return [
        {
          id: 'YlOrRd',
          name: 'Jaune-Orange-Rouge',
          colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
          type: 'sequential'
        },
        {
          id: 'YlGnBu',
          name: 'Jaune-Vert-Bleu',
          colors: ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84'],
          type: 'sequential'
        },
        {
          id: 'Blues',
          name: 'Bleus',
          colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
          type: 'sequential'
        },
        {
          id: 'Greens',
          name: 'Verts',
          colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'],
          type: 'sequential'
        },
        {
          id: 'Reds',
          name: 'Rouges',
          colors: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'],
          type: 'sequential'
        }
      ];
    }

    if (analysis.type === 'string' && analysis.suitableForCategorized) {
      // For categorical data, suggest qualitative schemes
      return [
        {
          id: 'Set1',
          name: 'Set 1 (Contrasté)',
          colors: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'],
          type: 'qualitative'
        },
        {
          id: 'Pastel',
          name: 'Pastel',
          colors: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
          type: 'qualitative'
        },
        {
          id: 'Dark',
          name: 'Sombre',
          colors: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
          type: 'qualitative'
        }
      ];
    }

    return [];
  }

  /**
   * Get all available fields from features
   */
  getAllFields(features) {
    const fieldsSet = new Set();

    features.forEach(f => {
      try {
        const props = typeof f.properties === 'string'
          ? JSON.parse(f.properties)
          : (f.properties || {});
        Object.keys(props).forEach(key => fieldsSet.add(key));
      } catch {
        // Skip invalid properties
      }
    });

    return Array.from(fieldsSet).sort();
  }

  /**
   * Quick field type detection (without full analysis)
   */
  quickFieldType(features, fieldName) {
    const sample = features.slice(0, 10).map(f => {
      try {
        const props = typeof f.properties === 'string'
          ? JSON.parse(f.properties)
          : (f.properties || {});
        return props[fieldName];
      } catch {
        return null;
      }
    }).filter(v => v != null);

    if (sample.length === 0) return 'unknown';

    return this.inferType(sample);
  }
}

export default new DataAnalyzer();
