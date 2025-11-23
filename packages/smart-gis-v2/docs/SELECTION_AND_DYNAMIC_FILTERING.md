# Sélection Bidirectionnelle & Filtrage Dynamique

## 🎯 Objectif

Implémenter deux fonctionnalités essentielles pour Smart-GIS v2:

1. **Sélection bidirectionnelle**: Synchroniser sélection carte ↔ Grist
2. **Filtrage dynamique**: Découvrir les champs disponibles et proposer filtres adaptés

**Date**: 2025-11-23
**Auteur**: Claude
**Status**: Guide d'implémentation

---

## 📋 Table des matières

1. [Partie 1: Sélection Bidirectionnelle](#partie-1-sélection-bidirectionnelle)
2. [Partie 2: Découverte Dynamique des Champs](#partie-2-découverte-dynamique-des-champs)
3. [Implémentation Pratique](#implémentation-pratique)

---

## Partie 1: Sélection Bidirectionnelle

### 🔄 Principe

**Grist → Widget**: Quand l'utilisateur clique sur une ligne dans Grist, l'entité correspondante est mise en surbrillance sur la carte

**Widget → Grist**: Quand l'utilisateur clique sur une entité sur la carte, la ligne correspondante est sélectionnée dans Grist

**Widgets liés**: Si plusieurs widgets sont liés ("Select By"), la sélection se propage automatiquement

---

### 📡 API Grist pour la sélection

#### 1. Écouter les changements de sélection Grist

```javascript
// Écouter quand l'utilisateur sélectionne une ligne dans Grist
grist.onRecord((record, mappings) => {
  if (!record) {
    // Aucune sélection
    clearSelection();
    return;
  }

  console.log('Grist a sélectionné:', record.id);

  // Mettre en surbrillance sur la carte
  highlightFeature(record.id);

  // Accéder aux données du record
  const geometry = record[mappings.geometry_wgs84];
  const name = record[mappings.feature_name];
});
```

#### 2. Envoyer une sélection à Grist

```javascript
// Sélection simple (1 entité)
function selectSingle(recordId) {
  grist.setCursorPos({ rowId: recordId });
}

// Sélection multiple (plusieurs entités)
function selectMultiple(recordIds) {
  grist.setSelectedRows(recordIds);
}

// Désélectionner tout
function clearSelection() {
  grist.setSelectedRows([]);
}
```

---

### 🎨 Pattern complet de sélection

```javascript
class MapSelectionManager {
  constructor(gristApi, map) {
    this.gristApi = gristApi;
    this.map = map;
    this.selectedIds = new Set();
    this.lastSelectedId = null;
  }

  /**
   * Initialiser les écouteurs Grist
   */
  init() {
    // 1. Écouter sélection depuis Grist
    this.gristApi.onRecord((record, mappings) => {
      if (!record) {
        this.clearHighlight();
        return;
      }

      // Mettre à jour état local
      this.selectedIds.clear();
      this.selectedIds.add(record.id);
      this.lastSelectedId = record.id;

      // Mettre en surbrillance sur carte
      this.highlightFeatures([record.id]);

      // Centrer sur l'entité (optionnel)
      this.zoomToFeature(record.id);
    });
  }

  /**
   * Gérer clic sur la carte (single select)
   */
  handleMapClick(recordId) {
    // Mettre à jour état local immédiatement (feedback instantané)
    this.selectedIds.clear();
    this.selectedIds.add(recordId);
    this.lastSelectedId = recordId;

    // Mettre en surbrillance localement
    this.highlightFeatures([recordId]);

    // Envoyer à Grist
    this.gristApi.setCursorPos({ rowId: recordId });

    console.log('[Selection] Single select:', recordId);
  }

  /**
   * Gérer Ctrl+Clic (toggle selection)
   */
  handleCtrlClick(recordId) {
    if (this.selectedIds.has(recordId)) {
      this.selectedIds.delete(recordId);
    } else {
      this.selectedIds.add(recordId);
      this.lastSelectedId = recordId;
    }

    this.highlightFeatures([...this.selectedIds]);
    this.gristApi.setSelectedRows([...this.selectedIds]);

    console.log('[Selection] Toggle select:', recordId, 'Total:', this.selectedIds.size);
  }

  /**
   * Gérer Shift+Clic (range selection)
   */
  handleShiftClick(recordId, allRecords) {
    if (!this.lastSelectedId) {
      // Pas de sélection précédente, sélection simple
      this.handleMapClick(recordId);
      return;
    }

    // Trouver range entre lastSelectedId et recordId
    const fromIdx = allRecords.findIndex(r => r.id === this.lastSelectedId);
    const toIdx = allRecords.findIndex(r => r.id === recordId);

    if (fromIdx === -1 || toIdx === -1) {
      console.warn('[Selection] Invalid range selection');
      return;
    }

    const [min, max] = [Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx)];
    const rangeRecords = allRecords.slice(min, max + 1);
    const rangeIds = rangeRecords.map(r => r.id);

    // Ajouter à la sélection
    rangeIds.forEach(id => this.selectedIds.add(id));

    this.highlightFeatures([...this.selectedIds]);
    this.gristApi.setSelectedRows([...this.selectedIds]);

    console.log('[Selection] Range select:', rangeIds.length, 'features');
  }

  /**
   * Sélection par BBOX (rectangle dessiné)
   */
  selectInBounds(bounds) {
    const ids = [];

    // Trouver toutes les features dans le BBOX
    this.map.eachLayer(layer => {
      if (layer.feature && layer.feature.id) {
        const featureBounds = layer.getBounds();
        if (bounds.intersects(featureBounds)) {
          ids.push(layer.feature.id);
          this.selectedIds.add(layer.feature.id);
        }
      }
    });

    this.highlightFeatures([...this.selectedIds]);
    this.gristApi.setSelectedRows([...this.selectedIds]);

    console.log('[Selection] Selected in bounds:', ids.length, 'features');
  }

  /**
   * Sélection par critère
   */
  selectByFilter(predicate, allRecords) {
    const filtered = allRecords.filter(predicate);
    const ids = filtered.map(r => r.id);

    this.selectedIds.clear();
    ids.forEach(id => this.selectedIds.add(id));

    this.highlightFeatures(ids);
    this.gristApi.setSelectedRows(ids);

    console.log('[Selection] Selected by filter:', ids.length, 'features');
  }

  /**
   * Mettre en surbrillance les features sélectionnées
   */
  highlightFeatures(recordIds) {
    this.map.eachLayer(layer => {
      if (!layer.feature) return;

      const isSelected = recordIds.includes(layer.feature.id);

      // Appliquer style de surbrillance
      if (layer.setStyle) {
        layer.setStyle({
          color: isSelected ? '#FF0000' : layer.feature.properties.originalColor || '#3388ff',
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1 : 0.7,
          fillOpacity: isSelected ? 0.5 : 0.2
        });

        // Mettre au premier plan
        if (isSelected) {
          layer.bringToFront();
        }
      }
    });
  }

  /**
   * Supprimer surbrillance
   */
  clearHighlight() {
    this.selectedIds.clear();
    this.highlightFeatures([]);
  }

  /**
   * Zoomer sur une feature
   */
  zoomToFeature(recordId) {
    this.map.eachLayer(layer => {
      if (layer.feature && layer.feature.id === recordId) {
        if (layer.getBounds) {
          this.map.fitBounds(layer.getBounds(), {
            padding: [50, 50],
            maxZoom: 16
          });
        } else if (layer.getLatLng) {
          this.map.setView(layer.getLatLng(), 15);
        }
      }
    });
  }
}
```

---

### 🔗 Widgets liés (Select By)

Pour permettre à Smart-GIS v2 d'être source de sélection pour d'autres widgets :

```javascript
// Dans l'initialisation du widget
grist.ready({
  requiredAccess: 'full',
  allowSelectBy: true,  // ✅ Active "Select By" pour ce widget
  columns: [
    { name: 'geometry_wgs84', optional: false },
    { name: 'feature_name', optional: true },
    { name: 'layer_name', optional: true }
  ]
});
```

**Configuration côté utilisateur** :
1. Ajouter Smart-GIS v2 + un autre widget (table, carte, etc.)
2. Sur le 2ème widget: Menu (⋮) → Data selection → "Select By" → Choisir Smart-GIS v2
3. Configurer la colonne de lien (généralement une Reference)

**Résultat** : Quand l'utilisateur clique sur la carte Smart-GIS, le 2ème widget filtre automatiquement !

---

### ⚡ Bonnes pratiques

| Pratique | Pourquoi |
|----------|----------|
| Mettre à jour l'état local **avant** d'envoyer à Grist | Feedback visuel instantané |
| Utiliser `setCursorPos` pour sélection simple | Grist met en surbrillance la ligne |
| Utiliser `setSelectedRows` pour multi-sélection | Support natif des widgets liés |
| Débouncer les changements rapides | Éviter trop d'appels API |
| Valider que recordId existe | Éviter erreurs si données ont changé |
| Gérer `null` dans onRecord | L'utilisateur peut désélectionner |
| Sauvegarder `lastSelectedId` | Nécessaire pour Shift+Clic range |

---

## Partie 2: Découverte Dynamique des Champs

### 🎯 Principe

**Problème actuel** : Les filtres sont hardcodés (`insee_reg`, `insee_dep`, etc.) mais les vrais noms de champs varient selon les couches :
- Communes: `code_insee`, `code_insee_de_la_region`
- BDTOPO: Peut avoir d'autres noms

**Solution** : Découvrir dynamiquement les champs via `DescribeFeatureType`, puis proposer filtres adaptés.

---

### 📊 Découverte automatique des champs

#### 1. Récupérer le schéma d'une couche

```javascript
/**
 * Récupérer schéma des champs d'une couche WFS
 */
async function getLayerSchema(typeName) {
  const url = `https://data.geopf.fr/wfs?` +
    `service=WFS&version=2.0.0&request=DescribeFeatureType&` +
    `typeName=${encodeURIComponent(typeName)}`;

  const response = await fetch(url);
  const xmlText = await response.text();
  const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');

  const fields = [];
  const elements = xmlDoc.getElementsByTagName('xsd:element');

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const name = element.getAttribute('name');
    const type = element.getAttribute('type');

    // Ignorer géométrie
    if (type && type.includes('gml:')) continue;

    // Mapper type XSD → type simple
    let simpleType = 'string';
    if (type?.includes('int') || type?.includes('decimal')) {
      simpleType = 'number';
    } else if (type?.includes('date')) {
      simpleType = 'date';
    } else if (type?.includes('boolean')) {
      simpleType = 'boolean';
    }

    fields.push({
      name,
      type: simpleType,
      xsdType: type
    });
  }

  return fields;
}

// Exemple d'utilisation
const communeFields = await getLayerSchema('ADMINEXPRESS-COG-CARTO.LATEST:commune');

console.log(communeFields);
/*
[
  { name: 'nom_officiel', type: 'string', xsdType: 'xsd:string' },
  { name: 'code_insee', type: 'string', xsdType: 'xsd:string' },
  { name: 'population', type: 'number', xsdType: 'xsd:integer' },
  { name: 'code_insee_du_departement', type: 'string', xsdType: 'xsd:string' },
  { name: 'code_insee_de_la_region', type: 'string', xsdType: 'xsd:string' },
  { name: 'code_postal', type: 'string', xsdType: 'xsd:string' },
  { name: 'superficie_cadastrale', type: 'number', xsdType: 'xsd:integer' }
]
*/
```

---

#### 2. Catégoriser automatiquement les champs

```javascript
/**
 * Catégoriser les champs selon leur usage
 */
function categorizeFields(fields) {
  const categories = {
    identifiers: [],   // ID, code_insee, cleabs...
    names: [],         // nom, nom_officiel, libelle...
    geography: [],     // code_postal, insee_reg, insee_dep...
    demographics: [],  // population, habitants...
    measures: [],      // superficie, area, length...
    dates: [],         // date_creation, annee...
    other: []
  };

  fields.forEach(field => {
    const nameLower = field.name.toLowerCase();

    if (nameLower.includes('id') || nameLower.includes('code_insee') || nameLower.includes('cleabs')) {
      categories.identifiers.push(field);
    }
    else if (nameLower.includes('nom') || nameLower.includes('libelle') || nameLower.includes('name')) {
      categories.names.push(field);
    }
    else if (nameLower.includes('insee') || nameLower.includes('postal') || nameLower.includes('region') || nameLower.includes('departement')) {
      categories.geography.push(field);
    }
    else if (nameLower.includes('population') || nameLower.includes('habitants')) {
      categories.demographics.push(field);
    }
    else if (nameLower.includes('superficie') || nameLower.includes('area') || nameLower.includes('length') || nameLower.includes('perimeter')) {
      categories.measures.push(field);
    }
    else if (field.type === 'date' || nameLower.includes('date') || nameLower.includes('annee')) {
      categories.dates.push(field);
    }
    else {
      categories.other.push(field);
    }
  });

  return categories;
}
```

---

#### 3. Générer filtres appropriés selon type

```javascript
/**
 * Générer opérateurs de filtre selon type de champ
 */
function getSuggestedFilters(field) {
  const filters = [];

  switch (field.type) {
    case 'string':
      filters.push(
        { op: 'LIKE', label: 'Contient', needsValue: true, example: `${field.name} LIKE '%Paris%'` },
        { op: '=', label: 'Égal à', needsValue: true, example: `${field.name} = 'Paris'` },
        { op: 'IN', label: 'Parmi', needsValue: true, example: `${field.name} IN ('Paris', 'Lyon')` }
      );
      break;

    case 'number':
      filters.push(
        { op: '=', label: 'Égal à', needsValue: true, example: `${field.name} = 100000` },
        { op: '>', label: 'Supérieur à', needsValue: true, example: `${field.name} > 100000` },
        { op: '<', label: 'Inférieur à', needsValue: true, example: `${field.name} < 100000` },
        { op: 'BETWEEN', label: 'Entre', needsValue: true, example: `${field.name} BETWEEN 10000 AND 100000` }
      );
      break;

    case 'date':
      filters.push(
        { op: '>', label: 'Après le', needsValue: true, example: `${field.name} > '2020-01-01'` },
        { op: '<', label: 'Avant le', needsValue: true, example: `${field.name} < '2025-01-01'` },
        { op: 'BETWEEN', label: 'Entre', needsValue: true, example: `${field.name} BETWEEN '2020-01-01' AND '2025-01-01'` }
      );
      break;
  }

  return filters;
}
```

---

### 🎨 UI de filtrage dynamique

```javascript
class DynamicFilterBuilder {
  constructor(typeName) {
    this.typeName = typeName;
    this.schema = null;
    this.categories = null;
    this.filters = [];
  }

  /**
   * Initialiser: découvrir schéma
   */
  async init() {
    console.log(`[FilterBuilder] Discovering schema for ${this.typeName}...`);

    this.schema = await getLayerSchema(this.typeName);
    this.categories = categorizeFields(this.schema);

    console.log(`[FilterBuilder] Found ${this.schema.length} fields:`);
    console.log('- Identifiers:', this.categories.identifiers.length);
    console.log('- Names:', this.categories.names.length);
    console.log('- Geography:', this.categories.geography.length);
    console.log('- Demographics:', this.categories.demographics.length);
    console.log('- Measures:', this.categories.measures.length);

    this.renderUI();
  }

  /**
   * Générer UI de filtrage
   */
  renderUI() {
    const container = document.getElementById('filter-builder');

    // Bouton "Ajouter un filtre"
    const addButton = document.createElement('button');
    addButton.textContent = '+ Ajouter un filtre';
    addButton.onclick = () => this.addFilterRow();
    container.appendChild(addButton);

    // Zone de filtres
    this.filtersContainer = document.createElement('div');
    this.filtersContainer.className = 'filters-list';
    container.appendChild(this.filtersContainer);
  }

  /**
   * Ajouter ligne de filtre
   */
  addFilterRow() {
    const filterId = Date.now();

    const row = document.createElement('div');
    row.className = 'filter-row';
    row.dataset.filterId = filterId;

    // 1. Sélection champ
    const fieldSelect = document.createElement('select');
    fieldSelect.innerHTML = '<option value="">-- Sélectionner un champ --</option>';

    // Grouper par catégorie
    Object.entries(this.categories).forEach(([category, fields]) => {
      if (fields.length === 0) return;

      const group = document.createElement('optgroup');
      group.label = this.getCategoryLabel(category);

      fields.forEach(field => {
        const option = document.createElement('option');
        option.value = field.name;
        option.textContent = `${field.name} (${field.type})`;
        option.dataset.fieldType = field.type;
        group.appendChild(option);
      });

      fieldSelect.appendChild(group);
    });

    fieldSelect.onchange = (e) => {
      const fieldName = e.target.value;
      const field = this.schema.find(f => f.name === fieldName);
      if (field) {
        this.updateOperatorSelect(filterId, field);
      }
    };

    // 2. Sélection opérateur (vide initialement)
    const operatorSelect = document.createElement('select');
    operatorSelect.id = `operator-${filterId}`;
    operatorSelect.innerHTML = '<option value="">-- Opérateur --</option>';

    // 3. Valeur
    const valueInput = document.createElement('input');
    valueInput.id = `value-${filterId}`;
    valueInput.type = 'text';
    valueInput.placeholder = 'Valeur...';

    // 4. Bouton supprimer
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '✕';
    deleteButton.className = 'delete-filter';
    deleteButton.onclick = () => {
      row.remove();
      this.filters = this.filters.filter(f => f.id !== filterId);
    };

    row.appendChild(fieldSelect);
    row.appendChild(operatorSelect);
    row.appendChild(valueInput);
    row.appendChild(deleteButton);

    this.filtersContainer.appendChild(row);

    this.filters.push({ id: filterId, field: null, operator: null, value: null });
  }

  /**
   * Mettre à jour sélecteur d'opérateur selon type de champ
   */
  updateOperatorSelect(filterId, field) {
    const operatorSelect = document.getElementById(`operator-${filterId}`);
    const valueInput = document.getElementById(`value-${filterId}`);

    // Obtenir opérateurs suggérés
    const suggested = getSuggestedFilters(field);

    // Remplir le select
    operatorSelect.innerHTML = '<option value="">-- Opérateur --</option>';
    suggested.forEach(filter => {
      const option = document.createElement('option');
      option.value = filter.op;
      option.textContent = filter.label;
      option.title = filter.example; // Tooltip avec exemple
      operatorSelect.appendChild(option);
    });

    // Adapter placeholder selon type
    if (field.type === 'number') {
      valueInput.type = 'number';
      valueInput.placeholder = 'Ex: 100000';
    } else if (field.type === 'date') {
      valueInput.type = 'date';
      valueInput.placeholder = 'Ex: 2025-01-01';
    } else {
      valueInput.type = 'text';
      valueInput.placeholder = 'Ex: Paris';
    }
  }

  /**
   * Construire filtre CQL depuis l'UI
   */
  buildCQLFilter() {
    const clauses = [];

    this.filtersContainer.querySelectorAll('.filter-row').forEach(row => {
      const filterId = row.dataset.filterId;
      const fieldSelect = row.querySelector('select');
      const operatorSelect = document.getElementById(`operator-${filterId}`);
      const valueInput = document.getElementById(`value-${filterId}`);

      const fieldName = fieldSelect.value;
      const operator = operatorSelect.value;
      const value = valueInput.value;

      if (!fieldName || !operator || !value) return;

      const field = this.schema.find(f => f.name === fieldName);

      // Construire clause selon opérateur
      let clause;
      switch (operator) {
        case 'LIKE':
          clause = `${fieldName} LIKE '%${value.replace(/'/g, "''")}'%'`;
          break;

        case '=':
        case '>':
        case '<':
        case '>=':
        case '<=':
        case '!=':
          if (field.type === 'string') {
            clause = `${fieldName} ${operator} '${value.replace(/'/g, "''")}'`;
          } else {
            clause = `${fieldName} ${operator} ${value}`;
          }
          break;

        case 'IN':
          const values = value.split(',').map(v => `'${v.trim().replace(/'/g, "''")}'`).join(', ');
          clause = `${fieldName} IN (${values})`;
          break;

        case 'BETWEEN':
          const [min, max] = value.split(',').map(v => v.trim());
          if (field.type === 'string') {
            clause = `${fieldName} BETWEEN '${min}' AND '${max}'`;
          } else {
            clause = `${fieldName} BETWEEN ${min} AND ${max}`;
          }
          break;
      }

      if (clause) {
        clauses.push(clause);
      }
    });

    return clauses.length > 0 ? clauses.join(' AND ') : null;
  }

  getCategoryLabel(category) {
    const labels = {
      identifiers: '🆔 Identifiants',
      names: '📝 Noms',
      geography: '🗺️ Géographie',
      demographics: '👥 Démographie',
      measures: '📏 Mesures',
      dates: '📅 Dates',
      other: '📦 Autres'
    };
    return labels[category] || category;
  }
}
```

---

### 💡 Exemple d'utilisation complète

```javascript
// Initialiser le constructeur de filtres
const filterBuilder = new DynamicFilterBuilder('ADMINEXPRESS-COG-CARTO.LATEST:commune');

// Découvrir schéma et générer UI
await filterBuilder.init();

// L'utilisateur ajoute des filtres via l'UI:
// 1. Champ: "population" (number)
// 2. Opérateur: ">"
// 3. Valeur: "100000"
//
// 4. Champ: "code_postal" (string)
// 5. Opérateur: "LIKE"
// 6. Valeur: "75"

// Construire le filtre CQL
const cqlFilter = filterBuilder.buildCQLFilter();
console.log(cqlFilter);
// → "population > 100000 AND code_postal LIKE '%75%'"

// Utiliser pour import
const params = new URLSearchParams({
  service: 'WFS',
  version: '2.0.0',
  request: 'GetFeature',
  typeName: 'ADMINEXPRESS-COG-CARTO.LATEST:commune',
  outputFormat: 'application/json',
  cql_filter: cqlFilter,
  count: 1000
});

const response = await fetch(`https://data.geopf.fr/wfs?${params}`);
const geojson = await response.json();

console.log(`Trouvé ${geojson.features.length} communes avec population > 100k et CP contenant 75`);
```

---

## Implémentation Pratique

### 🚀 Phase 1: Sélection bidirectionnelle (2-3 jours)

#### Fichiers à modifier

**1. `/src/components/map/MapView.jsx`**
```javascript
import { useEffect, useCallback, useState } from 'react';
import SelectionManager from '../../services/SelectionManager';

const MapView = ({ gristApi, records }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectionManager = useRef(null);

  useEffect(() => {
    if (!gristApi || !mapRef.current) return;

    // Initialiser gestionnaire de sélection
    selectionManager.current = new SelectionManager(gristApi, mapRef.current);
    selectionManager.current.init();

    // Écouter sélection Grist
    gristApi.onRecord((record) => {
      if (!record) {
        setSelectedIds(new Set());
        selectionManager.current.clearHighlight();
        return;
      }

      setSelectedIds(new Set([record.id]));
      selectionManager.current.highlightFeatures([record.id]);
    });

    return () => {
      selectionManager.current = null;
    };
  }, [gristApi]);

  const handleFeatureClick = useCallback((recordId, event) => {
    if (!selectionManager.current) return;

    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Clic: toggle
      selectionManager.current.handleCtrlClick(recordId);
    } else if (event.shiftKey) {
      // Shift+Clic: range
      selectionManager.current.handleShiftClick(recordId, records);
    } else {
      // Clic simple
      selectionManager.current.handleMapClick(recordId);
    }
  }, [records]);

  return (
    <div>
      {/* Carte Leaflet avec gestion des clics */}
    </div>
  );
};
```

**2. `/src/services/SelectionManager.js`** (nouveau fichier)
```javascript
// Code du SelectionManager complet (voir section précédente)
export default class SelectionManager {
  // ... implémentation complète
}
```

**3. Activer "Select By" dans `/src/SmartGISWidget.jsx`**
```javascript
grist.ready({
  requiredAccess: 'full',
  allowSelectBy: true,  // ✅ Ajouter cette ligne
  columns: [
    { name: 'geometry_wgs84', optional: false },
    { name: 'feature_name', optional: true },
    // ...
  ]
});
```

---

### 🔍 Phase 2: Filtrage dynamique (3-4 jours)

#### Fichiers à créer/modifier

**1. `/src/services/FieldDiscoveryService.js`** (nouveau)
```javascript
export class FieldDiscoveryService {
  async getLayerSchema(typeName) { /* ... */ }
  categorizeFields(fields) { /* ... */ }
  getSuggestedFilters(field) { /* ... */ }
}
```

**2. `/src/components/import/DynamicFilterBuilder.jsx`** (nouveau)
```javascript
// UI React pour le constructeur de filtres dynamiques
import { useState, useEffect } from 'react';
import { FieldDiscoveryService } from '../../services/FieldDiscoveryService';

const DynamicFilterBuilder = ({ typeName, onFilterChange }) => {
  const [schema, setSchema] = useState(null);
  const [filters, setFilters] = useState([]);

  useEffect(() => {
    const service = new FieldDiscoveryService();
    service.getLayerSchema(typeName).then(setSchema);
  }, [typeName]);

  // ... implémentation UI
};
```

**3. Intégrer dans `ImportWizard.jsx`**
```javascript
{currentStep.id === 'config' && method.supportsDynamicFilters && (
  <DynamicFilterBuilder
    typeName={config.ign_layer}
    onFilterChange={(cqlFilter) => handleConfigChange('cql_filter', cqlFilter)}
  />
)}
```

---

### 📊 Bénéfices attendus

| Fonctionnalité | Bénéfice |
|----------------|----------|
| **Sélection bidirectionnelle** | UX cohérente, widgets liés fonctionnent |
| **Découverte dynamique** | Pas de hardcoding, s'adapte à toutes les couches |
| **UI de filtrage** | Accessible aux non-techniques, pas besoin de connaître CQL |
| **Catégorisation** | Facilite la recherche de champs (géographie, démographie...) |
| **Opérateurs adaptés** | Suggestions pertinentes selon type (string, number, date) |

---

## Sources

- [Grist Plugin API Documentation](https://support.getgrist.com/code/modules/grist_plugin_api/)
- [GristView Interface](https://support.getgrist.com/code/interfaces/grist_plugin_api.GristView/)
- [Custom Widgets Guide](https://support.getgrist.com/widget-custom/)
- [Linking Widgets in Grist](https://support.getgrist.com/linking-widgets/)
- [CursorPos Interface](https://support.getgrist.com/code/interfaces/grist_plugin_api.CursorPos/)
- [WFS DescribeFeatureType](https://docs.geoserver.org/stable/en/user/services/wfs/reference.html)

---

**Date de création**: 2025-11-23
**Auteur**: Claude
**Version**: 1.0
**Statut**: Guide complet - Prêt pour implémentation
