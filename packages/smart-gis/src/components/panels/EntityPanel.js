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
  onSave,
  onDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'style'
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const tabs = [
    { id: 'details', icon: '📋', label: 'Détails' },
    { id: 'style', icon: '🎨', label: 'Style' },
  ];

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

  const handleEditToggle = () => {
    if (!isEditing) {
      // Enter edit mode
      setEditedName(currentEntity.name || '');
      setEditedDescription(currentEntity.description || '');
      setIsEditing(true);
    } else {
      // Cancel edit mode
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    onSave?.({
      id: currentEntity.id,
      name: editedName,
      description: editedDescription,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Supprimer l'entité "${currentEntity.name || currentEntity.id}" ?`)) {
      onDelete?.(currentEntity.id);
      onClose?.();
    }
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

      {/* Tab Headers */}
      <div style={styles.tabHeader}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            <span style={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Entity Content */}
      <div style={styles.content}>
        {activeTab === 'details' && (
          <>
            {!isEditing ? (
              /* View Mode - Details */
              <>
                {/* Name */}
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Nom</div>
                  <div style={styles.fieldValue}>{currentEntity.name || 'Sans nom'}</div>
                </div>

                {/* Layer */}
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Couche</div>
                  <div style={styles.fieldValue}>{currentEntity.layer_name || 'Aucune'}</div>
                </div>

                {/* Description */}
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Description</div>
                  <div style={styles.fieldValue}>
                    {currentEntity.description || 'Aucune description'}
                  </div>
                </div>

                {/* Geometry */}
                {currentEntity.geometry && (
                  <div style={styles.field}>
                    <div style={styles.fieldLabel}>Géométrie</div>
                    <div style={{...styles.fieldValue, ...styles.geometryValue}}>
                      {currentEntity.geometry.substring(0, 80)}
                      {currentEntity.geometry.length > 80 && '...'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Edit Mode - Details */
              <>
                {/* Name Input */}
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>Nom</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    style={styles.input}
                    placeholder="Nom de l'entité"
                  />
                </div>

                {/* Layer (read-only in edit) */}
                <div style={styles.field}>
                  <div style={styles.fieldLabel}>Couche</div>
                  <div style={styles.fieldValue}>{currentEntity.layer_name || 'Aucune'}</div>
                </div>

                {/* Description Textarea */}
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>Description</label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    style={styles.textarea}
                    placeholder="Description de l'entité"
                    rows={4}
                  />
                </div>

                {/* Geometry (read-only) */}
                {currentEntity.geometry && (
                  <div style={styles.field}>
                    <div style={styles.fieldLabel}>Géométrie</div>
                    <div style={{...styles.fieldValue, ...styles.geometryValue}}>
                      {currentEntity.geometry.substring(0, 80)}
                      {currentEntity.geometry.length > 80 && '...'}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'style' && (
          /* Style Tab */
          <>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Couleur</div>
              <div style={styles.colorRow}>
                <input
                  type="color"
                  defaultValue="#3388ff"
                  style={styles.colorInput}
                />
                <span style={styles.colorValue}>#3388ff</span>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Transparence</div>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="70"
                style={styles.rangeInput}
              />
              <span style={styles.rangeValue}>70%</span>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Remplissage</div>
              <div style={styles.colorRow}>
                <input
                  type="color"
                  defaultValue="#3388ff"
                  style={styles.colorInput}
                />
                <span style={styles.colorValue}>#3388ff</span>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Bordure</div>
              <div style={styles.colorRow}>
                <input
                  type="color"
                  defaultValue="#3388ff"
                  style={styles.colorInput}
                />
                <span style={styles.colorValue}>#3388ff</span>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabel}>Épaisseur bordure</div>
              <input
                type="range"
                min="1"
                max="10"
                defaultValue="2"
                style={styles.rangeInput}
              />
              <span style={styles.rangeValue}>2px</span>
            </div>

            <button style={styles.applyStyleButton}>
              Appliquer le style
            </button>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {!isEditing ? (
          /* View Mode Actions */
          <>
            <button
              style={styles.actionButton}
              onClick={handleEditToggle}
              title="Éditer l'entité"
            >
              <span>✏️</span>
              <span>Éditer</span>
            </button>
            <button
              style={{...styles.actionButton, ...styles.actionButtonDanger}}
              onClick={handleDelete}
              title="Supprimer l'entité"
            >
              <span>🗑️</span>
              <span>Supprimer</span>
            </button>
          </>
        ) : (
          /* Edit Mode Actions */
          <>
            <button
              style={{...styles.actionButton, ...styles.actionButtonSecondary}}
              onClick={handleEditToggle}
              title="Annuler les modifications"
            >
              <span>✕</span>
              <span>Annuler</span>
            </button>
            <button
              style={{...styles.actionButton, ...styles.actionButtonPrimary}}
              onClick={handleSave}
              title="Sauvegarder les modifications"
            >
              <span>✓</span>
              <span>Sauvegarder</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    bottom: '12px', // Start from bottom
    right: '1%', // RIGHT side like EditionToolbar
    maxHeight: 'calc(100% - 150px)', // Stop before EditionToolbar (leave space at top)
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
  tabHeader: {
    display: 'flex',
    borderBottom: `2px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabActive: {
    backgroundColor: colors.white,
    borderBottomColor: colors.primary,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  tabIcon: {
    fontSize: fontSize.sm,
  },
  tabLabel: {
    fontSize: fontSize.xs,
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
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  actionButtonSecondary: {
    backgroundColor: colors.grayLight,
  },
  input: {
    width: '100%',
    padding: spacing.sm,
    fontSize: fontSize.sm,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    outline: 'none',
    transition: `all ${transitions.fast}`,
  },
  textarea: {
    width: '100%',
    padding: spacing.sm,
    fontSize: fontSize.sm,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    outline: 'none',
    resize: 'vertical',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: `all ${transitions.fast}`,
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorInput: {
    width: '60px',
    height: '36px',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  colorValue: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  rangeInput: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  rangeValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  applyStyleButton: {
    width: '100%',
    padding: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.white,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
};

export default EntityPanel;
