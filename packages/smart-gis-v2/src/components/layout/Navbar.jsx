/**
 * Navbar - Top Navigation Bar (Level 1)
 *
 * Always visible, contains primary actions
 */

import React, { useEffect, useState } from 'react';
import StateManager from '../../core/StateManager';

const Navbar = () => {
  const [projectName, setProjectName] = useState('Smart-GIS Project');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [layerCount, setLayerCount] = useState(0);

  useEffect(() => {
    // Subscribe to layers changes
    const unsubscribeLayers = StateManager.subscribe('layers.workspace', (layers) => {
      setLayerCount(layers.length);
    });

    // Initial state
    setLayerCount(StateManager.getState('layers.workspace').length);

    // Update undo/redo state
    const interval = setInterval(() => {
      const history = StateManager.getHistory();
      setCanUndo(history.canUndo);
      setCanRedo(history.canRedo);
    }, 500);

    return () => {
      unsubscribeLayers();
      clearInterval(interval);
    };
  }, []);

  const handleNew = () => {
    if (confirm('Create new project? This will clear current workspace.')) {
      StateManager.reset();
    }
  };

  const handleSave = () => {
    // TODO: Implement save dialog
    console.log('Save project');
  };

  const handleImport = () => {
    StateManager.setState('ui.activeTab', 'data', 'Switch to import');
  };

  const handleSearch = () => {
    StateManager.setState('ui.activeTab', 'search', 'Switch to search');
  };

  const handleUndo = () => {
    StateManager.undo();
  };

  const handleRedo = () => {
    StateManager.redo();
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <button className="btn-icon" onClick={handleNew} title="New Project">
          ➕
        </button>
        <button className="btn-icon" onClick={handleSave} title="Save Project">
          💾
        </button>
        <button className="btn-icon" onClick={handleImport} title="Import Data">
          📥
        </button>
        <button className="btn-icon" onClick={handleSearch} title="Search">
          🔍
        </button>

        <div className="navbar-divider"></div>

        <button
          className="btn-icon"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo"
        >
          ↶
        </button>
        <button
          className="btn-icon"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo"
        >
          ↷
        </button>
      </div>

      <div className="navbar-center">
        <h1 className="project-name">{projectName}</h1>
        <span className="layer-count">{layerCount} layers</span>
      </div>

      <div className="navbar-right">
        <button className="btn-icon" title="Settings">
          ⚙️
        </button>
        <button className="btn-icon" title="Help">
          ❓
        </button>
      </div>
    </div>
  );
};

export default Navbar;
