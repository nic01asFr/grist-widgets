# API Reference - Grist Widget Utilities

> Documentation complète des classes et utilitaires pour le développement de widgets

## Table des Matières

- [GristWidgetBase](#gristwidgetbase)
- [ColumnHelper](#columnhelper)
- [DataValidator](#datavalidator)
- [PerformanceManager](#performancemanager)
- [Grist API](#grist-api)

---

## GristWidgetBase

Classe de base pour tous les widgets Grist. Gère l'initialisation, les événements et la communication avec Grist.

### Constructor

```javascript
constructor()
```

Initialise le widget avec les propriétés par défaut.

**Propriétés initialisées:**
- `this.gristApi` - Instance de l'API Grist
- `this.docApi` - API du document
- `this.allRecords` - Tous les enregistrements de la table
- `this.mappedColumns` - Mapping des colonnes
- `this.columnHelper` - Helper d'accès aux colonnes
- `this.perfManager` - Gestionnaire de performance
- `this.config` - Configuration du widget
- `this.isWidgetMode` - Mode widget vs standalone

### Méthodes à Override (Abstraites)

#### getExpectedColumns()

Déclare les colonnes attendues par le widget.

```javascript
getExpectedColumns(): Array<{name: string, optional: boolean, description?: string}>
```

**Returns:** Tableau de définitions de colonnes

**Example:**
```javascript
getExpectedColumns() {
  return [
    {
      name: 'title',
      optional: false,
      description: 'Titre de l\'élément'
    },
    {
      name: 'description',
      optional: true,
      description: 'Description optionnelle'
    }
  ];
}
```

#### getRequiredAccess()

Définit le niveau d'accès requis.

```javascript
getRequiredAccess(): string
```

**Returns:** `'read table'` ou `'full'`

**Example:**
```javascript
getRequiredAccess() {
  return 'read table';  // ou 'full' pour édition
}
```

#### initializeBusinessComponents()

Initialise les composants métier du widget (UI, bibliothèques tierces).

```javascript
async initializeBusinessComponents(): Promise<void>
```

**Example:**
```javascript
async initializeBusinessComponents() {
  this.container = document.getElementById('app');

  // Initialiser Leaflet
  this.map = L.map('map').setView([46.6, 2.0], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    .addTo(this.map);
}
```

#### onDataUpdate()

Appelé quand les données changent (nouveaux records).

```javascript
onDataUpdate(): void
```

**Example:**
```javascript
onDataUpdate() {
  this.render();
  this.updateStatistics();
}
```

#### onSelectionChange(record)

Appelé quand la sélection change dans Grist.

```javascript
onSelectionChange(record: any): void
```

**Parameters:**
- `record` - Enregistrement sélectionné

**Example:**
```javascript
onSelectionChange(record) {
  if (!record) return;

  this.highlightRecord(record.id);
  this.scrollToRecord(record.id);
}
```

#### onReady()

Appelé quand le widget est prêt (après initialisation complète).

```javascript
onReady(): void
```

**Example:**
```javascript
onReady() {
  console.log('Widget ready with', this.allRecords.length, 'records');
  this.showWelcomeMessage();
}
```

### Méthodes Utilitaires

#### init()

Lance le processus d'initialisation en 7 phases.

```javascript
async init(): Promise<void>
```

**Phases:**
1. Detection mode (widget vs standalone)
2. Initialize Grist API
3. Load configuration
4. Declare requirements
5. Setup event listeners
6. Load document metadata
7. Initialize business components

**Example:**
```javascript
const widget = new MyWidget();
widget.init().catch(error => {
  console.error('Erreur initialisation:', error);
});
```

#### showError(message)

Affiche un message d'erreur à l'utilisateur.

```javascript
showError(message: string): void
```

**Example:**
```javascript
try {
  await this.docApi.applyUserActions([...]);
} catch (error) {
  this.showError('Impossible de sauvegarder les modifications');
}
```

### Propriétés Publiques

| Propriété | Type | Description |
|-----------|------|-------------|
| `gristApi` | `GristAPI` | API Grist principale |
| `docApi` | `DocAPI` | API du document |
| `allRecords` | `Array<any>` | Tous les enregistrements |
| `mappedColumns` | `Object` | Mapping des colonnes |
| `columnHelper` | `ColumnHelper` | Helper d'accès colonnes |
| `perfManager` | `PerformanceManager` | Gestionnaire de performance |
| `config` | `Object` | Configuration widget |
| `isWidgetMode` | `boolean` | Mode widget ou standalone |

---

## ColumnHelper

Accès sécurisé aux colonnes mappées avec valeurs par défaut.

### Constructor

```javascript
constructor(mappedColumns: Object)
```

**Parameters:**
- `mappedColumns` - Objet de mapping des colonnes

### Méthodes

#### getValue(record, columnName, defaultValue)

Récupère la valeur d'une colonne de manière sécurisée.

```javascript
getValue(record: any, columnName: string, defaultValue?: any): any
```

**Parameters:**
- `record` - Enregistrement source
- `columnName` - Nom de la colonne attendue
- `defaultValue` - Valeur par défaut si absent

**Returns:** Valeur de la colonne ou defaultValue

**Example:**
```javascript
const title = this.columnHelper.getValue(record, 'title', 'Sans titre');
const score = this.columnHelper.getValue(record, 'score', 0);
const tags = this.columnHelper.getValue(record, 'tags', []);
```

#### hasColumn(columnName)

Vérifie si une colonne existe dans le mapping.

```javascript
hasColumn(columnName: string): boolean
```

**Returns:** `true` si la colonne est mappée

**Example:**
```javascript
if (this.columnHelper.hasColumn('description')) {
  const desc = this.columnHelper.getValue(record, 'description');
  this.renderDescription(desc);
}
```

#### getFirstAvailable(record, columnNames, defaultValue)

Retourne la première valeur non vide parmi plusieurs colonnes.

```javascript
getFirstAvailable(record: any, columnNames: Array<string>, defaultValue?: any): any
```

**Parameters:**
- `record` - Enregistrement source
- `columnNames` - Tableau de noms de colonnes (priorité)
- `defaultValue` - Valeur par défaut

**Returns:** Première valeur trouvée ou defaultValue

**Example:**
```javascript
const name = this.columnHelper.getFirstAvailable(
  record,
  ['name', 'title', 'label'],
  'Sans nom'
);
```

#### getAllMapped(record)

Récupère toutes les valeurs mappées d'un enregistrement.

```javascript
getAllMapped(record: any): Object
```

**Returns:** Objet avec toutes les valeurs mappées

**Example:**
```javascript
const data = this.columnHelper.getAllMapped(record);
// { title: "...", description: "...", geometry: "..." }
```

#### validateRequiredColumns(requiredColumns)

Vérifie que toutes les colonnes requises sont mappées.

```javascript
validateRequiredColumns(requiredColumns: Array<string>): void
```

**Throws:** Erreur si une colonne requise manque

**Example:**
```javascript
try {
  this.columnHelper.validateRequiredColumns(['title', 'geometry']);
} catch (error) {
  this.showError(error.message);
}
```

---

## DataValidator

Validation des données et protection XSS.

### Méthodes Statiques

#### validate(value, type, options)

Valide une valeur selon son type.

```javascript
static validate(value: any, type: string, options?: Object): {valid: boolean, errors: Array<string>}
```

**Parameters:**
- `value` - Valeur à valider
- `type` - Type de validation (voir types supportés ci-dessous)
- `options` - Options spécifiques au type

**Returns:** `{valid: boolean, errors: Array<string>}`

**Types supportés:**

##### `'geometry'` - Géométrie WKT

```javascript
const result = DataValidator.validate(
  'POINT(2.3522 48.8566)',
  'geometry'
);
// { valid: true, errors: [] }
```

**Formats acceptés:** POINT, LINESTRING, POLYGON, MULTIPOINT, MULTILINESTRING, MULTIPOLYGON

##### `'email'` - Email

```javascript
const result = DataValidator.validate(
  'user@example.com',
  'email'
);
```

##### `'numeric'` - Numérique avec range

```javascript
const result = DataValidator.validate(
  75,
  'numeric',
  { min: 0, max: 100 }
);
```

**Options:**
- `min` - Minimum (optionnel)
- `max` - Maximum (optionnel)

##### `'choice'` - Choix dans enum

```javascript
const result = DataValidator.validate(
  'pending',
  'choice',
  { enum: ['pending', 'approved', 'rejected'] }
);
```

**Options:**
- `enum` - Tableau de valeurs autorisées

##### `'text'` - Texte avec longueur

```javascript
const result = DataValidator.validate(
  'Hello',
  'text',
  { minLength: 1, maxLength: 100 }
);
```

**Options:**
- `minLength` - Longueur minimum (optionnel)
- `maxLength` - Longueur maximum (optionnel)

##### `'url'` - URL

```javascript
const result = DataValidator.validate(
  'https://example.com',
  'url'
);
```

##### `'date'` - Date

```javascript
const result = DataValidator.validate(
  '2024-01-15',
  'date'
);
```

**Formats acceptés:** ISO 8601, timestamps

#### sanitizeHTML(text)

Échappe les caractères HTML pour prévenir XSS.

```javascript
static sanitizeHTML(text: string): string
```

**Returns:** Texte sécurisé

**Example:**
```javascript
const userInput = '<script>alert("XSS")</script>';
const safe = DataValidator.sanitizeHTML(userInput);
// '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

element.innerHTML = `<div>${safe}</div>`;
```

**Protection contre:**
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#039;`
- `&` → `&amp;`

---

## PerformanceManager

Optimisation des performances (cache, debounce, throttle, memoization).

### Constructor

```javascript
constructor()
```

### Méthodes

#### getCached(key, computeFn, ttl)

Cache le résultat d'une fonction avec TTL.

```javascript
getCached(key: string, computeFn: Function, ttl?: number): any
```

**Parameters:**
- `key` - Clé de cache unique
- `computeFn` - Fonction qui calcule la valeur
- `ttl` - Durée de vie en millisecondes (défaut: 60000 = 1 minute)

**Returns:** Valeur cachée ou nouvellement calculée

**Example:**
```javascript
const result = this.perfManager.getCached('stats-2024', () => {
  return this.calculateExpensiveStatistics();
}, 300000); // 5 minutes
```

#### memoize(fn)

Crée une version mémoïzée d'une fonction.

```javascript
memoize(fn: Function): Function
```

**Returns:** Fonction mémoïzée

**Example:**
```javascript
// Mémoïzer le parsing WKT
this.parseWKT = this.perfManager.memoize((wkt) => {
  return WKTParser.parse(wkt);
});

// Utilisation
const geom1 = this.parseWKT('POINT(2.3 48.8)');
const geom2 = this.parseWKT('POINT(2.3 48.8)'); // Retour immédiat (cache)
```

#### debounce(fn, delay)

Crée une version debouncée d'une fonction.

```javascript
debounce(fn: Function, delay: number): Function
```

**Parameters:**
- `fn` - Fonction à debouncer
- `delay` - Délai en millisecondes

**Returns:** Fonction debouncée

**Use case:** Inputs utilisateur, recherche

**Example:**
```javascript
this.handleSearch = this.perfManager.debounce((query) => {
  this.performSearch(query);
}, 500);

// Dans le HTML
searchInput.addEventListener('input', (e) => {
  this.handleSearch(e.target.value);
});
```

#### throttle(fn, limit)

Crée une version throttlée d'une fonction.

```javascript
throttle(fn: Function, limit: number): Function
```

**Parameters:**
- `fn` - Fonction à throttler
- `limit` - Intervalle minimum en millisecondes

**Returns:** Fonction throttlée

**Use case:** Scroll, resize, animations

**Example:**
```javascript
this.handleScroll = this.perfManager.throttle(() => {
  this.updateVisibleItems();
}, 100);

window.addEventListener('scroll', this.handleScroll);
```

#### clearCache()

Vide le cache complet.

```javascript
clearCache(): void
```

**Example:**
```javascript
// Lors d'une mise à jour majeure
onDataUpdate() {
  this.perfManager.clearCache();
  this.render();
}
```

---

## Grist API

Interface avec Grist (fournie par le plugin API).

### grist.ready()

Signale que le widget est prêt.

```javascript
grist.ready(options?: Object): Promise<void>
```

**Options:**
- `requiredAccess` - Niveau d'accès requis (`'read table'` ou `'full'`)
- `columns` - Déclaration des colonnes attendues
- `allowSelectBy` - Autoriser la sélection par le widget

**Example:**
```javascript
await grist.ready({
  requiredAccess: 'read table',
  columns: [
    { name: 'title', optional: false },
    { name: 'description', optional: true }
  ]
});
```

### grist.onRecords(callback)

Écoute les changements de données (tous les records).

```javascript
grist.onRecords(callback: (records: Array<any>, mappedColumns: Object) => void): void
```

**Example:**
```javascript
grist.onRecords((records, mappedColumns) => {
  this.allRecords = records;
  this.mappedColumns = mappedColumns;
  this.onDataUpdate();
});
```

### grist.onRecord(callback)

Écoute les changements de sélection (record courant).

```javascript
grist.onRecord(callback: (record: any, mappedColumns: Object) => void): void
```

**Example:**
```javascript
grist.onRecord((record, mappedColumns) => {
  if (record) {
    this.onSelectionChange(record);
  }
});
```

### grist.setCursorPos(position)

Change la position du curseur dans Grist.

```javascript
grist.setCursorPos(position: {rowId: number}): Promise<void>
```

**Example:**
```javascript
// Lors d'un clic sur élément
handleClick(recordId) {
  grist.setCursorPos({ rowId: recordId });
}
```

### grist.setSelectedRows(rowIds)

Sélectionne plusieurs lignes.

```javascript
grist.setSelectedRows(rowIds: Array<number>): Promise<void>
```

**Example:**
```javascript
grist.setSelectedRows([1, 2, 3]);
```

### grist.docApi.applyUserActions(actions)

Applique des actions utilisateur (édition de données).

```javascript
grist.docApi.applyUserActions(actions: Array<Array<any>>): Promise<void>
```

**Actions courantes:**

#### AddRecord

```javascript
await grist.docApi.applyUserActions([
  ['AddRecord', 'TableName', null, {
    column1: 'value1',
    column2: 'value2'
  }]
]);
```

#### UpdateRecord

```javascript
await grist.docApi.applyUserActions([
  ['UpdateRecord', 'TableName', recordId, {
    column1: 'new value'
  }]
]);
```

#### RemoveRecord

```javascript
await grist.docApi.applyUserActions([
  ['RemoveRecord', 'TableName', recordId]
]);
```

#### BulkUpdateRecord

```javascript
await grist.docApi.applyUserActions([
  ['BulkUpdateRecord', 'TableName', [id1, id2, id3], {
    column1: ['val1', 'val2', 'val3']
  }]
]);
```

### grist.docApi.fetchTable(tableId)

Récupère toutes les données d'une table.

```javascript
grist.docApi.fetchTable(tableId: string): Promise<{id: Array<number>, [column]: Array<any>}>
```

**Example:**
```javascript
const tableData = await grist.docApi.fetchTable('Documents');
// { id: [1,2,3], title: ['A','B','C'], content: [...] }
```

### grist.sectionApi.setSelectedRows(rowIds)

Sélectionne des lignes dans la section courante.

```javascript
grist.sectionApi.setSelectedRows(rowIds: Array<number>): Promise<void>
```

---

## Exemples Complets

### Widget avec Validation

```javascript
class ValidatedWidget extends GristWidgetBase {
  onDataUpdate() {
    this.allRecords.forEach(record => {
      const email = this.columnHelper.getValue(record, 'email');

      const validation = DataValidator.validate(email, 'email');
      if (!validation.valid) {
        console.warn(`Record ${record.id}: email invalide`);
        return;
      }

      this.renderRecord(record);
    });
  }

  renderRecord(record) {
    const name = this.columnHelper.getValue(record, 'name', 'Anonyme');
    const safeName = DataValidator.sanitizeHTML(name);

    this.container.innerHTML += `<div>${safeName}</div>`;
  }
}
```

### Widget avec Cache

```javascript
class CachedWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    // Mémoïzer fonction coûteuse
    this.parseGeometry = this.perfManager.memoize((wkt) => {
      return expensiveWKTParser(wkt);
    });
  }

  onDataUpdate() {
    const stats = this.perfManager.getCached('statistics', () => {
      return this.calculateStatistics();
    }, 60000); // Cache 1 minute

    this.displayStats(stats);
  }
}
```

### Widget avec Recherche Debouncée

```javascript
class SearchWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    this.searchInput = document.getElementById('search');

    this.handleSearch = this.perfManager.debounce((query) => {
      this.performSearch(query);
    }, 500);

    this.searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
  }

  performSearch(query) {
    const validation = DataValidator.validate(query, 'text', {
      minLength: 3,
      maxLength: 100
    });

    if (!validation.valid) return;

    const results = this.allRecords.filter(record => {
      const title = this.columnHelper.getValue(record, 'title', '');
      return title.toLowerCase().includes(query.toLowerCase());
    });

    this.displayResults(results);
  }
}
```

---

## Notes Importantes

### Sécurité

⚠️ **Toujours sanitizer les données avant affichage HTML**

```javascript
// ❌ MAUVAIS - Vulnérable XSS
element.innerHTML = `<div>${record.name}</div>`;

// ✅ BON - Protégé
const safeName = DataValidator.sanitizeHTML(record.name);
element.innerHTML = `<div>${safeName}</div>`;
```

### Performance

⚠️ **Éviter les calculs répétés**

```javascript
// ❌ MAUVAIS - Recalcule à chaque fois
onDataUpdate() {
  this.allRecords.forEach(record => {
    const result = this.expensiveCalculation(record);
  });
}

// ✅ BON - Cache
this.expensiveCalculation = this.perfManager.memoize((record) => {
  // ... calcul coûteux
});
```

### Accès aux Colonnes

⚠️ **Toujours utiliser ColumnHelper**

```javascript
// ❌ MAUVAIS - Peut crasher
const title = record.title;

// ✅ BON - Sécurisé avec défaut
const title = this.columnHelper.getValue(record, 'title', 'Sans titre');
```

---

## Ressources

- [Grist Plugin API](https://support.getgrist.com/code/modules/grist_plugin_api/)
- [Custom Widgets Guide](https://support.getgrist.com/widget-custom/)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Principes architecturaux
- [WIDGET_DEVELOPMENT_GUIDE.md](./WIDGET_DEVELOPMENT_GUIDE.md) - Guide pratique
