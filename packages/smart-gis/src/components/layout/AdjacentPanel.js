/**
 * AdjacentPanel Component
 * Smart GIS Widget v3.0
 *
 * Contextual panel that appears to the right of the main menu
 * Used for StyleEditor, EntityList, StatsPanel, etc.
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows, customScrollbar } from '../../constants/styles';

const AdjacentPanel = ({
  isOpen = false,
  onClose,
  title,
  children,
  width = 320,
  menuWidth = 350, // Width of main menu
}) => {
  if (!isOpen) return null;

  const styles = getAdjacentPanelStyles(width, menuWidth);

  return (
    <>
      {/* Overlay (optional, for closing on click outside) */}
      <div
        style={styles.overlay}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button
            onClick={onClose}
            style={styles.closeButton}
            title="Fermer"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.grayLight}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </>
  );
};

const getAdjacentPanelStyles = (width, menuWidth) => ({
  overlay: {
    position: 'fixed',
    top: '50px', // Below navbar
    left: `${menuWidth}px`, // After main menu
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 998,
    animation: 'fadeIn 0.2s ease',
  },
  panel: {
    position: 'fixed',
    top: '50px', // Below navbar
    left: `${menuWidth}px`, // Adjacent to main menu
    bottom: 0,
    width: `${width}px`,
    backgroundColor: colors.white,
    boxShadow: shadows.xl,
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${colors.border}`,
    animation: 'slideInFromRight 0.3s ease',
  },
  header: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgLight,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '28px',
    color: colors.textSecondary,
    cursor: 'pointer',
    padding: 0,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    transition: 'background-color 0.2s',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    ...customScrollbar,
  },
});

// Add animation
if (typeof document !== 'undefined' && !document.getElementById('adjacent-panel-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'adjacent-panel-animations';
  styleSheet.textContent = `
    @keyframes slideInFromRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default AdjacentPanel;
