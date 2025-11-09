# Smart GIS Widget v3.0 - Plan d'Implémentation Complet

## 📋 Vue d'Ensemble

Refonte complète du widget avec :
- ✅ Architecture UX/UI moderne et épurée
- ✅ Système de sélection contextuel avancé
- ✅ Gestion projet simplifiée
- ✅ Éditeurs visuels (style, attributs)
- ✅ Recherche intelligente (texte + sémantique)

**Documents de référence** :
- `/packages/smart-gis/UX_REFACTORING_PLAN.md` - Architecture UX/UI
- `/packages/smart-gis/SELECTION_BEHAVIOR_SPEC.md` - Comportements sélection

---

## 🏗️ Architecture Technique

### Structure de Fichiers

```
packages/smart-gis/
├── src/
│   ├── GeoSemanticMapWidget.js          (Orchestrateur principal)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.js                (Titre projet + toggle menu)
│   │   │   ├── MainMenu.js              (Menu latéral principal)
│   │   │   ├── AdjacentPanel.js         (Panneau droit contextuel)
│   │   │   └── MapContainer.js          (Wrapper carte + outils)
│   │   │
│   │   ├── menu/
│   │   │   ├── SearchSection.js         (Recherche intelligente)
│   │   │   ├── LayersSection.js         (Liste couches)
│   │   │   ├── LayerItem.js             (Item couche)
│   │   │   ├── ImportSection.js         (Import IGN/OSM)
│   │   │   └── ProjectSection.js        (Gestion projet)
│   │   │
│   │   ├── panels/
│   │   │   ├── StyleEditor.js           (Éditeur style visuel)
│   │   │   ├── EntityDetails.js         (Détails entité unique)
│   │   │   ├── EntityList.js            (Liste entités couche)
│   │   │   ├── SelectionPanel.js        (Sélection multiple)
│   │   │   ├── StatsPanel.js            (Statistiques)
│   │   │   └── ImportWizard.js          (Assistant import)
│   │   │
│   │   ├── map/
│   │   │   ├── SelectionTools.js        (Barre outils sélection)
│   │   │   ├── SelectionActionsBar.js   (Actions sur sélection)
│   │   │   ├── EditionToolbar.js        (Outils édition géométrie)
│   │   │   ├── MapLegend.js             (Légende dynamique)
│   │   │   └── MapControls.js           (Contrôles carte)
│   │   │
│   │   └── ui/
│   │       ├── Button.js                (Bouton avec variants)
│   │       ├── Input.js                 (Input avec icône)
│   │       ├── ColorPicker.js           (Picker couleur + alpha)
│   │       ├── Slider.js                (Slider avec unité)
│   │       ├── Checkbox.js              (Checkbox stylé)
│   │       ├── Select.js                (Select customisé)
│   │       ├── Tooltip.js               (Tooltip)
│   │       ├── Modal.js                 (Modal centré)
│   │       ├── ContextMenu.js           (Menu contextuel)
│   │       └── Toast.js                 (Notifications)
│   │
│   ├── hooks/
│   │   ├── useProject.js                (Gestion projet)
│   │   ├── useSearch.js                 (Recherche intelligente)
│   │   ├── useMapSelection.js           (Sélection carte)
│   │   ├── useLayerManagement.js        (Gestion couches)
│   │   ├── useStyleEditor.js            (Édition style)
│   │   └── useKeyboardShortcuts.js      (Raccourcis clavier)
│   │
│   ├── services/
│   │   ├── IGNService.js                (API IGN)
│   │   ├── OSMService.js                (API OSM)
│   │   ├── exportService.js             (Export GeoJSON/KML/CSV)
│   │   └── geometryService.js           (Utilitaires géométrie)
│   │
│   ├── utils/
│   │   ├── wktParser.js                 (Parser WKT)
│   │   ├── styleHelpers.js              (Helpers style)
│   │   └── selectionHelpers.js          (Helpers sélection)
│   │
│   └── constants/
│       ├── colors.js                    (Palette couleurs)
│       ├── styles.js                    (Styles globaux)
│       └── config.js                    (Configuration)
│
├── public/
│   └── index.html
│
├── package.json
└── README.md
```

---

## 🎨 Design System

### Palette de Couleurs

```javascript
// constants/colors.js
export const colors = {
  // Primary
  primary: '#3498db',
  primaryHover: '#2980b9',
  primaryLight: '#ecf5fc',

  // Success
  success: '#16B378',
  successHover: '#12a06a',
  successLight: '#e8f8f3',

  // Danger
  danger: '#e74c3c',
  dangerHover: '#c0392b',
  dangerLight: '#fdecea',

  // Warning
  warning: '#f39c12',
  warningHover: '#e67e22',
  warningLight: '#fef5e7',

  // Neutral
  dark: '#2c3e50',
  darkHover: '#1a252f',
  gray: '#95a5a6',
  grayLight: '#ecf0f1',
  white: '#ffffff',

  // Selection
  selected: '#f39c12',
  selectedLight: 'rgba(243, 156, 18, 0.1)',
  hover: 'rgba(52, 152, 219, 0.2)',

  // Map
  highlight: '#f39c12',
  selectionZone: 'rgba(52, 152, 219, 0.1)',
};
```

### Composants UI de Base

#### Button Component

```javascript
// components/ui/Button.js
import React from 'react';
import { colors } from '../../constants/colors';

const Button = ({
  children,
  variant = 'primary', // primary | secondary | danger | ghost
  size = 'medium',     // small | medium | large
  icon,
  onClick,
  disabled = false,
  fullWidth = false,
  ...props
}) => {
  const styles = getButtonStyles(variant, size, disabled, fullWidth);

  return (
    <button
      style={styles.button}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => !disabled && (e.target.style.transform = 'translateY(-1px)')}
      onMouseLeave={(e) => (e.target.style.transform = 'translateY(0)')}
      {...props}
    >
      {icon && <span style={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
};

const getButtonStyles = (variant, size, disabled, fullWidth) => {
  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      border: 'none',
    },
    secondary: {
      backgroundColor: colors.grayLight,
      color: colors.dark,
      border: `1px solid ${colors.gray}`,
    },
    danger: {
      backgroundColor: colors.danger,
      color: colors.white,
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
    },
  };

  const sizeStyles = {
    small: { padding: '4px 8px', fontSize: '11px' },
    medium: { padding: '6px 14px', fontSize: '13px' },
    large: { padding: '10px 20px', fontSize: '15px' },
  };

  return {
    button: {
      ...variantStyles[variant],
      ...sizeStyles[size],
      fontWeight: '500',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      width: fullWidth ? '100%' : 'auto',
      justifyContent: 'center',
    },
    icon: {
      display: 'flex',
      alignItems: 'center',
    },
  };
};

export default Button;
```

#### ColorPicker Component

```javascript
// components/ui/ColorPicker.js
import React, { useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

const ColorPicker = ({ value, onChange, showAlpha = false }) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.swatch,
          backgroundColor: value,
        }}
        onClick={() => setShowPicker(!showPicker)}
      />

      <HexColorInput
        color={value}
        onChange={onChange}
        style={styles.input}
        placeholder="#3498db"
      />

      {showPicker && (
        <div style={styles.popover}>
          <div
            style={styles.cover}
            onClick={() => setShowPicker(false)}
          />
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
  },
  swatch: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: '2px solid #ecf0f1',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  input: {
    padding: '6px 10px',
    border: '1px solid #ecf0f1',
    borderRadius: '4px',
    fontSize: '13px',
    width: '100px',
  },
  popover: {
    position: 'absolute',
    top: '40px',
    left: 0,
    zIndex: 2000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  cover: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
};

export default ColorPicker;
```

#### Slider Component

```javascript
// components/ui/Slider.js
import React from 'react';
import { colors } from '../../constants/colors';

const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  label,
}) => {
  return (
    <div style={styles.container}>
      {label && (
        <div style={styles.header}>
          <span style={styles.label}>{label}</span>
          <span style={styles.value}>{value}{unit}</span>
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: colors.dark,
  },
  value: {
    fontSize: '13px',
    color: colors.gray,
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    WebkitAppearance: 'none',
    background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} var(--value), ${colors.grayLight} var(--value), ${colors.grayLight} 100%)`,
  },
};

export default Slider;
```

---

## 🧩 Composants Principaux

### 1. Navbar

```javascript
// components/layout/Navbar.js
import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import Button from '../ui/Button';

const Navbar = ({
  projectName,
  onProjectNameChange,
  onToggleMenu,
  onToggleFullscreen,
  menuOpen,
}) => {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  const handleSave = () => {
    onProjectNameChange(tempName);
    setEditing(false);
  };

  return (
    <div style={styles.navbar}>
      <div style={styles.left}>
        <button
          onClick={onToggleMenu}
          style={styles.menuButton}
          title={menuOpen ? 'Fermer menu' : 'Ouvrir menu'}
        >
          ☰
        </button>

        {editing ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            style={styles.input}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            style={styles.title}
            title="Cliquer pour renommer"
          >
            📊 {projectName}
            <span style={styles.editIcon}>✏️</span>
          </div>
        )}
      </div>

      <button
        onClick={onToggleFullscreen}
        style={styles.fullscreenButton}
        title="Mode plein écran"
      >
        🗺️
      </button>
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
    padding: '0 16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1001,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuButton: {
    backgroundColor: 'transparent',
    color: colors.white,
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  editIcon: {
    fontSize: '12px',
    opacity: 0.6,
  },
  input: {
    backgroundColor: colors.white,
    color: colors.dark,
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    padding: '6px 12px',
    borderRadius: '4px',
    outline: 'none',
    minWidth: '200px',
  },
  fullscreenButton: {
    backgroundColor: 'transparent',
    color: colors.white,
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
};

export default Navbar;
```

### 2. Hook useMapSelection

```javascript
// hooks/useMapSelection.js
import { useState, useCallback } from 'react';

const useMapSelection = (records, activeLayer = null) => {
  const [selection, setSelection] = useState([]);
  const [selectionMode, setSelectionMode] = useState('pointer'); // pointer | rectangle | lasso | circle

  // Sélectionner une entité unique
  const selectEntity = useCallback((entityId, modifier = 'none') => {
    if (modifier === 'ctrl') {
      // Toggle dans sélection
      setSelection(prev =>
        prev.includes(entityId)
          ? prev.filter(id => id !== entityId)
          : [...prev, entityId]
      );
    } else if (modifier === 'shift') {
      // Sélection plage (par ID)
      if (selection.length === 0) {
        setSelection([entityId]);
      } else {
        const lastSelected = selection[selection.length - 1];
        const range = getIDRange(lastSelected, entityId, records);
        setSelection(range);
      }
    } else {
      // Remplacer sélection
      setSelection([entityId]);
    }
  }, [selection, records]);

  // Sélectionner dans une zone (bounds)
  const selectInBounds = useCallback((bounds, modifier = 'none') => {
    const entitiesInBounds = records.filter(r => {
      // Filtre par couche active si définie
      if (activeLayer && r.layer_name !== activeLayer) return false;

      // Vérifie si géométrie dans bounds
      return isGeometryInBounds(r.geometry, bounds);
    });

    const ids = entitiesInBounds.map(r => r.id);

    if (modifier === 'ctrl') {
      // Ajouter à sélection existante
      setSelection(prev => [...new Set([...prev, ...ids])]);
    } else if (modifier === 'shift') {
      // Intersection
      setSelection(prev => prev.filter(id => ids.includes(id)));
    } else {
      // Remplacer
      setSelection(ids);
    }

    return ids.length;
  }, [records, activeLayer]);

  // Tout désélectionner
  const clearSelection = useCallback(() => {
    setSelection([]);
  }, []);

  // Tout sélectionner (couche active ou tout)
  const selectAll = useCallback(() => {
    const ids = activeLayer
      ? records.filter(r => r.layer_name === activeLayer).map(r => r.id)
      : records.map(r => r.id);
    setSelection(ids);
  }, [records, activeLayer]);

  // Sélectionner entités par IDs
  const selectByIds = useCallback((ids) => {
    setSelection(ids);
  }, []);

  // Vérifier si entité est sélectionnée
  const isSelected = useCallback((entityId) => {
    return selection.includes(entityId);
  }, [selection]);

  // Obtenir les records sélectionnés
  const selectedRecords = records.filter(r => selection.includes(r.id));

  return {
    selection,
    selectedRecords,
    selectionMode,
    setSelectionMode,
    selectEntity,
    selectInBounds,
    clearSelection,
    selectAll,
    selectByIds,
    isSelected,
  };
};

// Helper: Range d'IDs entre deux entités
const getIDRange = (startId, endId, records) => {
  const startIdx = records.findIndex(r => r.id === startId);
  const endIdx = records.findIndex(r => r.id === endId);

  if (startIdx === -1 || endIdx === -1) return [startId, endId];

  const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
  return records.slice(min, max + 1).map(r => r.id);
};

// Helper: Vérifie si géométrie dans bounds
const isGeometryInBounds = (wktGeometry, bounds) => {
  // Parse WKT et vérifie intersection avec bounds
  // Implémentation simplifiée
  try {
    // Extraire coordonnées du WKT
    const coords = extractCoordinates(wktGeometry);

    // Vérifier si au moins un point dans bounds
    return coords.some(([lng, lat]) =>
      lng >= bounds.getWest() &&
      lng <= bounds.getEast() &&
      lat >= bounds.getSouth() &&
      lat <= bounds.getNorth()
    );
  } catch (e) {
    return false;
  }
};

// Helper: Extraire coordonnées d'un WKT
const extractCoordinates = (wkt) => {
  if (!wkt) return [];

  // Regex pour extraire paires de coordonnées
  const regex = /([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)/g;
  const matches = [];
  let match;

  while ((match = regex.exec(wkt)) !== null) {
    matches.push([parseFloat(match[1]), parseFloat(match[2])]);
  }

  return matches;
};

export default useMapSelection;
```

### 3. StyleEditor Panel

```javascript
// components/panels/StyleEditor.js
import React, { useState, useEffect } from 'react';
import ColorPicker from '../ui/ColorPicker';
import Slider from '../ui/Slider';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import { colors } from '../../constants/colors';

const StyleEditor = ({
  entity,
  onSave,
  onCancel,
  geometryType,
}) => {
  const [style, setStyle] = useState({
    color: '#3498db',
    opacity: 100,
    fillColor: '#3498db',
    fillOpacity: 30,
    weight: 2,
    fill: true,
    stroke: true,
  });

  useEffect(() => {
    // Charger style existant
    if (entity?.style_config) {
      try {
        const existing = typeof entity.style_config === 'string'
          ? JSON.parse(entity.style_config)
          : entity.style_config;
        setStyle({
          ...style,
          ...existing,
          opacity: (existing.opacity || 1) * 100,
          fillOpacity: (existing.fillOpacity || 0.3) * 100,
        });
      } catch (e) {
        console.warn('Invalid style_config:', e);
      }
    }
  }, [entity]);

  const handleSave = () => {
    const finalStyle = {
      color: style.color,
      opacity: style.opacity / 100,
      weight: style.weight,
    };

    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      finalStyle.fillColor = style.fillColor;
      finalStyle.fillOpacity = style.fillOpacity / 100;
      finalStyle.fill = style.fill;
    }

    if (style.stroke) {
      finalStyle.stroke = true;
    }

    onSave(finalStyle);
  };

  const isPolygon = geometryType === 'Polygon' || geometryType === 'MultiPolygon';

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>🎨 Style</h3>
        <button onClick={onCancel} style={styles.closeButton}>×</button>
      </div>

      <div style={styles.content}>
        {/* Bordure */}
        <div style={styles.section}>
          <Checkbox
            label="Afficher bordure"
            checked={style.stroke}
            onChange={(checked) => setStyle({ ...style, stroke: checked })}
          />

          {style.stroke && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Couleur bordure</label>
                <ColorPicker
                  value={style.color}
                  onChange={(color) => setStyle({ ...style, color })}
                />
              </div>

              <Slider
                label="Épaisseur"
                value={style.weight}
                onChange={(weight) => setStyle({ ...style, weight })}
                min={1}
                max={10}
                step={1}
                unit="px"
              />

              <Slider
                label="Opacité bordure"
                value={style.opacity}
                onChange={(opacity) => setStyle({ ...style, opacity })}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
            </>
          )}
        </div>

        {/* Remplissage (polygones seulement) */}
        {isPolygon && (
          <div style={styles.section}>
            <Checkbox
              label="Remplir"
              checked={style.fill}
              onChange={(checked) => setStyle({ ...style, fill: checked })}
            />

            {style.fill && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Couleur remplissage</label>
                  <ColorPicker
                    value={style.fillColor}
                    onChange={(fillColor) => setStyle({ ...style, fillColor })}
                  />
                </div>

                <Slider
                  label="Opacité remplissage"
                  value={style.fillOpacity}
                  onChange={(fillOpacity) => setStyle({ ...style, fillOpacity })}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                />
              </>
            )}
          </div>
        )}

        {/* Aperçu */}
        <div style={styles.section}>
          <label style={styles.label}>Aperçu</label>
          <div style={styles.preview}>
            {isPolygon ? (
              <svg width="100%" height="80" viewBox="0 0 100 80">
                <polygon
                  points="10,10 90,10 90,70 10,70"
                  fill={style.fill ? style.fillColor : 'none'}
                  fillOpacity={style.fill ? style.fillOpacity / 100 : 0}
                  stroke={style.stroke ? style.color : 'none'}
                  strokeWidth={style.weight}
                  strokeOpacity={style.opacity / 100}
                />
              </svg>
            ) : (
              <svg width="100%" height="80" viewBox="0 0 100 80">
                <polyline
                  points="10,70 30,30 70,50 90,10"
                  fill="none"
                  stroke={style.color}
                  strokeWidth={style.weight}
                  strokeOpacity={style.opacity / 100}
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Appliquer
        </Button>
      </div>
    </div>
  );
};

const styles = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.white,
  },
  header: {
    padding: '16px',
    borderBottom: `1px solid ${colors.grayLight}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: colors.dark,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.gray,
  },
  content: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: `1px solid ${colors.grayLight}`,
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: colors.dark,
    marginBottom: '8px',
  },
  preview: {
    backgroundColor: colors.grayLight,
    borderRadius: '6px',
    padding: '16px',
  },
  footer: {
    padding: '16px',
    borderTop: `1px solid ${colors.grayLight}`,
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};

export default StyleEditor;
```

---

## 📝 Plan d'Implémentation par Phases

### Phase 1 : Fondations (2 jours)
**Objectif** : Créer le design system et les composants UI de base

- [ ] Créer `constants/colors.js`, `constants/styles.js`
- [ ] Implémenter `ui/Button.js`
- [ ] Implémenter `ui/Input.js`
- [ ] Implémenter `ui/ColorPicker.js` (avec `react-colorful`)
- [ ] Implémenter `ui/Slider.js`
- [ ] Implémenter `ui/Checkbox.js`
- [ ] Implémenter `ui/Select.js`
- [ ] Implémenter `ui/Tooltip.js`
- [ ] Implémenter `ui/Modal.js`
- [ ] Implémenter `ui/Toast.js`
- [ ] Créer storybook ou page de test pour tous les composants

### Phase 2 : Layout (1 jour)
**Objectif** : Structure principale de l'application

- [ ] Implémenter `layout/Navbar.js`
- [ ] Implémenter `layout/MainMenu.js` (structure vide)
- [ ] Implémenter `layout/AdjacentPanel.js` (conteneur)
- [ ] Implémenter système toggle menu (état + animation)
- [ ] Tester responsive

### Phase 3 : Sélection Carte (2 jours)
**Objectif** : Système de sélection complet

- [ ] Créer `hooks/useMapSelection.js`
- [ ] Implémenter `map/SelectionTools.js` (barre outils)
- [ ] Implémenter `map/SelectionActionsBar.js`
- [ ] Intégrer Leaflet Draw pour rectangle/lasso/circle
- [ ] Gestion modificateurs clavier (Ctrl, Shift)
- [ ] Feedback visuel (highlight, hover)
- [ ] Tests tous les cas d'usage (SELECTION_BEHAVIOR_SPEC.md)

### Phase 4 : Gestion Couches (2 jours)
**Objectif** : Menu couches + actions

- [ ] Créer `hooks/useLayerManagement.js`
- [ ] Implémenter `menu/LayersSection.js`
- [ ] Implémenter `menu/LayerItem.js`
- [ ] Implémenter `panels/EntityList.js`
- [ ] Implémenter `panels/StatsPanel.js`
- [ ] Intégration avec sélection

### Phase 5 : Éditeur Style (1 jour)
**Objectif** : Interface visuelle pour styles

- [ ] Créer `hooks/useStyleEditor.js`
- [ ] Implémenter `panels/StyleEditor.js` (complet)
- [ ] Aperçu temps réel
- [ ] Application style individuel
- [ ] Application style groupe/couche

### Phase 6 : Recherche Intelligente (2 jours)
**Objectif** : Recherche texte + sémantique avec suggestions

- [ ] Créer `hooks/useSearch.js`
- [ ] Implémenter `menu/SearchSection.js`
- [ ] Intégrer recherche texte (filtre local)
- [ ] Intégrer recherche sémantique (VECTOR_SEARCH)
- [ ] Suggestions contextuelles (dropdown)
- [ ] Recadrage carte sur sélection
- [ ] Highlight résultats

### Phase 7 : Gestion Projet (2 jours)
**Objectif** : Nouveau/Sauvegarder/Charger

- [ ] Créer `hooks/useProject.js`
- [ ] Implémenter `menu/ProjectSection.js`
- [ ] Fonction nouveau projet (nettoyer GIS_WorkSpace)
- [ ] Fonction sauvegarder (copier table)
- [ ] Fonction charger (liste tables + copie vers WorkSpace)
- [ ] Fonction exporter (GeoJSON, KML, CSV)
- [ ] Gestion nom projet (éditable navbar)

### Phase 8 : Import (1 jour)
**Objectif** : Import simplifié IGN/OSM

- [ ] Implémenter `menu/ImportSection.js`
- [ ] Refonte `panels/ImportWizard.js` (simplifié)
- [ ] Choix couche destination
- [ ] Aperçu avant import
- [ ] Intégration avec IGNService/OSMService

### Phase 9 : Édition Géométrie (1 jour)
**Objectif** : Outils édition avec contexte couche

- [ ] Implémenter `map/EditionToolbar.js`
- [ ] Leaflet.pm integration (draw tools)
- [ ] Contexte couche active pour nouvelle géométrie
- [ ] Style automatique selon couche
- [ ] Édition géométrie existante

### Phase 10 : Tests & Polish (2 jours)
**Objectif** : Tests, bugs, animations, doc

- [ ] Tests tous les workflows
- [ ] Corrections bugs
- [ ] Animations et transitions
- [ ] Raccourcis clavier
- [ ] Documentation utilisateur
- [ ] README mis à jour

**Total : ~16 jours** (3 semaines en rythme normal)

---

## ✅ Validation Finale

Avant de commencer, validation requise sur :

- [ ] Architecture technique approuvée
- [ ] Design system validé
- [ ] Comportements sélection validés
- [ ] Plan d'implémentation accepté
- [ ] Priorités définies (toutes phases ou sous-ensemble)

---

## 🚀 Démarrage

Une fois validé, commencer par :

1. **Créer nouvelle branche** : `claude/ux-refactoring-v3`
2. **Installer dépendances** :
   ```bash
   npm install react-colorful
   ```
3. **Créer structure dossiers** : `components/`, `hooks/`, `utils/`, `constants/`
4. **Phase 1** : Design system (2 jours)

---

**Prêt à démarrer ?**
