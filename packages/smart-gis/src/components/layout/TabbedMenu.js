/**
 * TabbedMenu Component
 * Smart GIS Widget v3.0
 *
 * Tabbed menu with resizable width (Couches | Projet | Recherche)
 */

import React, { useState, useRef, useEffect } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, transitions } from '../../constants/styles';

const TabbedMenu = ({
  isOpen = true,
  onClose,
  children,
  initialWidth = 320,
  minWidth = 250,
  maxWidth = 600,
  onWidthChange,
}) => {
  const [activeTab, setActiveTab] = useState('layers'); // 'layers' | 'project' | 'search'
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const menuRef = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const tabs = [
    { id: 'layers', icon: '🗂️', label: 'Couches' },
    { id: 'project', icon: '📁', label: 'Projet' },
    { id: 'search', icon: '🔍', label: 'Recherche' },
  ];

  // Handle resize start
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.current + delta));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        ...styles.container,
        width: `${width}px`,
      }}
    >
      {/* Tab Headers */}
      <div style={styles.tabHeader}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = colors.grayLight;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            <span style={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {React.Children.map(children, (child) => {
          if (!child) return null;
          return React.cloneElement(child, {
            activeTab,
            menuWidth: width,
          });
        })}
      </div>

      {/* Resize Handle */}
      <div
        style={{
          ...styles.resizeHandle,
          ...(isResizing ? styles.resizeHandleActive : {}),
        }}
        onMouseDown={handleResizeStart}
        title="Redimensionner le menu"
      />
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    height: '100%',
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: `width ${transitions.normal}`,
  },
  tabHeader: {
    display: 'flex',
    borderBottom: `2px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabActive: {
    backgroundColor: colors.white,
    borderBottomColor: colors.primary,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  tabIcon: {
    fontSize: fontSize.lg,
  },
  tabLabel: {
    fontSize: fontSize.sm,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  resizeHandle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '4px',
    height: '100%',
    cursor: 'ew-resize',
    backgroundColor: 'transparent',
    transition: `background-color ${transitions.fast}`,
  },
  resizeHandleActive: {
    backgroundColor: colors.primary,
  },
};

export default TabbedMenu;
