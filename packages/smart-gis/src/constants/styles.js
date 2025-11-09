/**
 * Design System - Global Styles & Helpers
 * Smart GIS Widget v3.0
 */

import { colors } from './colors';

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

export const fontSize = {
  xs: '11px',
  sm: '13px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  xxl: '24px',
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  round: '50%',
};

export const shadows = {
  sm: `0 1px 3px ${colors.shadow}`,
  md: `0 2px 6px ${colors.shadowMedium}`,
  lg: `0 4px 12px ${colors.shadowMedium}`,
  xl: `0 8px 24px ${colors.shadowStrong}`,
};

export const transitions = {
  fast: '0.1s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
  verySlow: '0.5s ease',
};

export const zIndex = {
  base: 1,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
};

/**
 * Helper: Generate box shadow
 */
export const boxShadow = (size = 'md') => shadows[size] || shadows.md;

/**
 * Helper: Generate transition
 */
export const transition = (properties = 'all', duration = 'normal') => {
  const props = Array.isArray(properties) ? properties.join(', ') : properties;
  const dur = transitions[duration] || duration;
  return `${props} ${dur}`;
};

/**
 * Helper: Flexbox utilities
 */
export const flex = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerVertical: {
    display: 'flex',
    alignItems: 'center',
  },
  centerHorizontal: {
    display: 'flex',
    justifyContent: 'center',
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  columnCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

/**
 * Helper: Truncate text with ellipsis
 */
export const truncate = (maxWidth = '100%') => ({
  maxWidth,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/**
 * Helper: Scrollbar styling
 */
export const customScrollbar = {
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: colors.grayLight,
    borderRadius: borderRadius.sm,
  },
  '&::-webkit-scrollbar-thumb': {
    background: colors.gray,
    borderRadius: borderRadius.sm,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: colors.grayHover,
  },
};

const styles = {
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  flex,
  boxShadow,
  transition,
  truncate,
  customScrollbar,
};

export default styles;
