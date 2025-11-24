/**
 * AttributeQueryBuilder - Visual query builder for selecting features
 *
 * Workflow:
 * 1. Select layer
 * 2. Add conditions (field, operator, value)
 * 3. Set AND/OR logic
 * 4. Preview results
 * 5. Execute action (Select, Filter, Save)
 */

import React, { useState, useEffect, useMemo } from 'react';
import StateManager from '../../core/StateManager';
import SelectionQueryEngine from '../../services/SelectionQueryEngine';
import DataAnalyzer from '../../services/DataAnalyzer';
import './AttributeQueryBuilder.css';

const AttributeQueryBuilder = ({ layerId, onClose }) => {
  const [layer, setLayer] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [operator, setOperator] = useState('AND');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Load layer data
  useEffect(() => {
    if (layerId) {
      const layers = StateManager.getState('layers.workspace');
      const foundLayer = layers.find(l => l.id === layerId);
      setLayer(foundLayer);
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
        return !['id', 'geometry', 'layer_name', 'is_visible'].includes(key);
      });
    } catch (error) {
      console.error('[AttributeQueryBuilder] Error parsing properties:', error);
      return [];
    }
  }, [layer]);

  // Detect field type
  const detectFieldType = (fieldName) => {
    if (!layer) return 'string';

    const layers = StateManager.getState('layers.workspace');
    const features = layers.filter(f => f.layer_name === layer.layer_name);

    if (features.length === 0) return 'string';

    const analysis = DataAnalyzer.analyzeField(features, fieldName);
    return analysis.type;
  };

  // Add new condition
  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        id: Date.now(),
        field: availableFields[0] || '',
        operator: '=',
        value: '',
        fieldType: 'string'
      }
    ]);
  };

  // Remove condition
  const handleRemoveCondition = (id) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  // Update condition field
  const handleFieldChange = (id, field) => {
    const fieldType = detectFieldType(field);
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, field, fieldType, operator: fieldType === 'number' ? '=' : '=' } : c
    ));
  };

  // Update condition operator
  const handleOperatorChange = (id, operator) => {
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, operator } : c
    ));
  };

  // Update condition value
  const handleValueChange = (id, value) => {
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, value } : c
    ));
  };

  // Execute query
  const executeQuery = () => {
    if (conditions.length === 0) {
      alert('Veuillez ajouter au moins une condition');
      return;
    }

    const layers = StateManager.getState('layers.workspace');
    const features = layers.filter(f => f.layer_name === layer.layer_name);

    const query = {
      conditions: conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value
      })),
      operator
    };

    // Validate query
    const validation = SelectionQueryEngine.validateQuery(query);
    if (!validation.valid) {
      alert(`Requête invalide: ${validation.error}`);
      return;
    }

    // Execute query
    const filteredFeatures = SelectionQueryEngine.executeQuery(features, query);
    setResults(filteredFeatures);
    setShowResults(true);
  };

  // Select features (sync to Grist)
  const handleSelect = () => {
    executeQuery();

    if (results.length > 0) {
      // Get first result ID to sync selection
      const firstId = results[0].id;
      StateManager.setState('map.selectedFeature', firstId, 'Query selection');

      // Store query results for highlighting
      StateManager.setState('query.results', results.map(r => r.id), 'Store query results');

      alert(`${results.length} entité(s) sélectionnée(s)`);
    }
  };

  // Filter features (hide others)
  const handleFilter = () => {
    executeQuery();

    if (results.length > 0) {
      const resultIds = new Set(results.map(r => r.id));

      // Update visibility
      const layers = StateManager.getState('layers.workspace');
      const updatedLayers = layers.map(feature => {
        if (feature.layer_name === layer.layer_name) {
          return {
            ...feature,
            is_visible: resultIds.has(feature.id)
          };
        }
        return feature;
      });

      StateManager.setState('layers.workspace', updatedLayers, 'Filter by query');
      alert(`${results.length} entité(s) affichée(s)`);
    }
  };

  // Reset filter
  const handleResetFilter = () => {
    const layers = StateManager.getState('layers.workspace');
    const updatedLayers = layers.map(feature => {
      if (feature.layer_name === layer.layer_name) {
        return { ...feature, is_visible: true };
      }
      return feature;
    });

    StateManager.setState('layers.workspace', updatedLayers, 'Reset filter');
    setResults([]);
    setShowResults(false);
  };

  // Get SQL string for display
  const getSQLPreview = () => {
    if (conditions.length === 0) return '';

    const query = {
      conditions: conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value
      })),
      operator
    };

    return SelectionQueryEngine.toSQLString(query);
  };

  if (!layer) {
    return <div className="query-builder-loading">Chargement...</div>;
  }

  return (
    <div className="attribute-query-builder">
      <div className="builder-header">
        <h3>Requête attributaire - {layer.layer_name}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="builder-body">
        {/* Logic operator */}
        <section className="builder-section">
          <div className="logic-selector">
            <button
              className={`logic-btn ${operator === 'AND' ? 'active' : ''}`}
              onClick={() => setOperator('AND')}
            >
              ET (AND)
            </button>
            <button
              className={`logic-btn ${operator === 'OR' ? 'active' : ''}`}
              onClick={() => setOperator('OR')}
            >
              OU (OR)
            </button>
          </div>
        </section>

        {/* Conditions */}
        <section className="builder-section">
          <div className="section-header">
            <h4>Conditions</h4>
            <button className="add-btn" onClick={handleAddCondition}>
              + Ajouter
            </button>
          </div>

          {conditions.length === 0 && (
            <div className="empty-message">
              Aucune condition. Cliquez sur "+ Ajouter" pour commencer.
            </div>
          )}

          <div className="conditions-list">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="condition-row">
                <span className="condition-index">{index + 1}</span>

                {/* Field selector */}
                <select
                  className="condition-field"
                  value={condition.field}
                  onChange={(e) => handleFieldChange(condition.id, e.target.value)}
                >
                  {availableFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>

                {/* Operator selector */}
                <select
                  className="condition-operator"
                  value={condition.operator}
                  onChange={(e) => handleOperatorChange(condition.id, e.target.value)}
                >
                  {SelectionQueryEngine.getOperatorsForType(condition.fieldType).map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {/* Value input (only if operator needs value) */}
                {SelectionQueryEngine.getOperatorsForType(condition.fieldType)
                  .find(op => op.value === condition.operator)?.needsValue && (
                  <input
                    type={condition.fieldType === 'number' ? 'number' : 'text'}
                    className="condition-value"
                    value={condition.value}
                    onChange={(e) => handleValueChange(condition.id, e.target.value)}
                    placeholder="Valeur..."
                  />
                )}

                {/* Remove button */}
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveCondition(condition.id)}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SQL Preview */}
        {conditions.length > 0 && (
          <section className="builder-section">
            <h4>Aperçu SQL</h4>
            <div className="sql-preview">
              <code>{getSQLPreview() || 'Requête vide'}</code>
            </div>
          </section>
        )}

        {/* Results */}
        {showResults && (
          <section className="builder-section">
            <h4>Résultats ({results.length})</h4>
            {results.length === 0 ? (
              <div className="empty-message">Aucun résultat trouvé</div>
            ) : (
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      {availableFields.slice(0, 3).map(field => (
                        <th key={field}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 10).map(feature => {
                      const props = typeof feature.properties === 'string'
                        ? JSON.parse(feature.properties)
                        : feature.properties;

                      return (
                        <tr key={feature.id}>
                          <td>{feature.id}</td>
                          {availableFields.slice(0, 3).map(field => (
                            <td key={field}>{String(props[field] || '')}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {results.length > 10 && (
                  <div className="results-more">
                    ... et {results.length - 10} autre(s)
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="builder-footer">
        <button className="btn-secondary" onClick={handleResetFilter}>
          Réinitialiser
        </button>
        <div className="action-buttons">
          <button
            className="btn-action"
            onClick={executeQuery}
            disabled={conditions.length === 0}
          >
            Exécuter
          </button>
          <button
            className="btn-action"
            onClick={handleSelect}
            disabled={conditions.length === 0}
          >
            Sélectionner
          </button>
          <button
            className="btn-action"
            onClick={handleFilter}
            disabled={conditions.length === 0}
          >
            Filtrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttributeQueryBuilder;
