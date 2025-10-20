# Architecture des Widgets Grist

> Principes fondamentaux et séparation des responsabilités

## 📐 Principe de Séparation

### Backend (Grist) - Source de Vérité

**Responsabilités :**
- ✅ Calculs géospatiaux (ST_*)
- ✅ Recherche vectorielle (VECTOR_SEARCH)
- ✅ Agrégations & formules
- ✅ Stockage & historique
- ✅ Relations & contraintes
- ✅ Validation des données

**Exemple :**
```python
# Dans une colonne Grist (formule)
area_km2 = ST_AREA($geometry, 'km2')
distance_to_center = ST_DISTANCE($geometry, $center_point, 'km')
search_results = VECTOR_SEARCH(Documents, $query, threshold=0.75)
```

### Frontend (Widget) - Interface

**Responsabilités :**
- ✅ Affichage & visualisation
- ✅ Interactions utilisateur
- ✅ Navigation & sélection
- ✅ Cache UI & optimisations
- ❌ PAS de calculs métier

**Exemple :**
```javascript
// Widget lit les résultats calculés par Grist
const area = columnHelper.getValue(record, 'area_km2');
const distance = columnHelper.getValue(record, 'distance_to_center');
```

## 🎯 Règle d'Or

> **Si Grist peut le faire → le widget le LIT, ne le CALCULE PAS**

### ✅ BON (Read-Only Widget)

```javascript
class GeoWidget {
  displayMetrics(record) {
    // Lire les métriques calculées par Grist
    return {
      area: this.columnHelper.getValue(record, 'area_km2', 0),
      length: this.columnHelper.getValue(record, 'length_km', 0),
      centroid: this.columnHelper.getValue(record, 'centroid')
    };
  }
}
```

### ❌ MAUVAIS (Recalcul côté Widget)

```javascript
class GeoWidget {
  displayMetrics(record) {
    // Ne jamais recalculer dans le widget !
    const geometry = record.geometry;
    const area = this.calculateArea(geometry);  // ❌ NON !
    const length = this.calculateLength(geometry); // ❌ NON !
    return { area, length };
  }
}
```

## 🔄 Flux de Données

```
┌────────────────────────────────────────────┐
│  1. GRIST CALCULE                          │
│  ────────────────────────────────────────  │
│  • Formules dans colonnes                  │
│  • Fonctions ST_* et VECTOR_*              │
│  • Agrégations                             │
└──────────────┬─────────────────────────────┘
               │
               │ API Events
               │ (onRecords, onRecord)
               │
┌──────────────▼─────────────────────────────┐
│  2. WIDGET REÇOIT                          │
│  ────────────────────────────────────────  │
│  • allRecords (tous les records)           │
│  • mappedColumns (colonnes mappées)        │
│  • selectedIds (sélection courante)        │
└──────────────┬─────────────────────────────┘
               │
               │ Render
               │
┌──────────────▼─────────────────────────────┐
│  3. WIDGET AFFICHE                         │
│  ────────────────────────────────────────  │
│  • Visualisation des données              │
│  • Interaction utilisateur                │
│  • Mise à jour sélection                  │
└────────────────────────────────────────────┘
               │
               │ User Action
               │ (setCursorPos, applyUserActions)
               │
┌──────────────▼─────────────────────────────┐
│  4. RETOUR À GRIST                         │
│  ────────────────────────────────────────  │
│  • Mise à jour données                     │
│  • Recalcul des formules                   │
│  • Notification → Widget                   │
└────────────────────────────────────────────┘
```

## 🧩 Pattern Widget Réactif

```javascript
class MyWidget extends GristWidgetBase {
  // 1. Grist envoie les données
  onDataUpdate() {
    // Rafraîchir UI avec nouvelles données
    this.renderData();
  }

  // 2. Utilisateur clique sur élément
  handleClick(recordId) {
    // Notifier Grist de la sélection
    this.gristApi.setCursorPos({ rowId: recordId });
  }

  // 3. Grist confirme la sélection
  onSelectionChange(record) {
    // Mettre à jour UI (highlight, etc.)
    this.highlightRecord(record.id);
  }
}
```

## 📦 Composants Architecture

### 1. GristWidgetBase

Classe de base pour tous les widgets. Gère :
- Initialisation en 7 phases
- Connexion API Grist
- Event listeners
- Gestion d'erreurs

### 2. ColumnHelper

Accès sécurisé aux colonnes mappées. Évite :
- Erreurs undefined
- Hardcoding des noms de colonnes
- Confusion fields vs direct access

### 3. DataValidator

Validation systématique des données. Garantit :
- Type checking
- Format validation
- Protection XSS

### 4. PerformanceManager

Optimisations UI. Fournit :
- Cache avec TTL
- Debounce pour inputs
- Throttle pour scroll
- Memoization

## 🔐 Sécurité

### Validation des Inputs

**Toujours valider avant utilisation :**

```javascript
const validation = DataValidator.validate(value, 'geometry');
if (!validation.valid) {
  console.warn('Géométrie invalide:', validation.errors);
  return;
}
```

### Protection XSS

**Toujours sanitizer les affichages HTML :**

```javascript
const safeName = DataValidator.sanitizeHTML(record.name);
element.innerHTML = `<div>${safeName}</div>`;
```

### Gestion des Erreurs

**Try/catch sur toutes opérations async :**

```javascript
try {
  await this.docApi.applyUserActions([...]);
} catch (error) {
  console.error('Erreur:', error);
  this.showErrorToUser('Impossible de sauvegarder');
}
```

## 🎨 UI States

### States Obligatoires

1. **Loading** - Pendant chargement initial
2. **Empty** - Quand aucune donnée
3. **Error** - En cas d'erreur
4. **Success** - Affichage normal

### Exemple

```javascript
class MyWidget {
  render() {
    if (this.isLoading) {
      return this.renderLoading();
    }

    if (this.allRecords.length === 0) {
      return this.renderEmpty();
    }

    if (this.error) {
      return this.renderError(this.error);
    }

    return this.renderSuccess();
  }
}
```

## 📊 Performance

### Cache Stratégique

```javascript
// Cache les calculs côtés
this.parseWKT = this.perfManager.memoize((wkt) => {
  return expensiveWKTParser(wkt);
});
```

### Debounce Inputs

```javascript
// Éviter trop de requêtes
this.searchDebounced = this.perfManager.debounce(
  (query) => this.performSearch(query),
  500 // 500ms
);
```

### Batch Updates

```javascript
// Grouper les mises à jour UI
requestAnimationFrame(() => {
  this.updateAllLayers();
});
```

## 🔗 Intégration Grist

### Fonctions Géospatiales

```javascript
// Dans Grist (colonnes formula)
area_km2 = ST_AREA($geometry, 'km2')
length_km = ST_LENGTH($geometry, 'km')
is_inside = ST_CONTAINS($zone, $point)
center = ST_CENTROID($geometry)

// Dans Widget (lecture)
const area = columnHelper.getValue(record, 'area_km2');
```

### Fonctions Vectorielles

```javascript
// Dans Grist (colonnes formula)
vector = CREATE_VECTOR($title, $description)
results = VECTOR_SEARCH(Docs, $query, embedding_column="vector")
score = VECTOR_SIMILARITY($vec1, $vec2, 'cosine')

// Dans Widget (lecture)
const results = columnHelper.getValue(record, 'results');
```

## 📏 Best Practices

### DO ✅

1. Hériter de GristWidgetBase
2. Utiliser ColumnHelper pour accès colonnes
3. Valider toutes les données entrantes
4. Gérer tous les états UI (loading, empty, error)
5. Implémenter le highlighting de sélection
6. Documenter configuration requise
7. Tester en mode standalone et intégré

### DON'T ❌

1. Recalculer ce que Grist calcule déjà
2. Accéder directement aux colonnes sans helper
3. Ignorer la validation des données
4. Oublier la sanitization XSS
5. Négliger les performances (cache, debounce)
6. Hardcoder les noms de colonnes
7. Oublier la gestion d'erreurs

## 🔄 Cycle de Vie

```javascript
┌─────────────────────────────────────────┐
│  1. CONSTRUCTION                        │
│     new MyWidget()                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  2. INITIALISATION                      │
│     await widget.init()                 │
│     • detectMode()                      │
│     • initializeGristApi()              │
│     • loadConfiguration()               │
│     • declareRequirements()             │
│     • setupEventListeners()             │
│     • loadDocumentMetadata()            │
│     • initializeBusinessComponents()    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  3. READY                               │
│     onReady()                           │
└──────────────┬──────────────────────────┘
               │
               │ ┌──────────────────────┐
               ├─│ onDataUpdate()       │
               │ └──────────────────────┘
               │
               │ ┌──────────────────────┐
               ├─│ onSelectionChange()  │
               │ └──────────────────────┘
               │
               │ ┌──────────────────────┐
               └─│ User Actions         │
                 │ → Back to Grist      │
                 └──────────────────────┘
```

## 🎯 Principes Finaux

1. **Grist = Source de Vérité** - Tous calculs métier dans Grist
2. **Widget = Vue** - Affichage et interaction uniquement
3. **Sécurité First** - Validation et sanitization systématiques
4. **Performance** - Cache et optimisations dès la conception
5. **User Experience** - États UI, erreurs claires, feedback immédiat
6. **Maintenabilité** - Code structuré, documenté, testable
