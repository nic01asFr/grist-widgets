# Patterns d'Échange de Données entre Widgets

Ce document explore l'utilisation de l'architecture de synchronisation pour l'échange de **données** (pas seulement de paramètres de vue) entre widgets Grist.

## Différence fondamentale

| Aspect | Sync de Vue | Échange de Données |
|--------|-------------|-------------------|
| **Quoi** | Paramètres de visualisation | Données métier |
| **Exemples** | Position caméra, zoom, filtres | Records, sélections, résultats de calcul |
| **Fréquence** | Temps réel (30fps) | Sur événement (clic, validation) |
| **Volume** | Léger (quelques floats) | Variable (1 record → milliers) |
| **Persistance** | Optionnelle | Souvent requise |

---

## 1. Sélection → Détail (Linked Views)

### Principe
Sélectionner un enregistrement dans une vue affiche ses détails/relations dans d'autres vues.

```
┌─────────────────────┐     ┌─────────────────────────────────┐
│ Liste Clients       │     │ Détail Client                   │
│ (master)            │────▶│ (slave)                         │
│                     │     │                                 │
│ > ACME Corp ●       │     │ ACME Corp                       │
│   Globex Inc        │     │ CA: 1.2M€  Contacts: 5          │
│   Initech           │     │ Dernière commande: 15/01/2024   │
└─────────────────────┘     └─────────────────────────────────┘
         │
         │     ┌─────────────────────────────────┐
         └────▶│ Commandes du Client             │
               │ (slave)                         │
               │                                 │
               │ CMD-001  15/01  12,500€  ✓     │
               │ CMD-002  22/01   8,300€  ⏳    │
               └─────────────────────────────────┘
```

### Implémentation

```javascript
// Données échangées
interface SelectionData {
    tableId: string;      // Table source
    rowId: number;        // ID de l'enregistrement
    record?: object;      // Données complètes (optionnel)
}

// Master (Liste)
sync.register('selection', {
    get: () => ({
        tableId: 'Clients',
        rowId: state.selectedRowId,
        record: state.selectedRecord
    }),
    set: null,  // Master n'accepte pas les updates externes
    persistent: true
});

// Slave (Détail)
sync.register('selection', {
    get: () => state.currentSelection,
    set: async (selection) => {
        // Option 1: Utiliser le record embarqué
        if (selection.record) {
            displayDetail(selection.record);
        }
        // Option 2: Charger depuis Grist
        else {
            const record = await grist.docApi.fetchTable(selection.tableId, {
                filters: { id: selection.rowId }
            });
            displayDetail(record[0]);
        }
        // Charger les données liées
        await loadRelatedOrders(selection.rowId);
    }
});
```

### Cas d'usage concrets

| Master | Slaves | Données échangées |
|--------|--------|-------------------|
| Liste de projets | Tâches, Budget, Équipe | `projectId` |
| Carte des sites | Fiche site, Historique | `siteId`, `coordinates` |
| Timeline événements | Détail événement, Participants | `eventId` |
| Arbre de catégories | Produits de la catégorie | `categoryPath` |

---

## 2. Drill-Down Hiérarchique

### Principe
Navigation dans une hiérarchie de données, chaque niveau affectant les niveaux inférieurs.

```
Niveau 1          Niveau 2           Niveau 3           Niveau 4
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ Régions   │───▶│ Départmts │───▶│ Communes  │───▶│ Parcelles │
│           │    │           │    │           │    │           │
│ > IDF     │    │ > 75      │    │ > Paris 1 │    │ AB-0012   │
│   PACA    │    │   77      │    │   Paris 2 │    │ AB-0013   │
│   ARA     │    │   78      │    │           │    │           │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
```

### Implémentation

```javascript
// Chemin de drill-down
interface DrillPath {
    levels: string[];      // ['region', 'departement', 'commune', 'parcelle']
    values: any[];         // ['IDF', '75', 'Paris 1', null]
    currentLevel: number;  // 2 (commune sélectionnée)
}

// Widget niveau N
sync.register('drillPath', {
    get: () => state.drillPath,
    set: (path) => {
        // Filtrer les données selon le chemin
        const myLevel = config.get('level');  // Ex: 2 pour communes

        if (path.currentLevel >= myLevel - 1) {
            // Le niveau parent a une sélection
            const parentFilter = path.values[myLevel - 1];
            filterData(parentFilter);
        }

        if (path.currentLevel > myLevel) {
            // Un niveau enfant est sélectionné, highlight
            highlightItem(path.values[myLevel]);
        }
    }
});

// Au clic sur un item
onItemClick(item) {
    const path = sync.getValue('drillPath');
    path.values[myLevel] = item.id;
    path.currentLevel = myLevel;
    // Effacer les niveaux enfants
    for (let i = myLevel + 1; i < path.levels.length; i++) {
        path.values[i] = null;
    }
    sync.emit('drillPath');
}
```

### Variante : Breadcrumb partagé

```javascript
// Un widget breadcrumb affiche et permet de naviguer dans le chemin
sync.register('drillPath', {
    get: () => state.drillPath,
    set: (path) => renderBreadcrumb(path),
    // Le breadcrumb peut aussi émettre (clic pour remonter)
});
```

---

## 3. Pipeline de Données

### Principe
La sortie d'un widget devient l'entrée d'un autre (workflow de traitement).

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Import    │───▶│  Transform  │───▶│   Validate  │───▶│   Export    │
│             │    │             │    │             │    │             │
│ CSV → JSON  │    │ Nettoyage   │    │ Contrôles   │    │ → Grist     │
│             │    │ Enrichissmt │    │ Corrections │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                  │                  │                  │
     └──────────────────┴──────────────────┴──────────────────┘
                    Données transformées progressivement
```

### Implémentation

```javascript
// Structure de données du pipeline
interface PipelineData {
    stage: string;           // 'import' | 'transform' | 'validate' | 'export'
    records: object[];       // Données en cours de traitement
    errors: object[];        // Erreurs rencontrées
    stats: {
        total: number;
        processed: number;
        valid: number;
        invalid: number;
    };
}

// Widget Transform
sync.register('pipelineData', {
    get: () => state.outputData,
    set: async (input) => {
        if (input.stage === 'import') {
            // Recevoir les données de l'étape précédente
            state.inputData = input;

            // Traiter
            const transformed = await processTransformations(input.records);

            // Préparer la sortie
            state.outputData = {
                stage: 'transform',
                records: transformed.records,
                errors: [...input.errors, ...transformed.errors],
                stats: updateStats(input.stats, transformed)
            };

            // Émettre vers l'étape suivante
            sync.emit('pipelineData');
        }
    }
});
```

### Cas d'usage concrets

| Pipeline | Étapes | Données |
|----------|--------|---------|
| Import géo | Upload → Parse → Validate → Geocode → Save | Features GeoJSON |
| ETL | Extract → Transform → Load → Verify | Records métier |
| Workflow doc | Draft → Review → Approve → Publish | Documents |
| Analyse | Query → Filter → Aggregate → Visualize | Résultats |

---

## 4. Agrégation Multi-Niveaux

### Principe
Même données vues à différents niveaux d'agrégation, synchronisées.

```
┌─────────────────────────────────────────────────────────────┐
│                     Vue Détail (master)                      │
│  Transaction par transaction                                 │
│  ┌────────┬────────┬─────────┬────────┐                     │
│  │ Date   │ Client │ Produit │ Montant│                     │
│  ├────────┼────────┼─────────┼────────┤                     │
│  │ 15/01  │ ACME   │ Prod A  │  1,200 │ ← sélectionné      │
│  │ 15/01  │ ACME   │ Prod B  │    800 │                     │
│  │ 16/01  │ Globex │ Prod A  │  2,100 │                     │
└──┴────────┴────────┴─────────┴────────┴─────────────────────┘
         │
         ▼
┌─────────────────────┐    ┌─────────────────────┐
│ Agrégat Client      │    │ Agrégat Produit     │
│ (slave)             │    │ (slave)             │
│                     │    │                     │
│ ACME     ████ 2,000 │◀──│ Prod A   ████ 3,300 │
│ Globex   ██   2,100 │    │ Prod B   █     800 │
└─────────────────────┘    └─────────────────────┘
        Highlight ACME            Highlight Prod A
```

### Implémentation

```javascript
// Données de contexte
interface AggregationContext {
    selectedRecords: number[];    // IDs des lignes sélectionnées
    groupByFields: string[];      // Champs de regroupement actifs
    highlightValues: {            // Valeurs à mettre en évidence
        [field: string]: any[];
    };
    dateRange?: { start: Date, end: Date };
}

// Widget Agrégat
sync.register('aggregationContext', {
    get: () => state.context,
    set: (context) => {
        // Extraire les valeurs à highlight pour mon champ de groupement
        const myGroupField = config.get('groupBy');  // Ex: 'client'

        if (context.highlightValues[myGroupField]) {
            highlightBars(context.highlightValues[myGroupField]);
        }

        // Recalculer si la période change
        if (context.dateRange) {
            recalculateAggregates(context.dateRange);
        }
    }
});

// Quand une sélection change dans le détail
onSelectionChange(selectedRows) {
    const context = {
        selectedRecords: selectedRows.map(r => r.id),
        highlightValues: {
            client: [...new Set(selectedRows.map(r => r.client))],
            produit: [...new Set(selectedRows.map(r => r.produit))]
        }
    };
    sync.emit('aggregationContext');
}
```

---

## 5. Formulaire → Résultat

### Principe
Les données saisies dans un formulaire génèrent un résultat dans un autre widget.

```
┌─────────────────────────┐    ┌─────────────────────────────────┐
│ Simulateur (master)     │    │ Résultat (slave)                │
│                         │    │                                 │
│ Montant: [100,000 €]    │    │ ┌─────────────────────────────┐│
│ Durée:   [20 ans    ▼]  │───▶│ │ Mensualité: 527,84 €       ││
│ Taux:    [3.5%      ]   │    │ │ Coût total: 126,681 €      ││
│                         │    │ │ Intérêts:    26,681 €      ││
│ [Calculer]              │    │ └─────────────────────────────┘│
│                         │    │                                 │
│                         │    │ 📊 Tableau d'amortissement     │
└─────────────────────────┘    └─────────────────────────────────┘
```

### Implémentation

```javascript
// Données du formulaire
interface FormData {
    values: Record<string, any>;   // Valeurs saisies
    valid: boolean;                // Formulaire valide?
    errors: Record<string, string>; // Erreurs de validation
    submitted: boolean;            // Bouton cliqué?
    timestamp: number;             // Pour détecter les changements
}

// Widget Formulaire (master)
sync.register('formData', {
    get: () => ({
        values: state.formValues,
        valid: state.isValid,
        errors: state.validationErrors,
        submitted: state.submitted,
        timestamp: Date.now()
    }),
    persistent: true  // Sauvegarder les dernières valeurs
});

// Widget Résultat (slave)
sync.register('formData', {
    set: (form) => {
        if (!form.valid) {
            showValidationErrors(form.errors);
            return;
        }

        // Calculer le résultat
        const result = calculateLoan(form.values);
        displayResult(result);

        // Générer le tableau d'amortissement
        if (form.submitted) {
            generateAmortizationTable(form.values, result);
        }
    }
});
```

### Mode temps réel vs soumission

```javascript
// Config: mise à jour en temps réel ou sur soumission
config.define('updateMode', {
    type: 'string',
    default: 'realtime',  // 'realtime' | 'submit'
    sources: ['url', 'options']
});

// Slave adapte son comportement
sync.register('formData', {
    set: (form) => {
        const mode = config.get('updateMode');

        if (mode === 'realtime') {
            // Toujours recalculer
            calculateAndDisplay(form.values);
        } else {
            // Attendre la soumission
            if (form.submitted) {
                calculateAndDisplay(form.values);
            }
        }
    }
});
```

---

## 6. Recherche Distribuée

### Principe
Une requête de recherche est exécutée sur plusieurs sources, les résultats sont agrégés.

```
┌─────────────────────────────────────────────────────────────┐
│                    Barre de recherche (master)               │
│  🔍 [acme corporation                              ] [🔎]   │
└─────────────────────────────────────────────────────────────┘
         │
         ├────────────────┬────────────────┬────────────────┐
         ▼                ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Clients     │  │ Contacts    │  │ Documents   │  │ Historique  │
│ (slave)     │  │ (slave)     │  │ (slave)     │  │ (slave)     │
│             │  │             │  │             │  │             │
│ ACME Corp ✓ │  │ John@acme   │  │ Contrat.pdf │  │ 15/01 Appel │
│ ACME Ltd    │  │ Jane@acme   │  │ Devis.xlsx  │  │ 12/01 Email │
│ 2 résultats │  │ 2 résultats │  │ 2 résultats │  │ 5 résultats │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
         │                │                │                │
         └────────────────┴────────────────┴────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────┐
                    │ Résultats combinés: 11 total    │
                    │ Triés par pertinence            │
                    └─────────────────────────────────┘
```

### Implémentation

```javascript
// Requête de recherche
interface SearchQuery {
    text: string;
    filters?: object;
    timestamp: number;
}

// Résultats de recherche
interface SearchResults {
    source: string;        // 'clients' | 'contacts' | etc.
    query: string;         // Requête originale
    results: object[];     // Résultats
    count: number;
    searchTime: number;    // Temps de recherche (ms)
}

// Widget Recherche (master) - émet la requête
sync.register('searchQuery', {
    get: () => state.query,
    persistent: false  // Pas besoin de persister les recherches
});

// Widgets Sources (slaves) - répondent avec leurs résultats
sync.register('searchQuery', {
    set: async (query) => {
        const mySource = config.get('source');  // Ex: 'clients'

        // Rechercher dans ma source
        const results = await searchInSource(mySource, query.text);

        // Publier mes résultats
        state.results = {
            source: mySource,
            query: query.text,
            results: results,
            count: results.length,
            searchTime: Date.now() - query.timestamp
        };
        sync.emit('searchResults');
    }
});

// Widget Agrégateur (collecte tous les résultats)
sync.register('searchResults', {
    set: (result) => {
        // Ajouter/mettre à jour les résultats de cette source
        state.allResults[result.source] = result;

        // Rafraîchir l'affichage combiné
        displayCombinedResults(Object.values(state.allResults));
    }
});
```

---

## 7. État de Workflow

### Principe
Plusieurs widgets représentent les étapes d'un processus, l'état avance entre eux.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Création   │───▶│  Validation │───▶│ Approbation │───▶│ Publication │
│             │    │             │    │             │    │             │
│ ✓ Terminé   │    │ ● En cours  │    │ ○ À venir   │    │ ○ À venir   │
│             │    │             │    │             │    │             │
│ [Détails]   │    │ [Valider]   │    │ [Approuver] │    │ [Publier]   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Implémentation

```javascript
// État du workflow
interface WorkflowState {
    entityId: number;          // ID du document/dossier
    entityType: string;        // Type d'entité
    currentStep: string;       // Étape actuelle
    history: {                 // Historique
        step: string;
        user: string;
        date: Date;
        action: string;
        comment?: string;
    }[];
    data: object;              // Données métier
}

// Chaque widget d'étape
const myStep = config.get('step');  // Ex: 'validation'

sync.register('workflowState', {
    get: () => state.workflow,
    set: (workflow) => {
        // Suis-je l'étape courante?
        const isCurrentStep = workflow.currentStep === myStep;

        if (isCurrentStep) {
            // Activer mon widget
            enableActions();
            loadEntityData(workflow.entityId, workflow.data);
        } else {
            // Désactiver mais montrer l'état
            disableActions();
            showStepStatus(workflow.history.find(h => h.step === myStep));
        }
    }
});

// Action de validation
async function validateStep(comment) {
    const workflow = sync.getValue('workflowState');

    // Ajouter à l'historique
    workflow.history.push({
        step: myStep,
        user: currentUser.id,
        date: new Date(),
        action: 'validated',
        comment
    });

    // Avancer à l'étape suivante
    workflow.currentStep = getNextStep(myStep);

    // Sauvegarder et propager
    await saveWorkflowState(workflow);
    sync.emit('workflowState');
}
```

---

## 8. Cache Distribué

### Principe
Un widget charge des données lourdes une fois, les autres les réutilisent.

```
┌─────────────────────────────────────────────────────────────┐
│                    Widget Principal (master)                 │
│                                                             │
│  📦 Données chargées: Référentiel IGN (2.3 MB)             │
│  ✓ 15,234 communes | ✓ 101 départements | ✓ 18 régions    │
│                                                             │
│  [Actualiser]                                               │
└─────────────────────────────────────────────────────────────┘
         │
         │  Broadcast: { type: 'cache', key: 'referentiel-geo', ... }
         │
         ├─────────────────────────────┬──────────────────────┐
         ▼                             ▼                      ▼
┌─────────────────┐         ┌─────────────────┐    ┌─────────────────┐
│ Carte           │         │ Formulaire      │    │ Stats           │
│ (slave)         │         │ (slave)         │    │ (slave)         │
│                 │         │                 │    │                 │
│ Utilise le      │         │ Autocomplete    │    │ Agrégations     │
│ référentiel     │         │ communes        │    │ par région      │
│ pour affichage  │         │                 │    │                 │
└─────────────────┘         └─────────────────┘    └─────────────────┘
```

### Implémentation

```javascript
// Structure du cache partagé
interface SharedCache {
    key: string;           // Identifiant unique
    data: any;             // Données (ou null si demande)
    version: number;       // Version pour invalidation
    loadedAt: number;      // Timestamp de chargement
    source: string;        // ID du widget qui a chargé
}

// Widget qui charge les données (master ou premier à en avoir besoin)
sync.register('sharedCache', {
    get: () => state.cache,
    set: async (request) => {
        // Quelqu'un demande des données que j'ai?
        if (request.data === null && state.cache[request.key]) {
            // Je les ai, je les partage
            sync.emit('sharedCache');
        }
        // Quelqu'un partage des données?
        else if (request.data !== null) {
            // Les stocker localement
            state.cache[request.key] = request;
        }
    }
});

// Widget qui a besoin des données (slave)
async function getSharedData(key) {
    // Déjà en cache local?
    if (state.cache[key]) {
        return state.cache[key].data;
    }

    // Demander au réseau
    sync.setValue('sharedCache', { key, data: null, version: 0 });
    sync.emit('sharedCache');

    // Attendre la réponse (avec timeout)
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject('Timeout'), 5000);

        const unsubscribe = sync.onChange('sharedCache', (cache) => {
            if (cache.key === key && cache.data !== null) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(cache.data);
            }
        });
    });
}
```

---

## 9. Notifications Inter-Widgets

### Principe
Un widget émet des notifications que d'autres peuvent afficher/traiter.

```javascript
// Structure de notification
interface WidgetNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    source: string;        // Widget émetteur
    title: string;
    message: string;
    data?: any;            // Données associées
    actions?: {            // Actions possibles
        label: string;
        action: string;
    }[];
    timestamp: number;
    read: boolean;
}

// Widget émetteur
function notifyOthers(type, title, message, data) {
    const notification = {
        id: generateId(),
        type,
        source: widgetId,
        title,
        message,
        data,
        timestamp: Date.now(),
        read: false
    };

    state.notifications.push(notification);
    sync.emit('notifications');
}

// Widget récepteur (ex: centre de notifications)
sync.register('notifications', {
    set: (notifications) => {
        const newNotifs = notifications.filter(n =>
            !state.seenIds.has(n.id) && n.source !== widgetId
        );

        newNotifs.forEach(n => {
            state.seenIds.add(n.id);
            displayNotification(n);
        });
    }
});
```

---

## Tableau récapitulatif

| Pattern | Direction | Volume | Fréquence | Persistance |
|---------|-----------|--------|-----------|-------------|
| Sélection → Détail | Master → Slaves | 1 record | Sur clic | Oui |
| Drill-Down | Cascade | Path (léger) | Sur clic | Oui |
| Pipeline | Chaîné | Variable | Sur étape | Non |
| Agrégation | Bidirectionnel | Léger (IDs) | Sur sélection | Non |
| Form → Résultat | Master → Slave | 1 objet | Temps réel | Oui |
| Recherche | Fan-out/in | Variable | Sur requête | Non |
| Workflow | Tous | État complet | Sur action | Oui |
| Cache | Partagé | Lourd | 1 fois | Session |
| Notifications | Broadcast | Léger | Sur événement | Optionnel |

---

## Intégration avec Grist

### Liaison native Grist (sans sync custom)

Grist offre déjà des mécanismes de liaison entre vues :

```python
# Dans une table Grist, une colonne liée
Commandes = LOOKUPRECORDS(Commandes, client=$id)

# Le widget peut utiliser cette liaison
```

### Quand utiliser le sync custom vs Grist natif?

| Cas | Grist natif | Sync custom |
|-----|-------------|-------------|
| Liaison table → table | ✓ | |
| Filtrage par sélection | ✓ | |
| Calculs cross-table | ✓ | |
| Synchronisation vue 3D/carte | | ✓ |
| Pipeline de traitement | | ✓ |
| Cache partagé | | ✓ |
| Workflow multi-étapes | | ✓ |
| Notifications temps réel | | ✓ |

### Approche hybride

```javascript
// Utiliser les liaisons Grist ET le sync custom
async function onGristRecordSelect(record) {
    // Grist gère la liaison de données
    // Le sync gère le contexte de visualisation

    const context = {
        recordId: record.id,
        // Ajouter le contexte de visualisation
        highlight: true,
        panTo: true,
        zoomLevel: 'detail'
    };

    sync.setValue('viewContext', context);
    sync.emit('viewContext');
}
```

---

## Prochaines étapes

1. **Implémenter les patterns prioritaires** (Sélection, Drill-down, Form→Result)
2. **Créer des exemples concrets** avec smart-gis + territoire-3d
3. **Documenter les cas Grist natif vs sync**
4. **Tester les performances** avec volumes importants
