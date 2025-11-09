/**
 * Select Component
 * Smart GIS Widget v3.0
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transition } from '../../constants/styles';

const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner...',
  disabled = false,
  fullWidth = false,
  label,
  ...props
}) => {
  const styles = getSelectStyles(disabled, fullWidth);

  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.selectContainer}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={styles.select}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
        <span style={styles.arrow}>▼</span>
      </div>
    </div>
  );
};

const getSelectStyles = (disabled, fullWidth) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: fullWidth ? '100%' : 'auto',
  },
  label: {
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  selectContainer: {
    position: 'relative',
    width: '100%',
  },
  select: {
    width: '100%',
    padding: `${spacing.sm} 36px ${spacing.sm} ${spacing.md}`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.textPrimary,
    backgroundColor: disabled ? colors.grayVeryLight : colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: transition(['border-color'], 'normal'),
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  },
  arrow: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    pointerEvents: 'none',
  },
});

export default Select;
