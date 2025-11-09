/**
 * Checkbox Component
 * Smart GIS Widget v3.0
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transition } from '../../constants/styles';

const Checkbox = ({
  checked,
  onChange,
  label,
  disabled = false,
  ...props
}) => {
  const styles = getCheckboxStyles(checked, disabled);

  return (
    <label style={styles.container}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={styles.input}
        {...props}
      />
      <span style={styles.checkmark}>
        {checked && <span style={styles.checkIcon}>✓</span>}
      </span>
      {label && <span style={styles.label}>{label}</span>}
    </label>
  );
};

const getCheckboxStyles = (checked, disabled) => ({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    opacity: disabled ? 0.5 : 1,
  },
  input: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  checkmark: {
    position: 'relative',
    width: '20px',
    height: '20px',
    backgroundColor: checked ? colors.primary : colors.white,
    border: `2px solid ${checked ? colors.primary : colors.border}`,
    borderRadius: borderRadius.sm,
    transition: transition(['background-color', 'border-color'], 'fast'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkIcon: {
    color: colors.white,
    fontSize: '14px',
    fontWeight: fontWeight.bold,
    lineHeight: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.textPrimary,
  },
});

export default Checkbox;
