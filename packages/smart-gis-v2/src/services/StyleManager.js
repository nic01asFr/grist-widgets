/**
 * StyleManager - Centralized style management for layers and features
 *
 * Features:
 * - Layer-level styles (apply to all features in a layer)
 * - Feature-level styles (override layer style)
 * - Style presets (professional color schemes)
 * - Hover effects
 * - Style persistence via StateManager
 */

import StateManager from '../core/StateManager';

class StyleManager {
  constructor() {
    this.stylePresets = {
      blue: {
        name: 'Bleu',
        icon: '🔵',
        point: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.6 },
        line: { color: '#3b82f6', weight: 3, opacity: 0.8 },
        polygon: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2 }
      },
      green: {
        name: 'Vert',
        icon: '🟢',
        point: { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.6 },
        line: { color: '#10b981', weight: 3, opacity: 0.8 },
        polygon: { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3, weight: 2 }
      },
      red: {
        name: 'Rouge',
        icon: '🔴',
        point: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 },
        line: { color: '#ef4444', weight: 3, opacity: 0.8 },
        polygon: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }
      },
      orange: {
        name: 'Orange',
        icon: '🟠',
        point: { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.6 },
        line: { color: '#f97316', weight: 3, opacity: 0.8 },
        polygon: { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.3, weight: 2 }
      },
      purple: {
        name: 'Violet',
        icon: '🟣',
        point: { color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.6 },
        line: { color: '#a855f7', weight: 3, opacity: 0.8 },
        polygon: { color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.3, weight: 2 }
      },
      yellow: {
        name: 'Jaune',
        icon: '🟡',
        point: { color: '#eab308', fillColor: '#eab308', fillOpacity: 0.6 },
        line: { color: '#eab308', weight: 3, opacity: 0.8 },
        polygon: { color: '#eab308', fillColor: '#eab308', fillOpacity: 0.3, weight: 2 }
      },
      teal: {
        name: 'Turquoise',
        icon: '🔷',
        point: { color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.6 },
        line: { color: '#14b8a6', weight: 3, opacity: 0.8 },
        polygon: { color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.3, weight: 2 }
      },
      pink: {
        name: 'Rose',
        icon: '🩷',
        point: { color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.6 },
        line: { color: '#ec4899', weight: 3, opacity: 0.8 },
        polygon: { color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.3, weight: 2 }
      },
      gray: {
        name: 'Gris',
        icon: '⚫',
        point: { color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.6 },
        line: { color: '#6b7280', weight: 3, opacity: 0.8 },
        polygon: { color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.3, weight: 2 }
      }
    };

    this.hoverEffects = {
      none: { name: 'Aucun', enabled: false },
      highlight: { name: 'Surbrillance', enabled: true, weightIncrease: 2, opacityIncrease: 0.2 },
      glow: { name: 'Halo', enabled: true, weightIncrease: 4, opacityIncrease: 0.3 },
      pulse: { name: 'Pulse', enabled: true, animation: true }
    };

    // Initialize state
    this.initializeState();
  }

  initializeState() {
    // Initialize style storage if not exists
    if (!StateManager.getState('styles.layers')) {
      StateManager.setState('styles.layers', {}, 'Initialize layer styles');
    }
    if (!StateManager.getState('styles.hoverEffect')) {
      StateManager.setState('styles.hoverEffect', 'highlight', 'Initialize hover effect');
    }
  }

  /**
   * Get all style presets
   */
  getStylePresets() {
    return this.stylePresets;
  }

  /**
   * Get hover effects
   */
  getHoverEffects() {
    return this.hoverEffects;
  }

  /**
   * Get style for a specific layer
   */
  getLayerStyle(layerName) {
    const layerStyles = StateManager.getState('styles.layers');
    return layerStyles[layerName] || null;
  }

  /**
   * Set style for a layer
   */
  setLayerStyle(layerName, style) {
    const layerStyles = StateManager.getState('styles.layers');
    layerStyles[layerName] = {
      ...style,
      updatedAt: Date.now()
    };

    StateManager.setState('styles.layers', layerStyles, `Update style for ${layerName}`);
    console.log('[StyleManager] Updated style for layer:', layerName);
  }

  /**
   * Apply preset to layer
   */
  applyPresetToLayer(layerName, presetId, geometryType) {
    const preset = this.stylePresets[presetId];
    if (!preset) {
      console.warn('[StyleManager] Invalid preset:', presetId);
      return;
    }

    let style;
    const type = geometryType?.toUpperCase();

    if (type === 'POINT' || type === 'MULTIPOINT') {
      style = preset.point;
    } else if (type === 'LINESTRING' || type === 'MULTILINESTRING') {
      style = preset.line;
    } else if (type === 'POLYGON' || type === 'MULTIPOLYGON') {
      style = preset.polygon;
    } else {
      // Default to polygon style
      style = preset.polygon;
    }

    this.setLayerStyle(layerName, {
      preset: presetId,
      geometryType,
      ...style
    });
  }

  /**
   * Get computed style for a feature
   * Priority: feature style > layer style > default style
   */
  getFeatureStyle(feature, isHovered = false, isSelected = false) {
    const layerName = feature.layer_name;
    const geometryType = feature.geometry_type;

    // Start with layer style or default
    let style = this.getLayerStyle(layerName) || this.getDefaultStyle(geometryType);

    // Apply feature-specific style if exists
    if (feature.style) {
      try {
        const featureStyle = typeof feature.style === 'string'
          ? JSON.parse(feature.style)
          : feature.style;
        style = { ...style, ...featureStyle };
      } catch (err) {
        console.warn('[StyleManager] Invalid feature style:', err);
      }
    }

    // Apply selection style (highest priority)
    if (isSelected) {
      return this.applySelectionStyle(style);
    }

    // Apply hover effect
    if (isHovered) {
      const hoverEffect = StateManager.getState('styles.hoverEffect') || 'highlight';
      return this.applyHoverEffect(style, hoverEffect);
    }

    return style;
  }

  /**
   * Get default style based on geometry type
   */
  getDefaultStyle(geometryType) {
    const type = geometryType?.toUpperCase();

    const defaults = {
      POINT: {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.6,
        radius: 8,
        weight: 2
      },
      LINESTRING: {
        color: '#ff7800',
        weight: 3,
        opacity: 0.8
      },
      POLYGON: {
        color: '#ff7800',
        fillColor: '#ff7800',
        fillOpacity: 0.3,
        weight: 2
      }
    };

    if (type?.includes('POINT')) return defaults.POINT;
    if (type?.includes('LINE')) return defaults.LINESTRING;
    if (type?.includes('POLYGON')) return defaults.POLYGON;

    return defaults.POLYGON;
  }

  /**
   * Apply selection style
   */
  applySelectionStyle(baseStyle) {
    return {
      ...baseStyle,
      color: '#ffff00',
      fillColor: '#ffff00',
      weight: (baseStyle.weight || 2) + 2,
      fillOpacity: Math.min((baseStyle.fillOpacity || 0.3) + 0.2, 1)
    };
  }

  /**
   * Apply hover effect
   */
  applyHoverEffect(baseStyle, effectType) {
    const effect = this.hoverEffects[effectType];
    if (!effect || !effect.enabled) {
      return baseStyle;
    }

    return {
      ...baseStyle,
      weight: (baseStyle.weight || 2) + (effect.weightIncrease || 0),
      fillOpacity: Math.min((baseStyle.fillOpacity || 0.3) + (effect.opacityIncrease || 0), 1),
      opacity: Math.min((baseStyle.opacity || 0.8) + (effect.opacityIncrease || 0), 1)
    };
  }

  /**
   * Set current hover effect
   */
  setHoverEffect(effectType) {
    if (this.hoverEffects[effectType]) {
      StateManager.setState('styles.hoverEffect', effectType, 'Update hover effect');
      console.log('[StyleManager] Hover effect set to:', effectType);
    }
  }

  /**
   * Reset layer style to default
   */
  resetLayerStyle(layerName) {
    const layerStyles = StateManager.getState('styles.layers');
    delete layerStyles[layerName];
    StateManager.setState('styles.layers', layerStyles, `Reset style for ${layerName}`);
    console.log('[StyleManager] Reset style for layer:', layerName);
  }

  /**
   * Get all configured layer styles
   */
  getAllLayerStyles() {
    return StateManager.getState('styles.layers') || {};
  }

  /**
   * Create custom style
   */
  createCustomStyle(config) {
    const { color, fillColor, fillOpacity, weight, opacity, radius } = config;

    return {
      color: color || '#3388ff',
      fillColor: fillColor || color || '#3388ff',
      fillOpacity: fillOpacity !== undefined ? fillOpacity : 0.3,
      weight: weight !== undefined ? weight : 2,
      opacity: opacity !== undefined ? opacity : 0.8,
      radius: radius !== undefined ? radius : 8
    };
  }
}

export default new StyleManager();
