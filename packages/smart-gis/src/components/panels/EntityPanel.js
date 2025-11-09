/**
 * EntityPanel Component
 * Smart GIS Widget v3.0
 *
 * Detailed entity view panel (RIGHT side, below EditionToolbar)
 * Shows entity details, navigation for multi-selection, edit options
 */

import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows, transitions } from '../../constants/styles';

const EntityPanel = ({
  entities = [],
  selectedEntityIds = [],
  onClose,
  onPrevious,
  onNext,
  onEdit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (selectedEntityIds.length === 0) {
    return null;
  }

  const selectedEntities = entities.filter(e => selectedEntityIds.includes(e.id));
  const currentEntity = selectedEntities[currentIndex] || {};
  const hasMultiple = selectedEntities.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : selectedEntities.length - 1));
    onPrevious?.();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < selectedEntities.length - 1 ? prev + 1 : 0));
    onNext?.();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>📄</span>
          <span style={styles.headerTitle}>Fiche Entité</span>
          {hasMultiple && (
            <span style={styles.badge}>
              {currentIndex + 1} / {selectedEntities.length}
            </span>
          )}
        </div>
        <button
          style={styles.closeButton}
          onClick={onClose}
          title="Fermer"
        >
          ✕
        </button>
      </div>

      {/* Navigation (if multiple) */}
      {hasMultiple && (
        <div style={styles.navigation}>
          <button
            style={styles.navButton}
            onClick={handlePrevious}
            title="Entité précédente"
          >
            ←
          </button>
          <span style={styles.navText}>
            {currentEntity.name || `Entité ${currentEntity.id}`}
          </span>
          <button
            style={styles.navButton}
            onClick={handleNext}
            title="Entité suivante"
          >
            →
          </button>
        </div>
      )}

      {/* Entity Content */}
      <div style={styles.content}>
        {/* Name */}
        {currentEntity.name && (
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Nom</div>
            <div style={styles.fieldValue}>{currentEntity.name}</div>
          </div>
        )}

        {/* Layer */}
        {currentEntity.layer_name && (
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Couche</div>
            <div style={styles.fieldValue}>{currentEntity.layer_name}</div>
          </div>
        )}

        {/* Description */}
        {currentEntity.description && (
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Description</div>
            <div style={styles.fieldValue}>{currentEntity.description}</div>
          </div>
        )}

        {/* Geometry */}
        {currentEntity.geometry && (
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Géométrie</div>
            <div style={{...styles.fieldValue, ...styles.geometryValue}}>
              {currentEntity.geometry.substring(0, 100)}
              {currentEntity.geometry.length > 100 && '...'}
            </div>
          </div>
        )}

        {/* TODO: Add photo if exists */}
        {/* TODO: Add custom fields */}
        {/* TODO: Add popup configuration */}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          style={styles.actionButton}
          onClick={() => onEdit?.(currentEntity.id)}
          title="Éditer l'entité"
        >
          <span>✏️</span>
          <span>Éditer</span>
        </button>
        <button
          style={{...styles.actionButton, ...styles.actionButtonDanger}}
          onClick={() => console.log('Delete', currentEntity.id)}
          title="Supprimer l'entité"
        >
          <span>🗑️</span>
          <span>Supprimer</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    top: '70px', // Below EditionToolbar
    right: '1%', // RIGHT side like EditionToolbar
    bottom: '12px',
    width: '300px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 900,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: fontSize.lg,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  badge: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  closeButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    transition: `all ${transitions.fast}`,
  },
  navigation: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.white,
    flexShrink: 0,
  },
  navButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grayLight,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    fontSize: fontSize.md,
    color: colors.textPrimary,
    transition: `all ${transitions.fast}`,
  },
  navText: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: `0 ${spacing.sm}`,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  fieldValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    wordWrap: 'break-word',
  },
  geometryValue: {
    fontFamily: 'monospace',
    fontSize: '11px',
    backgroundColor: colors.grayVeryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.border}`,
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    padding: spacing.md,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
    flexShrink: 0,
  },
  actionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    transition: `all ${transitions.fast}`,
  },
  actionButtonDanger: {
    borderColor: colors.danger,
    color: colors.danger,
  },
};

export default EntityPanel;
