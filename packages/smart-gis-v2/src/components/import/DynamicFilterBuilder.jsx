/**
 * DynamicFilterBuilder - Build CQL filters dynamically based on discovered fields
 *
 * Features:
 * - Auto-discover fields from WFS layer
 * - Categorize fields (identifiers, names, geography, etc.)
 * - Suggest appropriate operators per field type
 * - Build CQL filter strings
 * - Multiple filter support with AND/OR logic
 */

import React, { useState, useEffect } from 'react';
import FieldDiscoveryService from '../../services/FieldDiscoveryService';
import './DynamicFilterBuilder.css';

const DynamicFilterBuilder = ({ serviceUrl, typeName, onFilterChange }) => {
  const [schema, setSchema] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch schema on mount
  useEffect(() => {
    if (!serviceUrl || !typeName) return;

    const loadSchema = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const enrichedSchema = await FieldDiscoveryService.getEnrichedSchema(serviceUrl, typeName);
        setSchema(enrichedSchema);
        console.log('[DynamicFilterBuilder] Schema loaded:', enrichedSchema);
      } catch (err) {
        console.error('[DynamicFilterBuilder] Failed to load schema:', err);
        setError(`Impossible de charger les champs: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchema();
  }, [serviceUrl, typeName]);

  // Build CQL filter string from filters array
  useEffect(() => {
    if (filters.length === 0) {
      onFilterChange('');
      return;
    }

    const cqlParts = filters
      .filter(f => f.field && f.operator && f.value)
      .map(f => {
        const field = findField(f.field);
        return FieldDiscoveryService.buildCQLFilter(
          f.field,
          f.operator,
          f.value,
          field?.type || 'string'
        );
      })
      .filter(Boolean);

    if (cqlParts.length > 0) {
      const combinedFilter = cqlParts.join(' AND ');
      onFilterChange(combinedFilter);
    } else {
      onFilterChange('');
    }
  }, [filters]);

  const findField = (fieldName) => {
    if (!schema) return null;

    for (const category of Object.values(schema.categories)) {
      const field = category.find(f => f.name === fieldName);
      if (field) return field;
    }

    return null;
  };

  const addFilter = () => {
    setFilters([
      ...filters,
      { id: Date.now(), field: '', operator: '', value: '' }
    ]);
  };

  const removeFilter = (filterId) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const updateFilter = (filterId, updates) => {
    setFilters(filters.map(f =>
      f.id === filterId ? { ...f, ...updates } : f
    ));
  };

  const handleFieldChange = (filterId, fieldName) => {
    const field = findField(fieldName);
    const defaultOperator = field?.operators[0]?.op || '=';

    updateFilter(filterId, {
      field: fieldName,
      operator: defaultOperator,
      value: ''
    });
  };

  if (isLoading) {
    return (
      <div className="dynamic-filter-builder loading">
        <div className="spinner-small"></div>
        <p>Chargement des champs disponibles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dynamic-filter-builder error">
        <p>⚠️ {error}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Réessayer
        </button>
      </div>
    );
  }

  if (!schema) {
    return null;
  }

  const popularCategories = ['identifiers', 'names', 'geography'];
  const hasPopularFields = popularCategories.some(cat =>
    schema.categories[cat] && schema.categories[cat].length > 0
  );

  return (
    <div className="dynamic-filter-builder">
      <div className="filter-builder-header">
        <h4>🔍 Filtres dynamiques</h4>
        <p className="hint">
          {schema.totalFields} champs disponibles pour {typeName}
        </p>
      </div>

      {/* Quick filter suggestions */}
      {hasPopularFields && filters.length === 0 && (
        <div className="quick-suggestions">
          <p className="suggestions-label">Suggestions rapides:</p>
          <div className="suggestion-chips">
            {schema.categories.identifiers?.slice(0, 3).map(field => (
              <button
                key={field.name}
                className="suggestion-chip"
                onClick={() => {
                  addFilter();
                  setTimeout(() => {
                    const newFilter = filters[filters.length];
                    if (newFilter) {
                      handleFieldChange(newFilter.id, field.name);
                    }
                  }, 10);
                }}
              >
                {field.name}
              </button>
            ))}
            {schema.categories.names?.slice(0, 2).map(field => (
              <button
                key={field.name}
                className="suggestion-chip"
                onClick={() => {
                  addFilter();
                }}
              >
                {field.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filters */}
      {filters.map((filter, idx) => {
        const field = findField(filter.field);
        const operators = field?.operators || [];

        return (
          <div key={filter.id} className="filter-row">
            <div className="filter-index">{idx + 1}</div>

            {/* Field selector */}
            <select
              className="filter-field-select"
              value={filter.field}
              onChange={(e) => handleFieldChange(filter.id, e.target.value)}
            >
              <option value="">-- Champ --</option>
              {Object.entries(schema.categories).map(([categoryName, fields]) => {
                if (fields.length === 0) return null;

                return (
                  <optgroup key={categoryName} label={getCategoryLabel(categoryName)}>
                    {fields.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>

            {/* Operator selector */}
            {filter.field && (
              <select
                className="filter-operator-select"
                value={filter.operator}
                onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
              >
                {operators.map(op => (
                  <option key={op.op} value={op.op}>
                    {op.label}
                  </option>
                ))}
              </select>
            )}

            {/* Value input */}
            {filter.field && filter.operator && (
              <input
                type={field?.type === 'number' ? 'number' : 'text'}
                className="filter-value-input"
                placeholder={`Valeur...`}
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
              />
            )}

            {/* Remove button */}
            <button
              className="btn-remove-filter"
              onClick={() => removeFilter(filter.id)}
              title="Supprimer ce filtre"
            >
              ×
            </button>
          </div>
        );
      })}

      {/* Add filter button */}
      <div className="filter-actions">
        <button className="btn-add-filter" onClick={addFilter}>
          + Ajouter un filtre
        </button>

        {filters.length > 0 && (
          <button
            className="btn-clear-filters"
            onClick={() => setFilters([])}
          >
            Effacer tous
          </button>
        )}
      </div>

      {/* Advanced: Show all categories */}
      {showAdvanced && (
        <div className="advanced-panel">
          <h5>Tous les champs par catégorie</h5>
          {Object.entries(schema.categories).map(([categoryName, fields]) => {
            if (fields.length === 0) return null;

            return (
              <div key={categoryName} className="category-section">
                <h6>{getCategoryLabel(categoryName)} ({fields.length})</h6>
                <ul className="field-list">
                  {fields.map(field => (
                    <li key={field.name}>
                      <strong>{field.name}</strong> <span className="field-type">({field.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn-toggle-advanced"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▲ Masquer' : '▼ Voir tous les champs'}
      </button>
    </div>
  );
};

function getCategoryLabel(categoryName) {
  const labels = {
    identifiers: '🔑 Identifiants',
    names: '📝 Noms',
    geography: '🗺️ Géographie',
    demographics: '👥 Démographie',
    measures: '📏 Mesures',
    dates: '📅 Dates',
    other: '📦 Autres'
  };

  return labels[categoryName] || categoryName;
}

export default DynamicFilterBuilder;
