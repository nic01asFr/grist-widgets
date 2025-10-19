/**
 * LAYER MANAGER COMPONENT
 *
 * Panneau de gestion des couches (layers) du projet cartographique
 * Fonctionnalités:
 * - Liste hiérarchique des couches
 * - Toggle visibilité par couche
 * - Réorganisation z-index (drag & drop futur)
 * - Statistiques par couche (nombre d'entités)
 */

import React, { useState } from 'react';

const LayerManager = ({ layers, onToggleVisibility, onUpdateZIndex }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!layers || layers.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>📚 Couches</span>
        </div>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Aucune couche</p>
          <p style={styles.emptyHint}>Importez des données pour commencer</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <span style={styles.title}>
          {collapsed ? '▶' : '▼'} 📚 Couches ({layers.length})
        </span>
      </div>

      {!collapsed && (
        <div style={styles.layerList}>
          {layers.map((layer, index) => (
            <LayerItem
              key={layer.name}
              layer={layer}
              index={index}
              onToggleVisibility={onToggleVisibility}
              onUpdateZIndex={onUpdateZIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const LayerItem = ({ layer, index, onToggleVisibility, onUpdateZIndex }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = () => {
    if (onToggleVisibility) {
      onToggleVisibility(layer.name, !layer.visible);
    }
  };

  const handleMoveUp = () => {
    if (onUpdateZIndex && layer.zIndex < 100) {
      onUpdateZIndex(layer.name, layer.zIndex + 1);
    }
  };

  const handleMoveDown = () => {
    if (onUpdateZIndex && layer.zIndex > 0) {
      onUpdateZIndex(layer.name, layer.zIndex - 1);
    }
  };

  const getLayerIcon = (type) => {
    switch (type) {
      case 'vector': return '📍';
      case 'raster': return '🖼️';
      case 'wms': return '🌐';
      case 'wfs': return '🔗';
      default: return '📄';
    }
  };

  return (
    <div style={{
      ...styles.layerItem,
      opacity: layer.visible ? 1 : 0.5
    }}>
      <div style={styles.layerHeader}>
        {/* Checkbox visibilité */}
        <input
          type="checkbox"
          checked={layer.visible}
          onChange={handleToggle}
          style={styles.checkbox}
          title="Toggle visibility"
        />

        {/* Nom et icône */}
        <span
          style={styles.layerName}
          onClick={() => setShowDetails(!showDetails)}
          title="Click for details"
        >
          {getLayerIcon(layer.type)} {layer.name}
        </span>

        {/* Badge nombre d'entités */}
        <span style={styles.badge}>
          {layer.features.length}
        </span>

        {/* Contrôles z-index */}
        <div style={styles.zIndexControls}>
          <button
            onClick={handleMoveUp}
            style={styles.zButton}
            title="Move layer up (increase z-index)"
          >
            ↑
          </button>
          <span style={styles.zValue}>{layer.zIndex}</span>
          <button
            onClick={handleMoveDown}
            style={styles.zButton}
            title="Move layer down (decrease z-index)"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Détails de la couche */}
      {showDetails && (
        <div style={styles.layerDetails}>
          <div style={styles.detailRow}>
            <strong>Type:</strong> {layer.type}
          </div>
          <div style={styles.detailRow}>
            <strong>Entités:</strong> {layer.features.length}
          </div>
          <div style={styles.detailRow}>
            <strong>Visibles:</strong>{' '}
            {layer.features.filter(f => f.is_visible !== false).length}
          </div>
          <div style={styles.detailRow}>
            <strong>Z-index:</strong> {layer.zIndex}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '10px',
    overflow: 'hidden'
  },
  header: {
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
    cursor: 'pointer',
    userSelect: 'none'
  },
  title: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#495057'
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center'
  },
  emptyText: {
    margin: '0 0 8px 0',
    color: '#6c757d',
    fontSize: '14px'
  },
  emptyHint: {
    margin: 0,
    color: '#adb5bd',
    fontSize: '12px'
  },
  layerList: {
    padding: '8px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  layerItem: {
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    marginBottom: '6px',
    backgroundColor: 'white',
    transition: 'opacity 0.2s'
  },
  layerHeader: {
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px'
  },
  layerName: {
    flex: 1,
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#212529'
  },
  badge: {
    backgroundColor: '#e9ecef',
    color: '#495057',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600'
  },
  zIndexControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px'
  },
  zButton: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    padding: '2px 6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#495057',
    transition: 'all 0.2s'
  },
  zValue: {
    fontSize: '11px',
    color: '#6c757d',
    minWidth: '20px',
    textAlign: 'center'
  },
  layerDetails: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e9ecef',
    fontSize: '12px'
  },
  detailRow: {
    marginBottom: '6px',
    color: '#495057'
  }
};

export default LayerManager;
