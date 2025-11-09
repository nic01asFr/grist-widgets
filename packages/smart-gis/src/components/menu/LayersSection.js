/**
 * LayersSection Component
 * Smart GIS Widget v3.0
 *
 * Displays and manages all layers in the project
 * Redesigned with bulk actions, multi-select, and compact layout
 */

import React, { useState, useMemo } from 'react';
import LayerItem from './LayerItem';
import { Input } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const LayersSection = ({
  records = [],
  activeLayer = null,
  onActiveLayerChange,
  onLayerVisibilityToggle,
  onLayerEdit,
  onLayerDelete,
  onLayerRename,
  onEntityListOpen,
  onStatsOpen,
  visibleLayers = new Set(),
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | count | recent
  const [selectedLayers, setSelectedLayers] = useState(new Set());

  // Group records by layer
  const layerGroups = useMemo(() => {
    const groups = {};

    records.forEach(record => {
      const layerName = record.layer_name || 'Default Layer';
      if (!groups[layerName]) {
        groups[layerName] = {
          name: layerName,
          count: 0,
          geometryTypes: new Set(),
          entities: [],
        };
      }

      groups[layerName].count++;
      groups[layerName].entities.push(record);

      // Extract geometry type
      const geomType = extractGeometryType(record.geometry);
      if (geomType) {
        groups[layerName].geometryTypes.add(geomType);
      }
    });

    return Object.values(groups);
  }, [records]);

  // Filter and sort layers
  const filteredLayers = useMemo(() => {
    let filtered = layerGroups;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(layer =>
        layer.name.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [layerGroups, searchQuery, sortBy]);

  const totalEntities = layerGroups.reduce((sum, layer) => sum + layer.count, 0);
  const totalLayers = layerGroups.length;
  const visibleCount = Array.from(visibleLayers).length;

  // Multi-select handlers
  const handleToggleLayerSelection = (layerName) => {
    setSelectedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerName)) {
        newSet.delete(layerName);
      } else {
        newSet.add(layerName);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedLayers(new Set(filteredLayers.map(l => l.name)));
  };

  const handleDeselectAll = () => {
    setSelectedLayers(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedLayers.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedLayers.size} couche(s) sélectionnée(s) ?`)) return;

    for (const layerName of selectedLayers) {
      await onLayerDelete?.(layerName);
    }
    setSelectedLayers(new Set());
  };

  const handleBulkVisibility = (visible) => {
    for (const layerName of selectedLayers) {
      const isCurrentlyVisible = visibleLayers.has(layerName);
      if (visible !== isCurrentlyVisible) {
        onLayerVisibilityToggle?.(layerName);
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Search Bar (Fixed) */}
      <div style={styles.searchBar}>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une couche..."
          icon="🔎"
          fullWidth
        />
      </div>

      {/* Compact Stats & Sort (Fixed, Single Line) */}
      <div style={styles.statsAndSort}>
        <div style={styles.stats}>
          <span style={styles.statItem}>{totalLayers} couches</span>
          <span style={styles.statSeparator}>•</span>
          <span style={styles.statItem}>{totalEntities} entités</span>
          <span style={styles.statSeparator}>•</span>
          <span style={styles.statItem}>{visibleCount} visibles</span>
        </div>
        <div style={styles.sortButtons}>
          <button
            style={{ ...styles.sortButton, ...(sortBy === 'name' ? styles.sortButtonActive : {}) }}
            onClick={() => setSortBy('name')}
            title="Trier par nom"
          >
            A-Z
          </button>
          <button
            style={{ ...styles.sortButton, ...(sortBy === 'count' ? styles.sortButtonActive : {}) }}
            onClick={() => setSortBy('count')}
            title="Trier par nombre"
          >
            #
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar (Fixed, shown when layers selected) */}
      {selectedLayers.size > 0 && (
        <div style={styles.bulkToolbar}>
          <div style={styles.bulkInfo}>
            <span style={styles.bulkCount}>{selectedLayers.size} sélectionnée(s)</span>
            <button style={styles.bulkClearButton} onClick={handleDeselectAll}>
              ✕
            </button>
          </div>
          <div style={styles.bulkActions}>
            <button
              style={styles.bulkActionButton}
              onClick={() => handleBulkVisibility(true)}
              title="Afficher toutes"
            >
              👁️
            </button>
            <button
              style={styles.bulkActionButton}
              onClick={() => handleBulkVisibility(false)}
              title="Masquer toutes"
            >
              🙈
            </button>
            <button
              style={{ ...styles.bulkActionButton, ...styles.bulkActionButtonDanger }}
              onClick={handleBulkDelete}
              title="Supprimer"
            >
              🗑️
            </button>
          </div>
        </div>
      )}

      {/* Layers List (Scrollable Only) */}
      <div style={styles.layersList}>
        {filteredLayers.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📍</p>
            <p style={styles.emptyText}>
              {searchQuery ? 'Aucune couche trouvée' : 'Aucune couche'}
            </p>
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div style={styles.selectAllRow}>
              <input
                type="checkbox"
                checked={selectedLayers.size === filteredLayers.length && filteredLayers.length > 0}
                onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                style={styles.checkbox}
              />
              <span style={styles.selectAllText}>
                Tout sélectionner
              </span>
            </div>

            {/* Layer Items */}
            {filteredLayers.map(layer => (
              <LayerItem
                key={layer.name}
                layer={layer}
                isActive={activeLayer === layer.name}
                isVisible={visibleLayers.has(layer.name)}
                isSelected={selectedLayers.has(layer.name)}
                onActivate={() => onActiveLayerChange?.(layer.name)}
                onToggleVisibility={() => onLayerVisibilityToggle?.(layer.name)}
                onToggleSelection={() => handleToggleLayerSelection(layer.name)}
                onRename={(newName) => onLayerRename?.(layer.name, newName)}
                onShowEntities={() => onEntityListOpen?.(layer.name)}
              />
            ))}
          </>
        )}
      </div>

      {/* Bottom Actions (Fixed) */}
      <div style={styles.bottomActions}>
        <button
          style={styles.bottomButton}
          onClick={() => onActiveLayerChange?.(null)}
          disabled={!activeLayer}
        >
          Désélectionner la couche
        </button>
      </div>
    </div>
  );
};

/**
 * Helper: Extract geometry type from WKT string
 */
const extractGeometryType = (wkt) => {
  if (!wkt) return null;

  const match = wkt.match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  searchBar: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    flexShrink: 0,
  },
  statsAndSort: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${spacing.md} ${spacing.sm} ${spacing.md}`,
    flexShrink: 0,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: '11px',
    color: colors.textSecondary,
  },
  statItem: {
    fontWeight: fontWeight.medium,
  },
  statSeparator: {
    color: colors.border,
  },
  sortButtons: {
    display: 'flex',
    gap: '4px',
  },
  sortButton: {
    width: '32px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: '11px',
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
  sortButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    color: colors.primary,
  },
  bulkToolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    padding: spacing.sm,
    margin: `0 ${spacing.md} ${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.primaryVeryLight,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    flexShrink: 0,
  },
  bulkInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  bulkClearButton: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.sm,
    fontSize: '12px',
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  bulkActions: {
    display: 'flex',
    gap: spacing.xs,
  },
  bulkActionButton: {
    flex: 1,
    padding: spacing.xs,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  bulkActionButtonDanger: {
    borderColor: colors.danger,
    color: colors.danger,
  },
  layersList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    padding: `0 ${spacing.md}`,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  selectAllRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  selectAllText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  emptyState: {
    padding: spacing.xl,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 8px 0',
    opacity: 0.3,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    margin: 0,
  },
  bottomActions: {
    display: 'flex',
    padding: spacing.md,
    paddingTop: spacing.sm,
    borderTop: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  bottomButton: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.grayLight,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
};

export default LayersSection;
