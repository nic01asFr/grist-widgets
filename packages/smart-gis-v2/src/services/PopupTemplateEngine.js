/**
 * PopupTemplateEngine - Configurable popup templates
 *
 * Features:
 * - Template-based popups with variable substitution
 * - Predefined templates (simple, detailed, custom)
 * - Field visibility control
 * - HTML sanitization
 * - Format helpers (numbers, dates, units)
 */

import StateManager from '../core/StateManager';

class PopupTemplateEngine {
  constructor() {
    this.templates = {
      simple: {
        id: 'simple',
        name: 'Simple',
        icon: '📝',
        description: 'Nom et type uniquement',
        render: (feature) => {
          return `
            <div class="popup-simple">
              <h4>${this.escape(feature.feature_name || feature.layer_name)}</h4>
              <p class="type-badge">${this.escape(feature.geometry_type || 'Feature')}</p>
            </div>
          `;
        }
      },

      detailed: {
        id: 'detailed',
        name: 'Détaillé',
        icon: '📋',
        description: 'Toutes les informations',
        render: (feature) => {
          const properties = this.parseProperties(feature.properties);
          const metrics = this.getMetrics(feature);

          return `
            <div class="popup-detailed">
              <h4>${this.escape(feature.feature_name || feature.layer_name)}</h4>
              <p class="layer-name">${this.escape(feature.layer_name)}</p>

              ${metrics.length > 0 ? `
                <div class="metrics-section">
                  <h5>📏 Métriques</h5>
                  ${metrics.map(m => `
                    <div class="metric">
                      <span class="label">${m.label}:</span>
                      <span class="value">${m.value}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${Object.keys(properties).length > 0 ? `
                <div class="properties-section">
                  <h5>ℹ️ Propriétés</h5>
                  ${Object.entries(properties).slice(0, 5).map(([key, value]) => `
                    <div class="property">
                      <span class="key">${this.escape(key)}:</span>
                      <span class="value">${this.escape(String(value))}</span>
                    </div>
                  `).join('')}
                  ${Object.keys(properties).length > 5 ?
                    `<p class="more-info">... et ${Object.keys(properties).length - 5} autres</p>`
                    : ''}
                </div>
              ` : ''}
            </div>
          `;
        }
      },

      compact: {
        id: 'compact',
        name: 'Compact',
        icon: '🗜️',
        description: 'Vue compacte avec principales infos',
        render: (feature) => {
          const metrics = this.getMetrics(feature);
          const mainMetric = metrics[0]; // Surface ou longueur

          return `
            <div class="popup-compact">
              <h4>${this.escape(feature.feature_name || feature.layer_name)}</h4>
              ${mainMetric ? `
                <div class="main-metric">
                  ${mainMetric.value}
                </div>
              ` : ''}
              <p class="type">${this.escape(feature.geometry_type || '')}</p>
            </div>
          `;
        }
      },

      metrics_only: {
        id: 'metrics_only',
        name: 'Métriques seules',
        icon: '📊',
        description: 'Uniquement les mesures géométriques',
        render: (feature) => {
          const metrics = this.getMetrics(feature);

          return `
            <div class="popup-metrics">
              <h4>${this.escape(feature.feature_name || feature.layer_name)}</h4>
              ${metrics.length > 0 ? metrics.map(m => `
                <div class="metric-row">
                  <strong>${m.label}:</strong> ${m.value}
                </div>
              `).join('') : '<p>Aucune métrique disponible</p>'}
            </div>
          `;
        }
      }
    };

    this.initializeState();
  }

  initializeState() {
    // Initialize popup config if not exists
    if (!StateManager.getState('popups.template')) {
      StateManager.setState('popups.template', 'detailed', 'Initialize popup template');
    }
    if (!StateManager.getState('popups.layerTemplates')) {
      StateManager.setState('popups.layerTemplates', {}, 'Initialize layer popup templates');
    }
  }

  /**
   * Get all available templates
   */
  getTemplates() {
    return this.templates;
  }

  /**
   * Get current template ID
   */
  getCurrentTemplate() {
    return StateManager.getState('popups.template') || 'detailed';
  }

  /**
   * Set default template
   */
  setDefaultTemplate(templateId) {
    if (this.templates[templateId]) {
      StateManager.setState('popups.template', templateId, 'Update default popup template');
      console.log('[PopupTemplate] Default template set to:', templateId);
    }
  }

  /**
   * Set template for specific layer
   */
  setLayerTemplate(layerName, templateId) {
    if (this.templates[templateId]) {
      const layerTemplates = StateManager.getState('popups.layerTemplates');
      layerTemplates[layerName] = templateId;
      StateManager.setState('popups.layerTemplates', layerTemplates, `Set popup template for ${layerName}`);
      console.log('[PopupTemplate] Template for', layerName, 'set to:', templateId);
    }
  }

  /**
   * Render popup for a feature
   */
  render(feature) {
    // Get template for this layer, or default
    const layerTemplates = StateManager.getState('popups.layerTemplates');
    const templateId = layerTemplates[feature.layer_name] || this.getCurrentTemplate();

    const template = this.templates[templateId];
    if (!template) {
      console.warn('[PopupTemplate] Template not found:', templateId);
      return this.templates.detailed.render(feature);
    }

    return template.render(feature);
  }

  /**
   * Parse properties from JSON string
   */
  parseProperties(propertiesJson) {
    if (!propertiesJson) return {};

    try {
      return typeof propertiesJson === 'string'
        ? JSON.parse(propertiesJson)
        : propertiesJson;
    } catch (err) {
      console.warn('[PopupTemplate] Failed to parse properties:', err);
      return {};
    }
  }

  /**
   * Extract metrics from feature (using Grist ST_* calculated columns)
   */
  getMetrics(feature) {
    const metrics = [];

    // Area (for polygons)
    if (feature.area_km2 != null && typeof feature.area_km2 === 'number') {
      metrics.push({
        label: 'Surface',
        value: this.formatArea(feature.area_km2),
        raw: feature.area_km2
      });
    }

    // Perimeter (for polygons)
    if (feature.perimeter_km != null && typeof feature.perimeter_km === 'number') {
      metrics.push({
        label: 'Périmètre',
        value: this.formatLength(feature.perimeter_km),
        raw: feature.perimeter_km
      });
    }

    // Length (for lines)
    if (feature.length_km != null && typeof feature.length_km === 'number') {
      metrics.push({
        label: 'Longueur',
        value: this.formatLength(feature.length_km),
        raw: feature.length_km
      });
    }

    // Center coordinates
    if (feature.center_lat != null && feature.center_lon != null) {
      metrics.push({
        label: 'Centre',
        value: `${feature.center_lat.toFixed(6)}, ${feature.center_lon.toFixed(6)}`,
        raw: [feature.center_lat, feature.center_lon]
      });
    }

    return metrics;
  }

  /**
   * Format area with appropriate units
   */
  formatArea(km2) {
    if (km2 >= 1) {
      return `${km2.toFixed(2)} km²`;
    } else if (km2 >= 0.01) {
      return `${(km2 * 100).toFixed(2)} ha`;
    } else {
      return `${(km2 * 1000000).toFixed(0)} m²`;
    }
  }

  /**
   * Format length with appropriate units
   */
  formatLength(km) {
    if (km >= 1) {
      return `${km.toFixed(2)} km`;
    } else {
      return `${(km * 1000).toFixed(0)} m`;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escape(text) {
    if (text == null) return '';

    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Create custom template
   */
  registerCustomTemplate(id, config) {
    const { name, icon, description, render } = config;

    this.templates[id] = {
      id,
      name,
      icon: icon || '📄',
      description: description || 'Template personnalisé',
      render: typeof render === 'function' ? render : () => '<p>Template invalide</p>'
    };

    console.log('[PopupTemplate] Registered custom template:', id);
  }
}

export default new PopupTemplateEngine();
