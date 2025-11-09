/**
 * MainMenu Component
 * Smart GIS Widget v3.0
 *
 * Collapsible side menu with sections for Search, Layers, Import, and Project
 */

import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transition, shadows, customScrollbar } from '../../constants/styles';

const MainMenu = ({
  isOpen = true,
  onClose,
  children,
  width = 350,
}) => {
  if (!isOpen) return null;

  const styles = getMainMenuStyles(width);

  return (
    <>
      {/* Overlay for mobile */}
      <div
        style={styles.overlay}
        onClick={onClose}
      />

      {/* Menu panel */}
      <div style={styles.menu}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Menu</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            title="Fermer le menu"
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

/**
 * MenuSection Component
 * Collapsible section within the main menu
 */
export const MenuSection = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  collapsible = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div style={sectionStyles.section}>
      {/* Section header */}
      <div
        style={{
          ...sectionStyles.header,
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={handleToggle}
      >
        <div style={sectionStyles.titleContainer}>
          {icon && <span style={sectionStyles.icon}>{icon}</span>}
          <h3 style={sectionStyles.title}>{title}</h3>
        </div>
        {collapsible && (
          <span style={sectionStyles.arrow}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {/* Section content */}
      {isExpanded && (
        <div style={sectionStyles.content}>
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * MenuDivider Component
 * Visual separator between sections
 */
export const MenuDivider = () => (
  <div style={sectionStyles.divider} />
);

const getMainMenuStyles = (width) => ({
  overlay: {
    position: 'fixed',
    top: '50px', // Below navbar
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgOverlay,
    zIndex: 999,
    animation: 'fadeIn 0.2s ease',
  },
  menu: {
    position: 'fixed',
    top: '50px', // Below navbar
    left: 0,
    bottom: 0,
    width: `${width}px`,
    backgroundColor: colors.white,
    boxShadow: shadows.lg,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInLeft 0.3s ease',
  },
  header: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '32px',
    color: colors.textSecondary,
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    transition: transition(['background-color'], 'fast'),
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    ...customScrollbar,
  },
});

const sectionStyles = {
  section: {
    borderBottom: `1px solid ${colors.border}`,
  },
  header: {
    padding: spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: transition(['background-color'], 'fast'),
    userSelect: 'none',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: fontSize.lg,
  },
  title: {
    margin: 0,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  arrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    transition: transition(['transform'], 'fast'),
  },
  content: {
    padding: spacing.lg,
    paddingTop: 0,
    animation: 'fadeIn 0.2s ease',
  },
  divider: {
    height: '1px',
    backgroundColor: colors.border,
    margin: `${spacing.md} 0`,
  },
};

// Add animations
if (typeof document !== 'undefined' && !document.getElementById('menu-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'menu-animations';
  styleSheet.textContent = `
    @keyframes slideInLeft {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MainMenu;
