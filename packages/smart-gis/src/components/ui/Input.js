/**
 * Input Component
 * Smart GIS Widget v3.0
 */

import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transition } from '../../constants/styles';

const Input = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  error,
  disabled = false,
  fullWidth = false,
  onFocus,
  onBlur,
  onKeyPress,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const styles = getInputStyles(isFocused, error, disabled, fullWidth, !!icon);

  return (
    <div style={styles.container}>
      {icon && <span style={styles.icon}>{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={styles.input}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyPress={onKeyPress}
        {...props}
      />
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
};

const getInputStyles = (isFocused, error, disabled, fullWidth, hasIcon) => {
  const borderColor = error
    ? colors.danger
    : isFocused
    ? colors.primary
    : colors.border;

  return {
    container: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: fullWidth ? '100%' : 'auto',
    },
    input: {
      padding: hasIcon ? `${spacing.sm} ${spacing.sm} ${spacing.sm} 36px` : `${spacing.sm} ${spacing.md}`,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      color: colors.textPrimary,
      backgroundColor: disabled ? colors.grayVeryLight : colors.white,
      border: `1px solid ${borderColor}`,
      borderRadius: borderRadius.md,
      outline: 'none',
      transition: transition(['border-color', 'box-shadow'], 'normal'),
      cursor: disabled ? 'not-allowed' : 'text',
      boxShadow: isFocused ? `0 0 0 3px ${colors.primary}20` : 'none',
      width: '100%',
    },
    icon: {
      position: 'absolute',
      left: spacing.md,
      top: '50%',
      transform: error ? 'translateY(calc(-50% - 10px))' : 'translateY(-50%)',
      fontSize: fontSize.md,
      color: colors.textSecondary,
      pointerEvents: 'none',
      transition: transition(['transform'], 'normal'),
    },
    error: {
      marginTop: spacing.xs,
      fontSize: fontSize.xs,
      color: colors.danger,
      fontWeight: fontWeight.medium,
    },
  };
};

export default Input;
