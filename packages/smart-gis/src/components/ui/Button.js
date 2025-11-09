/**
 * Button Component
 * Smart GIS Widget v3.0
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transition } from '../../constants/styles';

const Button = ({
  children,
  variant = 'primary', // primary | secondary | danger | ghost | success
  size = 'medium',     // small | medium | large
  icon,
  onClick,
  disabled = false,
  fullWidth = false,
  loading = false,
  type = 'button',
  title,
  ...props
}) => {
  const styles = getButtonStyles(variant, size, disabled, fullWidth, loading);

  return (
    <button
      type={type}
      style={styles.button}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      title={title}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = styles.hoverShadow;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      {...props}
    >
      {loading ? (
        <span style={styles.spinner}>⏳</span>
      ) : (
        <>
          {icon && <span style={styles.icon}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

const getButtonStyles = (variant, size, disabled, fullWidth, loading) => {
  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      border: 'none',
      hoverShadow: `0 4px 12px ${colors.primary}40`,
    },
    secondary: {
      backgroundColor: colors.white,
      color: colors.dark,
      border: `1px solid ${colors.border}`,
      hoverShadow: `0 2px 8px ${colors.shadowMedium}`,
    },
    danger: {
      backgroundColor: colors.danger,
      color: colors.white,
      border: 'none',
      hoverShadow: `0 4px 12px ${colors.danger}40`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
      hoverShadow: `0 2px 8px ${colors.primary}20`,
    },
    success: {
      backgroundColor: colors.success,
      color: colors.white,
      border: 'none',
      hoverShadow: `0 4px 12px ${colors.success}40`,
    },
  };

  // Size styles
  const sizeStyles = {
    small: {
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: fontSize.xs,
      gap: spacing.xs,
    },
    medium: {
      padding: `6px 14px`,
      fontSize: fontSize.sm,
      gap: spacing.xs,
    },
    large: {
      padding: `10px 20px`,
      fontSize: fontSize.lg,
      gap: spacing.md,
    },
  };

  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const sizeStyle = sizeStyles[size] || sizeStyles.medium;

  return {
    button: {
      ...variantStyle,
      ...sizeStyle,
      fontWeight: fontWeight.medium,
      borderRadius: borderRadius.md,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      transition: transition(['all'], 'normal'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: fullWidth ? '100%' : 'auto',
      outline: 'none',
      userSelect: 'none',
    },
    icon: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '1.1em',
    },
    spinner: {
      display: 'inline-block',
      animation: 'spin 1s linear infinite',
    },
    hoverShadow: variantStyle.hoverShadow,
  };
};

export default Button;
