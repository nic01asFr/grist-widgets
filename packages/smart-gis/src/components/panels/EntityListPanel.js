/**
 * EntityListPanel Component
 * Smart GIS Widget v3.0
 *
 * Displays list of entities for a selected layer
 * Shown when user clicks on a layer in LayersSection
 */

import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const EntityListPanel = ({
  layerName,
  entities = [],
  selectedEntityIds = [],
  onEntityClick,
  onClose,
  onSelectAll,
  onDeselectAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter entities by search
  const filteredEntities = entities.filter(entity => {
    if (!searchQuery.trim()) return true;
    const name = (entity.name || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getGeometryIcon = (geometry) => {
    if (!geometry) return '❓';
    if (geometry.startsWith('POINT')) return '📍';
    if (geometry.startsWith('LINE')) return '〰️';
    if (geometry.startsWith('POLYGON')) return '▭';
    return '🗺️';
  };

  const allSelected = filteredEntities.length > 0 &&
    filteredEntities.every(e => selectedEntityIds.includes(e.id));

  const handleToggleAll = () => {
    if (allSelected) {
      onDeselectAll?.();
    } else {
      onSelectAll?.(filteredEntities.map(e => e.id));
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={styles.layerIcon}>📂</span>
            <span style={styles.layerName}>{layerName}</span>
            <span style={styles.entityCount}>({entities.length})</span>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={styles.searchBar}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une entité..."
            style={styles.searchInput}
          />
        </div>

        {/* Bulk Selection */}
        <div style={styles.bulkBar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleAll}
              style={styles.checkbox}
            />
            <span>Tout sélectionner</span>
          </label>
          <span style={styles.selectedCount}>
            {selectedEntityIds.length} sélectionnée(s)
          </span>
        </div>

        {/* Entity List */}
        <div style={styles.list}>
          {filteredEntities.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>🔍</span>
              <span style={styles.emptyText}>
                {searchQuery ? 'Aucune entité trouvée' : 'Aucune entité'}
              </span>
            </div>
          ) : (
            filteredEntities.map((entity) => {
              const isSelected = selectedEntityIds.includes(entity.id);
              return (
                <div
                  key={entity.id}
                  style={{
                    ...styles.entityItem,
                    ...(isSelected ? styles.entityItemSelected : {}),
                  }}
                  onClick={() => onEntityClick?.(entity.id)}
                >
                  <span style={styles.entityIcon}>
                    {getGeometryIcon(entity.geometry)}
                  </span>
                  <div style={styles.entityInfo}>
                    <div style={styles.entityName}>
                      {entity.name || `Entité #${entity.id}`}
                    </div>
                    {entity.description && (
                      <div style={styles.entityDesc}>
                        {entity.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span style={styles.selectedBadge}>✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.closeFooterButton} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    width: '90%',
    maxWidth: '600px',
    height: '80vh',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottom: `2px solid ${colors.border}`,
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  layerIcon: {
    fontSize: fontSize.xl,
  },
  layerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  entityCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.sm,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  searchBar: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  searchInput: {
    width: '100%',
    padding: spacing.sm,
    fontSize: fontSize.sm,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    outline: 'none',
    transition: `all ${transitions.fast}`,
  },
  bulkBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.grayVeryLight,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: fontSize.sm,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  selectedCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: spacing.sm,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    height: '100%',
  },
  emptyIcon: {
    fontSize: '64px',
    opacity: 0.3,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  entityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  entityItemSelected: {
    backgroundColor: colors.primaryVeryLight,
    borderColor: colors.primary,
  },
  entityIcon: {
    fontSize: fontSize.lg,
    flexShrink: 0,
  },
  entityInfo: {
    flex: 1,
    minWidth: 0,
  },
  entityName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  entityDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  selectedBadge: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTop: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  closeFooterButton: {
    padding: `${spacing.sm} ${spacing.md}`,
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

export default EntityListPanel;
