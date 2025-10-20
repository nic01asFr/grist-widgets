/**
 * CONTEXT MENU
 *
 * Menu contextuel pour features géographiques
 * Affiché au clic droit sur un élément de la carte
 */

import React from 'react';

const ContextMenu = ({ x, y, onEditGeometry, onEditAttributes, onEditStyle, onDelete, onClose }) => {
  const menuItems = [
    {
      icon: '✏️',
      label: 'Éditer la géométrie',
      action: onEditGeometry,
      enabled: true
    },
    {
      icon: '📝',
      label: 'Modifier les attributs',
      action: onEditAttributes,
      enabled: true
    },
    {
      icon: '🎨',
      label: 'Changer le style',
      action: onEditStyle,
      enabled: true
    },
    {
      type: 'divider'
    },
    {
      icon: '🗑️',
      label: 'Supprimer',
      action: onDelete,
      enabled: true,
      danger: true
    }
  ];

  const handleClick = (action) => {
    if (action) {
      action();
    }
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        style={{
          ...styles.menu,
          left: x,
          top: y
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={idx} style={styles.divider} />;
          }

          return (
            <button
              key={idx}
              onClick={() => handleClick(item.action)}
              disabled={!item.enabled}
              style={{
                ...styles.menuItem,
                ...(item.danger ? styles.dangerItem : {}),
                ...(item.enabled ? {} : styles.disabledItem)
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    backgroundColor: 'transparent'
  },
  menu: {
    position: 'fixed',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e0e0e0',
    padding: '4px',
    minWidth: '220px',
    zIndex: 10001
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#2c3e50',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    textAlign: 'left'
  },
  icon: {
    marginRight: '10px',
    fontSize: '16px',
    width: '20px',
    textAlign: 'center'
  },
  label: {
    flex: 1
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '4px 8px'
  },
  dangerItem: {
    color: '#e74c3c'
  },
  disabledItem: {
    opacity: 0.4,
    cursor: 'not-allowed'
  }
};

export default ContextMenu;
