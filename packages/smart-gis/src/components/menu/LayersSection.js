/**
 * LayersSection Component
 * Smart GIS Widget v3.0
 *
 * Displays and manages all layers in the project
 */

import React, { useState, useMemo } from 'react';
import { MenuSection } from '../layout';
import LayerItem from './LayerItem';
import { Button, Input } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

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

  return (
    <MenuSection title="📍 Couches" icon="📍" defaultExpanded={true}>
      <div style={styles.container}>
        {/* Search & Stats */}
        <div style={styles.header}>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une couche..."
            icon="🔎"
            fullWidth
          />

          <div style={styles.stats}>
            <span style={styles.statItem}>
              {totalLayers} couche{totalLayers > 1 ? 's' : ''}
            </span>
            <span style={styles.statSeparator}>•</span>
            <span style={styles.statItem}>
              {totalEntities} entité{totalEntities > 1 ? 's' : ''}
            </span>
            <span style={styles.statSeparator}>•</span>
            <span style={styles.statItem}>
              {visibleCount} visible{visibleCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Sort Options */}
        <div style={styles.sortBar}>
          <span style={styles.sortLabel}>Trier par:</span>
          <button
            style={{ ...styles.sortButton, ...(sortBy === 'name' ? styles.sortButtonActive : {}) }}
            onClick={() => setSortBy('name')}
          >
            Nom
          </button>
          <button
            style={{ ...styles.sortButton, ...(sortBy === 'count' ? styles.sortButtonActive : {}) }}
            onClick={() => setSortBy('count')}
          >
            Nombre
          </button>
        </div>

        {/* Layers List */}
        <div style={styles.layersList}>
          {filteredLayers.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📍</p>
              <p style={styles.emptyText}>
                {searchQuery ? 'Aucune couche trouvée' : 'Aucune couche'}
              </p>
            </div>
          ) : (
            filteredLayers.map(layer => (
              <LayerItem
                key={layer.name}
                layer={layer}
                isActive={activeLayer === layer.name}
                isVisible={visibleLayers.has(layer.name)}
                onActivate={() => onActiveLayerChange?.(layer.name)}
                onToggleVisibility={() => onLayerVisibilityToggle?.(layer.name)}
                onEdit={() => onLayerEdit?.(layer.name)}
                onDelete={() => onLayerDelete?.(layer.name)}
                onRename={(newName) => onLayerRename?.(layer.name, newName)}
                onShowEntities={() => onEntityListOpen?.(layer.name)}
                onShowStats={() => onStatsOpen?.(layer.name)}
              />
            ))
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onActiveLayerChange?.(null)}
            fullWidth
          >
            Désélectionner la couche
          </Button>
        </div>
      </div>
    </MenuSection>
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
    gap: spacing.md,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statItem: {
    fontWeight: fontWeight.medium,
  },
  statSeparator: {
    color: colors.border,
  },
  sortBar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} 0`,
  },
  sortLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  sortButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  sortButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    color: colors.primary,
  },
  layersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    maxHeight: '400px',
    overflowY: 'auto',
    padding: `${spacing.xs} 0`,
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
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTop: `1px solid ${colors.border}`,
  },
};

export default LayersSection;
