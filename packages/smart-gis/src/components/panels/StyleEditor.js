/**
 * StyleEditor Component
 * Smart GIS Widget v3.0
 *
 * Visual style editor for layers and entities
 */

import React, { useState, useEffect } from 'react';
import { Button, ColorPicker, Slider, Checkbox } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/styles';

const StyleEditor = ({
  targetName = '',
  targetType = 'layer', // 'layer' | 'entity' | 'selection'
  initialStyle = {},
  onApply,
  onCancel,
}) => {
  // Style state
  const [style, setStyle] = useState({
    fillColor: '#3498db',
    fillOpacity: 50,
    strokeColor: '#2c3e50',
    strokeOpacity: 100,
    strokeWidth: 2,
    radius: 8,
    showFill: true,
    showStroke: true,
    ...initialStyle,
  });

  // Update when initialStyle changes
  useEffect(() => {
    setStyle(prev => ({ ...prev, ...initialStyle }));
  }, [initialStyle]);

  const handleApply = () => {
    onApply?.(style);
  };

  const handleReset = () => {
    setStyle({
      fillColor: '#3498db',
      fillOpacity: 50,
      strokeColor: '#2c3e50',
      strokeOpacity: 100,
      strokeWidth: 2,
      radius: 8,
      showFill: true,
      showStroke: true,
    });
  };

  const handlePreset = (preset) => {
    setStyle(prev => ({ ...prev, ...preset }));
  };

  // Style presets
  const presets = [
    {
      name: 'Bleu',
      icon: '🔵',
      style: { fillColor: '#3498db', strokeColor: '#2980b9', fillOpacity: 50, strokeOpacity: 100 },
    },
    {
      name: 'Vert',
      icon: '🟢',
      style: { fillColor: '#2ecc71', strokeColor: '#27ae60', fillOpacity: 50, strokeOpacity: 100 },
    },
    {
      name: 'Rouge',
      icon: '🔴',
      style: { fillColor: '#e74c3c', strokeColor: '#c0392b', fillOpacity: 50, strokeOpacity: 100 },
    },
    {
      name: 'Jaune',
      icon: '🟡',
      style: { fillColor: '#f39c12', strokeColor: '#d68910', fillOpacity: 50, strokeOpacity: 100 },
    },
    {
      name: 'Violet',
      icon: '🟣',
      style: { fillColor: '#9b59b6', strokeColor: '#8e44ad', fillOpacity: 50, strokeOpacity: 100 },
    },
    {
      name: 'Gris',
      icon: '⚪',
      style: { fillColor: '#95a5a6', strokeColor: '#7f8c8d', fillOpacity: 50, strokeOpacity: 100 },
    },
  ];

  // Generate preview style
  const previewStyle = {
    fillColor: style.showFill ? hexToRgba(style.fillColor, style.fillOpacity / 100) : 'transparent',
    strokeColor: style.showStroke ? hexToRgba(style.strokeColor, style.strokeOpacity / 100) : 'transparent',
    strokeWidth: style.strokeWidth,
    radius: style.radius,
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Éditeur de Style</h3>
        <p style={styles.subtitle}>
          {targetType === 'layer' && `Couche: ${targetName}`}
          {targetType === 'entity' && `Entité: ${targetName}`}
          {targetType === 'selection' && `${targetName} entité(s) sélectionnée(s)`}
        </p>
      </div>

      {/* Preview */}
      <div style={styles.previewSection}>
        <h4 style={styles.sectionTitle}>Aperçu</h4>
        <div style={styles.previewContainer}>
          {/* Point preview */}
          <div style={styles.previewItem}>
            <svg width="60" height="60" style={styles.previewSvg}>
              <circle
                cx="30"
                cy="30"
                r={previewStyle.radius}
                fill={previewStyle.fillColor}
                stroke={previewStyle.strokeColor}
                strokeWidth={previewStyle.strokeWidth}
              />
            </svg>
            <span style={styles.previewLabel}>Point</span>
          </div>

          {/* Line preview */}
          <div style={styles.previewItem}>
            <svg width="60" height="60" style={styles.previewSvg}>
              <polyline
                points="10,50 25,20 40,35 55,10"
                fill="none"
                stroke={previewStyle.strokeColor}
                strokeWidth={previewStyle.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={styles.previewLabel}>Ligne</span>
          </div>

          {/* Polygon preview */}
          <div style={styles.previewItem}>
            <svg width="60" height="60" style={styles.previewSvg}>
              <polygon
                points="30,10 50,40 10,40"
                fill={previewStyle.fillColor}
                stroke={previewStyle.strokeColor}
                strokeWidth={previewStyle.strokeWidth}
              />
            </svg>
            <span style={styles.previewLabel}>Polygone</span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div style={styles.presetsSection}>
        <h4 style={styles.sectionTitle}>Préréglages</h4>
        <div style={styles.presetsGrid}>
          {presets.map((preset, index) => (
            <button
              key={index}
              style={styles.presetButton}
              onClick={() => handlePreset(preset.style)}
              title={preset.name}
            >
              <span style={styles.presetIcon}>{preset.icon}</span>
              <span style={styles.presetName}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fill Style */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Remplissage</h4>
          <Checkbox
            checked={style.showFill}
            onChange={(checked) => setStyle(prev => ({ ...prev, showFill: checked }))}
            label="Activer"
          />
        </div>

        {style.showFill && (
          <div style={styles.controls}>
            <ColorPicker
              value={style.fillColor}
              onChange={(color) => setStyle(prev => ({ ...prev, fillColor: color }))}
              label="Couleur"
            />
            <Slider
              value={style.fillOpacity}
              onChange={(value) => setStyle(prev => ({ ...prev, fillOpacity: value }))}
              min={0}
              max={100}
              step={1}
              label="Opacité"
              unit="%"
            />
          </div>
        )}
      </div>

      {/* Stroke Style */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Bordure</h4>
          <Checkbox
            checked={style.showStroke}
            onChange={(checked) => setStyle(prev => ({ ...prev, showStroke: checked }))}
            label="Activer"
          />
        </div>

        {style.showStroke && (
          <div style={styles.controls}>
            <ColorPicker
              value={style.strokeColor}
              onChange={(color) => setStyle(prev => ({ ...prev, strokeColor: color }))}
              label="Couleur"
            />
            <Slider
              value={style.strokeOpacity}
              onChange={(value) => setStyle(prev => ({ ...prev, strokeOpacity: value }))}
              min={0}
              max={100}
              step={1}
              label="Opacité"
              unit="%"
            />
            <Slider
              value={style.strokeWidth}
              onChange={(value) => setStyle(prev => ({ ...prev, strokeWidth: value }))}
              min={1}
              max={10}
              step={0.5}
              label="Épaisseur"
              unit="px"
            />
          </div>
        )}
      </div>

      {/* Point Style */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Point</h4>
        <div style={styles.controls}>
          <Slider
            value={style.radius}
            onChange={(value) => setStyle(prev => ({ ...prev, radius: value }))}
            min={2}
            max={20}
            step={1}
            label="Rayon"
            unit="px"
          />
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <Button variant="ghost" onClick={handleReset} fullWidth>
          Réinitialiser
        </Button>
        <Button variant="secondary" onClick={onCancel} fullWidth>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleApply} fullWidth>
          Appliquer
        </Button>
      </div>
    </div>
  );
};

/**
 * Helper: Convert hex to rgba
 */
const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'auto',
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
  previewSection: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
  },
  sectionTitle: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  previewContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  previewItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewSvg: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
  },
  previewLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  presetsSection: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.xs,
  },
  presetButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  presetIcon: {
    fontSize: fontSize.xl,
  },
  presetName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  section: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  actions: {
    padding: spacing.md,
    display: 'flex',
    gap: spacing.xs,
    backgroundColor: colors.grayVeryLight,
    borderTop: `1px solid ${colors.border}`,
  },
};

export default StyleEditor;
