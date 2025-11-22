/**
 * SearchResults - Display Search Results
 *
 * Features:
 * - Results list with highlighting
 * - Map integration (pan/zoom to results)
 * - Export results
 * - Create layer from results
 */

import React, { useState } from 'react';
import StateManager from '../../core/StateManager';
import { calculateBounds } from '../../utils/geometry/wktParser';
import './SearchResults.css';

const SearchResults = ({ results, onClose }) => {
  const [selectedResultId, setSelectedResultId] = useState(null);

  const handleResultClick = (result) => {
    setSelectedResultId(result.id);

    // Update selection in StateManager
    StateManager.setState('selection.ids', [result.id], 'Select search result');

    // Calculate and zoom to geometry bounds
    if (result.geometry_wgs84 || result.geometry) {
      const geometry = result.geometry_wgs84 || result.geometry;
      const bounds = calculateBounds(geometry);

      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;

      const latDiff = bounds.maxLat - bounds.minLat;
      const lngDiff = bounds.maxLng - bounds.minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      let zoom = maxDiff > 5 ? 6 : maxDiff > 1 ? 9 : maxDiff > 0.5 ? 11 : 13;

      StateManager.setState('map.center', [centerLat, centerLng], 'Zoom to result');
      StateManager.setState('map.zoom', zoom, 'Zoom to result');
    }
  };

  const handleSelectAll = () => {
    const allIds = results.results.map(r => r.id);
    StateManager.setState('selection.ids', allIds, 'Select all search results');
  };

  const handleZoomToAll = () => {
    if (results.results.length === 0) return;

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

    results.results.forEach(result => {
      const geometry = result.geometry_wgs84 || result.geometry;
      if (!geometry) return;

      const bounds = calculateBounds(geometry);
      minLat = Math.min(minLat, bounds.minLat);
      maxLat = Math.max(maxLat, bounds.maxLat);
      minLng = Math.min(minLng, bounds.minLng);
      maxLng = Math.max(maxLng, bounds.maxLng);
    });

    if (minLat !== Infinity) {
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      let zoom = maxDiff > 5 ? 6 : maxDiff > 1 ? 9 : maxDiff > 0.5 ? 11 : 13;

      StateManager.setState('map.center', [centerLat, centerLng], 'Zoom to all results');
      StateManager.setState('map.zoom', zoom, 'Zoom to all results');
    }
  };

  const getModeLabel = (mode) => {
    const labels = {
      semantic: 'Sémantique',
      spatial: 'Spatiale',
      hybrid: 'Hybride'
    };
    return labels[mode] || mode;
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="search-results">
      <div className="results-header">
        <div className="results-title">
          <h4>Résultats de recherche</h4>
          <span className="results-count">{results.count} résultat{results.count > 1 ? 's' : ''}</span>
        </div>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="results-meta">
        <div className="meta-item">
          <span className="meta-label">Mode:</span>
          <span className="meta-value">{getModeLabel(results.mode)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Heure:</span>
          <span className="meta-value">{formatTimestamp(results.timestamp)}</span>
        </div>
      </div>

      <div className="results-actions">
        <button className="btn-action" onClick={handleSelectAll}>
          ✓ Tout sélectionner
        </button>
        <button className="btn-action" onClick={handleZoomToAll}>
          🔍 Zoomer tout
        </button>
      </div>

      <div className="results-list">
        {results.results.length === 0 ? (
          <div className="empty-results">
            <div className="empty-icon">🔍</div>
            <p>Aucun résultat trouvé</p>
          </div>
        ) : (
          results.results.map(result => (
            <div
              key={result.id}
              className={`result-item ${selectedResultId === result.id ? 'selected' : ''}`}
              onClick={() => handleResultClick(result)}
            >
              <div className="result-header">
                <div className="result-name">
                  {result.feature_name || result.layer_name || `Feature ${result.id}`}
                </div>
                <div className="result-type-badge">{result.geometry_type || 'Unknown'}</div>
              </div>

              {result.layer_name && (
                <div className="result-layer">
                  📚 {result.layer_name}
                </div>
              )}

              {result.geometry_wgs84 && (
                <div className="result-geometry">
                  {(result.geometry_wgs84 || result.geometry).substring(0, 60)}...
                </div>
              )}

              <div className="result-actions-inline">
                <button
                  className="btn-inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResultClick(result);
                  }}
                >
                  🔍 Zoom
                </button>
                <button
                  className="btn-inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    StateManager.setState('selection.ids', [result.id], 'Select result');
                  }}
                >
                  ✓ Sélectionner
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchResults;
