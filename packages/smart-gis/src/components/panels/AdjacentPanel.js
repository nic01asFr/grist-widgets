/**
 * AdjacentPanel Component
 * Smart GIS Widget v3.0
 *
 * Panel that opens adjacent to the main TabbedMenu
 * Used for layer options and entities list
 */

import React, { useState, useRef, useEffect } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const AdjacentPanel = ({
  isOpen = false,
  onClose,
  layerName = '',
  layerData = {},
  entities = [],
  selectedEntityIds = [],
  onEntitySelect,
  onStyleChange,
  children,
  initialWidth = 300,
  minWidth = 250,
  maxWidth = 500,
}) => {
  const [activeTab, setActiveTab] = useState('options'); // 'options' | 'entities'
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const tabs = [
    { id: 'options', icon: '🎨', label: 'Options' },
    { id: 'entities', icon: '📋', label: 'Entités' },
  ];

  // Handle resize start
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  // Filter entities by search
  const filteredEntities = entities.filter(entity => {
    if (!searchQuery.trim()) return true;
    const name = (entity.name || '').toLowerCase();
    const description = (entity.description || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || description.includes(query);
  });

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        ...styles.container,
        width: `${width}px`,
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🗂️</span>
          <span style={styles.headerTitle}>{layerName}</span>
        </div>
        <button
          style={styles.closeButton}
          onClick={onClose}
          title="Fermer le panneau"
        >
          ✕
        </button>
      </div>

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

      {/* Tab Content */}
      <div style={styles.content}>
        {activeTab === 'options' && (
          <div style={styles.optionsContent}>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Style de la couche</div>

              {/* Couleur */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Couleur</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    defaultValue={layerData.color || '#3388ff'}
                    onChange={(e) => onStyleChange?.({ color: e.target.value })}
                    style={styles.colorInput}
                  />
                  <span style={styles.colorValue}>{layerData.color || '#3388ff'}</span>
                </div>
              </div>

              {/* Transparence */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Transparence</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={layerData.opacity || 70}
                  onChange={(e) => onStyleChange?.({ opacity: e.target.value })}
                  style={styles.rangeInput}
                />
                <span style={styles.rangeValue}>{layerData.opacity || 70}%</span>
              </div>

              {/* Remplissage */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Couleur de remplissage</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    defaultValue={layerData.fillColor || '#3388ff'}
                    onChange={(e) => onStyleChange?.({ fillColor: e.target.value })}
                    style={styles.colorInput}
                  />
                  <span style={styles.colorValue}>{layerData.fillColor || '#3388ff'}</span>
                </div>
              </div>

              {/* Bordures */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Couleur de bordure</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    defaultValue={layerData.borderColor || '#3388ff'}
                    onChange={(e) => onStyleChange?.({ borderColor: e.target.value })}
                    style={styles.colorInput}
                  />
                  <span style={styles.colorValue}>{layerData.borderColor || '#3388ff'}</span>
                </div>
              </div>

              {/* Épaisseur bordure */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Épaisseur bordure</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  defaultValue={layerData.borderWidth || 2}
                  onChange={(e) => onStyleChange?.({ borderWidth: e.target.value })}
                  style={styles.rangeInput}
                />
                <span style={styles.rangeValue}>{layerData.borderWidth || 2}px</span>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Application</div>
              <div style={styles.applyButtons}>
                <button style={styles.applyButton}>
                  Appliquer à toutes les entités
                </button>
                <button style={{...styles.applyButton, ...styles.applyButtonSecondary}}>
                  Appliquer aux sélectionnées
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entities' && (
          <div style={styles.entitiesContent}>
            {/* Search */}
            <div style={styles.searchBox}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une entité..."
                style={styles.searchInput}
              />
            </div>

            {/* Stats */}
            <div style={styles.stats}>
              <span style={styles.statItem}>{filteredEntities.length} entités</span>
              {selectedEntityIds.length > 0 && (
                <>
                  <span style={styles.statSeparator}>•</span>
                  <span style={styles.statItem}>{selectedEntityIds.length} sélectionnées</span>
                </>
              )}
            </div>

            {/* Entities List */}
            <div style={styles.entitiesList}>
              {filteredEntities.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>📍</p>
                  <p style={styles.emptyText}>
                    {searchQuery ? 'Aucune entité trouvée' : 'Aucune entité dans cette couche'}
                  </p>
                </div>
              ) : (
                filteredEntities.map(entity => (
                  <div
                    key={entity.id}
                    style={{
                      ...styles.entityItem,
                      ...(selectedEntityIds.includes(entity.id) ? styles.entityItemSelected : {}),
                    }}
                    onClick={() => onEntitySelect?.(entity.id)}
                  >
                    <div style={styles.entityInfo}>
                      <div style={styles.entityName}>
                        {entity.name || `Entité ${entity.id}`}
                      </div>
                      {entity.description && (
                        <div style={styles.entityDescription}>
                          {entity.description}
                        </div>
                      )}
                    </div>
                    <div style={styles.entityGeometryType}>
                      {extractGeometryType(entity.geometry)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        style={{
          ...styles.resizeHandle,
          ...(isResizing ? styles.resizeHandleActive : {}),
        }}
        onMouseDown={handleResizeStart}
        title="Redimensionner le panneau"
      />
    </div>
  );
};

/**
 * Helper: Extract geometry type from WKT string
 */
const extractGeometryType = (wkt) => {
  if (!wkt) return '?';

  const match = wkt.match(/^([A-Z]+)/i);
  if (!match) return '?';

  const type = match[1].toUpperCase();
  const icons = {
    'POINT': '📍',
    'LINESTRING': '〰️',
    'POLYGON': '▭',
    'MULTIPOINT': '📍📍',
    'MULTILINESTRING': '〰️〰️',
    'MULTIPOLYGON': '▭▭',
  };

  return icons[type] || type;
};

const styles = {
  container: {
    position: 'relative',
    height: '100%',
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: `width ${transitions.normal}`,
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
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    fontSize: fontSize.sm,
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
    fontSize: fontSize.md,
  },
  tabLabel: {
    fontSize: fontSize.sm,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },

  // Options Tab Styles
  optionsContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    display: 'block',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
  applyButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  applyButton: {
    padding: spacing.sm,
    backgroundColor: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.white,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  applyButtonSecondary: {
    backgroundColor: colors.white,
    color: colors.primary,
  },

  // Entities Tab Styles
  entitiesContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  searchBox: {
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
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  statItem: {
    fontWeight: fontWeight.medium,
  },
  statSeparator: {
    color: colors.border,
  },
  entitiesList: {
    flex: 1,
    overflow: 'auto',
    padding: spacing.sm,
  },
  entityItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    boxShadow: `0 0 0 2px ${colors.primaryLight}`,
  },
  entityInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  entityName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  entityDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '2px',
  },
  entityGeometryType: {
    fontSize: fontSize.lg,
    marginLeft: spacing.sm,
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

  // Resize Handle
  resizeHandle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '4px',
    height: '100%',
    cursor: 'ew-resize',
    backgroundColor: 'transparent',
    transition: `background-color ${transitions.fast}`,
  },
  resizeHandleActive: {
    backgroundColor: colors.primary,
  },
};

export default AdjacentPanel;
