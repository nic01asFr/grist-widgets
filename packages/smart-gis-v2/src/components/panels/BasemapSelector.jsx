/**
 * BasemapSelector - Select basemap tile layer
 *
 * Displays basemaps grouped by category with previews
 */

import React, { useState } from 'react';
import BasemapProvider from '../../services/BasemapProvider';
import StateManager from '../../core/StateManager';
import './BasemapSelector.css';

const BasemapSelector = () => {
  const [currentBasemap, setCurrentBasemap] = useState(
    StateManager.getState('map.basemap') || 'osm'
  );

  const basemapsByCategory = BasemapProvider.getBasemapsByCategory();

  const handleSelect = (basemapId) => {
    setCurrentBasemap(basemapId);
    StateManager.setState('map.basemap', basemapId, 'Change basemap');
    console.log('[BasemapSelector] Selected:', basemapId);
  };

  return (
    <div className="basemap-selector">
      <h4>🗺️ Fond de carte</h4>

      {Object.entries(basemapsByCategory).map(([category, basemaps]) => (
        <div key={category} className="basemap-category">
          <h5>{category}</h5>
          <div className="basemap-grid">
            {basemaps.map(basemap => (
              <button
                key={basemap.id}
                className={`basemap-card ${currentBasemap === basemap.id ? 'active' : ''}`}
                onClick={() => handleSelect(basemap.id)}
                title={basemap.name}
              >
                <span className="basemap-icon">{basemap.icon}</span>
                <span className="basemap-name">{basemap.name}</span>
                {currentBasemap === basemap.id && (
                  <span className="check-badge">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BasemapSelector;
