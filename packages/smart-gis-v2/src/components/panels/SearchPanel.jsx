/**
 * SearchPanel - Hybrid Search (Tab 4)
 *
 * Features:
 * - Semantic search (VECTOR_SEARCH)
 * - Spatial search (ST_* predicates)
 * - Hybrid search (semantic + spatial)
 * - Search history with quick replay
 */

import React, { useState, useEffect } from 'react';
import { getAllSearchModes, getSpatialPredicate, createSearchHistoryItem } from '../../config/searchConfig';
import SearchResults from '../search/SearchResults';
import StateManager from '../../core/StateManager';
import GristAPI from '../../core/GristAPI';
import './SearchPanel.css';

const SearchPanel = () => {
  const [activeMode, setActiveMode] = useState('semantic');
  const [activePredicate, setActivePredicate] = useState('within');
  const [params, setParams] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const searchModes = getAllSearchModes();
  const currentMode = searchModes.find(m => m.id === activeMode);

  useEffect(() => {
    // Subscribe to search history
    const unsubscribe = StateManager.subscribe('data.searchHistory', (history) => {
      setSearchHistory(history || []);
    });

    const initialHistory = StateManager.getState('data.searchHistory') || [];
    setSearchHistory(initialHistory);

    // Initialize default params
    if (currentMode && currentMode.params) {
      const defaultParams = {};
      currentMode.params.forEach(param => {
        if (param.defaultValue !== undefined) {
          defaultParams[param.name] = param.defaultValue;
        }
      });
      setParams(defaultParams);
    }

    return unsubscribe;
  }, [activeMode]);

  const handleModeChange = (modeId) => {
    setActiveMode(modeId);
    setParams({});
    setError(null);
    setSearchResults(null);
  };

  const handleParamChange = (paramName, value) => {
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleSearch = async () => {
    setError(null);
    setIsSearching(true);

    try {
      const currentTable = StateManager.getState('data.currentTable') || 'GIS_WorkSpace';
      const workspaceLayers = StateManager.getState('layers.workspace') || [];

      let results = [];

      if (activeMode === 'semantic') {
        // Semantic search using VECTOR_SEARCH
        // Note: In production, this would use Grist's VECTOR_SEARCH function
        // For now, we simulate with text search on properties
        results = workspaceLayers.filter(layer => {
          const searchText = params.query.toLowerCase();
          const layerText = JSON.stringify(layer).toLowerCase();
          return layerText.includes(searchText);
        });
      } else if (activeMode === 'spatial') {
        // Spatial search using ST_* predicates
        const predicate = getSpatialPredicate(activePredicate);

        if (activePredicate === 'distance') {
          // Distance-based search
          const centerPoint = params.center; // WKT Point
          const radius = params.radius;
          const unit = params.unit;

          // Simplified distance calculation (for demo)
          // In production, use ST_DISTANCE
          results = workspaceLayers.filter(layer => {
            // This would be replaced with actual ST_DISTANCE call
            return true; // Placeholder
          });
        } else if (activePredicate === 'bbox') {
          // Bbox search
          results = workspaceLayers.filter(layer => {
            // Check if layer geometry intersects bbox
            // This would use ST_INTERSECTS in production
            return true; // Placeholder
          });
        } else {
          // Other spatial predicates (within, contains, intersects, touches)
          results = workspaceLayers.filter(layer => {
            // This would use corresponding ST_* function
            return true; // Placeholder
          });
        }
      } else if (activeMode === 'hybrid') {
        // Hybrid search: semantic + spatial
        // First filter by semantic similarity
        const semanticResults = workspaceLayers.filter(layer => {
          const searchText = params.semanticQuery.toLowerCase();
          const layerText = JSON.stringify(layer).toLowerCase();
          return layerText.includes(searchText);
        });

        // Then apply spatial filter
        results = semanticResults.filter(layer => {
          // Apply spatial predicate
          return true; // Placeholder
        });
      }

      // Limit results
      const maxResults = params.maxResults || 10;
      results = results.slice(0, maxResults);

      setSearchResults({
        mode: activeMode,
        predicate: activePredicate,
        params: params,
        results: results,
        count: results.length,
        timestamp: new Date().toISOString()
      });

      // Add to search history
      const historyItem = createSearchHistoryItem(activeMode, params, results.length);
      const newHistory = [historyItem, ...searchHistory.slice(0, 9)]; // Keep last 10
      StateManager.setState('data.searchHistory', newHistory, 'Search completed');

      // Update selection with results
      const resultIds = results.map(r => r.id);
      StateManager.setState('selection.ids', resultIds, 'Search results selected');

      setIsSearching(false);
    } catch (err) {
      setError(err.message);
      setIsSearching(false);
    }
  };

  const handleHistoryClick = (historyItem) => {
    setActiveMode(historyItem.mode);
    setParams(historyItem.params);
  };

  const canSearch = () => {
    if (!currentMode) return false;

    if (currentMode.params) {
      const requiredParams = currentMode.params.filter(p => p.required);
      return requiredParams.every(p => params[p.name]);
    }

    return true;
  };

  const renderParamInput = (param) => {
    switch (param.type) {
      case 'text':
        return (
          <input
            type="text"
            value={params[param.name] || ''}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
            placeholder={param.placeholder}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step}
            value={params[param.name] || ''}
            onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
          />
        );

      case 'choice':
        return (
          <select
            value={params[param.name] || ''}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
          >
            {param.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'geometry_picker':
        return (
          <div className="geometry-picker">
            <input
              type="text"
              value={params[param.name] || ''}
              onChange={(e) => handleParamChange(param.name, e.target.value)}
              placeholder="WKT geometry..."
            />
            <button className="btn-pick">📍 Carte</button>
          </div>
        );

      case 'column_select':
        // In production, would list available columns from Grist table
        return (
          <select
            value={params[param.name] || ''}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            <option value="element_vector">element_vector</option>
            <option value="description_vector">description_vector</option>
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="search-panel">
      <div className="search-header">
        <h3>Recherche</h3>
        <p className="subtitle">Sémantique, spatiale ou hybride</p>
      </div>

      {/* Mode Selector */}
      <div className="search-modes">
        {searchModes.map(mode => (
          <button
            key={mode.id}
            className={`mode-button ${activeMode === mode.id ? 'active' : ''}`}
            onClick={() => handleModeChange(mode.id)}
            style={{ borderColor: mode.color }}
          >
            <span className="mode-icon">{mode.icon}</span>
            <span className="mode-label">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Search Form */}
      <div className="search-form">
        {error && (
          <div className="error-message">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {/* Spatial Predicate Selector (only for spatial mode) */}
        {activeMode === 'spatial' && (
          <div className="predicate-selector">
            <label>Prédicat spatial</label>
            <select
              value={activePredicate}
              onChange={(e) => setActivePredicate(e.target.value)}
            >
              {Object.values(currentMode.predicates).map(pred => (
                <option key={pred.id} value={pred.id}>
                  {pred.icon} {pred.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Parameters */}
        {currentMode && currentMode.params && currentMode.params.map(param => (
          <div key={param.name} className="param-field">
            <label>
              {param.label}
              {param.required && <span className="required">*</span>}
            </label>
            {renderParamInput(param)}
            {param.help && <div className="param-help">{param.help}</div>}
          </div>
        ))}

        {/* Spatial Predicate Parameters */}
        {activeMode === 'spatial' && currentMode.predicates[activePredicate] && (
          currentMode.predicates[activePredicate].params.map(param => (
            <div key={param.name} className="param-field">
              <label>
                {param.label}
                {param.required && <span className="required">*</span>}
              </label>
              {renderParamInput(param)}
              {param.help && <div className="param-help">{param.help}</div>}
            </div>
          ))
        )}

        <button
          className="btn-search"
          onClick={handleSearch}
          disabled={!canSearch() || isSearching}
        >
          {isSearching ? 'Recherche...' : '🔍 Rechercher'}
        </button>
      </div>

      {/* Search Results */}
      {searchResults && (
        <SearchResults
          results={searchResults}
          onClose={() => setSearchResults(null)}
        />
      )}

      {/* Search History */}
      {searchHistory.length > 0 && !searchResults && (
        <div className="search-history">
          <h4>Recherches récentes</h4>
          <div className="history-list">
            {searchHistory.map(item => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => handleHistoryClick(item)}
              >
                <div className="history-query">{item.query}</div>
                <div className="history-meta">
                  {item.resultCount} résultats • {formatDate(item.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
  return date.toLocaleDateString('fr-FR');
}

export default SearchPanel;
