# Roadmap Smart GIS Widget
## Évolution du Geo-Semantic Map Widget vers Smart GIS

> Transformation progressive du widget géographique existant en système SIG intelligent avec gestion de projets cartographiques multi-sources

---

## 📊 État Actuel (v1.0)

### ✅ Fonctionnalités Existantes

**Core Cartographique :**
- ✅ Affichage WKT (Point, Line, Polygon + Multi-types)
- ✅ Leaflet + React-Leaflet
- ✅ Clustering automatique (MarkerClusterGroup)
- ✅ Zoom automatique sur données

**Édition :**
- ✅ Leaflet.pm intégré
- ✅ Création géométries (Point, Line, Polygon, Rectangle)
- ✅ Mode édition activable
- ✅ Sauvegarde dans Grist

**Interface :**
- ✅ Sidebar avec statistiques
- ✅ Liste des entités
- ✅ Filtrage rapide par texte
- ✅ Sélection bidirectionnelle (Grist ↔ Map)
- ✅ Highlight sélection
- ✅ Popups avec calculs (aire, longueur)

**Grist Integration :**
- ✅ API Grist (`onRecords`, `onRecord`, `setCursorPos`)
- ✅ Mapping colonnes
- ✅ `applyUserActions` pour création records

### ❌ Limitations Actuelles

1. **Pas de gestion multi-sources** - Une seule table = un seul type de données
2. **Pas d'import externe** - Données doivent être déjà dans Grist
3. **Pas de catalogues** - Impossible de charger IGN, OSM, etc.
4. **Pas de couches** - Toutes géométries mélangées
5. **Pas de styles personnalisés** - Styles hardcodés par type géométrie
6. **Pas de raster** - Uniquement vecteur
7. **Recherche sémantique incomplète** - UI prête mais non fonctionnelle

---

## 🎯 Vision Cible (v2.0 - Smart GIS)

### Paradigme

**1 Table Grist = 1 Projet Cartographique Multi-Sources**

Chaque ligne de la table = une entité géographique (vecteur ou raster) appartenant à une ou plusieurs couches logiques.

### Workflow Utilisateur

```
1. Ouvrir widget → Table projet par défaut créée
2. Importer données :
   a. Rechercher "bâtiments paris" dans catalogues
   b. Configurer bbox, filtres, limite
   c. Enregistrer → Insère dans table projet (layer: "Bâtiments")
3. Ajouter raster :
   a. Rechercher "orthophoto" dans catalogues
   b. Enregistrer → Insère tile layer (layer: "Fond")
4. Ajouter autres sources (routes, POI, etc.)
5. Éditer éléments (géométrie, style, attributs)
6. Sauvegarder projet → Renommer table → Nouvelle table créée
```

---

## 📅 Plan de Développement Progressif

### ✅ Phase 1 : Fondations Tables Système (COMPLÈTE - 2025-10-19)

**Objectif :** Créer infrastructure tables partagées ✅

#### Tâches

- [x] **1.1 - Auto-création tables système** ✅
  - `ensureSystemTables()` au `useEffect` initial
  - Vérifier existence : `GIS_Catalogs`, `GIS_Styles`, `GIS_Config`
  - Créer si manquantes via `docApi.applyUserActions`
  - Schéma :
    ```javascript
    GIS_Catalogs: [
      { id: 'source_type', type: 'Choice', choices: ['IGN', 'OSM', 'WFS', 'Custom'] },
      { id: 'title', type: 'Text' },
      { id: 'description', type: 'Text' },
      { id: 'keywords', type: 'Text' },
      { id: 'endpoint_url', type: 'Text' },
      { id: 'layer_name', type: 'Text' },
      { id: 'geometry_type', type: 'Choice', choices: ['Point', 'Line', 'Polygon'] },
      { id: 'catalog_vector', type: 'Vector' }
    ]

    GIS_Styles: [
      { id: 'style_name', type: 'Text' },
      { id: 'style_type', type: 'Choice', choices: ['Point', 'Line', 'Polygon'] },
      { id: 'style_config', type: 'Text' }, // JSON Leaflet style
      { id: 'is_system', type: 'Bool' }
    ]

    GIS_Config: [
      { id: 'config_key', type: 'Text' },
      { id: 'config_value', type: 'Text' },
      { id: 'config_type', type: 'Choice', choices: ['string', 'number', 'json', 'bool'] }
    ]
    ```

- [x] **1.2 - Initialiser catalogues pré-configurés** ✅
  - Insérer 5 datasets IGN (bâtiments, routes, communes, hydrographie, etc.)
  - Insérer 3 datasets OSM (buildings, roads, POIs)
  - Ajouter formules `CREATE_VECTOR` sur `catalog_vector`

- [x] **1.3 - Initialiser styles système** ✅
  - 5 styles prédéfinis (marker bleu, route orange, zone jaune, etc.)

**Livrables :**
- Fonction `setupSystemInfrastructure()` robuste
- Tables auto-créées au premier lancement
- Catalogues IGN/OSM prêts

---

### ✅ Phase 2 : Support Multi-Couches (COMPLÈTE - 2025-10-19)

**Objectif :** Table projet avec colonnes `layer_name`, `layer_type`, `z_index` ✅

#### Tâches

- [x] **2.1 - Détecter/créer table projet** ✅
  - `detectProjectTable()` : vérifier si table courante est projet (colonnes `layer_name`, `layer_type`)
  - Si non : `createDefaultProjectTable()` avec toutes colonnes nécessaires
  - Schéma table projet :
    ```javascript
    Project_Table: [
      { id: 'layer_name', type: 'Text' },
      { id: 'layer_type', type: 'Choice', choices: ['vector', 'raster', 'wms'] },
      { id: 'source_catalog', type: 'Ref:GIS_Catalogs' },
      { id: 'geometry', type: 'Geometry' },
      { id: 'raster_url', type: 'Text' },
      { id: 'bbox', type: 'Text' },
      { id: 'properties', type: 'Text' }, // JSON
      { id: 'nom', type: 'Text' },
      { id: 'type', type: 'Text' },
      { id: 'style_config', type: 'Text' },
      { id: 'z_index', type: 'Int' },
      { id: 'is_visible', type: 'Bool' },
      { id: 'import_session', type: 'Int' },
      { id: 'element_vector', type: 'Vector' }
    ]
    ```

- [x] **2.2 - Adapter affichage multi-couches** ✅
  - Fonction `groupByLayer(records)` : regrouper par `layer_name`
  - Fonction `sortByZIndex(layers)` : trier par `z_index`
  - Afficher chaque couche dans ordre correct
  - Gérer visibilité (`is_visible`)

- [x] **2.3 - Layer Manager dans sidebar** ✅
  - Liste des couches (unique `layer_name`)
  - Toggle visibility par couche
  - Contrôle z-index (up/down)
  - Suppression couche (tous records de cette couche)

**Livrables :**
- Table projet auto-configurante
- Affichage multi-couches fonctionnel
- Layer manager UI

---

### ✅ Phase 3 : Import Wizard - Vecteur (COMPLÈTE - 2025-10-19)

**Objectif :** Importer données IGN/OSM dans table projet ✅

#### Tâches

- [x] **3.1 - UI recherche catalogue** ✅
  - Nouveau panneau sidebar "📥 Import"
  - Champ recherche avec debounce
  - Fonction `searchCatalogs(query)` : recherche dans `GIS_Catalogs`
  - Affichage résultats avec badges (IGN, OSM, type géométrie)
  - Bouton "Sélectionner" → ouvre éditeur requête

- [x] **3.2 - Éditeur de requête** ✅
  - UI pour :
    - Limite features (input number) ✅
    - Zone géographique (bbox par défaut) ✅
  - Bouton "Prévisualiser" → `handlePreview()` ✅

- [x] **3.3 - Preview import** ✅
  - Fetch depuis API réelle ✅
  - Affichage liste features ✅
  - Count réel ✅
  - Validation ✅

- [x] **3.4 - Services API externes** ✅
  - `IGNService` complet ✅
    - WFS 2.0.0 Géoplateforme ✅
    - queryBatiments, queryRoutes, queryCommunes, queryHydrographie ✅
    - BBOX, COUNT, CQL_FILTER support ✅
    - Parser GeoJSON natif ✅
  - `OSMService` complet ✅
    - Overpass API avec Overpass QL ✅
    - queryBuildings, queryRoads, queryPOIs ✅
    - Conversion OSM JSON → GeoJSON ✅
    - Timeout 25s ✅

- [x] **3.5 - Insertion données** ✅
  - `handleImport()` avec BulkAddRecord ✅
  - Conversion GeoJSON → WKT (featureToWKT) ✅
  - Génération layer_name automatique ✅
  - Incrémentation import_session ✅

- [x] **3.6 - Gestion sessions import** ✅
  - Auto-increment import_session ✅
  - Chaque import = session unique
  - z_index = session * 10 (imports successifs au-dessus)

**Livrables :**
- Import wizard complet
- Fetch IGN fonctionnel
- Fetch OSM fonctionnel
- Insertion batch optimisée

---

### ✅ Phase 4 : Import Raster (COMPLÈTE - 2025-10-19)

**Objectif :** Support couches raster (WMS, WMTS, XYZ tiles) ✅

#### Tâches

- [x] **4.1 - Catalogues raster** ✅
  - Ajouter datasets raster dans `GIS_Catalogs` :
    - IGN Orthophotographie ✅
    - IGN Plan IGN ✅
    - OSM Standard ✅
    - Stamen Terrain ✅
    - CartoDB Positron ✅
  - `layer_type = "raster"` ✅

- [x] **4.2 - UI import raster** ✅
  - Workflow simplifié dans ImportWizard ✅
  - Détection automatique raster ✅
  - Preview simplifié ✅

- [x] **4.3 - Insertion raster** ✅
  - Insérer 1 seule ligne via AddRecord ✅
  - `layer_type = "raster"` ✅
  - `raster_url` depuis catalog.endpoint_url ✅
  - `z_index = 0` (fond de carte) ✅

- [x] **4.4 - Rendu raster** ✅
  - RasterLayers component ✅
  - `L.tileLayer()` automatique ✅
  - Gérer visibilité via layerVisibility ✅
  - Gérer z-index ✅

**Livrables :**
- Support raster complet
- IGN Orthophoto intégré
- Rendu performant

---

### ✅ Phase 5 : Styles Personnalisés (COMPLÈTE - 2025-10-19)

**Objectif :** Styles par couche et par élément ✅

#### Tâches

- [x] **5.1 - Style editor UI** ✅
  - StyleEditor.js modal créé (545 lignes)
  - Prévisualisation temps réel
  - Pour Point :
    - Type marker (circle, marker)
    - Couleur (color picker), rayon (slider), opacité
  - Pour Line :
    - Couleur, largeur (slider), dash pattern, opacité
  - Pour Polygon :
    - Couleur remplissage, opacité, bordure, épaisseur bordure

- [x] **5.2 - Application styles** ✅
  - Fonction `getStyle()` améliorée
  - Parser JSON `style_config` de chaque record
  - Merge avec styles par défaut
  - Conserve effets sélection/hover
  - Fallback sécurisé si JSON invalide

- [x] **5.3 - Intégration menu contextuel** ✅
  - Action "🎨 Changer le style" fonctionnelle
  - Remplace placeholder Phase 6
  - handleSaveStyle via UpdateRecord

**Livrables :**
- ✅ Style editor fonctionnel avec preview
- ✅ Styles personnalisés par élément
- ✅ Persistance dans style_config JSON
- ⚠️ Bibliothèque styles GIS_Styles (non implémenté - optionnel)

---

### ✅ Phase 6 : Édition Avancée (COMPLÈTE - 2025-10-19)

**Objectif :** Éditer géométries, attributs, styles individuellement ✅

#### Tâches

- [x] **6.1 - Menu contextuel** ✅
  - ContextMenu.js component créé
  - Right-click sur feature → menu contextuel
  - 4 actions disponibles:
    - ✏️ Éditer géométrie
    - 📝 Modifier attributs
    - 🎨 Changer style (placeholder Phase 5)
    - 🗑️ Supprimer

- [x] **6.2 - Édition géométrie** ✅
  - Activation mode édition via menu contextuel
  - Leaflet.pm déjà fonctionnel
  - Sauvegarde automatique existante conservée

- [x] **6.3 - Éditeur attributs** ✅
  - AttributeEditor.js modal créé
  - Édition `nom`, `type`, `properties` (JSON)
  - Validation JSON temps réel
  - UpdateRecord via Grist API

- [x] **6.4 - Suppression** ✅
  - DeleteConfirmDialog.js modal créé
  - Confirmation avec détails record
  - RemoveRecord via Grist API
  - Refresh automatique de la carte

**Livrables :**
- ✅ Menu contextuel complet (4 actions)
- ✅ Édition géométrie via Leaflet.pm
- ✅ Éditeur attributs avec validation
- ✅ Suppression sécurisée avec confirmation

---

### ✅ Phase 7 : Sauvegarde Projet (COMPLÈTE - 2025-10-19)

**Objectif :** Sauvegarder projet = renommer table + créer nouvelle ✅

#### Tâches

- [x] **7.1 - UI sauvegarde** ✅
  - Bouton "💾 Sauvegarder" dans header
  - Modal SaveProjectDialog avec input nom
  - Suggestion intelligente: `Carte_YYYYMMDD`

- [x] **7.2 - Renommage table** ✅
  - `docApi.applyUserActions(['RenameTable', currentTable, projectName])`
  - Gestion erreurs

- [x] **7.3 - Création nouvelle table projet** ✅
  - `createProjectTable(docApi, 'GeoMap_Project_Default')` automatique
  - `setCurrentProjectTable()` pour configuration
  - Carte vide prête

- [x] **7.4 - Workflow post-sauvegarde** ✅
  - Fermeture automatique dialog
  - Logs console pour feedback
  - Widget prêt pour nouveau projet

**Livrables :**
- ✅ Sauvegarde projet fonctionnelle
- ✅ Workflow continu (projet 1 → projet 2 → ...)
- ✅ 1 Table = 1 Projet sauvegardé

---

### Phase 8 : Recherche Sémantique (1 semaine)

**Objectif :** VECTOR_SEARCH dans catalogues et éléments

#### Tâches

- [ ] **8.1 - Recherche catalogues**
  - Activer recherche dans sidebar Import
  - Créer record dans `GIS_SearchQueries` :
    ```javascript
    {
      search_query: query,
      search_mode: 'Catalogs',
      catalog_results: VECTOR_SEARCH(GIS_Catalogs, $search_query, embedding_column="catalog_vector")
    }
    ```
  - Afficher résultats triés par similarité

- [ ] **8.2 - Recherche éléments**
  - Dans sidebar Explorer
  - VECTOR_SEARCH dans table projet courante
  - Sur `element_vector` (colonne avec formule)
  - Highlight résultats sur carte

- [ ] **8.3 - Formules embeddings**
  - `GIS_Catalogs.catalog_vector = CREATE_VECTOR($title, $keywords, $description)`
  - `Project_Table.element_vector = CREATE_VECTOR($layer_name, $nom, $type)`
  - Génération auto si Albert API disponible

**Livrables :**
- Recherche sémantique catalogues
- Recherche sémantique éléments
- Tri par pertinence

---

### Phase 9 : Optimisations Performance (1 semaine)

**Objectif :** Support gros volumes (5000+ features)

#### Tâches

- [ ] **9.1 - Viewport filtering**
  - `filterByViewport(records, bounds)` : garder seulement features visibles
  - Update au `moveend` event (debounced 500ms)
  - Évite rendering 10,000 features hors écran

- [ ] **9.2 - Lazy loading progressif**
  - Si > 1000 features : charger par batches de 500
  - Yield entre batches (pas bloquer UI)
  - Progress indicator

- [ ] **9.3 - Cache géométries parsées**
  - `Map<recordId, ParsedGeoJSON>`
  - Éviter re-parse WKT à chaque render
  - Invalidation si record modifié

- [ ] **9.4 - Web Workers (optionnel)**
  - Parser WKT dans worker
  - Calculs (area, length) dans worker
  - Message passing async

**Livrables :**
- Viewport filtering
- Cache performances
- Support 10,000+ features fluide

---

### Phase 10 : Polish & Documentation (1 semaine)

**Objectif :** UX finale et docs complètes

#### Tâches

- [ ] **10.1 - UI/UX polish**
  - Transitions smooth
  - Loading states partout
  - Error handling graceful
  - Confirmation dialogs
  - Tooltips

- [ ] **10.2 - Documentation utilisateur**
  - README avec screenshots
  - Guide workflow import
  - Exemples cas d'usage
  - FAQ

- [ ] **10.3 - Documentation développeur**
  - Architecture code
  - API externe (IGN, OSM)
  - Schéma tables système
  - Contribution guide

- [ ] **10.4 - Tests**
  - Test initialisation tables
  - Test import IGN (mock)
  - Test import OSM (mock)
  - Test multi-couches
  - Test sauvegarde projet

**Livrables :**
- UX professionnelle
- Documentation complète
- Tests de non-régression

---

## 📊 Timeline Global

| Phase | Durée | Dépendances | Priorité |
|-------|-------|-------------|----------|
| 1. Fondations Tables | 1 semaine | - | ⭐⭐⭐⭐⭐ CRITIQUE |
| 2. Multi-Couches | 1 semaine | Phase 1 | ⭐⭐⭐⭐⭐ CRITIQUE |
| 3. Import Vecteur | 2 semaines | Phase 1, 2 | ⭐⭐⭐⭐⭐ CRITIQUE |
| 4. Import Raster | 1 semaine | Phase 3 | ⭐⭐⭐⭐☆ HAUTE |
| 5. Styles Personnalisés | 1 semaine | Phase 2 | ⭐⭐⭐☆☆ MOYENNE |
| 6. Édition Avancée | 1 semaine | Phase 2 | ⭐⭐⭐☆☆ MOYENNE |
| 7. Sauvegarde Projet | 3 jours | Phase 2 | ⭐⭐⭐⭐☆ HAUTE |
| 8. Recherche Sémantique | 1 semaine | Phase 1, 3 | ⭐⭐⭐☆☆ MOYENNE |
| 9. Optimisations Perf | 1 semaine | Phase 3, 4 | ⭐⭐⭐⭐☆ HAUTE |
| 10. Polish & Docs | 1 semaine | Toutes | ⭐⭐⭐☆☆ MOYENNE |

**Total estimé : 10-11 semaines**

**MVP (Minimum Viable Product) : Phases 1-3-7**
- Tables système
- Import vecteur IGN/OSM
- Sauvegarde projet

**MVP Timeline : 3.5 semaines**

---

## 🎯 Premiers Pas (Cette Semaine)

### Jour 1-2 : Phase 1.1-1.2

**Tâche :** Créer `setupSystemInfrastructure()` dans `GeoSemanticMapWidget.js`

```javascript
const setupSystemInfrastructure = async () => {
  try {
    // 1. Vérifier tables existantes
    const tables = await gristApiRef.current.docApi.fetchTable('_grist_Tables');
    const tableNames = tables.id.map((id, i) => tables.tableId[i]);

    const systemTables = ['GIS_Catalogs', 'GIS_Styles', 'GIS_Config'];
    const missingTables = systemTables.filter(t => !tableNames.includes(t));

    // 2. Créer tables manquantes
    for (const tableName of missingTables) {
      await createSystemTable(tableName);
    }

    // 3. Vérifier si catalogues initialisés
    const catalogsData = await gristApiRef.current.docApi.fetchTable('GIS_Catalogs');
    if (catalogsData.id.length === 0) {
      await initializeCatalogs();
    }

    console.log('✅ Infrastructure système prête');
  } catch (error) {
    console.error('❌ Erreur setup infrastructure:', error);
  }
};
```

**Objectif :** Au prochain lancement du widget, les 3 tables système existent et sont remplies.

---

## 📝 Notes Importantes

### Compatibilité Ascendante

**Défi :** Ne pas casser l'usage actuel (table simple avec géométries)

**Solution :**
- Détecter si table est "legacy" (pas de colonnes `layer_name`, `layer_type`)
- Si legacy : mode classique (comportement actuel)
- Si projet : nouveau mode multi-couches
- Proposer migration legacy → projet (optionnel)

### Migration Progressive

Utilisateurs existants peuvent continuer à utiliser v1.0 (mode simple).

Pour passer en v2.0 :
1. Créer nouvelle table projet
2. Importer données depuis table legacy
3. Bénéficier des nouvelles fonctionnalités

### Rollout Stratégie

1. **Développement sur branche `feature/smart-gis`**
2. **Tests internes phases 1-3**
3. **MVP Release (v2.0-beta)** - Phases 1-3-7
4. **Feedback utilisateurs**
5. **Full Release (v2.0)** - Toutes phases

---

## ✅ Checklist Démarrage

Avant de commencer Phase 1 :

- [x] Analyser code existant (fait)
- [x] Comprendre workflow cible (fait)
- [x] Valider architecture tables (fait)
- [ ] Setup environnement dev local
- [ ] Tester widget existant avec Grist
- [ ] Créer branche `feature/smart-gis`
- [ ] Commencer Phase 1.1

---

**Prêt à démarrer ?** 🚀

Phase 1 commence par `setupSystemInfrastructure()` !
