/**
 * EditionToolbar Component
 * Smart GIS Widget v3.0
 *
 * Geometry edition toolbar (for Leaflet.pm integration)
 */

import React, { useState } from 'react';
import { Button, Select } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions, shadows } from '../../constants/styles';

const EditionToolbar = ({
  editionMode = null, // null | 'draw' | 'edit' | 'delete'
  drawMode = 'marker', // 'marker' | 'line' | 'polygon' | 'rectangle' | 'circle'
  activeLayer = null,
  onModeChange,
  onDrawModeChange,
  onSave,
  onCancel,
  isEditing = false,
}) => {
  const [showLayerWarning, setShowLayerWarning] = useState(false);

  const handleModeClick = (mode) => {
    if (!activeLayer && mode === 'draw') {
      setShowLayerWarning(true);
      setTimeout(() => setShowLayerWarning(false), 3000);
      return;
    }
    onModeChange?.(mode === editionMode ? null : mode);
  };

  const drawModes = [
    { id: 'marker', icon: '📍', label: 'Point', tooltip: 'Dessiner un point (P)' },
    { id: 'line', icon: '〰️', label: 'Ligne', tooltip: 'Dessiner une ligne (L)' },
    { id: 'polygon', icon: '▭', label: 'Polygone', tooltip: 'Dessiner un polygone (O)' },
    { id: 'rectangle', icon: '▭', label: 'Rectangle', tooltip: 'Dessiner un rectangle (R)' },
    { id: 'circle', icon: '⭕', label: 'Cercle', tooltip: 'Dessiner un cercle (C)' },
  ];

  return (
    <div style={styles.container}>
      {/* Layer Warning */}
      {showLayerWarning && (
        <div style={styles.warning}>
          <span style={styles.warningIcon}>⚠️</span>
          <span style={styles.warningText}>
            Sélectionnez une couche avant de dessiner
          </span>
        </div>
      )}

      {/* Mode Buttons */}
      <div style={styles.modesGroup}>
        <button
          style={{
            ...styles.modeButton,
            ...(editionMode === 'draw' ? styles.modeButtonActive : {}),
          }}
          onClick={() => handleModeClick('draw')}
          title="Mode dessin (D)"
          onMouseEnter={(e) => {
            if (editionMode !== 'draw') {
              e.currentTarget.style.backgroundColor = colors.grayLight;
            }
          }}
          onMouseLeave={(e) => {
            if (editionMode !== 'draw') {
              e.currentTarget.style.backgroundColor = colors.white;
            }
          }}
        >
          <span style={styles.modeIcon}>✏️</span>
          <span style={styles.modeLabel}>Dessiner</span>
        </button>

        <button
          style={{
            ...styles.modeButton,
            ...(editionMode === 'edit' ? styles.modeButtonActive : {}),
          }}
          onClick={() => handleModeClick('edit')}
          title="Mode édition (E)"
          onMouseEnter={(e) => {
            if (editionMode !== 'edit') {
              e.currentTarget.style.backgroundColor = colors.grayLight;
            }
          }}
          onMouseLeave={(e) => {
            if (editionMode !== 'edit') {
              e.currentTarget.style.backgroundColor = colors.white;
            }
          }}
        >
          <span style={styles.modeIcon}>✂️</span>
          <span style={styles.modeLabel}>Éditer</span>
        </button>

        <button
          style={{
            ...styles.modeButton,
            ...(editionMode === 'delete' ? styles.modeButtonActive : {}),
          }}
          onClick={() => handleModeClick('delete')}
          title="Mode suppression (X)"
          onMouseEnter={(e) => {
            if (editionMode !== 'delete') {
              e.currentTarget.style.backgroundColor = colors.dangerLight;
            }
          }}
          onMouseLeave={(e) => {
            if (editionMode !== 'delete') {
              e.currentTarget.style.backgroundColor = colors.white;
            }
          }}
        >
          <span style={styles.modeIcon}>🗑️</span>
          <span style={styles.modeLabel}>Supprimer</span>
        </button>
      </div>

      {/* Draw Mode Selection */}
      {editionMode === 'draw' && (
        <>
          <div style={styles.divider} />
          <div style={styles.drawModesGroup}>
            {drawModes.map(mode => (
              <button
                key={mode.id}
                style={{
                  ...styles.drawModeButton,
                  ...(drawMode === mode.id ? styles.drawModeButtonActive : {}),
                }}
                onClick={() => onDrawModeChange?.(mode.id)}
                title={mode.tooltip}
                onMouseEnter={(e) => {
                  if (drawMode !== mode.id) {
                    e.currentTarget.style.backgroundColor = colors.grayLight;
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (drawMode !== mode.id) {
                    e.currentTarget.style.backgroundColor = colors.white;
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span style={styles.drawModeIcon}>{mode.icon}</span>
                <span style={styles.drawModeLabel}>{mode.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Active Layer Context */}
      {editionMode && (
        <>
          <div style={styles.divider} />
          <div style={styles.contextGroup}>
            <span style={styles.contextLabel}>Couche:</span>
            <span style={styles.contextValue}>
              {activeLayer || 'Aucune'}
            </span>
          </div>
        </>
      )}

      {/* Save/Cancel Actions */}
      {isEditing && (
        <>
          <div style={styles.divider} />
          <div style={styles.actionsGroup}>
            <button
              style={styles.cancelButton}
              onClick={onCancel}
              title="Annuler les modifications (Échap)"
            >
              ✕ Annuler
            </button>
            <button
              style={styles.saveButton}
              onClick={onSave}
              title="Sauvegarder les modifications (Entrée)"
            >
              ✓ Sauvegarder
            </button>
          </div>
        </>
      )}
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
    padding: spacing.sm,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    backdropFilter: 'blur(10px)',
    transition: `all ${transitions.normal}`,
  },
  warning: {
    position: 'absolute',
    top: '-50px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.warningLight,
    border: `2px solid ${colors.warning}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.md,
    whiteSpace: 'nowrap',
  },
  warningIcon: {
    fontSize: fontSize.md,
  },
  warningText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
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
    minWidth: '80px',
  },
  modeButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primaryVeryLight}`,
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
  drawModesGroup: {
    display: 'flex',
    gap: spacing.xs,
  },
  drawModeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    minWidth: '60px',
  },
  drawModeButtonActive: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    boxShadow: `0 0 0 2px ${colors.successLight}`,
  },
  drawModeIcon: {
    fontSize: fontSize.lg,
  },
  drawModeLabel: {
    fontSize: '10px',
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  contextGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
  },
  contextLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  contextValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  actionsGroup: {
    display: 'flex',
    gap: spacing.xs,
  },
  cancelButton: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.danger}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.danger,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
  saveButton: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.success,
    border: `1px solid ${colors.success}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
};

export default EditionToolbar;
