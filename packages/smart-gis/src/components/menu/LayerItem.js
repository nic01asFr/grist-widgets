/**
 * LayerItem Component
 * Smart GIS Widget v3.0
 *
 * Compact layer display with checkbox and essential info
 * Redesigned: No hover actions, simple click to activate, double-click to show entities
 */

import React, { useState } from 'react';
import { Input } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const LayerItem = ({
  layer,
  isActive = false,
  isVisible = true,
  isSelected = false,
  onActivate,
  onToggleVisibility,
  onToggleSelection,
  onRename,
  onShowEntities,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

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

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!isEditing) {
      onShowEntities?.();
    }
  };

  const handleClick = (e) => {
    // If clicking checkbox area, don't activate
    const target = e.target;
    if (target.type === 'checkbox') return;

    if (!isEditing) {
      onActivate?.();
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
        ...(isSelected ? styles.containerSelected : {}),
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="Double-clic pour voir les entités"
    >
      <div style={styles.row}>
        {/* Checkbox for multi-select */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelection?.();
          }}
          style={styles.checkbox}
          onClick={(e) => e.stopPropagation()}
        />

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
            {isActive && <span style={styles.activeBadge}>✓</span>}
          </div>
        )}

        {/* Entity Count */}
        <div style={styles.count}>
          <span style={styles.countText}>{layer.count}</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  containerActive: {
    backgroundColor: colors.primaryVeryLight,
    borderColor: colors.primary,
  },
  containerSelected: {
    backgroundColor: colors.grayVeryLight,
    borderColor: colors.textSecondary,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  visibilityButton: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: fontSize.sm,
    transition: `all ${transitions.fast}`,
    outline: 'none',
    flexShrink: 0,
  },
  geometryIcon: {
    fontSize: fontSize.sm,
    width: '18px',
    textAlign: 'center',
    flexShrink: 0,
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
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    flexShrink: 0,
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
    minWidth: '28px',
    height: '20px',
    padding: `0 ${spacing.xs}`,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  countText: {
    fontSize: '11px',
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
};

export default LayerItem;
