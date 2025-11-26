/**
 * DataDrivenStyleEditor - Configure data-driven styling rules
 *
 * Workflow:
 * 1. Select layer
 * 2. Choose styling type (Categorized, Graduated, Proportional, Expression)
 * 3. Configure parameters
 * 4. Preview result
 * 5. Apply rule
 */

import React, { useState, useEffect, useMemo } from 'react';
import StateManager from '../../core/StateManager';
import DataAnalyzer from '../../services/DataAnalyzer';
import StyleRuleEngine from '../../services/StyleRuleEngine';
import './DataDrivenStyleEditor.css';

const DataDrivenStyleEditor = ({ layerId, onClose }) => {
  const [layer, setLayer] = useState(null);
  const [styleType, setStyleType] = useState('categorized');
  const [selectedField, setSelectedField] = useState('');
  const [fieldAnalysis, setFieldAnalysis] = useState(null);
  const [configuration, setConfiguration] = useState({});
  const [previewFeatures, setPreviewFeatures] = useState([]);

  // Load layer data
  useEffect(() => {
    if (layerId) {
      const layers = StateManager.getState('layers.workspace');
      const foundLayer = layers.find(l => l.id === layerId);
      setLayer(foundLayer);

      // Get all features for this layer
      const features = layers.filter(f => f.layer_name === foundLayer?.layer_name);
      setPreviewFeatures(features.slice(0, 10)); // Preview first 10
    }
  }, [layerId]);

  // Available fields from layer
  const availableFields = useMemo(() => {
    if (!layer || !layer.properties) return [];

    try {
      const props = typeof layer.properties === 'string'
        ? JSON.parse(layer.properties)
        : layer.properties;

      return Object.keys(props).filter(key => {
        // Exclude internal fields
        return !['id', 'geometry', 'layer_name', 'is_visible'].includes(key);
      });
    } catch (error) {
      console.error('[DataDrivenStyleEditor] Error parsing properties:', error);
      return [];
    }
  }, [layer]);

  // Analyze field when selected
  useEffect(() => {
    if (selectedField && layer) {
      const layers = StateManager.getState('layers.workspace');
      const features = layers.filter(f => f.layer_name === layer.layer_name);

      const analysis = DataAnalyzer.analyzeField(features, selectedField);
      setFieldAnalysis(analysis);

      // Initialize configuration based on type
      if (styleType === 'categorized' && analysis.type === 'string') {
        initializeCategorized(analysis);
      } else if (styleType === 'graduated' && analysis.type === 'number') {
        initializeGraduated(analysis);
      } else if (styleType === 'proportional' && analysis.type === 'number') {
        initializeProportional(analysis);
      }
    }
  }, [selectedField, styleType, layer]);

  // Initialize categorized configuration
  const initializeCategorized = (analysis) => {
    const categories = analysis.uniqueValues || [];
    const colorSchemes = DataAnalyzer.getSuggestedColorSchemes(analysis);
    const colors = colorSchemes[0]?.colors || ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

    const categoriesConfig = categories.slice(0, 10).map((value, index) => ({
      value,
      color: colors[index % colors.length],
      label: String(value)
    }));

    setConfiguration({
      categories: categoriesConfig,
      defaultColor: '#cccccc',
      colorScheme: colorSchemes[0]?.name || 'default'
    });
  };

  // Initialize graduated configuration
  const initializeGraduated = (analysis) => {
    const breaks = analysis.breaks?.quantile || [];
    const colorSchemes = DataAnalyzer.getSuggestedColorSchemes(analysis);
    const colors = colorSchemes[0]?.colors || ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'];

    const ranges = breaks.map((breakValue, index) => {
      const min = index === 0 ? analysis.min : breaks[index - 1];
      const max = breakValue;

      // Ensure values are numbers before calling toFixed
      const minNum = typeof min === 'number' ? min : Number(min);
      const maxNum = typeof max === 'number' ? max : Number(max);

      return {
        min: minNum,
        max: maxNum,
        color: colors[index % colors.length],
        label: `${minNum.toFixed(2)} - ${maxNum.toFixed(2)}`
      };
    });

    setConfiguration({
      ranges,
      method: 'quantile',
      numClasses: breaks.length,
      defaultColor: '#cccccc',
      colorScheme: colorSchemes[0]?.name || 'YlOrRd'
    });
  };

  // Initialize proportional configuration
  const initializeProportional = (analysis) => {
    setConfiguration({
      minSize: 5,
      maxSize: 30,
      minValue: analysis.min,
      maxValue: analysis.max,
      baseColor: '#1f77b4'
    });
  };

  // Handle field selection
  const handleFieldChange = (e) => {
    setSelectedField(e.target.value);
  };

  // Handle type change
  const handleTypeChange = (type) => {
    setStyleType(type);
    setConfiguration({});
    setFieldAnalysis(null);
  };

  // Handle color change for category
  const handleCategoryColorChange = (index, color) => {
    const newCategories = [...configuration.categories];
    newCategories[index].color = color;
    setConfiguration({ ...configuration, categories: newCategories });
  };

  // Handle range color change
  const handleRangeColorChange = (index, color) => {
    const newRanges = [...configuration.ranges];
    newRanges[index].color = color;
    setConfiguration({ ...configuration, ranges: newRanges });
  };

  // Change classification method
  const handleMethodChange = (method) => {
    if (!fieldAnalysis) return;

    const breaks = fieldAnalysis.breaks?.[method] || [];
    const colors = configuration.ranges.map(r => r.color);

    const newRanges = breaks.map((breakValue, index) => {
      const min = index === 0 ? fieldAnalysis.min : breaks[index - 1];
      const max = breakValue;

      // Ensure values are numbers before calling toFixed
      const minNum = typeof min === 'number' ? min : Number(min);
      const maxNum = typeof max === 'number' ? max : Number(max);

      return {
        min: minNum,
        max: maxNum,
        color: colors[index] || '#cccccc',
        label: `${minNum.toFixed(2)} - ${maxNum.toFixed(2)}`
      };
    });

    setConfiguration({
      ...configuration,
      method,
      ranges: newRanges
    });
  };

  // Apply rule
  const handleApply = () => {
    if (!layer || !selectedField) {
      alert('Veuillez sélectionner un champ');
      return;
    }

    const rule = {
      type: styleType,
      field: selectedField,
      geometryType: layer.geometry_type,
      ...configuration
    };

    // Save to StateManager (setState automatically notifies subscribers)
    const currentRules = StateManager.getState('layers.styleRules') || {};
    StateManager.setState('layers.styleRules', {
      ...currentRules,
      [layer.layer_name]: rule
    }, 'Apply style rule');

    if (onClose) onClose();
  };

  // Reset rule
  const handleReset = () => {
    const currentRules = StateManager.getState('layers.styleRules') || {};
    delete currentRules[layer?.layer_name];
    StateManager.setState('layers.styleRules', currentRules, 'Reset style rule');

    if (onClose) onClose();
  };

  if (!layer) {
    return <div className="style-editor-loading">Chargement...</div>;
  }

  return (
    <div className="data-driven-style-editor">
      <div className="editor-header">
        <h3>Style de données - {layer.layer_name}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="editor-body">
        {/* Step 1: Choose Style Type */}
        <section className="editor-section">
          <h4>1. Type de style</h4>
          <div className="type-selector">
            <button
              className={`type-btn ${styleType === 'categorized' ? 'active' : ''}`}
              onClick={() => handleTypeChange('categorized')}
            >
              <span className="type-icon">🎨</span>
              <span className="type-label">Catégorisé</span>
              <span className="type-hint">Valeurs uniques</span>
            </button>
            <button
              className={`type-btn ${styleType === 'graduated' ? 'active' : ''}`}
              onClick={() => handleTypeChange('graduated')}
            >
              <span className="type-icon">📊</span>
              <span className="type-label">Gradué</span>
              <span className="type-hint">Plages numériques</span>
            </button>
            <button
              className={`type-btn ${styleType === 'proportional' ? 'active' : ''}`}
              onClick={() => handleTypeChange('proportional')}
            >
              <span className="type-icon">⚫</span>
              <span className="type-label">Proportionnel</span>
              <span className="type-hint">Taille variable</span>
            </button>
            <button
              className={`type-btn ${styleType === 'expression' ? 'active' : ''}`}
              onClick={() => handleTypeChange('expression')}
              disabled
            >
              <span className="type-icon">🔧</span>
              <span className="type-label">Expression</span>
              <span className="type-hint">Formule (bientôt)</span>
            </button>
          </div>
        </section>

        {/* Step 2: Select Field */}
        <section className="editor-section">
          <h4>2. Champ d'attribut</h4>
          <select
            className="field-selector"
            value={selectedField}
            onChange={handleFieldChange}
          >
            <option value="">-- Sélectionner un champ --</option>
            {availableFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>

          {fieldAnalysis && (
            <div className="field-info">
              <span className="info-badge">Type: {fieldAnalysis.type}</span>
              {fieldAnalysis.type === 'number' && (
                <>
                  <span className="info-badge">Min: {typeof fieldAnalysis.min === 'number' ? fieldAnalysis.min.toFixed(2) : fieldAnalysis.min}</span>
                  <span className="info-badge">Max: {typeof fieldAnalysis.max === 'number' ? fieldAnalysis.max.toFixed(2) : fieldAnalysis.max}</span>
                  <span className="info-badge">Moyenne: {typeof fieldAnalysis.mean === 'number' ? fieldAnalysis.mean.toFixed(2) : fieldAnalysis.mean}</span>
                </>
              )}
              {fieldAnalysis.type === 'string' && (
                <span className="info-badge">Valeurs: {fieldAnalysis.uniqueCount}</span>
              )}
            </div>
          )}
        </section>

        {/* Step 3: Configuration */}
        {selectedField && fieldAnalysis && (
          <section className="editor-section">
            <h4>3. Configuration</h4>

            {/* Categorized configuration */}
            {styleType === 'categorized' && configuration.categories && (
              <div className="config-categorized">
                <div className="categories-list">
                  {configuration.categories.map((cat, index) => (
                    <div key={index} className="category-row">
                      <input
                        type="color"
                        value={cat.color}
                        onChange={(e) => handleCategoryColorChange(index, e.target.value)}
                        className="color-input"
                      />
                      <span className="category-label">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Graduated configuration */}
            {styleType === 'graduated' && configuration.ranges && (
              <div className="config-graduated">
                <div className="method-selector">
                  <label>Méthode de classification:</label>
                  <select
                    value={configuration.method}
                    onChange={(e) => handleMethodChange(e.target.value)}
                  >
                    <option value="quantile">Quantile (effectifs égaux)</option>
                    <option value="equal">Intervalles égaux</option>
                    <option value="jenks">Jenks (ruptures naturelles)</option>
                  </select>
                </div>
                <div className="ranges-list">
                  {configuration.ranges.map((range, index) => (
                    <div key={index} className="range-row">
                      <input
                        type="color"
                        value={range.color}
                        onChange={(e) => handleRangeColorChange(index, e.target.value)}
                        className="color-input"
                      />
                      <span className="range-label">{range.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proportional configuration */}
            {styleType === 'proportional' && configuration.minSize && (
              <div className="config-proportional">
                <div className="prop-row">
                  <label>Taille min:</label>
                  <input
                    type="number"
                    value={configuration.minSize}
                    onChange={(e) => setConfiguration({ ...configuration, minSize: Number(e.target.value) })}
                    min="1"
                    max="50"
                  />
                </div>
                <div className="prop-row">
                  <label>Taille max:</label>
                  <input
                    type="number"
                    value={configuration.maxSize}
                    onChange={(e) => setConfiguration({ ...configuration, maxSize: Number(e.target.value) })}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="prop-row">
                  <label>Couleur:</label>
                  <input
                    type="color"
                    value={configuration.baseColor}
                    onChange={(e) => setConfiguration({ ...configuration, baseColor: e.target.value })}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Preview */}
        {selectedField && configuration && Object.keys(configuration).length > 0 && (
          <section className="editor-section">
            <h4>4. Aperçu</h4>
            <div className="preview-list">
              {previewFeatures.slice(0, 5).map((feature, index) => {
                const props = typeof feature.properties === 'string'
                  ? JSON.parse(feature.properties)
                  : feature.properties;

                const fieldValue = props[selectedField];
                const previewStyle = StyleRuleEngine.applyStyleRule(feature, {
                  type: styleType,
                  field: selectedField,
                  geometryType: layer.geometry_type,
                  ...configuration
                });

                return (
                  <div key={index} className="preview-item">
                    <div
                      className="preview-swatch"
                      style={{
                        backgroundColor: previewStyle.fillColor || previewStyle.color,
                        width: previewStyle.radius ? `${previewStyle.radius * 2}px` : '20px',
                        height: previewStyle.radius ? `${previewStyle.radius * 2}px` : '20px'
                      }}
                    />
                    <span className="preview-value">{String(fieldValue)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="editor-footer">
        <button className="btn-secondary" onClick={handleReset}>
          Réinitialiser
        </button>
        <button
          className="btn-primary"
          onClick={handleApply}
          disabled={!selectedField || !configuration || Object.keys(configuration).length === 0}
        >
          Appliquer
        </button>
      </div>
    </div>
  );
};

export default DataDrivenStyleEditor;
