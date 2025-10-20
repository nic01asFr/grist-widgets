# Patterns VECTOR_SEARCH pour Widgets Grist

> Guide pratique pour développeurs de widgets : détecter et exploiter les différents patterns de recherche vectorielle configurés dans Grist

## 📋 Table des Matières

- [Introduction](#introduction)
- [Détection des Patterns](#détection-des-patterns)
- [Patterns par Niveau](#patterns-par-niveau)
- [Intégration Widget](#intégration-widget)
- [Exemples de Widgets](#exemples-de-widgets)
- [Best Practices](#best-practices)

---

## Introduction

### Qu'est-ce qu'un Pattern VECTOR_SEARCH ?

Les utilisateurs de Grist configurent la recherche vectorielle de différentes manières selon leurs besoins. Chaque configuration suit un **pattern** (niveau 0 à 10) qui détermine :

- Quelles colonnes contiennent les embeddings
- Comment les résultats sont calculés
- Quels paramètres sont utilisés (threshold, limit)
- S'il y a des conditions ou filtres

### Rôle du Widget

Le widget doit :

1. **Détecter** quel pattern est utilisé dans la table Grist
2. **Adapter** son interface en conséquence
3. **Exploiter** les résultats calculés par Grist
4. **Afficher** les données de manière pertinente

**Règle d'or** : Le widget **LIT** les résultats, il ne **CALCULE** pas les embeddings.

---

## Détection des Patterns

### Méthode générale de détection

```javascript
class VectorSearchWidget extends GristWidgetBase {
  detectPattern() {
    const helper = this.columnHelper;

    // Détecter colonnes Vector
    const vectorColumns = this.findColumnsByType('Vector');

    // Détecter colonnes Reference List (résultats de recherche)
    const refListColumns = this.findColumnsByType('Reference List');

    // Détecter colonnes Text (queries)
    const textColumns = this.findColumnsByType('Text');

    // Analyser la structure
    const pattern = this.analyzeStructure({
      vectorColumns,
      refListColumns,
      textColumns
    });

    return pattern;
  }

  findColumnsByType(type) {
    // Parcourir mappedColumns pour trouver colonnes d'un type
    return Object.entries(this.mappedColumns)
      .filter(([key, value]) => this.getColumnType(value) === type)
      .map(([key]) => key);
  }
}
```

### Indicateurs par Pattern

| Pattern | Indicateurs Colonnes | Détection |
|---------|---------------------|-----------|
| **N0** - Auto-embedding | Pas de colonne Vector custom | `vectorColumns.length === 0` |
| **N1** - Mono-champ | 1 colonne Vector | `vectorColumns.length === 1` |
| **N2** - Multi-champs | 1 colonne Vector | Même structure que N1 (différence dans formule) |
| **N3** - Enrichi | 1 colonne Vector | Même structure que N1 (différence dans formule) |
| **N4** - Filtrage | 1 colonne Vector + records avec `null` | `hasNullVectors === true` |
| **N5** - Conditionnel | 1 colonne Vector + records avec `null` | `hasNullVectors === true` |
| **N6** - Multi-facettes | 2+ colonnes Vector + colonne Choice | `vectorColumns.length >= 2` + Choice |
| **N7** - Auto-référence | 1 colonne Vector + Reference List même table | `refList.table === currentTable` |
| **N8** - Interface | Table séparée + colonnes query/results | Analyse structure table |
| **N9** - Avancé | 1 colonne Vector + logique complexe | Analyse formules (difficile) |
| **N10** - Pipeline | Colonnes en cascade | Analyse dépendances |

### Code de Détection Avancée

```javascript
analyzeStructure({ vectorColumns, refListColumns, textColumns }) {
  // Pattern N0 : Auto-embedding
  if (vectorColumns.length === 0 && refListColumns.length > 0) {
    return {
      level: 0,
      name: 'auto-embedding',
      description: 'Utilise l\'embedding automatique de Grist'
    };
  }

  // Pattern N6 : Multi-facettes
  if (vectorColumns.length >= 2) {
    const hasChoice = this.findColumnsByType('Choice').length > 0;
    return {
      level: 6,
      name: 'multi-facettes',
      description: 'Plusieurs modes de recherche disponibles',
      vectorColumns,
      hasChoice
    };
  }

  // Pattern N7 : Auto-référence
  if (vectorColumns.length === 1 && refListColumns.length > 0) {
    const refListCol = refListColumns[0];
    const refersToSameTable = this.checkSelfReference(refListCol);

    if (refersToSameTable) {
      return {
        level: 7,
        name: 'auto-reference',
        description: 'Recommandations/items similaires',
        vectorColumn: vectorColumns[0],
        resultsColumn: refListCol
      };
    }
  }

  // Pattern N4/N5 : Filtrage/Conditionnel
  if (vectorColumns.length === 1) {
    const hasNullVectors = this.checkNullVectors(vectorColumns[0]);

    if (hasNullVectors) {
      return {
        level: 4, // ou 5, difficile à distinguer
        name: 'filtered',
        description: 'Certains enregistrements sont exclus de la recherche',
        vectorColumn: vectorColumns[0]
      };
    }

    // Pattern N1/N2/N3 : Mono/Multi/Enrichi
    return {
      level: 1, // par défaut
      name: 'custom-embedding',
      description: 'Embedding personnalisé',
      vectorColumn: vectorColumns[0]
    };
  }

  // Pattern non identifié
  return {
    level: -1,
    name: 'unknown',
    description: 'Pattern non reconnu'
  };
}

checkNullVectors(vectorColumnName) {
  return this.allRecords.some(record => {
    const value = this.columnHelper.getValue(record, vectorColumnName);
    return value === null || value === undefined;
  });
}

checkSelfReference(refListColumnName) {
  // Vérifier si la Reference List pointe vers la même table
  // Nécessite metadata de la table (disponible via docApi)
  // Simplifié ici
  return true; // À implémenter selon métadonnées disponibles
}
```

---

## Patterns par Niveau

### Pattern N0 : Auto-embedding

**Caractéristiques** :
- Pas de colonne Vector personnalisée
- Grist génère automatiquement les embeddings
- Recherche dans tous les champs de la table

**Structure typique** :
```yaml
Table_Recherche:
  - query: Text
  - results: Reference List = VECTOR_SEARCH(Table_Source, $query)
```

**Widget adapté** : Search Interface

**Code Widget** :
```javascript
class AutoEmbeddingSearchWidget extends GristWidgetBase {
  getExpectedColumns() {
    return [
      { name: 'query', optional: false, description: 'Texte de recherche' },
      { name: 'results', optional: false, description: 'Résultats' }
    ];
  }

  onDataUpdate() {
    const query = this.columnHelper.getValue(this.currentRecord, 'query', '');
    const results = this.columnHelper.getValue(this.currentRecord, 'results', []);

    this.displaySearchInterface(query, results);
  }

  displaySearchInterface(query, results) {
    this.container.innerHTML = `
      <div class="search-box">
        <input type="text" value="${query}" readonly />
        <span class="badge">${results.length} résultats</span>
      </div>
      <div class="results-list">
        ${this.renderResults(results)}
      </div>
    `;
  }

  renderResults(results) {
    return results.map(record => `
      <div class="result-item" data-id="${record.id}">
        ${this.renderRecordPreview(record)}
      </div>
    `).join('');
  }
}
```

---

### Pattern N1/N2/N3 : Custom Embedding (Mono/Multi/Enrichi)

**Caractéristiques** :
- 1 colonne Vector personnalisée
- Embedding sur champs spécifiques
- N1 : 1 champ, N2 : 2-5 champs, N3 : avec préfixes

**Structure typique** :
```yaml
Table_Source:
  - champ1, champ2, champ3: Text
  - custom_vector: Vector = CREATE_VECTOR($champ1, $champ2)
  - search_results: Reference List = VECTOR_SEARCH(Table_Source, $query, embedding_column="custom_vector")
```

**Widget adapté** : Generic Search ou Data Explorer

**Code Widget** :
```javascript
class CustomEmbeddingWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    // Détecter la colonne Vector
    this.vectorColumn = this.findColumnsByType('Vector')[0];

    // Détecter les champs source (analyse de formule - optionnel)
    this.sourceFields = this.detectSourceFields(this.vectorColumn);
  }

  detectSourceFields(vectorColumn) {
    // Analyser la formule CREATE_VECTOR si accessible
    // Sinon, heuristique basée sur les champs Text
    return this.findColumnsByType('Text');
  }

  onDataUpdate() {
    // Afficher les champs source + résultats
    this.allRecords.forEach(record => {
      const vector = this.columnHelper.getValue(record, this.vectorColumn);

      if (vector) {
        this.renderRecordWithEmbedding(record, vector);
      } else {
        this.renderExcludedRecord(record);
      }
    });
  }

  renderRecordWithEmbedding(record, vector) {
    const fields = this.sourceFields.map(field => {
      const value = this.columnHelper.getValue(record, field, '');
      return `<span class="field">${field}: ${value}</span>`;
    }).join(' ');

    return `
      <div class="record-card">
        ${fields}
        <span class="badge">✓ Indexé (${vector.length}D)</span>
      </div>
    `;
  }
}
```

---

### Pattern N4/N5 : Filtrage / Conditionnel

**Caractéristiques** :
- 1 colonne Vector avec valeurs `null` possibles
- N4 : Filtrage simple (`if condition else None`)
- N5 : Sélection conditionnelle (`if type == A else if type == B`)

**Structure typique** :
```yaml
Table_Products:
  - name, description: Text
  - stock, approved: Number/Bool
  - available_vector: Vector = CREATE_VECTOR($name, $description) if ($stock > 0 and $approved) else None
```

**Widget adapté** : Filtered Search avec indicateurs

**Code Widget** :
```javascript
class FilteredSearchWidget extends GristWidgetBase {
  onDataUpdate() {
    const vectorColumn = this.findColumnsByType('Vector')[0];

    // Séparer records indexés vs exclus
    const indexed = [];
    const excluded = [];

    this.allRecords.forEach(record => {
      const vector = this.columnHelper.getValue(record, vectorColumn);

      if (vector !== null && vector !== undefined) {
        indexed.push(record);
      } else {
        excluded.push(record);
      }
    });

    this.displayFilteredResults(indexed, excluded);
  }

  displayFilteredResults(indexed, excluded) {
    this.container.innerHTML = `
      <div class="stats">
        <div class="stat">
          <span class="count">${indexed.length}</span>
          <span class="label">Cherchables</span>
        </div>
        <div class="stat">
          <span class="count">${excluded.length}</span>
          <span class="label">Exclus</span>
        </div>
      </div>

      <div class="indexed-list">
        ${indexed.map(r => this.renderIndexedRecord(r)).join('')}
      </div>

      ${excluded.length > 0 ? `
        <details>
          <summary>Enregistrements exclus (${excluded.length})</summary>
          ${excluded.map(r => this.renderExcludedRecord(r)).join('')}
        </details>
      ` : ''}
    `;
  }

  renderIndexedRecord(record) {
    return `<div class="record indexed">✓ ${this.getRecordTitle(record)}</div>`;
  }

  renderExcludedRecord(record) {
    return `<div class="record excluded">⊘ ${this.getRecordTitle(record)}</div>`;
  }
}
```

---

### Pattern N6 : Multi-facettes

**Caractéristiques** :
- 2+ colonnes Vector (différents aspects)
- 1 colonne Choice (sélection du mode)
- 1 colonne Reference List avec formule conditionnelle

**Structure typique** :
```yaml
Table_Documents:
  - title, content, author, tags: Text
  - content_vector: Vector = CREATE_VECTOR($content)
  - metadata_vector: Vector = CREATE_VECTOR($author, $tags)

Table_Search:
  - query: Text
  - mode: Choice = ["content", "metadata"]
  - results: Reference List = VECTOR_SEARCH(Documents, $query, embedding_column=("content_vector" if $mode == "content" else "metadata_vector"))
```

**Widget adapté** : Multi-Mode Search Interface

**Code Widget** :
```javascript
class MultiFacetSearchWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    this.vectorColumns = this.findColumnsByType('Vector');
    this.modeColumn = this.findColumnsByType('Choice')[0];

    // Créer interface de sélection
    this.createModeSelector();
  }

  createModeSelector() {
    const modes = this.vectorColumns.map(col => ({
      id: col,
      label: this.humanizeColumnName(col)
    }));

    this.container.innerHTML = `
      <div class="mode-selector">
        ${modes.map(mode => `
          <button class="mode-btn" data-mode="${mode.id}">
            ${mode.label}
          </button>
        `).join('')}
      </div>
      <div class="search-container">
        <input type="text" id="query-input" placeholder="Rechercher...">
      </div>
      <div id="results-container"></div>
    `;

    // Event listeners
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleModeChange(e.target.dataset.mode);
      });
    });
  }

  handleModeChange(mode) {
    // Mettre à jour la colonne mode dans Grist
    this.gristApi.setCursorPos({ rowId: this.currentRecord.id });

    this.docApi.applyUserActions([
      ['UpdateRecord', this.currentTable, this.currentRecord.id, {
        [this.modeColumn]: mode
      }]
    ]).catch(error => {
      console.error('Erreur changement mode:', error);
    });
  }

  onDataUpdate() {
    const currentMode = this.columnHelper.getValue(this.currentRecord, this.modeColumn);
    const results = this.columnHelper.getValue(this.currentRecord, 'results', []);

    // Highlight mode actif
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });

    // Afficher résultats
    this.displayResults(results, currentMode);
  }

  displayResults(results, mode) {
    const container = this.container.querySelector('#results-container');

    container.innerHTML = `
      <div class="results-header">
        <span class="mode-badge">${mode}</span>
        <span class="count">${results.length} résultats</span>
      </div>
      ${results.map(r => this.renderResult(r, mode)).join('')}
    `;
  }

  humanizeColumnName(colName) {
    // content_vector → Content
    return colName.replace('_vector', '').replace('_', ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
```

---

### Pattern N7 : Auto-référence (Similaires)

**Caractéristiques** :
- 1 colonne Vector
- 1 colonne Reference List pointant vers la **même table**
- Formule utilise contenu de la ligne actuelle comme query

**Structure typique** :
```yaml
Table_Products:
  - name, description, category: Text
  - product_vector: Vector = CREATE_VECTOR($name, $description)
  - similar_products: Reference List = VECTOR_SEARCH(Products, $name + " " + $description, embedding_column="product_vector", threshold=0.80, limit=6)[1:]
```

**Widget adapté** : Recommendation Panel, Related Items

**Code Widget** :
```javascript
class SimilarItemsWidget extends GristWidgetBase {
  getExpectedColumns() {
    return [
      { name: 'name', optional: false },
      { name: 'similar_items', optional: false, description: 'Reference List vers même table' }
    ];
  }

  onSelectionChange(record) {
    if (!record) return;

    const itemName = this.columnHelper.getValue(record, 'name', 'Cet item');
    const similar = this.columnHelper.getValue(record, 'similar_items', []);

    this.displaySimilarItems(itemName, similar);
  }

  displaySimilarItems(currentName, similar) {
    this.container.innerHTML = `
      <div class="similar-panel">
        <h3>Items similaires à "${currentName}"</h3>

        ${similar.length > 0 ? `
          <div class="similar-list">
            ${similar.map((item, index) => this.renderSimilarItem(item, index)).join('')}
          </div>
        ` : `
          <p class="empty">Aucun item similaire trouvé</p>
        `}
      </div>
    `;

    // Click handlers
    this.container.querySelectorAll('.similar-item').forEach(el => {
      el.addEventListener('click', () => {
        this.gristApi.setCursorPos({ rowId: parseInt(el.dataset.id) });
      });
    });
  }

  renderSimilarItem(item, index) {
    const name = this.columnHelper.getValue(item, 'name', 'Sans nom');
    const description = this.columnHelper.getValue(item, 'description', '');

    return `
      <div class="similar-item" data-id="${item.id}">
        <span class="rank">#${index + 1}</span>
        <div class="item-content">
          <div class="item-name">${DataValidator.sanitizeHTML(name)}</div>
          <div class="item-desc">${DataValidator.sanitizeHTML(description.substring(0, 100))}...</div>
        </div>
      </div>
    `;
  }
}
```

---

### Pattern N8 : Interface Séparée

**Caractéristiques** :
- Table dédiée pour les recherches
- Colonnes : query (Text), results (Reference List)
- Optionnel : historique, paramètres (threshold, limit)

**Structure typique** :
```yaml
Table_Data:
  - fields: [...]
  - data_vector: Vector

Table_Search:
  - user_query: Text
  - search_mode: Choice
  - threshold: Number
  - limit: Number
  - results: Reference List = VECTOR_SEARCH(Table_Data, $user_query, embedding_column="data_vector", threshold=$threshold, limit=$limit)
  - search_date: DateTime
```

**Widget adapté** : Full Search Interface

**Code Widget** :
```javascript
class SearchInterfaceWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Rechercher...';

    // Debounce la recherche
    this.handleSearch = this.perfManager.debounce((query) => {
      this.performSearch(query);
    }, 500);

    this.searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    this.renderSearchInterface();
  }

  renderSearchInterface() {
    this.container.innerHTML = `
      <div class="search-interface">
        <div class="search-header">
          <div class="search-box"></div>
          <div class="search-controls">
            <label>
              Seuil de similarité:
              <input type="range" id="threshold-slider" min="0.5" max="1.0" step="0.05" value="0.75">
              <span id="threshold-value">0.75</span>
            </label>
            <label>
              Nombre de résultats:
              <input type="number" id="limit-input" min="1" max="100" value="20">
            </label>
          </div>
        </div>
        <div class="search-stats"></div>
        <div class="results-container"></div>
      </div>
    `;

    // Insérer l'input
    this.container.querySelector('.search-box').appendChild(this.searchInput);

    // Event listeners pour les contrôles
    this.setupControls();
  }

  setupControls() {
    const thresholdSlider = this.container.querySelector('#threshold-slider');
    const thresholdValue = this.container.querySelector('#threshold-value');
    const limitInput = this.container.querySelector('#limit-input');

    thresholdSlider.addEventListener('input', (e) => {
      thresholdValue.textContent = e.target.value;
      this.updateSearchParams({ threshold: parseFloat(e.target.value) });
    });

    limitInput.addEventListener('change', (e) => {
      this.updateSearchParams({ limit: parseInt(e.target.value) });
    });
  }

  async performSearch(query) {
    if (!query || query.length < 3) return;

    try {
      // Créer un nouvel enregistrement de recherche dans Grist
      await this.docApi.applyUserActions([
        ['AddRecord', 'Search', null, {
          user_query: query,
          search_date: new Date().toISOString()
        }]
      ]);

      this.showLoadingState();
    } catch (error) {
      console.error('Erreur recherche:', error);
      this.showErrorState(error.message);
    }
  }

  async updateSearchParams(params) {
    if (!this.currentRecord) return;

    await this.docApi.applyUserActions([
      ['UpdateRecord', this.currentTable, this.currentRecord.id, params]
    ]);
  }

  onDataUpdate() {
    const query = this.columnHelper.getValue(this.currentRecord, 'user_query', '');
    const results = this.columnHelper.getValue(this.currentRecord, 'results', []);
    const threshold = this.columnHelper.getValue(this.currentRecord, 'threshold', 0.75);
    const limit = this.columnHelper.getValue(this.currentRecord, 'limit', 20);

    // Synchroniser l'interface
    this.searchInput.value = query;
    this.container.querySelector('#threshold-slider').value = threshold;
    this.container.querySelector('#threshold-value').textContent = threshold;
    this.container.querySelector('#limit-input').value = limit;

    // Afficher résultats
    this.displaySearchResults(query, results);
  }

  displaySearchResults(query, results) {
    const statsContainer = this.container.querySelector('.search-stats');
    const resultsContainer = this.container.querySelector('.results-container');

    statsContainer.innerHTML = `
      <div class="stats-bar">
        <span class="query-display">Recherche: "${query}"</span>
        <span class="count-badge">${results.length} résultats</span>
      </div>
    `;

    resultsContainer.innerHTML = results.map((record, index) => {
      return this.renderSearchResult(record, index, query);
    }).join('');

    // Click handlers
    resultsContainer.querySelectorAll('.result-item').forEach(el => {
      el.addEventListener('click', () => {
        this.gristApi.setCursorPos({ rowId: parseInt(el.dataset.id) });
      });
    });
  }

  renderSearchResult(record, index, query) {
    // Récupérer les champs pertinents
    const title = this.columnHelper.getFirstAvailable(record, ['title', 'name', 'label'], 'Sans titre');
    const description = this.columnHelper.getFirstAvailable(record, ['description', 'content', 'summary'], '');

    return `
      <div class="result-item" data-id="${record.id}">
        <div class="result-rank">#${index + 1}</div>
        <div class="result-content">
          <div class="result-title">${DataValidator.sanitizeHTML(title)}</div>
          <div class="result-description">${DataValidator.sanitizeHTML(description.substring(0, 200))}...</div>
        </div>
      </div>
    `;
  }

  showLoadingState() {
    this.container.querySelector('.results-container').innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Recherche en cours...</p>
      </div>
    `;
  }

  showErrorState(message) {
    this.container.querySelector('.results-container').innerHTML = `
      <div class="error">
        <p>Erreur: ${DataValidator.sanitizeHTML(message)}</p>
      </div>
    `;
  }
}
```

---

### Pattern N9/N10 : Avancé / Pipeline

**Caractéristiques** :
- N9 : Logique conditionnelle complexe (badges, boost, priorités)
- N10 : Workflow multi-étapes avec cascade de recherches

**Structure N9** :
```yaml
Table_Items:
  - title, description: Text
  - priority: Choice
  - featured: Bool
  - enriched_vector: Vector = CREATE_VECTOR(("🔥 " if $priority == "high" else "") + ("⭐ " if $featured else "") + $title, $description)
```

**Structure N10** :
```yaml
Table_Reference:
  - content: Text
  - ref_vector: Vector

Table_Process:
  - input: Text
  - step1_results: Reference List = VECTOR_SEARCH(Table_Reference, $input)
  - extracted_category: Formula = $step1_results[0].category if len($step1_results) > 0 else "default"
  - step2_vector: Vector = CREATE_VECTOR($input, "Category: " + $extracted_category)
  - step2_results: Reference List = VECTOR_SEARCH(Table_Target, $input + " " + $extracted_category)
```

**Widget adapté** : Process Viewer, Pipeline Dashboard

**Code Widget (N10 - Pipeline)** :
```javascript
class PipelineWidget extends GristWidgetBase {
  onSelectionChange(record) {
    if (!record) return;

    // Visualiser le pipeline étape par étape
    const steps = this.extractPipelineSteps(record);
    this.displayPipeline(steps);
  }

  extractPipelineSteps(record) {
    return [
      {
        name: 'Input',
        data: this.columnHelper.getValue(record, 'input', ''),
        type: 'text'
      },
      {
        name: 'Step 1: Initial Search',
        data: this.columnHelper.getValue(record, 'step1_results', []),
        type: 'results'
      },
      {
        name: 'Extracted Category',
        data: this.columnHelper.getValue(record, 'extracted_category', ''),
        type: 'text'
      },
      {
        name: 'Step 2: Enriched Vector',
        data: this.columnHelper.getValue(record, 'step2_vector', null),
        type: 'vector'
      },
      {
        name: 'Step 2: Final Results',
        data: this.columnHelper.getValue(record, 'step2_results', []),
        type: 'results'
      }
    ];
  }

  displayPipeline(steps) {
    this.container.innerHTML = `
      <div class="pipeline">
        ${steps.map((step, index) => this.renderPipelineStep(step, index)).join('')}
      </div>
    `;
  }

  renderPipelineStep(step, index) {
    let content = '';

    switch(step.type) {
      case 'text':
        content = `<div class="step-text">${DataValidator.sanitizeHTML(step.data)}</div>`;
        break;
      case 'results':
        content = `<div class="step-results">${step.data.length} résultats</div>`;
        break;
      case 'vector':
        content = step.data ? `<div class="step-vector">Vector (${step.data.length}D)</div>` : '<div class="step-empty">-</div>';
        break;
    }

    return `
      <div class="pipeline-step">
        <div class="step-number">${index + 1}</div>
        <div class="step-content">
          <div class="step-name">${step.name}</div>
          ${content}
        </div>
        ${index < steps.length - 1 ? '<div class="step-arrow">→</div>' : ''}
      </div>
    `;
  }
}
```

---

## Intégration Widget

### Checklist d'Intégration

Pour intégrer la détection de patterns dans votre widget :

- [ ] **Phase 1 : Détection**
  - [ ] Implémenter `detectPattern()` dans `initializeBusinessComponents()`
  - [ ] Identifier les colonnes Vector, Reference List, Choice
  - [ ] Déterminer le niveau de pattern (0-10)

- [ ] **Phase 2 : Adaptation Interface**
  - [ ] Créer des variantes d'affichage selon le pattern
  - [ ] Ajouter des contrôles spécifiques (mode selector, threshold slider)
  - [ ] Adapter les événements utilisateur

- [ ] **Phase 3 : Exploitation Données**
  - [ ] Lire les résultats de VECTOR_SEARCH (Reference List)
  - [ ] Afficher les scores de similarité si disponibles
  - [ ] Gérer les cas de résultats vides

- [ ] **Phase 4 : Feedback Utilisateur**
  - [ ] Indiquer quel pattern est détecté
  - [ ] Afficher les statistiques (nb indexés/exclus)
  - [ ] Proposer des actions contextuelles

### Template Générique de Widget Vector-Aware

```javascript
class VectorAwareWidget extends GristWidgetBase {
  async initializeBusinessComponents() {
    // 1. Détecter le pattern
    this.pattern = this.detectPattern();

    console.log('Pattern détecté:', this.pattern);

    // 2. Adapter l'interface
    this.createInterfaceForPattern(this.pattern);
  }

  detectPattern() {
    const vectorColumns = this.findColumnsByType('Vector');
    const refListColumns = this.findColumnsByType('Reference List');
    const choiceColumns = this.findColumnsByType('Choice');

    return this.analyzeStructure({ vectorColumns, refListColumns, choiceColumns });
  }

  createInterfaceForPattern(pattern) {
    switch(pattern.level) {
      case 0:
        this.createAutoEmbeddingInterface();
        break;
      case 6:
        this.createMultiFacetInterface(pattern);
        break;
      case 7:
        this.createSimilarItemsInterface(pattern);
        break;
      case 8:
        this.createSearchInterface(pattern);
        break;
      default:
        this.createGenericInterface(pattern);
    }
  }

  onDataUpdate() {
    // Mise à jour selon le pattern
    if (this.pattern.level === 7) {
      this.updateSimilarItems();
    } else if (this.pattern.level === 8) {
      this.updateSearchResults();
    } else {
      this.updateGenericDisplay();
    }
  }

  // Helpers
  findColumnsByType(type) {
    // À implémenter selon métadonnées disponibles
    return [];
  }

  analyzeStructure({ vectorColumns, refListColumns, choiceColumns }) {
    // Logique de détection (voir section précédente)
    return { level: 0, name: 'auto-embedding' };
  }
}
```

---

## Exemples de Widgets

### Widget 1 : Vector Search Dashboard

**Pattern supportés** : Tous

**Fonctionnalités** :
- Détection automatique du pattern
- Affichage des statistiques d'indexation
- Visualisation des embeddings (PCA/t-SNE)
- Comparaison de modes (si multi-facettes)

```javascript
class VectorSearchDashboard extends GristWidgetBase {
  async initializeBusinessComponents() {
    this.pattern = this.detectPattern();

    this.container.innerHTML = `
      <div class="dashboard">
        <div class="dashboard-header">
          <h2>Vector Search Dashboard</h2>
          <span class="pattern-badge">Pattern N${this.pattern.level}</span>
        </div>

        <div class="stats-grid">
          <div class="stat-card" id="total-records"></div>
          <div class="stat-card" id="indexed-records"></div>
          <div class="stat-card" id="excluded-records"></div>
          <div class="stat-card" id="vector-dimensions"></div>
        </div>

        <div class="pattern-info" id="pattern-details"></div>

        <div class="data-viewer" id="data-container"></div>
      </div>
    `;
  }

  onDataUpdate() {
    this.updateStatistics();
    this.displayPatternInfo();
    this.renderDataView();
  }

  updateStatistics() {
    const totalRecords = this.allRecords.length;
    const vectorColumns = this.findColumnsByType('Vector');

    let indexedCount = 0;
    let dimensions = 0;

    if (vectorColumns.length > 0) {
      const vectorCol = vectorColumns[0];
      indexedCount = this.allRecords.filter(r => {
        const vec = this.columnHelper.getValue(r, vectorCol);
        return vec !== null && vec !== undefined;
      }).length;

      const firstVector = this.allRecords.find(r =>
        this.columnHelper.getValue(r, vectorCol) !== null
      );

      if (firstVector) {
        const vec = this.columnHelper.getValue(firstVector, vectorCol);
        dimensions = vec ? vec.length : 0;
      }
    }

    document.getElementById('total-records').innerHTML = `
      <div class="stat-value">${totalRecords}</div>
      <div class="stat-label">Total Records</div>
    `;

    document.getElementById('indexed-records').innerHTML = `
      <div class="stat-value">${indexedCount}</div>
      <div class="stat-label">Indexed</div>
    `;

    document.getElementById('excluded-records').innerHTML = `
      <div class="stat-value">${totalRecords - indexedCount}</div>
      <div class="stat-label">Excluded</div>
    `;

    document.getElementById('vector-dimensions').innerHTML = `
      <div class="stat-value">${dimensions}D</div>
      <div class="stat-label">Vector Size</div>
    `;
  }

  displayPatternInfo() {
    const patternDetails = document.getElementById('pattern-details');

    patternDetails.innerHTML = `
      <h3>${this.pattern.name}</h3>
      <p>${this.pattern.description}</p>
      ${this.renderPatternSpecificInfo()}
    `;
  }

  renderPatternSpecificInfo() {
    switch(this.pattern.level) {
      case 6:
        return `<p>Modes disponibles: ${this.pattern.vectorColumns.join(', ')}</p>`;
      case 7:
        return `<p>Auto-référence sur colonne: ${this.pattern.resultsColumn}</p>`;
      case 8:
        return `<p>Interface de recherche séparée détectée</p>`;
      default:
        return '';
    }
  }
}
```

### Widget 2 : Similar Items Panel

**Pattern supporté** : N7 (Auto-référence)

**Fonctionnalités** :
- Affichage des items similaires
- Score de similarité
- Navigation rapide

```javascript
// Voir code complet dans section Pattern N7
```

### Widget 3 : Search Interface

**Pattern supportés** : N0, N8

**Fonctionnalités** :
- Barre de recherche avec debounce
- Ajustement threshold/limit
- Historique de recherches
- Highlighting des termes

```javascript
// Voir code complet dans section Pattern N8
```

---

## Best Practices

### 1. Toujours détecter le pattern

Ne jamais supposer une structure fixe. Utilisez `detectPattern()` dans `initializeBusinessComponents()`.

```javascript
// ✅ BON
async initializeBusinessComponents() {
  this.pattern = this.detectPattern();
  this.adaptInterface(this.pattern);
}

// ❌ MAUVAIS
async initializeBusinessComponents() {
  // Suppose qu'il y a toujours une colonne "custom_vector"
  this.vectorColumn = 'custom_vector';
}
```

### 2. Gérer les cas de null/undefined

Les patterns N4/N5 peuvent avoir des embeddings null.

```javascript
// ✅ BON
const vector = this.columnHelper.getValue(record, vectorColumn);
if (vector !== null && vector !== undefined) {
  this.renderIndexed(record);
} else {
  this.renderExcluded(record);
}

// ❌ MAUVAIS
const vector = this.columnHelper.getValue(record, vectorColumn);
this.renderIndexed(record); // Crash si null
```

### 3. Utiliser ColumnHelper

Accès sécurisé aux colonnes avec fallback.

```javascript
// ✅ BON
const title = this.columnHelper.getFirstAvailable(
  record,
  ['title', 'name', 'label'],
  'Sans titre'
);

// ❌ MAUVAIS
const title = record.title || record.name || record.label || 'Sans titre';
```

### 4. Sanitizer les affichages

Protection XSS systématique.

```javascript
// ✅ BON
element.innerHTML = `<div>${DataValidator.sanitizeHTML(userInput)}</div>`;

// ❌ MAUVAIS
element.innerHTML = `<div>${userInput}</div>`;
```

### 5. Debouncer les recherches

Éviter les requêtes trop fréquentes.

```javascript
// ✅ BON
this.handleSearch = this.perfManager.debounce((query) => {
  this.performSearch(query);
}, 500);

// ❌ MAUVAIS
searchInput.addEventListener('input', (e) => {
  this.performSearch(e.target.value); // Trop de requêtes
});
```

### 6. Afficher les statistiques

Donner du contexte à l'utilisateur.

```javascript
// ✅ BON
this.container.innerHTML = `
  <div class="stats">
    <span>${results.length} résultats</span>
    <span>Seuil: ${threshold}</span>
  </div>
`;

// ❌ MAUVAIS
this.container.innerHTML = results.map(...).join('');
```

### 7. Gérer les états UI

Loading, Empty, Error.

```javascript
// ✅ BON
render() {
  if (this.isLoading) return this.renderLoading();
  if (results.length === 0) return this.renderEmpty();
  if (this.error) return this.renderError();
  return this.renderSuccess();
}
```

### 8. Documenter le pattern attendu

Dans le README du widget.

```markdown
## Pattern supportés

- **N0** - Auto-embedding : Recherche générale
- **N7** - Auto-référence : Items similaires
- **N8** - Interface : Moteur de recherche

## Configuration Grist requise

Pour utiliser ce widget en mode N7, créez :
- Colonne `item_vector` (Vector) = `CREATE_VECTOR($name, $description)`
- Colonne `similar_items` (Reference List) = `VECTOR_SEARCH(...)`
```

---

## Ressources

- [WIDGET_DEVELOPMENT_GUIDE.md](./WIDGET_DEVELOPMENT_GUIDE.md) - Guide pratique widget
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Principes architecturaux
- [API_REFERENCE.md](./API_REFERENCE.md) - Référence API complète
- [README-ENHANCED.md](/root/docker/Grist/README-ENHANCED.md) - Documentation fonctions vectorielles Grist

---

**Ce guide permet aux développeurs de widgets de détecter et exploiter intelligemment les différents patterns de recherche vectorielle configurés par les utilisateurs dans Grist.**
