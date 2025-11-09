/**
 * ZoomControls Component
 * Smart GIS Widget v3.0
 *
 * Zoom controls that stay on the map and move with menu
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows, transitions } from '../../constants/styles';

const ZoomControls = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  menuWidth = 300,
}) => {
  return (
    <div style={{
      ...styles.container,
      left: `calc(${menuWidth}px + ${spacing.md})`,
    }}>
      {/* Zoom In */}
      <button
        style={styles.button}
        onClick={onZoomIn}
        title="Zoom avant"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.primaryLight;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.white;
        }}
      >
        +
      </button>

      {/* Zoom Out */}
      <button
        style={styles.button}
        onClick={onZoomOut}
        title="Zoom arrière"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.primaryLight;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.white;
        }}
      >
        −
      </button>

      {/* Reset Zoom */}
      <button
        style={styles.button}
        onClick={onResetZoom}
        title="Réinitialiser le zoom"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.primaryLight;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.white;
        }}
      >
        🌍
      </button>
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    top: '12px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: `left ${transitions.normal}`,
  },
  button: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    boxShadow: shadows.md,
  },
};

export default ZoomControls;
