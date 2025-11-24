/**
 * StyleRuleEngine - Apply data-driven styling rules
 *
 * Supports 4 types of rules:
 * - Categorized: Different color per category
 * - Graduated: Color gradient based on numeric ranges
 * - Proportional: Size based on numeric value
 * - Expression: Style based on calculated expression
 */

import StyleManager from './StyleManager';

class StyleRuleEngine {
  /**
   * Apply a style rule to a feature
   */
  applyStyleRule(feature, rule) {
    if (!rule || !rule.type) {
      return StyleManager.getDefaultStyle(feature.geometry_type);
    }

    try {
      const properties = typeof feature.properties === 'string'
        ? JSON.parse(feature.properties)
        : (feature.properties || {});

      const geometryType = feature.geometry_type;

      switch (rule.type) {
        case 'categorized':
          return this.applyCategorized(properties, geometryType, rule);

        case 'graduated':
          return this.applyGraduated(properties, geometryType, rule);

        case 'proportional':
          return this.applyProportional(properties, geometryType, rule);

        case 'expression':
          return this.applyExpression(properties, geometryType, rule);

        default:
          return StyleManager.getDefaultStyle(geometryType);
      }
    } catch (error) {
      console.error('[StyleRuleEngine] Error applying rule:', error);
      return StyleManager.getDefaultStyle(feature.geometry_type);
    }
  }

  /**
   * Apply categorized styling (unique values)
   */
  applyCategorized(properties, geometryType, rule) {
    const value = properties[rule.field];
    const category = rule.categories?.find(c => c.value === value);
    const color = category ? category.color : (rule.defaultColor || '#cccccc');

    return this.createStyleForGeometry(geometryType, {
      color,
      fillColor: color,
      weight: rule.weight || 2,
      fillOpacity: rule.fillOpacity || 0.5,
      opacity: rule.opacity || 0.8
    });
  }

  /**
   * Apply graduated styling (numeric ranges)
   */
  applyGraduated(properties, geometryType, rule) {
    const value = Number(properties[rule.field]);

    if (isNaN(value)) {
      const color = rule.defaultColor || '#cccccc';
      return this.createStyleForGeometry(geometryType, { color, fillColor: color });
    }

    // Find the range this value falls into
    const range = rule.ranges?.find(r => value >= r.min && value < r.max);

    // If value equals max of last range, include it
    if (!range && rule.ranges?.length > 0) {
      const lastRange = rule.ranges[rule.ranges.length - 1];
      if (value === lastRange.max) {
        const color = lastRange.color;
        return this.createStyleForGeometry(geometryType, {
          color,
          fillColor: color,
          weight: rule.weight || 2,
          fillOpacity: rule.fillOpacity || 0.5,
          opacity: rule.opacity || 0.8
        });
      }
    }

    const color = range ? range.color : (rule.defaultColor || '#cccccc');

    return this.createStyleForGeometry(geometryType, {
      color,
      fillColor: color,
      weight: rule.weight || 2,
      fillOpacity: rule.fillOpacity || 0.5,
      opacity: rule.opacity || 0.8
    });
  }

  /**
   * Apply proportional sizing
   */
  applyProportional(properties, geometryType, rule) {
    const value = Number(properties[rule.field]);

    if (isNaN(value)) {
      return this.createStyleForGeometry(geometryType, {
        color: rule.color || '#3b82f6',
        fillColor: rule.color || '#3b82f6'
      });
    }

    // Calculate size based on value
    const minVal = rule.minValue || 0;
    const maxVal = rule.maxValue || 100;
    const minSize = rule.minSize || 5;
    const maxSize = rule.maxSize || 30;

    const ratio = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
    const size = minSize + ratio * (maxSize - minSize);

    const type = geometryType?.toUpperCase();

    // For points: radius
    if (type?.includes('POINT')) {
      return {
        color: rule.color || '#3b82f6',
        fillColor: rule.fillColor || rule.color || '#3b82f6',
        fillOpacity: rule.fillOpacity || 0.6,
        radius: Math.max(minSize, Math.min(size, maxSize)),
        weight: 2
      };
    }

    // For lines: weight
    if (type?.includes('LINE')) {
      return {
        color: rule.color || '#3b82f6',
        weight: Math.max(1, Math.min(size / 3, 10)),
        opacity: rule.opacity || 0.8
      };
    }

    // For polygons: use color with opacity proportional to value
    return {
      color: rule.color || '#3b82f6',
      fillColor: rule.fillColor || rule.color || '#3b82f6',
      fillOpacity: 0.3 + ratio * 0.4, // 0.3 to 0.7
      weight: 2,
      opacity: 0.8
    };
  }

  /**
   * Apply expression-based styling
   */
  applyExpression(properties, geometryType, rule) {
    try {
      // Evaluate expression
      const value = this.evaluateExpression(rule.expression, properties);

      // Apply as graduated style
      const range = rule.ranges?.find(r => value >= r.min && value < r.max);
      const color = range ? range.color : (rule.defaultColor || '#cccccc');

      return this.createStyleForGeometry(geometryType, {
        color,
        fillColor: color,
        weight: rule.weight || 2,
        fillOpacity: rule.fillOpacity || 0.5,
        opacity: rule.opacity || 0.8
      });
    } catch (error) {
      console.error('[StyleRuleEngine] Expression error:', error);
      return StyleManager.getDefaultStyle(geometryType);
    }
  }

  /**
   * Safely evaluate expression
   */
  evaluateExpression(expression, properties) {
    // Replace field names with values
    let expr = expression;

    // Sort keys by length (longest first) to avoid partial replacements
    const keys = Object.keys(properties).sort((a, b) => b.length - a.length);

    keys.forEach(key => {
      const value = properties[key];
      if (typeof value === 'number') {
        // Replace field name with numeric value
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
      }
    });

    // Evaluate safely (only basic math operators)
    // Remove any potentially dangerous characters
    expr = expr.replace(/[^0-9+\-*/(). ]/g, '');

    try {
      // Use Function constructor (safer than eval)
      const result = Function(`"use strict"; return (${expr})`)();
      return typeof result === 'number' ? result : 0;
    } catch (err) {
      console.warn('[StyleRuleEngine] Expression evaluation failed:', expr, err);
      return 0;
    }
  }

  /**
   * Create appropriate style for geometry type
   */
  createStyleForGeometry(geometryType, options) {
    const base = StyleManager.getDefaultStyle(geometryType);
    return { ...base, ...options };
  }

  /**
   * Generate legend items from rule
   */
  generateLegendItems(rule) {
    if (!rule) return [];

    switch (rule.type) {
      case 'categorized':
        return rule.categories?.map(cat => ({
          label: cat.label || cat.value,
          color: cat.color,
          type: 'category'
        })) || [];

      case 'graduated':
        return rule.ranges?.map((range, idx) => {
          let label;
          if (range.label) {
            label = range.label;
          } else if (idx === rule.ranges.length - 1) {
            label = `${this.formatValue(range.min)} - ${this.formatValue(range.max)}`;
          } else {
            label = `${this.formatValue(range.min)} - ${this.formatValue(range.max)}`;
          }

          return {
            label,
            color: range.color,
            type: 'range',
            min: range.min,
            max: range.max
          };
        }) || [];

      case 'proportional':
        return [
          {
            label: `${this.formatValue(rule.minValue)} (min)`,
            size: rule.minSize,
            color: rule.color,
            type: 'size'
          },
          {
            label: `${this.formatValue(rule.maxValue)} (max)`,
            size: rule.maxSize,
            color: rule.color,
            type: 'size'
          }
        ];

      case 'expression':
        return rule.ranges?.map(range => ({
          label: range.label || `${this.formatValue(range.min)} - ${this.formatValue(range.max)}`,
          color: range.color,
          type: 'range'
        })) || [];

      default:
        return [];
    }
  }

  /**
   * Format numeric value for display
   */
  formatValue(value) {
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '-∞';
    if (typeof value !== 'number') return String(value);

    // Format with appropriate precision
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    if (Math.abs(value) >= 100) {
      return Math.round(value).toString();
    }
    if (Math.abs(value) >= 1) {
      return value.toFixed(1);
    }
    return value.toFixed(2);
  }
}

export default new StyleRuleEngine();
