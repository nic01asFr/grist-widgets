/**
 * Navbar Component
 * Smart GIS Widget v3.0
 *
 * Minimal navbar with editable project name, menu toggle, and fullscreen mode
 */

import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transition, shadows } from '../../constants/styles';

const Navbar = ({
  projectName = 'Mon Projet GIS',
  onProjectNameChange,
  menuOpen = false,
  onToggleMenu,
  onToggleFullscreen,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  const handleStartEdit = () => {
    setTempName(projectName);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (tempName.trim()) {
      onProjectNameChange?.(tempName.trim());
    } else {
      setTempName(projectName);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTempName(projectName);
      setIsEditing(false);
    }
  };

  return (
    <div style={styles.navbar}>
      <div style={styles.left}>
        {/* Menu toggle button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleMenu?.();
          }}
          style={{
            ...styles.menuButton,
            ...(menuOpen ? { backgroundColor: colors.darkHover } : {}),
          }}
          title={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onMouseEnter={(e) => {
            if (!menuOpen) {
              e.currentTarget.style.backgroundColor = colors.darkHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!menuOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Project name (editable) */}
        {isEditing ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyPress}
            autoFocus
            style={styles.input}
            maxLength={100}
          />
        ) : (
          <div
            onClick={handleStartEdit}
            style={styles.projectName}
            title="Cliquer pour renommer le projet"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.icon}>📊</span>
            <span style={styles.projectText}>{projectName}</span>
            <span style={styles.editIcon}>✏️</span>
          </div>
        )}
      </div>

      <div style={styles.right}>
        {/* Fullscreen toggle */}
        <button
          onClick={onToggleFullscreen}
          style={styles.fullscreenButton}
          title="Basculer en plein écran (carte uniquement)"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.darkHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          🗺️
        </button>
      </div>
    </div>
  );
};

const styles = {
  navbar: {
    height: '50px',
    backgroundColor: colors.dark,
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${spacing.lg}`,
    boxShadow: shadows.md,
    zIndex: 1001,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0, // Allow flex items to shrink below content size
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuButton: {
    backgroundColor: 'transparent',
    color: colors.white,
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    transition: transition(['background-color'], 'fast'),
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  projectName: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    cursor: 'pointer',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    transition: transition(['background-color'], 'fast'),
    minWidth: 0, // Allow text to truncate
    flex: 1,
  },
  icon: {
    fontSize: fontSize.lg,
    flexShrink: 0,
  },
  projectText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  editIcon: {
    fontSize: fontSize.xs,
    opacity: 0.6,
    flexShrink: 0,
  },
  input: {
    backgroundColor: colors.white,
    color: colors.dark,
    border: 'none',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.sm,
    outline: `2px solid ${colors.primary}`,
    minWidth: '200px',
    maxWidth: '400px',
    flex: 1,
  },
  fullscreenButton: {
    backgroundColor: 'transparent',
    color: colors.white,
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    transition: transition(['background-color'], 'fast'),
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};

export default Navbar;
