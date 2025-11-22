/**
 * ToolsPanel - Interface des 30+ Outils Spatiaux (Tab 2)
 *
 * Affiche les outils disponibles selon la sélection active
 * Organisés en 6 catégories avec accordéons
 */

import React, { useState, useEffect, useMemo } from 'react';
import StateManager from '../../core/StateManager';
import { SPATIAL_TOOL_CATEGORIES, getAvailableTools } from '../../config/toolDefinitions';
import ToolExecutor from '../tools/ToolExecutor';
import './ToolsPanel.css';

const ToolsPanel = () => {
  const [selection, setSelection] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState('measurement');
  const [activeTool, setActiveTool] = useState(null);
  const [allLayers, setAllLayers] = useState([]);

  useEffect(() => {
    // Souscrire aux changements de sélection
    const unsubscribeSelection = StateManager.subscribe('selection.ids', (selectedIds) => {
      // Récupérer infos complètes des features sélectionnées
      const layers = StateManager.getState('layers.workspace');
      const selectedFeatures = layers.filter(layer => selectedIds.includes(layer.id));
      setSelection(selectedFeatures);
    });

    // Souscrire aux changements de layers
    const unsubscribeLayers = StateManager.subscribe('layers.workspace', setAllLayers);

    // État initial
    setAllLayers(StateManager.getState('layers.workspace'));
    const initialSelection = StateManager.getState('selection.ids');
    const initialFeatures = StateManager.getState('layers.workspace')
      .filter(layer => initialSelection.includes(layer.id));
    setSelection(initialFeatures);

    return () => {
      unsubscribeSelection();
      unsubscribeLayers();
    };
  }, []);

  // Calculer catégories d'outils disponibles selon sélection
  const availableCategories = useMemo(() => {
    return getAvailableTools(selection);
  }, [selection]);

  const handleToolClick = (tool) => {
    setActiveTool(tool);
    StateManager.setState('tools.activeTool', tool, `Activate tool: ${tool.label}`);
  };

  const handleToolClose = () => {
    setActiveTool(null);
    StateManager.setState('tools.activeTool', null, 'Close tool');
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  // Obtenir types de géométries dans la sélection
  const getGeometryTypes = () => {
    if (selection.length === 0) return [];
    const types = new Set(selection.map(f => f.geometry_type));
    return Array.from(types);
  };

  return (
    <div className="tools-panel">
      {/* Info sélection */}
      <div className="selection-info">
        {selection.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛠️</div>
            <p>Sélectionnez des géométries sur la carte pour voir les outils disponibles</p>
            <div className="hint">
              💡 Cliquez sur une feature ou utilisez les outils de sélection
            </div>
          </div>
        ) : (
          <div className="selection-summary">
            <div className="selection-count">
              <strong>{selection.length}</strong> {selection.length === 1 ? 'géométrie sélectionnée' : 'géométries sélectionnées'}
            </div>

            <div className="geometry-types">
              {getGeometryTypes().map(type => (
                <span key={type} className="badge badge-geometry">
                  {type}
                </span>
              ))}
            </div>

            <button
              className="btn-clear-selection"
              onClick={() => StateManager.setState('selection.ids', [], 'Clear selection')}
            >
              Effacer sélection
            </button>
          </div>
        )}
      </div>

      {/* Catégories d'outils */}
      {selection.length > 0 && (
        <div className="tool-categories">
          {Object.keys(availableCategories).length === 0 ? (
            <div className="no-tools-message">
              <p>Aucun outil disponible pour cette sélection</p>
            </div>
          ) : (
            Object.entries(availableCategories).map(([categoryId, category]) => (
              <div key={categoryId} className="tool-category">
                <div
                  className={`category-header ${expandedCategory === categoryId ? 'expanded' : ''}`}
                  onClick={() => toggleCategory(categoryId)}
                  style={{ borderLeftColor: category.color }}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-label">{category.label}</span>
                  <span className="tool-count">{category.tools.length}</span>
                  <span className="expand-icon">
                    {expandedCategory === categoryId ? '▼' : '▶'}
                  </span>
                </div>

                {expandedCategory === categoryId && (
                  <div className="category-tools">
                    <p className="category-description">{category.description}</p>

                    <div className="tools-grid">
                      {category.tools.map(tool => (
                        <button
                          key={tool.id}
                          className="tool-button"
                          onClick={() => handleToolClick(tool)}
                          title={tool.description}
                        >
                          <span className="tool-label">{tool.label}</span>

                          {tool.multiSelect && (
                            <span className="badge-small badge-multi">Multi</span>
                          )}

                          {tool.requiresSecondLayer && (
                            <span className="badge-small badge-layer">+Layer</span>
                          )}

                          {tool.createsNewGeometry && (
                            <span className="badge-small badge-new">Nouveau</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Exécuteur d'outil (modal) */}
      {activeTool && (
        <ToolExecutor
          tool={activeTool}
          selectedFeatures={selection}
          onClose={handleToolClose}
        />
      )}
    </div>
  );
};

export default ToolsPanel;
