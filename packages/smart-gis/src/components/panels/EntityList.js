/**
 * EntityList Panel Component
 * Smart GIS Widget v3.0
 *
 * Displays filtered list of entities from a layer
 */

import React, { useState, useMemo } from 'react';
import { Button, Input, Checkbox } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const EntityList = ({
  entities = [],
  layerName = '',
  selection = [],
  onEntityClick,
  onEntitySelect,
  onZoomTo,
  onEdit,
  onDelete,
  onSelectAll,
  onClearSelection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGeometryType, setFilterGeometryType] = useState('all');
  const [sortBy, setSortBy] = useState('id'); // id | name | type

  // Extract geometry types present
  const geometryTypes = useMemo(() => {
    const types = new Set();
    entities.forEach(entity => {
      const type = extractGeometryType(entity.geometry);
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [entities]);

  // Filter and sort entities
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entity =>
        (entity.name && entity.name.toLowerCase().includes(query)) ||
        (entity.id && entity.id.toString().includes(query))
      );
    }

    // Geometry type filter
    if (filterGeometryType !== 'all') {
      filtered = filtered.filter(entity => {
        const type = extractGeometryType(entity.geometry);
        return type === filterGeometryType;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'type':
          const typeA = extractGeometryType(a.geometry) || '';
          const typeB = extractGeometryType(b.geometry) || '';
          return typeA.localeCompare(typeB);
        case 'id':
        default:
          return a.id - b.id;
      }
    });

    return filtered;
  }, [entities, searchQuery, filterGeometryType, sortBy]);

  const selectedCount = selection.length;
  const isAllSelected = filteredEntities.length > 0 && filteredEntities.every(e => selection.includes(e.id));

  const geometryIcons = {
    POINT: '📍',
    LINESTRING: '〰️',
    POLYGON: '▭',
    MULTIPOINT: '📍📍',
    MULTILINESTRING: '〰️〰️',
    MULTIPOLYGON: '▭▭',
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onClearSelection?.();
    } else {
      onSelectAll?.(filteredEntities.map(e => e.id));
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          {layerName}
        </h3>
        <p style={styles.subtitle}>
          {entities.length} entité{entities.length > 1 ? 's' : ''}
          {filteredEntities.length !== entities.length && ` (${filteredEntities.length} filtré${filteredEntities.length > 1 ? 's' : ''})`}
        </p>
      </div>

      {/* Search & Filters */}
      <div style={styles.filters}>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom ou ID..."
          icon="🔎"
          fullWidth
        />

        {geometryTypes.length > 1 && (
          <div style={styles.filterRow}>
            <span style={styles.filterLabel}>Type:</span>
            <select
              value={filterGeometryType}
              onChange={(e) => setFilterGeometryType(e.target.value)}
              style={styles.select}
            >
              <option value="all">Tous</option>
              {geometryTypes.map(type => (
                <option key={type} value={type}>
                  {geometryIcons[type] || '❓'} {type}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.filterRow}>
          <span style={styles.filterLabel}>Trier:</span>
          <div style={styles.sortButtons}>
            <button
              style={{ ...styles.sortButton, ...(sortBy === 'id' ? styles.sortButtonActive : {}) }}
              onClick={() => setSortBy('id')}
            >
              ID
            </button>
            <button
              style={{ ...styles.sortButton, ...(sortBy === 'name' ? styles.sortButtonActive : {}) }}
              onClick={() => setSortBy('name')}
            >
              Nom
            </button>
            <button
              style={{ ...styles.sortButton, ...(sortBy === 'type' ? styles.sortButtonActive : {}) }}
              onClick={() => setSortBy('type')}
            >
              Type
            </button>
          </div>
        </div>
      </div>

      {/* Select All */}
      {filteredEntities.length > 0 && (
        <div style={styles.selectAll}>
          <Checkbox
            checked={isAllSelected}
            onChange={handleSelectAll}
            label={isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          />
          {selectedCount > 0 && (
            <span style={styles.selectionCount}>
              {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Entity List */}
      <div style={styles.listContainer}>
        {filteredEntities.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🔍</p>
            <p style={styles.emptyText}>
              {searchQuery || filterGeometryType !== 'all'
                ? 'Aucune entité trouvée'
                : 'Aucune entité dans cette couche'}
            </p>
          </div>
        ) : (
          filteredEntities.map(entity => (
            <EntityListItem
              key={entity.id}
              entity={entity}
              isSelected={selection.includes(entity.id)}
              onSelect={() => onEntitySelect?.(entity.id)}
              onClick={() => onEntityClick?.(entity.id)}
              onZoomTo={() => onZoomTo?.(entity.id)}
              onEdit={() => onEdit?.(entity.id)}
              onDelete={() => onDelete?.(entity.id)}
            />
          ))
        )}
      </div>

      {/* Batch Actions */}
      {selectedCount > 0 && (
        <div style={styles.batchActions}>
          <Button variant="secondary" size="small" onClick={() => onZoomTo?.(selection)} fullWidth>
            🔍 Recentrer ({selectedCount})
          </Button>
          <Button variant="secondary" size="small" onClick={() => onEdit?.(selection)} fullWidth>
            🎨 Éditer le style
          </Button>
          <Button variant="danger" size="small" onClick={() => onDelete?.(selection)} fullWidth>
            🗑️ Supprimer ({selectedCount})
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * EntityListItem - Individual entity row
 */
const EntityListItem = ({ entity, isSelected, onSelect, onClick, onZoomTo, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  const geometryType = extractGeometryType(entity.geometry);
  const geometryIcons = {
    POINT: '📍',
    LINESTRING: '〰️',
    POLYGON: '▭',
    MULTIPOINT: '📍📍',
    MULTILINESTRING: '〰️〰️',
    MULTIPOLYGON: '▭▭',
  };

  return (
    <div
      style={{
        ...itemStyles.container,
        ...(isSelected ? itemStyles.containerSelected : {}),
        ...(showActions ? itemStyles.containerHover : {}),
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={itemStyles.mainRow} onClick={onClick}>
        <Checkbox
          checked={isSelected}
          onChange={(checked) => {
            onSelect(entity.id);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        <span style={itemStyles.icon}>
          {geometryIcons[geometryType] || '❓'}
        </span>

        <div style={itemStyles.info}>
          <div style={itemStyles.name}>
            {entity.name || `Entité #${entity.id}`}
          </div>
          <div style={itemStyles.meta}>
            ID: {entity.id} • {geometryType || 'Unknown'}
          </div>
        </div>
      </div>

      {showActions && (
        <div style={itemStyles.actions}>
          <button style={itemStyles.actionButton} onClick={(e) => { e.stopPropagation(); onZoomTo(); }} title="Recentrer">
            🔍
          </button>
          <button style={itemStyles.actionButton} onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Éditer">
            ✏️
          </button>
          <button style={itemStyles.actionButton} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Supprimer">
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Helper: Extract geometry type from WKT
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
  header: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  title: {
    margin: 0,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0 0`,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filters: {
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    borderBottom: `1px solid ${colors.border}`,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    minWidth: '50px',
  },
  select: {
    flex: 1,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    outline: 'none',
    cursor: 'pointer',
  },
  sortButtons: {
    display: 'flex',
    gap: spacing.xs,
    flex: 1,
  },
  sortButton: {
    flex: 1,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  selectAll: {
    padding: spacing.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${colors.border}`,
  },
  selectionCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.selected,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.selectedLight,
    borderRadius: borderRadius.sm,
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: spacing.sm,
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
  batchActions: {
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
  },
};

const itemStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  containerSelected: {
    backgroundColor: colors.selectedLight,
    borderColor: colors.selected,
  },
  containerHover: {
    borderColor: colors.primary,
    transform: 'translateX(2px)',
  },
  mainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: fontSize.md,
    width: '20px',
    textAlign: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: '2px',
  },
  actions: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTop: `1px solid ${colors.border}`,
  },
  actionButton: {
    flex: 1,
    padding: spacing.xs,
    backgroundColor: colors.grayVeryLight,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
};

export default EntityList;
