/**
 * SelectionTools Component
 * Smart GIS Widget v3.0
 *
 * Compact floating toolbar for map selection modes
 * Displays above the map center - only shows active mode with dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows, transitions } from '../../constants/styles';

const SelectionTools = ({
  selectionMode = 'pointer',
  onModeChange,
  activeLayer = null,
  selectionCount = 0,
  onClear,
  disabled = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const modes = [
    { id: 'pointer', icon: '👆', label: 'Pointeur', tooltip: 'Sélection par clic (Échap)' },
    { id: 'rectangle', icon: '▢', label: 'Rectangle', tooltip: 'Sélection rectangulaire (R)' },
    { id: 'circle', icon: '⭕', label: 'Cercle', tooltip: 'Sélection circulaire (C)' },
    { id: 'lasso', icon: '✏️', label: 'Lasso', tooltip: 'Sélection libre (L)' },
  ];

  const currentMode = modes.find(m => m.id === selectionMode) || modes[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleModeSelect = (modeId) => {
    if (!disabled && onModeChange) {
      onModeChange(modeId);
      setIsDropdownOpen(false);
    }
  };

  const handleToggleActive = () => {
    // Click on the mode button itself = toggle active/inactive
    // For now, just ensure it's active
    if (!disabled && onModeChange) {
      onModeChange(selectionMode);
    }
  };

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      {/* Current Mode Display + Dropdown */}
      <div style={styles.modeSelector}>
        <button
          style={{
            ...styles.currentModeButton,
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onClick={handleToggleActive}
          disabled={disabled}
          title={currentMode.tooltip}
        >
          <span style={styles.modeIcon}>{currentMode.icon}</span>
          <span style={styles.modeLabel}>{currentMode.label}</span>
        </button>

        {/* Dropdown Toggle Arrow */}
        <button
          style={{
            ...styles.dropdownButton,
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onClick={handleDropdownToggle}
          disabled={disabled}
          title="Changer le mode de sélection"
        >
          <span style={styles.dropdownArrow}>{isDropdownOpen ? '▲' : '▼'}</span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div style={styles.dropdownMenu}>
            {modes
              .filter(m => m.id !== selectionMode)
              .map(mode => (
                <button
                  key={mode.id}
                  style={styles.dropdownItem}
                  onClick={() => handleModeSelect(mode.id)}
                  title={mode.tooltip}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.grayLight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.white;
                  }}
                >
                  <span style={styles.modeIcon}>{mode.icon}</span>
                  <span style={styles.modeLabel}>{mode.label}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Active Layer */}
      <div style={styles.context}>
        <span style={styles.contextIcon}>🎯</span>
        <span style={styles.contextText}>
          {activeLayer || 'Toutes'}
        </span>
      </div>

      {/* Selection Count Badge */}
      {selectionCount > 0 && (
        <>
          <div style={styles.badge}>
            <span style={styles.badgeText}>
              {selectionCount}
            </span>
          </div>

          {/* Clear Button */}
          <button
            style={styles.clearButton}
            onClick={onClear}
            disabled={disabled}
            title="Effacer la sélection (Échap)"
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = colors.dangerLight;
                e.currentTarget.style.color = colors.danger;
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = colors.textSecondary;
              }
            }}
          >
            ×
          </button>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    top: spacing.md,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    boxShadow: shadows.lg,
    backdropFilter: 'blur(10px)',
    transition: `all ${transitions.normal}`,
  },
  modeSelector: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  currentModeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.primaryLight,
    border: `1px solid ${colors.primary}`,
    borderRight: 'none',
    borderRadius: `${borderRadius.md} 0 0 ${borderRadius.md}`,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
  dropdownButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.primaryLight,
    border: `1px solid ${colors.primary}`,
    borderLeft: `1px solid ${colors.primary}80`,
    borderRadius: `0 ${borderRadius.md} ${borderRadius.md} 0`,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    minWidth: '24px',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  dropdownArrow: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  modeIcon: {
    fontSize: fontSize.lg,
    lineHeight: '1',
  },
  modeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '100%',
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.white,
    border: 'none',
    borderBottom: `1px solid ${colors.borderLight}`,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
    textAlign: 'left',
  },
  divider: {
    width: '1px',
    height: '28px',
    backgroundColor: colors.border,
    margin: `0 ${spacing.xs}`,
  },
  context: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
  },
  contextIcon: {
    fontSize: fontSize.md,
  },
  contextText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  badge: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.selectedLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.selected}`,
    minWidth: '32px',
    textAlign: 'center',
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.selected,
  },
  clearButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
};

export default SelectionTools;
