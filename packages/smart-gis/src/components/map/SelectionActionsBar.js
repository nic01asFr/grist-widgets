/**
 * SelectionActionsBar Component
 * Smart GIS Widget v3.0
 *
 * Actions toolbar for selected entities
 * Appears at bottom of map when entities are selected
 */

import React from 'react';
import { Button } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows, transitions } from '../../constants/styles';

const SelectionActionsBar = ({
  selectionCount = 0,
  selectionInfo = {},
  onCopy,
  onDelete,
  onExport,
  onEditStyle,
  onZoomTo,
  onEditGeometry,
  onClear,
  disabled = false,
}) => {
  if (selectionCount === 0) {
    return null;
  }

  const { isSingle, isMultiple, layerCount, layers } = selectionInfo;

  const actions = [
    {
      id: 'zoom',
      icon: '🔍',
      label: 'Recentrer',
      onClick: onZoomTo,
      variant: 'secondary',
      disabled: false,
    },
    {
      id: 'style',
      icon: '🎨',
      label: 'Style',
      onClick: onEditStyle,
      variant: 'secondary',
      disabled: false,
    },
    {
      id: 'edit',
      icon: '✏️',
      label: 'Éditer',
      onClick: onEditGeometry,
      variant: 'secondary',
      disabled: !isSingle, // Only allow editing single entity
    },
    {
      id: 'copy',
      icon: '📋',
      label: 'Copier',
      onClick: onCopy,
      variant: 'secondary',
      disabled: false,
    },
    {
      id: 'export',
      icon: '📥',
      label: 'Exporter',
      onClick: onExport,
      variant: 'secondary',
      disabled: false,
    },
    {
      id: 'delete',
      icon: '🗑️',
      label: 'Supprimer',
      onClick: onDelete,
      variant: 'danger',
      disabled: false,
    },
  ];

  return (
    <div style={styles.container}>
      {/* Selection Info */}
      <div style={styles.infoGroup}>
        <div style={styles.countBadge}>
          <span style={styles.countText}>
            {selectionCount} {isSingle ? 'entité' : 'entités'}
          </span>
        </div>

        {layerCount > 0 && (
          <div style={styles.layersInfo}>
            <span style={styles.layersIcon}>📍</span>
            <span style={styles.layersText}>
              {layerCount === 1 ? layers[0] : `${layerCount} couches`}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Action Buttons */}
      <div style={styles.actionsGroup}>
        {actions.map(action => (
          <Button
            key={action.id}
            variant={action.variant}
            size="small"
            icon={action.icon}
            onClick={action.onClick}
            disabled={disabled || action.disabled}
            title={action.label}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Clear Button */}
      <button
        style={styles.clearButton}
        onClick={onClear}
        disabled={disabled}
        title="Effacer la sélection (Échap)"
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = colors.dangerLight;
            e.currentTarget.style.color = colors.danger;
            e.currentTarget.style.transform = 'scale(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.textSecondary;
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <span style={styles.clearIcon}>×</span>
        <span style={styles.clearText}>Effacer</span>
      </button>
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.xl,
    backdropFilter: 'blur(10px)',
    maxWidth: '90vw',
    transition: `all ${transitions.normal}`,
  },
  infoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    padding: `${spacing.xs} ${spacing.md}`,
    backgroundColor: colors.selectedLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.selected}`,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.selected,
  },
  layersInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
  },
  layersIcon: {
    fontSize: fontSize.sm,
  },
  layersText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  divider: {
    width: '1px',
    height: '40px',
    backgroundColor: colors.border,
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
  clearIcon: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: '1',
  },
  clearText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
};

export default SelectionActionsBar;
