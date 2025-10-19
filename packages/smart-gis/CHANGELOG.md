# Changelog - Smart GIS Widget

## Phase 5 - Styles Personnalisés ✅ (2025-10-19)

### Implémenté
- ✅ **StyleEditor.js** - Éditeur de style complet (nouveau fichier, 545 lignes)
  - Modal avec aperçu temps réel
  - Détection automatique type géométrie (Point, LineString, Polygon)
  - **Pour Point:**
    - Type marqueur (circle, marker)
    - Couleur (color picker + input texte)
    - Rayon (slider 3-20px)
    - Opacité (slider 0-100%)
  - **Pour LineString:**
    - Couleur
    - Épaisseur (slider 1-10px)
    - Opacité
    - Style ligne (solide, pointillés, tirets, tiret-point)
  - **Pour Polygon:**
    - Couleur remplissage
    - Opacité remplissage
    - Couleur bordure
    - Épaisseur bordure (slider 0-8px)
  - Preview visuel dans modal
  - Sauvegarde JSON dans `style_config`

- ✅ **GeoSemanticMapWidget.js** - Application des styles
  - Import StyleEditor
  - État `styleEditor`
  - Handlers:
    - `handleEditStyle()` - Ouvre modal (remplace placeholder)
    - `handleSaveStyle()` - UpdateRecord avec style_config
  - Fonction `getStyle()` améliorée:
    - Parse `style_config` JSON de chaque record
    - Merge avec styles par défaut
    - Conserve effets sélection/hover
    - Fallback sécurisé si JSON invalide
  - Render StyleEditor modal

### Workflow utilisateur
```
1. Clic droit sur feature → "🎨 Changer le style"
2. StyleEditor s'ouvre avec valeurs actuelles ou défaut
3. Détection automatique géométrie → formulaire adapté
4. Modification valeurs → Aperçu temps réel
5. Exemples:
   - Point: Couleur rouge, rayon 12px, opacité 80%
   - Ligne: Couleur verte, épaisseur 5px, pointillés
   - Polygone: Remplissage bleu 40%, bordure noire 3px
6. Clic "🎨 Appliquer" → UpdateRecord Grist
7. Rendu immédiat sur carte avec nouveau style
8. Style persisté dans `style_config` JSON
```

### Architecture styles
- **Stockage:** Colonne `style_config` (JSON) dans table projet
- **Format:** Objet Leaflet style direct (color, fillColor, weight, etc.)
- **Application:** Merge avec styles par défaut à chaque render
- **Priorité:** style_config > styles défaut > sélection/hover
- **Validation:** Try/catch pour JSON invalide

### Styles supportés
**Point/MultiPoint:**
- `type`: 'circle' | 'marker'
- `color`: HEX color
- `radius`: number
- `fillOpacity`: 0-1

**LineString/MultiLineString:**
- `color`: HEX color
- `weight`: number
- `opacity`: 0-1
- `dashArray`: string | null

**Polygon/MultiPolygon:**
- `fillColor`: HEX color
- `fillOpacity`: 0-1
- `color`: HEX border color
- `weight`: number border width
- `opacity`: 0-1

### Build
- Taille: **195.94 kB** (+1.4 kB vs Phase 6)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Phase 6 - Édition Avancée ✅ (2025-10-19)

### Implémenté
- ✅ **ContextMenu.js** - Menu contextuel sur features (nouveau fichier)
  - Affichage au clic droit sur feature
  - 4 actions: Éditer géométrie, Modifier attributs, Changer style, Supprimer
  - UI modale avec overlay transparent
  - Icônes et séparation visuelle
  - Style "danger" pour suppression

- ✅ **AttributeEditor.js** - Éditeur d'attributs (nouveau fichier)
  - Modal avec formulaire d'édition
  - Champs: `nom`, `type`, `properties` (JSON)
  - Validation JSON en temps réel
  - Syntax highlighting pour JSON
  - Affichage ID et couche
  - Gestion erreurs et loading states

- ✅ **DeleteConfirmDialog.js** - Confirmation suppression (nouveau fichier)
  - Modal de confirmation avant suppression
  - Affichage infos record (nom, type, couche, ID)
  - Warning visuel (fond jaune)
  - Bouton "Supprimer" en rouge
  - Protection contre suppressions accidentelles

- ✅ **GeoSemanticMapWidget.js** - Intégration édition complète
  - Import des 3 nouveaux composants
  - États: `contextMenu`, `attributeEditor`, `deleteConfirm`
  - Handlers:
    - `handleEditGeometry()` - Active mode édition global
    - `handleEditAttributes()` - Ouvre modal édition
    - `handleSaveAttributes()` - UpdateRecord via Grist API
    - `handleDeleteRecord()` - Ouvre confirmation
    - `handleConfirmDelete()` - RemoveRecord via Grist API
    - `handleEditStyle()` - Placeholder Phase 5
  - Event `contextmenu` sur layers Leaflet
  - Stoppage propagation pour éviter menu natif
  - Render des 3 modals conditionnels

### Workflow utilisateur
```
1. Clic droit sur feature → ContextMenu s'ouvre
2. Sélection action:

   a. "✏️ Éditer la géométrie"
      → Mode édition activé
      → Leaflet.pm controls disponibles
      → Modification directe sur carte

   b. "📝 Modifier les attributs"
      → AttributeEditor modal s'ouvre
      → Édition nom, type, properties JSON
      → Validation JSON temps réel
      → Sauvegarde → UpdateRecord Grist

   c. "🎨 Changer le style"
      → Alert "À venir Phase 5"
      → TODO: StyleEditor

   d. "🗑️ Supprimer"
      → DeleteConfirmDialog s'ouvre
      → Affichage détails record
      → Confirmation → RemoveRecord Grist
      → Feature disparaît de la carte
```

### Améliorations édition géométrie
- Mode édition déjà existant via Leaflet.pm
- Activation via menu contextuel (au lieu du toggle global)
- Conservation de l'édition drag & drop existante
- Sauvegarde automatique des modifications (déjà implémenté)

### Build
- Taille: **194.54 kB** (+2.23 kB vs Phase 7)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Phase 7 - Sauvegarde Projet ✅ (2025-10-19)

### Implémenté
- ✅ **SaveProjectDialog.js** - Modal de sauvegarde projet (nouveau fichier)
  - Input nom projet avec validation
  - Suggestion intelligente: `Carte_YYYYMMDD`
  - Affichage table courante
  - Gestion erreurs et loading states
  - Support touche Enter
  - UI modale stylée avec overlay

- ✅ **GeoSemanticMapWidget.js** - Intégration sauvegarde complète
  - Import SaveProjectDialog + projectTableManager helpers
  - Bouton "💾 Sauvegarder" dans header (après Import)
  - État `showSaveDialog` pour affichage modal
  - Fonction `handleSaveProject()`:
    - Renommage table courante via `RenameTable`
    - Création nouvelle table par défaut via `createProjectTable()`
    - Configuration nouvelle table courante via `setCurrentProjectTable()`
    - Fermeture automatique dialog après succès
    - Gestion erreurs complète

- ✅ **projectTableManager.js** - Exports ajoutés
  - `createProjectTable` exporté pour usage externe
  - `setCurrentProjectTable` exporté pour usage externe

### Workflow utilisateur
```
1. Clic "💾 Sauvegarder" → SaveProjectDialog s'ouvre
2. Input nom (ex: "Paris_Urbanisme_2025")
3. Ou clic "💡 Suggestion" → Auto-remplissage "Carte_20251019"
4. Validation → 3 étapes automatiques:
   a. Table "GeoMap_Project_Default" → renommée en "Paris_Urbanisme_2025"
   b. Nouvelle "GeoMap_Project_Default" créée (vide, schéma identique)
   c. Widget configuré pour pointer sur nouvelle table
5. Résultat: Projet sauvegardé, prêt pour nouveau projet
6. Table sauvegardée visible dans liste tables Grist
```

### Paradigme confirmé
**1 Table = 1 Projet Sauvegardé**
- L'utilisateur travaille toujours sur `GeoMap_Project_Default`
- À la sauvegarde: table renommée (devient projet finalisé)
- Nouvelle table par défaut créée automatiquement
- Chaque vue Grist peut pointer sur une table projet différente
- Export facile: 1 table = 1 fichier CSV/Excel

### Build
- Taille: **192.31 kB** (+970 B vs Phase 4)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Phase 4 - Support Raster ✅ (2025-10-19)

### Implémenté
- ✅ **systemInfrastructure.js** - 5 catalogues raster ajoutés
  - IGN - Orthophotographie HR (WMTS)
  - IGN - Plan IGN (carte topographique)
  - OpenStreetMap - Standard
  - Stamen - Terrain
  - CartoDB - Positron (Light)
  - Ajout colonne `layer_type` dans schéma GIS_Catalogs
  - URLs IGN corrigées: `data.geopf.fr` au lieu de `wxs.ign.fr`

- ✅ **RasterLayers.js** - Composant de rendu raster
  - Détection automatique records avec `layer_type="raster"`
  - Création `L.tileLayer` pour chaque raster
  - Gestion visibilité via `layerVisibility`
  - Support z-index pour ordre d'affichage
  - Cleanup automatique des layers retirés

- ✅ **ImportWizard.js** - Workflow simplifié pour raster
  - Détection `catalog.layer_type === 'raster'`
  - Pas de preview (ajout direct)
  - UI spéciale: "🖼️ Couche Raster"
  - Message explicatif: "sera ajoutée comme fond de carte"

- ✅ **GeoSemanticMapWidget.js** - Intégration raster
  - Import RasterLayers component
  - Ajout `<RasterLayers />` dans MapContainer
  - `handleImport()` détecte raster et insère 1 ligne:
    - `layer_type: 'raster'`
    - `raster_url: catalog.endpoint_url`
    - `z_index: 0` (fond de carte)
  - Différenciation vecteur (BulkAddRecord) vs raster (AddRecord simple)

### Workflow utilisateur
```
1. Clic "📥 Import" → ImportWizard
2. Recherche "orthophoto" → Catalogue IGN raster trouvé
3. Sélection "IGN - Orthophotographie HR"
4. Preview simplifié (pas de features)
5. "Ajouter la couche raster" → 1 ligne insérée
6. Affichage immédiat sur carte comme fond
7. Toggle visibilité dans LayerManager
8. z_index=0 → affiché sous les vecteurs
```

### Catalogues raster disponibles
- **IGN**: Orthophoto HR, Plan IGN (WMTS)
- **OSM**: Carte standard
- **Stamen**: Terrain avec relief
- **CartoDB**: Positron light (minimaliste)

### Build
- Taille: **191.34 kB** (+256 B vs Phase 3)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Phase 3 - Import Wizard Vecteur ✅ (2025-10-19)

### Implémenté
- ✅ **ImportWizard.js** - Assistant d'import complet (3 étapes)
  - Step 1: Recherche dans catalogues (barre de recherche + filtrage)
  - Step 2: Configuration requête (limit, bbox)
  - Step 3: Prévisualisation avant import
  - Gestion erreurs et loading states
  - UI modale responsive avec progression

- ✅ **IGNService.js** - Service Géoplateforme IGN
  - Endpoint: `https://data.geopf.fr/wfs/ows`
  - WFS 2.0.0 avec output GeoJSON
  - `queryBatiments()` - BD TOPO V3 bâtiments
  - `queryRoutes()` - BD TOPO V3 routes
  - `queryCommunes()` - BD TOPO V3 communes
  - `queryHydrographie()` - BD TOPO V3 cours d'eau
  - Support BBOX, COUNT, CQL_FILTER
  - Bbox pré-configurés (Paris, Lyon, Marseille)

- ✅ **OSMService.js** - Service Overpass API OpenStreetMap
  - Endpoint: `https://overpass-api.de/api/interpreter`
  - Overpass QL queries
  - `queryBuildings()` - Bâtiments OSM
  - `queryRoads()` - Routes OSM (motorway→residential)
  - `queryPOIs()` - Points d'intérêt (amenities)
  - Conversion OSM JSON → GeoJSON automatique
  - Support nodes, ways, relations

- ✅ **GeoSemanticMapWidget.js** - Intégration import
  - Bouton "📥 Import" dans header
  - `handleImport()` - Bulk insert avec BulkAddRecord
  - Chargement automatique catalogues depuis GIS_Catalogs
  - Génération automatique layer_name depuis titre catalogue
  - Incrémentation import_session pour traçabilité
  - `featureToWKT()` helper pour conversion GeoJSON → WKT

### Workflow utilisateur
```
1. Clic "📥 Import" → ImportWizard s'ouvre
2. Recherche "bâtiments" → Filtrage catalogues IGN/OSM
3. Sélection "BD TOPO® - Bâtiments"
4. Configuration: limit=200
5. Preview: 200 bâtiments chargés depuis API IGN
6. Import → BulkAddRecord dans table projet
7. Affichage immédiat sur carte avec layer "BD TOPO® - Bâtiments"
```

### APIs externes intégrées
- **IGN Géoplateforme WFS** (data.geopf.fr)
  - 5 datasets BDTOPO V3 pré-configurés
  - Rate limit: 30 req/s
  - Format: GeoJSON natif

- **OSM Overpass API** (overpass-api.de)
  - 3 types de requêtes pré-configurées
  - Timeout: 25s par requête
  - Format: OSM JSON → GeoJSON

### Build
- Taille: **190.38 kB** (+1.56 kB vs Phase 2)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Phase 2 - Support Multi-Couches ✅ (2025-10-19)

### Implémenté
- ✅ **projectTableManager.js** - Module de gestion des tables projet
  - Schéma table projet (12 colonnes: layer_name, layer_type, geometry, etc.)
  - `initializeProjectSystem()` - Auto-création table par défaut
  - `groupByLayers()` - Groupement par layer_name
  - `sortLayersByZIndex()` - Tri par z-index
  - `getCurrentProjectTable()` - Détection table courante
  - `setCurrentProjectTable()` - Configuration table courante

- ✅ **LayerManager.js** - Composant UI de gestion des couches
  - Liste hiérarchique des couches
  - Toggle visibilité par couche (checkbox)
  - Contrôles z-index (↑ / ↓)
  - Badge nombre d'entités par couche
  - Détails dépliables (type, entités, visibles)
  - Icônes par type (📍 vector, 🖼️ raster, 🌐 WMS)

- ✅ **GeoSemanticMapWidget.js** - Intégration multi-couches
  - Import projectTableManager + LayerManager
  - État: `layers`, `layerVisibility`, `projectTableReady`
  - `initializeWidget()` - Initialisation système projet (Step 2)
  - `useEffect` - Groupement automatique par couches
  - `handleToggleLayerVisibility()` - Toggle visibilité UI
  - `handleUpdateLayerZIndex()` - Mise à jour z-index dans Grist
  - Filtrage rendu par `layerVisibility` + `is_visible`
  - Badge "✓ Project" dans header
  - LayerManager affiché position absolue (top-right)

### Paradigme confirmé
**1 Table = 1 Projet Cartographique Multi-Sources**
- Chaque ligne = 1 entité géographique (vector ou raster)
- Colonne `layer_name` = regroupement logique (layers Photoshop)
- Colonne `z_index` = ordre d'affichage
- Colonne `is_visible` = visibilité individuelle

### Build
- Taille: **186.33 kB** (+1.91 kB vs Phase 1)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Phase 1 - Fondations Tables Système ✅ (2025-10-19)

### Implémenté
- ✅ **systemInfrastructure.js** - Module d'infrastructure système
  - `setupSystemInfrastructure()` - Fonction principale
  - `createSystemTable()` - Création tables avec schéma
  - `tableExists()` - Vérification existence
  - `getConfig()` / `setConfig()` - Helpers configuration

- ✅ **Tables système** (auto-créées au lancement)
  - **GIS_Catalogs** - Catalogues de données externes
    - 5 datasets IGN (BDTOPO, AdminExpress, Routes, Hydro, Orthophoto)
    - 3 datasets OSM (Buildings, Roads, POIs)
    - Colonnes: source_type, dataset_id, title, keywords, endpoint_url, geometry_type, etc.

  - **GIS_Styles** - Bibliothèque de styles réutilisables
    - 5 styles système (Marker Bleu, Route Principale, Zone Urbaine, Limite Admin, Cours d'eau)
    - Colonnes: style_name, style_type, style_config (JSON Leaflet)

  - **GIS_Config** - Configuration widget (key-value store)
    - 7 valeurs par défaut (current_project_table, default_base_map, etc.)
    - Colonnes: config_key, config_value, config_type, description

- ✅ **GeoSemanticMapWidget.js** - Intégration infrastructure
  - Import systemInfrastructure
  - `initializeWidget()` - Appel setupSystemInfrastructure (Step 1)
  - État `infrastructureReady`
  - Badge "✓ System Ready" dans header
  - Titre changé: "Smart GIS" (au lieu de "Carte Géo-Sémantique")

### Build
- Taille: **184.4 kB** (+2.77 kB vs baseline)
- Warnings: **0** ✅
- Compilation: **Successful**

---

## Baseline - Widget Geo-Semantic Initial

### Fonctionnalités existantes
- ✅ Parser WKT complet (Point, Line, Polygon + Multi variants)
- ✅ Affichage Leaflet + React-Leaflet
- ✅ Clustering avec MarkerClusterGroup
- ✅ Édition interactive (Leaflet.pm / Geoman)
- ✅ Sidebar avec recherche et statistiques
- ✅ Sélection bidirectionnelle Grist ↔ Map
- ✅ Calcul aire/longueur
- ✅ Popups avec détails

### Technologies
- React 18.2
- Leaflet 1.9.4
- React-Leaflet 4.2.1
- @geoman-io/leaflet-geoman-free 2.15.0
- react-leaflet-cluster 2.1.0

---

## Prochaines étapes

### Phase 5 - Styles Personnalisés (1 semaine)

**Objectif**: Permettre la personnalisation des styles de rendu pour chaque couche

**Tâches**:
1. UI de sélection style dans LayerManager
2. Éditeur de style (couleur, épaisseur, opacité)
3. Bibliothèque de styles prédéfinis (GIS_Styles)
4. Application style par couche
5. Sauvegarde style dans `style_config` JSON
6. Preview en temps réel

**Livrables**:
- StyleEditor component
- Intégration dans LayerManager
- 10+ styles prédéfinis disponibles

**Critères de succès**:
- Changer couleur d'une couche → Rendu immédiat
- Créer style personnalisé → Sauvegardé et réutilisable
- Toggle entre style prédéfini et personnalisé

---

### Phase 6 - Édition Avancée (1 semaine)

**Objectif**: Améliorer capacités d'édition géométrique et attributaire

**Tâches**:
1. Mode édition par couche (non global)
2. Édition attributs dans popup
3. Duplication géométries
4. Snapping entre géométries
5. Split/Merge polygones
6. Undo/Redo stack
7. Validation géométries

**Livrables**:
- EditingToolbar component
- AttributeEditor component
- GeometryValidation helpers

**Critères de succès**:
- Éditer uniquement couche "Bâtiments"
- Modifier attributs directement dans popup
- Split polygon → 2 nouveaux records

---

### Phase 8 - Recherche Sémantique (1 semaine)

(Voir ROADMAP.md pour détails)

---

## Archivé - Import Wizard Vecteur (Phase 3 complétée)

**Objectif**: Permettre l'import de données vectorielles depuis les catalogues IGN/OSM

**Tâches**:
1. UI de recherche dans catalogues (barre de recherche + filtres)
2. Éditeur de requête (bbox, attributs, limites)
3. Service IGN WFS (appel API + parsing GeoJSON)
4. Service OSM Overpass (appel API + parsing)
5. Preview avant import (carte + tableau)
6. Import batch (BulkAddRecord dans table projet)
7. Gestion sessions d'import (import_session++)

**Livrables**:
- ImportWizard component
- IGNService.js + OSMService.js
- Integration dans widget (bouton "Import")
- Capacité à importer 100+ entités en 1 clic

**Critères de succès**:
- Rechercher "Bâtiments Paris" → Import 1000 bâtiments
- Rechercher "Routes Lyon" → Import 500 routes
- Affichage immédiat sur carte
- Couche créée automatiquement avec layer_name

---

**Dernière mise à jour**: 2025-10-19
**Version widget**: 2.0.0 (Smart GIS)
**Phases complètes**: 1-7 / 10 (70%)
