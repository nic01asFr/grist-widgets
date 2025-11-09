/**
 * SelectionTools Component
 * Smart GIS Widget v3.0
 *
 * Floating toolbar for map selection modes
 * Displays above the map when selection is active
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows, transitions } from '../../constants/styles';

const SelectionTools = ({
  selectionMode = 'pointer',
  onModeChange,
  activeLayer = null,
  selectionCount = 0,
  onClear,
  disabled = false,
}) => {
  const modes = [
    { id: 'pointer', icon: '👆', label: 'Pointeur', tooltip: 'Sélection par clic (Échap)' },
    { id: 'rectangle', icon: '▢', label: 'Rectangle', tooltip: 'Sélection rectangulaire (R)' },
    { id: 'circle', icon: '⭕', label: 'Cercle', tooltip: 'Sélection circulaire (C)' },
    { id: 'lasso', icon: '✏️', label: 'Lasso', tooltip: 'Sélection libre (L)' },
  ];

  const handleModeClick = (modeId) => {
    if (!disabled && onModeChange) {
      onModeChange(modeId);
    }
  };

  const handleClear = () => {
    if (!disabled && onClear) {
      onClear();
    }
  };

  return (
    <div style={styles.container}>
      {/* Mode Buttons */}
      <div style={styles.modesGroup}>
        {modes.map(mode => (
          <button
            key={mode.id}
            style={{
              ...styles.modeButton,
              ...(selectionMode === mode.id ? styles.modeButtonActive : {}),
              ...(disabled ? styles.modeButtonDisabled : {}),
            }}
            onClick={() => handleModeClick(mode.id)}
            disabled={disabled}
            title={mode.tooltip}
            onMouseEnter={(e) => {
              if (!disabled && selectionMode !== mode.id) {
                e.currentTarget.style.backgroundColor = colors.grayLight;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && selectionMode !== mode.id) {
                e.currentTarget.style.backgroundColor = colors.white;
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span style={styles.modeIcon}>{mode.icon}</span>
            <span style={styles.modeLabel}>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Context & Stats */}
      <div style={styles.contextGroup}>
        {/* Active Layer Context */}
        <div style={styles.context}>
          <span style={styles.contextIcon}>🎯</span>
          <span style={styles.contextText}>
            {activeLayer ? activeLayer : 'Toutes couches'}
          </span>
        </div>

        {/* Selection Count Badge */}
        {selectionCount > 0 && (
          <div style={styles.badge}>
            <span style={styles.badgeText}>
              {selectionCount} sélectionnée{selectionCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Clear Button */}
        {selectionCount > 0 && (
          <button
            style={styles.clearButton}
            onClick={handleClear}
            disabled={disabled}
            title="Effacer la sélection (Échap)"
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = colors.dangerLight;
                e.currentTarget.style.color = colors.danger;
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = colors.textSecondary;
              }
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    top: spacing.md,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    boxShadow: shadows.lg,
    backdropFilter: 'blur(10px)',
    transition: `all ${transitions.normal}`,
  },
  modesGroup: {
    display: 'flex',
    gap: spacing.xs,
  },
  modeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    minWidth: '70px',
  },
  modeButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primaryVeryLight}`,
  },
  modeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  modeIcon: {
    fontSize: fontSize.xl,
    lineHeight: '1',
  },
  modeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  divider: {
    width: '1px',
    height: '50px',
    backgroundColor: colors.border,
    margin: `0 ${spacing.xs}`,
  },
  contextGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  context: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
  },
  contextIcon: {
    fontSize: fontSize.md,
  },
  contextText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  badge: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.selectedLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.selected}`,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.selected,
  },
  clearButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
};

export default SelectionTools;
