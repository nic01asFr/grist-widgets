# Guide de Développement de Widgets Grist

> Guide pratique pour créer des widgets production-ready

## 🚀 Quick Start

### 1. Créer un Nouveau Widget

```bash
# Créer dossier
cd packages
mkdir my-widget
cd my-widget

# Initialiser
npm init -y
```

### 2. Structure de Base

```
my-widget/
├── public/
│   └── index.html       # Point d'entrée
├── src/
│   ├── MyWidget.js      # Classe principale
│   ├── index.js         # Initialisation
│   └── styles.css       # Styles
├── package.json
└── README.md
```

### 3. Fichier HTML Minimal

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>My Widget</title>
  <script src="https://docs.getgrist.com/grist-plugin-api.js"></script>
</head>
<body>
  <div id="app"></div>
  <script src="../src/index.js" type="module"></script>
</body>
</html>
```

### 4. Classe Widget de Base

```javascript
// src/MyWidget.js
import { GristWidgetBase } from './base/GristWidgetBase.js';

class MyWidget extends GristWidgetBase {
  // Déclarer les colonnes attendues
  getExpectedColumns() {
    return [
      { name: 'title', optional: false,
        description: 'Titre de l\'élément' },
      { name: 'description', optional: true,
        description: 'Description optionnelle' }
    ];
  }

  // Niveau d'accès requis
  getRequiredAccess() {
    return 'read table';  // ou 'full' si édition
  }

  // Initialiser composants métier
  async initializeBusinessComponents() {
    this.container = document.getElementById('app');
  }

  // Mise à jour données
  onDataUpdate() {
    this.render();
  }

  // Render
  render() {
    if (this.allRecords.length === 0) {
      this.container.innerHTML = '<p>Aucune donnée</p>';
      return;
    }

    this.container.innerHTML = this.allRecords.map(record => {
      const title = this.columnHelper.getValue(record, 'title', 'Sans titre');
      return `<div class="item">${title}</div>`;
    }).join('');
  }
}

export default MyWidget;
```

### 5. Point d'Entrée

```javascript
// src/index.js
import MyWidget from './MyWidget.js';

// Initialiser widget
const widget = new MyWidget();
widget.init().catch(error => {
  console.error('Erreur initialisation:', error);
});
```

## 📋 Checklist Développement

### Phase 1 : Analyse

- [ ] Identifier le cas d'usage métier
- [ ] Définir les données nécessaires
- [ ] Lister les calculs requis (à faire dans Grist)
- [ ] Définir les interactions utilisateur

### Phase 2 : Structure Grist

- [ ] Créer/identifier les tables sources
- [ ] Ajouter colonnes avec formules (ST_*, VECTOR_*, etc.)
- [ ] Tester les formules dans Grist
- [ ] Documenter la structure requise

### Phase 3 : Widget

- [ ] Hériter de GristWidgetBase
- [ ] Implémenter getExpectedColumns()
- [ ] Implémenter getRequiredAccess()
- [ ] Implémenter initializeBusinessComponents()
- [ ] Implémenter onDataUpdate()
- [ ] Implémenter onSelectionChange() si nécessaire

### Phase 4 : Sécurité & Qualité

- [ ] Valider tous les inputs (DataValidator)
- [ ] Sanitizer tous les affichages HTML
- [ ] Gérer les erreurs (try/catch)
- [ ] Implémenter états UI (loading, empty, error)
- [ ] Tester cas limites (0 données, données invalides)

### Phase 5 : Performance

- [ ] Cacher les calculs côté client
- [ ] Debouncer les recherches/filtres
- [ ] Optimiser le rendering (virtual scroll si besoin)
- [ ] Tester avec grande quantité de données

### Phase 6 : Documentation

- [ ] README avec usage
- [ ] Structure Grist requise
- [ ] Captures d'écran
- [ ] Exemples concrets

## 🧩 Utiliser les Composants de Base

### GristWidgetBase

```javascript
import { GristWidgetBase } from './base/GristWidgetBase.js';

class MyWidget extends GristWidgetBase {
  // Hériter et override les méthodes nécessaires
}
```

**Méthodes à override :**
- `getExpectedColumns()` - Colonnes attendues
- `getRequiredAccess()` - Niveau accès
- `initializeBusinessComponents()` - Init composants UI
- `onReady()` - Widget prêt
- `onDataUpdate()` - Nouvelles données
- `onSelectionChange(record)` - Sélection changée

### ColumnHelper

```javascript
// Dans onDataUpdate ou render
const helper = this.columnHelper;

// Récupérer valeur sécurisée
const title = helper.getValue(record, 'title', 'Défaut');

// Vérifier existence colonne
if (helper.hasColumn('description')) {
  const desc = helper.getValue(record, 'description');
}

// Première valeur disponible
const name = helper.getFirstAvailable(record,
  ['name', 'title', 'label'],
  'Sans nom'
);

// Toutes les valeurs mappées
const allData = helper.getAllMapped(record);

// Valider colonnes requises
try {
  helper.validateRequiredColumns(['title', 'geometry']);
} catch (error) {
  this.showError(error.message);
}
```

### DataValidator

```javascript
// Valider géométrie WKT
const validation = DataValidator.validate(value, 'geometry');
if (!validation.valid) {
  console.warn('Erreurs:', validation.errors);
  return;
}

// Valider email
const emailCheck = DataValidator.validate(email, 'email');

// Valider numérique avec range
const numCheck = DataValidator.validate(value, 'numeric', {
  min: 0,
  max: 100
});

// Valider choix (enum)
const choiceCheck = DataValidator.validate(value, 'choice', {
  enum: ['option1', 'option2', 'option3']
});

// Sanitizer HTML (protection XSS)
const safeName = DataValidator.sanitizeHTML(userInput);
element.innerHTML = `<div>${safeName}</div>`;
```

### PerformanceManager

```javascript
// Cache avec TTL
const result = this.perfManager.getCached('my-key', () => {
  return expensiveComputation();
}, 60000); // 60 secondes

// Memoization
this.parseWKT = this.perfManager.memoize((wkt) => {
  return WKTParser.parse(wkt);
});

// Debounce (inputs)
this.handleSearch = this.perfManager.debounce((query) => {
  this.performSearch(query);
}, 500);

// Throttle (scroll, resize)
this.handleScroll = this.perfManager.throttle(() => {
  this.updateVisibleItems();
}, 100);

// Nettoyer cache
this.perfManager.clearCache();
```

## 🎨 Patterns Communs

### Pattern 1 : Carte Interactive

```javascript
class MapWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    // Init Leaflet
    this.map = L.map('map').setView([46.6, 2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      .addTo(this.map);

    this.layers = new Map();
  }

  onDataUpdate() {
    // Nettoyer layers
    this.layers.forEach(layer => this.map.removeLayer(layer));
    this.layers.clear();

    // Afficher chaque record
    this.allRecords.forEach(record => {
      const geom = this.columnHelper.getValue(record, 'geometry');
      if (!geom) return;

      const layer = this.createLayer(record, geom);
      this.layers.set(record.id, layer);
    });
  }

  createLayer(record, geometry) {
    const feature = this.parseWKT(geometry);
    const layer = L.geoJSON(feature, {
      onEachFeature: (feature, layer) => {
        // Popup
        layer.bindPopup(this.createPopup(record));

        // Clic → sélectionner
        layer.on('click', () => {
          this.gristApi.setCursorPos({ rowId: record.id });
        });
      }
    }).addTo(this.map);

    return layer;
  }

  onSelectionChange(record) {
    // Highlight layer sélectionné
    this.layers.forEach((layer, id) => {
      if (id === record.id) {
        layer.setStyle({ weight: 6, fillOpacity: 0.8 });
      } else {
        layer.setStyle({ weight: 2, fillOpacity: 0.3 });
      }
    });
  }
}
```

### Pattern 2 : Recherche Vectorielle

```javascript
class SearchWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    this.searchInput = document.getElementById('search');
    this.resultsContainer = document.getElementById('results');

    // Debounce recherche
    this.handleSearch = this.perfManager.debounce((query) => {
      this.performSearch(query);
    }, 500);

    this.searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
  }

  async performSearch(query) {
    if (!query || query.length < 3) return;

    // Créer record de recherche
    // Grist exécutera VECTOR_SEARCH via formule
    try {
      await this.docApi.applyUserActions([
        ['AddRecord', 'Recherches', null, {
          query: query,
          date: new Date().toISOString()
        }]
      ]);

      this.resultsContainer.innerHTML = '<div>Recherche...</div>';
    } catch (error) {
      console.error('Erreur:', error);
      this.resultsContainer.innerHTML = '<div>Erreur</div>';
    }
  }

  onDataUpdate() {
    // Si on est sur table Recherches, afficher résultats
    const lastSearch = this.allRecords[this.allRecords.length - 1];
    if (!lastSearch) return;

    const results = this.columnHelper.getValue(lastSearch, 'resultats', []);
    this.displayResults(results);
  }

  displayResults(results) {
    if (results.length === 0) {
      this.resultsContainer.innerHTML = '<p>Aucun résultat</p>';
      return;
    }

    this.resultsContainer.innerHTML = results.map((result, index) => {
      const title = this.columnHelper.getValue(result, 'title');
      const score = this.columnHelper.getValue(result, 'score', 0);

      return `
        <div class="result">
          <span class="rank">#${index + 1}</span>
          <span class="title">${title}</span>
          <span class="score">${Math.round(score * 100)}%</span>
        </div>
      `;
    }).join('');
  }
}
```

### Pattern 3 : Dashboard KPIs

```javascript
class DashboardWidget extends GristWidgetBase {
  onDataUpdate() {
    this.updateKPIs();
    this.updateCharts();
  }

  updateKPIs() {
    const helper = this.columnHelper;

    // Calculer KPIs depuis données Grist
    const total = this.allRecords.length;
    const actifs = this.allRecords.filter(r =>
      helper.getValue(r, 'statut') === 'actif'
    ).length;
    const critiques = this.allRecords.filter(r =>
      helper.getValue(r, 'urgence') === '1-critique'
    ).length;

    // Afficher
    document.getElementById('kpi-total').textContent = total;
    document.getElementById('kpi-actifs').textContent = actifs;
    document.getElementById('kpi-critiques').textContent = critiques;
  }

  updateCharts() {
    // Préparer données pour Chart.js
    const counts = {};
    this.allRecords.forEach(r => {
      const statut = this.columnHelper.getValue(r, 'statut', 'inconnu');
      counts[statut] = (counts[statut] || 0) + 1;
    });

    // Mettre à jour chart
    if (this.chart) {
      this.chart.data.labels = Object.keys(counts);
      this.chart.data.datasets[0].data = Object.values(counts);
      this.chart.update();
    }
  }
}
```

## 🔧 Intégration Fonctions Grist

### Fonctions Géospatiales

**Dans Grist (formules de colonnes) :**

```python
# Aire en km²
area_km2 = ST_AREA($geometry, 'km2')

# Distance à un point
distance_center = ST_DISTANCE($geometry, $center_point, 'km')

# Longueur en km
length_km = ST_LENGTH($geometry, 'km')

# Centroïde
centroid = ST_CENTROID($geometry)

# Point dans polygone ?
is_inside = ST_CONTAINS($zone_polygone, $point)
```

**Dans Widget (lecture) :**

```javascript
const area = this.columnHelper.getValue(record, 'area_km2');
const distance = this.columnHelper.getValue(record, 'distance_center');
const length = this.columnHelper.getValue(record, 'length_km');
const centroid = this.columnHelper.getValue(record, 'centroid');
const isInside = this.columnHelper.getValue(record, 'is_inside');
```

### Fonctions Vectorielles

**Dans Grist (formules de colonnes) :**

```python
# Créer embedding
doc_vector = CREATE_VECTOR($title, $content, $tags)

# Recherche sémantique
search_results = VECTOR_SEARCH(
  Documents,
  $query,
  embedding_column="doc_vector",
  threshold=0.75,
  limit=20
)

# Similarité
similarity_score = VECTOR_SIMILARITY($vector1, $vector2, 'cosine')
```

**Dans Widget (lecture) :**

```javascript
const results = this.columnHelper.getValue(record, 'search_results', []);
const score = this.columnHelper.getValue(record, 'similarity_score', 0);
```

## 🎯 États UI Obligatoires

### Loading State

```javascript
renderLoading() {
  return `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Chargement...</p>
    </div>
  `;
}
```

### Empty State

```javascript
renderEmpty() {
  return `
    <div class="empty-container">
      <p>Aucune donnée à afficher</p>
      <small>Ajoutez des enregistrements dans Grist</small>
    </div>
  `;
}
```

### Error State

```javascript
renderError(error) {
  return `
    <div class="error-container">
      <p class="error-title">Une erreur est survenue</p>
      <p class="error-message">${DataValidator.sanitizeHTML(error)}</p>
      <button onclick="widget.retry()">Réessayer</button>
    </div>
  `;
}
```

## 🐛 Debugging

### Logs Structurés

```javascript
class MyWidget extends GristWidgetBase {
  constructor() {
    super();
    this.debugMode = this.config?.debugMode || false;
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[MyWidget]', ...args);
    }
  }

  onDataUpdate() {
    this.log('Data updated:', {
      recordCount: this.allRecords.length,
      columns: Object.keys(this.mappedColumns)
    });
  }
}
```

### Tester en Mode Standalone

```javascript
detectMode() {
  this.isWidgetMode = window !== window.parent &&
                      (!!window.parent?.grist || !!window.grist);

  if (!this.isWidgetMode) {
    console.warn('Mode standalone - Mock data');
    this.loadMockData();
  }
}

loadMockData() {
  this.allRecords = [
    { id: 1, title: 'Test 1', geometry: 'POINT(2.3522 48.8566)' },
    { id: 2, title: 'Test 2', geometry: 'POINT(4.8357 45.7640)' }
  ];
  this.mappedColumns = { title: 'title', geometry: 'geometry' };
  this.columnHelper = new ColumnHelper(this.mappedColumns);
  this.onDataUpdate();
}
```

## 📦 Build & Déploiement

### 1. Ajouter au Manifest

```javascript
// scripts/build-manifest.js
const widgets = [
  {
    name: 'my-widget',
    url: 'https://nic01asfr.github.io/grist-widgets/my-widget/',
    description: 'Description du widget'
  }
];
```

### 2. Configurer Build

```javascript
// scripts/prepare-dist.js
// Copier build dans dist/
fs.copySync('packages/my-widget/build', 'dist/my-widget');
```

### 3. Push vers GitHub

```bash
git add .
git commit -m "feat: Add my-widget"
git push origin main
```

Le workflow GitHub Actions déploie automatiquement !

## 🎓 Ressources

- [API Grist Plugin](https://support.getgrist.com/code/modules/grist_plugin_api/)
- [Custom Widgets Guide](https://support.getgrist.com/widget-custom/)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Principes architecturaux
- [API_REFERENCE.md](./API_REFERENCE.md) - Référence complète des utilitaires
