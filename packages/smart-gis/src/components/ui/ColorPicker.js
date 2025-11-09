/**
 * ColorPicker Component
 * Smart GIS Widget v3.0
 */

import React, { useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { colors } from '../../constants/colors';
import { spacing, fontSize, borderRadius, transition, zIndex } from '../../constants/styles';

const ColorPicker = ({
  value,
  onChange,
  showAlpha = false,
  label,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleClickOutside = () => {
    setShowPicker(false);
  };

  const styles = getColorPickerStyles(disabled);

  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}

      <div style={styles.inputContainer}>
        <div
          style={{
            ...styles.swatch,
            backgroundColor: value,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
          onClick={() => !disabled && setShowPicker(!showPicker)}
          title="Cliquer pour choisir une couleur"
        />

        <HexColorInput
          color={value}
          onChange={onChange}
          style={{
            ...styles.input,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          placeholder="#3498db"
          disabled={disabled}
        />
      </div>

      {showPicker && !disabled && (
        <div style={styles.popover}>
          <div
            style={styles.cover}
            onClick={handleClickOutside}
          />
          <div style={styles.pickerContainer}>
            <HexColorPicker color={value} onChange={onChange} />
            <div style={styles.presets}>
              <span style={styles.presetsLabel}>Couleurs rapides :</span>
              <div style={styles.presetsGrid}>
                {PRESET_COLORS.map((color) => (
                  <div
                    key={color}
                    style={{
                      ...styles.presetSwatch,
                      backgroundColor: color,
                      border: value.toLowerCase() === color.toLowerCase() ? `2px solid ${colors.dark}` : '1px solid #ddd',
                    }}
                    onClick={() => onChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PRESET_COLORS = [
  '#3498db', // Primary blue
  '#16B378', // Success green
  '#e74c3c', // Danger red
  '#f39c12', // Warning orange
  '#9b59b6', // Purple
  '#1abc9c', // Turquoise
  '#34495e', // Dark gray
  '#95a5a6', // Gray
  '#2ecc71', // Green
  '#e67e22', // Orange
  '#3498db', // Blue
  '#2c3e50', // Midnight blue
];

const getColorPickerStyles = (disabled) => ({
  container: {
    position: 'relative',
    width: '100%',
  },
  label: {
    display: 'block',
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.md,
    border: `2px solid ${colors.border}`,
    boxShadow: `0 1px 3px ${colors.shadow}`,
    flexShrink: 0,
    transition: transition(['transform', 'box-shadow'], 'fast'),
  },
  input: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    outline: 'none',
    transition: transition(['border-color'], 'normal'),
    fontFamily: 'monospace',
  },
  popover: {
    position: 'absolute',
    top: '50px',
    left: 0,
    zIndex: zIndex.popover,
  },
  cover: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: zIndex.popover - 1,
  },
  pickerContainer: {
    position: 'relative',
    zIndex: zIndex.popover,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: `0 4px 12px ${colors.shadowMedium}`,
    padding: spacing.lg,
  },
  presets: {
    marginTop: spacing.lg,
  },
  presetsLabel: {
    display: 'block',
    marginBottom: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: spacing.sm,
  },
  presetSwatch: {
    width: '32px',
    height: '32px',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: transition(['transform'], 'fast'),
  },
});

export default ColorPicker;
