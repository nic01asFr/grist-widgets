/**
 * LayersPanel - Gestion des Layers (Tab 1)
 *
 * Fonctionnalités:
 * - Liste des layers avec visibilité
 * - Toggle visibilité
 * - Suppression de layers
 * - Zoom sur layer
 * - Réorganisation z-index
 */

import React, { useState, useEffect } from 'react';
import StateManager from '../../core/StateManager';
import GristAPI from '../../core/GristAPI';
import { calculateBounds } from '../../utils/geometry/wktParser';
import './LayersPanel.css';

const LayersPanel = () => {
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [groupedLayers, setGroupedLayers] = useState({});

  useEffect(() => {
    const unsubscribe = StateManager.subscribe('layers.workspace', (workspaceLayers) => {
      setLayers(workspaceLayers);
      groupLayersByName(workspaceLayers);
    });

    const initialLayers = StateManager.getState('layers.workspace');
    setLayers(initialLayers);
    groupLayersByName(initialLayers);

    return unsubscribe;
  }, []);

  // Grouper layers par layer_name (pour gérer les multi-features)
  const groupLayersByName = (layersList) => {
    const grouped = {};

    layersList.forEach(layer => {
      const name = layer.layer_name || 'Sans nom';
      if (!grouped[name]) {
        grouped[name] = {
          name,
          features: [],
          visible: true,
          zIndex: layer.z_index || 0
        };
      }
      grouped[name].features.push(layer);
    });

    setGroupedLayers(grouped);
  };

  const toggleLayerVisibility = async (layerName) => {
    const layerGroup = groupedLayers[layerName];
    if (!layerGroup) return;

    const newVisibility = !layerGroup.visible;

    // Mettre à jour tous les features de ce layer
    const updates = layerGroup.features.map(f => ({
      id: f.id,
      is_visible: newVisibility
    }));

    try {
      const currentTable = StateManager.getState('data.currentTable') || 'GIS_WorkSpace';
      await GristAPI.updateRecords(currentTable, updates);

      // Mettre à jour état local
      const updatedLayers = layers.map(l =>
        l.layer_name === layerName ? { ...l, is_visible: newVisibility } : l
      );
      StateManager.setState('layers.workspace', updatedLayers, `Toggle visibility: ${layerName}`);
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const deleteLayer = async (layerName) => {
    if (!confirm(`Supprimer le layer "${layerName}" et toutes ses features (${groupedLayers[layerName].features.length}) ?`)) {
      return;
    }

    const layerGroup = groupedLayers[layerName];
    const featureIds = layerGroup.features.map(f => f.id);

    try {
      const currentTable = StateManager.getState('data.currentTable') || 'GIS_WorkSpace';
      await GristAPI.deleteRecords(currentTable, featureIds);

      // Mettre à jour état local
      const updatedLayers = layers.filter(l => !featureIds.includes(l.id));
      StateManager.setState('layers.workspace', updatedLayers, `Delete layer: ${layerName}`);
    } catch (error) {
      console.error('Error deleting layer:', error);
    }
  };

  const zoomToLayer = (layerName) => {
    const layerGroup = groupedLayers[layerName];
    if (!layerGroup || layerGroup.features.length === 0) return;

    // Calculer bounds globales pour toutes les features
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    layerGroup.features.forEach(feature => {
      const geometry = feature.geometry_wgs84 || feature.geometry;
      if (!geometry) return;

      const bounds = calculateBounds(geometry);
      if (bounds) {
        minLat = Math.min(minLat, bounds.minLat);
        maxLat = Math.max(maxLat, bounds.maxLat);
        minLng = Math.min(minLng, bounds.minLng);
        maxLng = Math.max(maxLng, bounds.maxLng);
      }
    });

    if (minLat !== Infinity) {
      // Calculer centre et zoom approprié
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // Estimer zoom basé sur l'étendue
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      let zoom = 13;
      if (maxDiff > 5) zoom = 6;
      else if (maxDiff > 1) zoom = 9;
      else if (maxDiff > 0.5) zoom = 11;
      else if (maxDiff > 0.1) zoom = 13;
      else zoom = 15;

      StateManager.setState('map.center', [centerLat, centerLng], 'Zoom to layer');
      StateManager.setState('map.zoom', zoom, 'Zoom to layer');
    }
  };

  const getLayerStats = (layerGroup) => {
    const types = {};
    layerGroup.features.forEach(f => {
      const type = f.geometry_type || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });

    return {
      total: layerGroup.features.length,
      types: Object.entries(types).map(([type, count]) => ({ type, count }))
    };
  };

  const layersList = Object.values(groupedLayers).sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <h3>Layers ({layersList.length})</h3>
        {layers.length > 0 && (
          <span className="features-count">{layers.length} features</span>
        )}
      </div>

      {layersList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <p>Aucun layer disponible</p>
          <div className="hint">
            💡 Importez des données depuis l'onglet "Import" pour commencer
          </div>
        </div>
      ) : (
        <div className="layers-list">
          {layersList.map(layerGroup => {
            const stats = getLayerStats(layerGroup);
            const isSelected = selectedLayerId === layerGroup.name;

            return (
              <div
                key={layerGroup.name}
                className={`layer-item ${isSelected ? 'selected' : ''} ${!layerGroup.visible ? 'hidden' : ''}`}
              >
                <div className="layer-controls">
                  <button
                    className="btn-visibility"
                    onClick={() => toggleLayerVisibility(layerGroup.name)}
                    title={layerGroup.visible ? 'Masquer' : 'Afficher'}
                  >
                    {layerGroup.visible ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                <div
                  className="layer-info"
                  onClick={() => setSelectedLayerId(isSelected ? null : layerGroup.name)}
                >
                  <div className="layer-name">{layerGroup.name}</div>
                  <div className="layer-meta">
                    <span className="badge badge-count">{stats.total} feature{stats.total > 1 ? 's' : ''}</span>
                    {stats.types.map(({ type, count }) => (
                      <span key={type} className="badge badge-type">
                        {type} {count > 1 ? `(${count})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="layer-actions">
                  <button
                    onClick={() => zoomToLayer(layerGroup.name)}
                    title="Zoomer sur le layer"
                    className="btn-action"
                  >
                    🔍
                  </button>
                  <button
                    onClick={() => deleteLayer(layerGroup.name)}
                    title="Supprimer le layer"
                    className="btn-action btn-delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {layers.length > 0 && (
        <div className="layers-footer">
          <div className="layers-stats">
            <strong>Total:</strong> {layers.length} features dans {layersList.length} layer{layersList.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default LayersPanel;
