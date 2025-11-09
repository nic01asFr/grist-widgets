/**
 * LayerItem Component
 * Smart GIS Widget v3.0
 *
 * Individual layer display with actions
 */

import React, { useState } from 'react';
import { Input } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const LayerItem = ({
  layer,
  isActive = false,
  isVisible = true,
  onActivate,
  onToggleVisibility,
  onEdit,
  onDelete,
  onRename,
  onShowEntities,
  onShowStats,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const [showActions, setShowActions] = useState(false);

  const handleRename = () => {
    if (editName.trim() && editName !== layer.name) {
      onRename?.(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(layer.name);
      setIsEditing(false);
    }
  };

  const geometryIcons = {
    POINT: '📍',
    LINESTRING: '〰️',
    POLYGON: '▭',
    MULTIPOINT: '📍📍',
    MULTILINESTRING: '〰️〰️',
    MULTIPOLYGON: '▭▭',
  };

  const getGeometryIcon = () => {
    if (!layer.geometryTypes || layer.geometryTypes.size === 0) return '❓';
    const types = Array.from(layer.geometryTypes);
    if (types.length === 1) {
      return geometryIcons[types[0]] || '❓';
    }
    return '🗺️'; // Mixed types
  };

  return (
    <div
      style={{
        ...styles.container,
        ...(isActive ? styles.containerActive : {}),
        ...(showActions ? styles.containerHover : {}),
      }}
      onClick={onActivate}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Main Row */}
      <div style={styles.mainRow}>
        {/* Visibility Toggle */}
        <button
          style={styles.visibilityButton}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility?.();
          }}
          title={isVisible ? 'Masquer la couche' : 'Afficher la couche'}
        >
          {isVisible ? '👁️' : '🙈'}
        </button>

        {/* Geometry Type Icon */}
        <span style={styles.geometryIcon} title={Array.from(layer.geometryTypes || []).join(', ')}>
          {getGeometryIcon()}
        </span>

        {/* Layer Name */}
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyPress}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={styles.nameInput}
          />
        ) : (
          <div style={styles.nameContainer}>
            <span style={styles.layerName}>
              {layer.name}
            </span>
            {isActive && <span style={styles.activeBadge}>ACTIF</span>}
          </div>
        )}

        {/* Entity Count */}
        <div style={styles.count}>
          <span style={styles.countText}>{layer.count}</span>
        </div>
      </div>

      {/* Actions Row (shown on hover or active) */}
      {(showActions || isActive) && !isEditing && (
        <div style={styles.actionsRow}>
          <button
            style={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              onShowEntities?.();
            }}
            title="Voir les entités"
          >
            📋 Liste
          </button>
          <button
            style={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              onShowStats?.();
            }}
            title="Voir les statistiques"
          >
            📊 Stats
          </button>
          <button
            style={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            title="Éditer le style"
          >
            🎨 Style
          </button>
          <button
            style={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Renommer la couche"
          >
            ✏️
          </button>
          <button
            style={{ ...styles.actionButton, ...styles.actionButtonDanger }}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Supprimer la couche "${layer.name}" (${layer.count} entités) ?`)) {
                onDelete?.();
              }
            }}
            title="Supprimer la couche"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  containerActive: {
    backgroundColor: colors.primaryVeryLight,
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primaryLight}`,
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
  visibilityButton: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    fontSize: fontSize.md,
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
  geometryIcon: {
    fontSize: fontSize.md,
    width: '20px',
    textAlign: 'center',
  },
  nameContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0, // Allow text truncation
  },
  layerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  activeBadge: {
    padding: `2px ${spacing.xs}`,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: '10px',
    fontWeight: fontWeight.bold,
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
  },
  nameInput: {
    flex: 1,
    fontSize: fontSize.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
  },
  count: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '24px',
    padding: `0 ${spacing.xs}`,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.sm,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTop: `1px solid ${colors.border}`,
  },
  actionButton: {
    flex: 1,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.grayVeryLight,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: '11px',
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    whiteSpace: 'nowrap',
  },
  actionButtonDanger: {
    color: colors.danger,
    flex: '0 0 auto', // Don't grow/shrink
  },
};

export default LayerItem;
