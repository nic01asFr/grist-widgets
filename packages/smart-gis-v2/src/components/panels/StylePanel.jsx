/**
 * StylePanel - Main style configuration panel
 *
 * Combines:
 * - Basemap selection
 * - Layer styles
 * - Popup templates
 * - Hover effects
 */

import React, { useState, useEffect } from 'react';
import StateManager from '../../core/StateManager';
import StyleManager from '../../services/StyleManager';
import PopupTemplateEngine from '../../services/PopupTemplateEngine';
import BasemapSelector from './BasemapSelector';
import './StylePanel.css';

const StylePanel = () => {
  const [activeSection, setActiveSection] = useState('basemap');
  const [layers, setLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [currentPopupTemplate, setCurrentPopupTemplate] = useState('detailed');
  const [currentHoverEffect, setCurrentHoverEffect] = useState('highlight');

  useEffect(() => {
    // Subscribe to workspace layers
    const unsubscribe = StateManager.subscribe('layers.workspace', (workspaceLayers) => {
      // Group by layer_name
      const layerMap = new Map();
      workspaceLayers.forEach(feature => {
        if (!layerMap.has(feature.layer_name)) {
          layerMap.set(feature.layer_name, {
            name: feature.layer_name,
            geometry_type: feature.geometry_type,
            count: 0
          });
        }
        layerMap.get(feature.layer_name).count++;
      });

      setLayers(Array.from(layerMap.values()));
    });

    // Load initial state
    const initialLayers = StateManager.getState('layers.workspace');
    const layerMap = new Map();
    initialLayers.forEach(feature => {
      if (!layerMap.has(feature.layer_name)) {
        layerMap.set(feature.layer_name, {
          name: feature.layer_name,
          geometry_type: feature.geometry_type,
          count: 0
        });
      }
      layerMap.get(feature.layer_name).count++;
    });
    setLayers(Array.from(layerMap.values()));

    // Load current settings
    setCurrentPopupTemplate(PopupTemplateEngine.getCurrentTemplate());
    setCurrentHoverEffect(StateManager.getState('styles.hoverEffect') || 'highlight');

    return unsubscribe;
  }, []);

  const sections = [
    { id: 'basemap', label: 'Fond de carte', icon: '🗺️' },
    { id: 'layers', label: 'Styles des layers', icon: '🎨' },
    { id: 'popups', label: 'Pop-ups', icon: '💬' },
    { id: 'hover', label: 'Survol', icon: '👆' }
  ];

  const handleApplyPreset = (layerName, presetId, geometryType) => {
    StyleManager.applyPresetToLayer(layerName, presetId, geometryType);
    // Force re-render
    StateManager.setState('styles.updated', Date.now(), 'Style updated');
  };

  const handleResetLayerStyle = (layerName) => {
    StyleManager.resetLayerStyle(layerName);
    StateManager.setState('styles.updated', Date.now(), 'Style reset');
  };

  const handlePopupTemplateChange = (templateId) => {
    PopupTemplateEngine.setDefaultTemplate(templateId);
    setCurrentPopupTemplate(templateId);
  };

  const handleHoverEffectChange = (effectType) => {
    StyleManager.setHoverEffect(effectType);
    setCurrentHoverEffect(effectType);
  };

  return (
    <div className="style-panel">
      {/* Section tabs */}
      <div className="section-tabs">
        {sections.map(section => (
          <button
            key={section.id}
            className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="tab-icon">{section.icon}</span>
            <span className="tab-text">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="section-content">
        {activeSection === 'basemap' && (
          <BasemapSelector />
        )}

        {activeSection === 'layers' && (
          <div className="layers-style-section">
            <h4>🎨 Styles des layers</h4>

            {layers.length === 0 ? (
              <p className="empty-message">Aucun layer à styliser</p>
            ) : (
              <div className="layers-list">
                {layers.map(layer => (
                  <LayerStyleCard
                    key={layer.name}
                    layer={layer}
                    onApplyPreset={handleApplyPreset}
                    onReset={handleResetLayerStyle}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'popups' && (
          <div className="popups-section">
            <h4>💬 Templates de pop-ups</h4>
            <p className="section-hint">Choisissez comment afficher les informations au clic</p>

            <div className="template-grid">
              {Object.values(PopupTemplateEngine.getTemplates()).map(template => (
                <button
                  key={template.id}
                  className={`template-card ${currentPopupTemplate === template.id ? 'active' : ''}`}
                  onClick={() => handlePopupTemplateChange(template.id)}
                >
                  <span className="template-icon">{template.icon}</span>
                  <div className="template-info">
                    <strong>{template.name}</strong>
                    <p>{template.description}</p>
                  </div>
                  {currentPopupTemplate === template.id && (
                    <span className="check-badge">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'hover' && (
          <div className="hover-section">
            <h4>👆 Effet de survol</h4>
            <p className="section-hint">Choisissez l'effet visuel au survol des features</p>

            <div className="hover-effects-grid">
              {Object.entries(StyleManager.getHoverEffects()).map(([key, effect]) => (
                <button
                  key={key}
                  className={`hover-effect-card ${currentHoverEffect === key ? 'active' : ''}`}
                  onClick={() => handleHoverEffectChange(key)}
                >
                  <strong>{effect.name}</strong>
                  {currentHoverEffect === key && (
                    <span className="check-badge">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * LayerStyleCard - Individual layer style configuration
 */
const LayerStyleCard = ({ layer, onApplyPreset, onReset }) => {
  const [expanded, setExpanded] = useState(false);
  const currentStyle = StyleManager.getLayerStyle(layer.name);
  const presets = StyleManager.getStylePresets();

  return (
    <div className="layer-style-card">
      <div className="layer-header" onClick={() => setExpanded(!expanded)}>
        <div className="layer-info">
          <strong>{layer.name}</strong>
          <span className="layer-meta">
            {layer.geometry_type} • {layer.count} feature{layer.count > 1 ? 's' : ''}
          </span>
        </div>
        <button className="expand-btn">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="layer-body">
          <div className="preset-grid">
            {Object.entries(presets).map(([id, preset]) => (
              <button
                key={id}
                className={`preset-btn ${currentStyle?.preset === id ? 'active' : ''}`}
                onClick={() => onApplyPreset(layer.name, id, layer.geometry_type)}
                title={preset.name}
              >
                <span>{preset.icon}</span>
              </button>
            ))}
          </div>

          {currentStyle && (
            <button
              className="reset-btn"
              onClick={() => onReset(layer.name)}
            >
              🔄 Réinitialiser
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StylePanel;
