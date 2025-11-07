# Smart GIS Widget for Grist

Widget cartographique intelligent avec gestion multi-sources, édition avancée et styles personnalisés.

## 🎯 Fonctionnalités

### ✅ Phases Complètes (1-8, 10 / 10 - 90%) - **Prêt pour Production**

#### Phase 1-2: Infrastructure & Multi-Couches
- **Tables système auto-créées**: GIS_Catalogs, GIS_Styles, GIS_Config, GIS_SearchQueries
- **Système de projet**: 1 Table = 1 Projet cartographique
- **Couches logiques**: Groupement par `layer_name`
- **LayerManager**: Toggle visibilité, gestion z-index

#### Phase 3: Import Wizard Vecteur
- **Catalogues intégrés**: IGN Géoplateforme (WFS 2.0.0), OSM Overpass API
- **8 datasets pré-configurés**: Bâtiments, routes, communes, hydrographie, POIs
- **Assistant 3 étapes**: Recherche → Configuration → Preview → Import
- **Bulk insert optimisé**: BulkAddRecord pour imports massifs

#### Phase 4: Support Raster
- **5 catalogues raster**: IGN Orthophoto, Plan IGN, OSM, Stamen, CartoDB
- **Rendu tile layers**: L.tileLayer automatique
- **Gestion fond de carte**: z_index=0 pour affichage sous vecteurs

#### Phase 5: Styles Personnalisés
- **StyleEditor modal**: Édition complète avec preview temps réel
- **Styles par géométrie**: Point (couleur, rayon), Line (épaisseur, dash), Polygon (remplissage, bordure)
- **Persistance JSON**: Stockage dans `style_config`

#### Phase 6: Édition Avancée
- **Menu contextuel**: Clic droit → 4 actions (éditer géométrie, attributs, style, supprimer)
- **AttributeEditor**: Modification nom, type, properties JSON avec validation
- **DeleteConfirmDialog**: Suppression sécurisée avec confirmation
- **UpdateRecord/RemoveRecord**: Intégration Grist API

#### Phase 7: Sauvegarde Projet
- **SaveProjectDialog**: Renommage table + création nouvelle table par défaut
- **Workflow continu**: Projet 1 → Sauvegarde → Projet 2
- **Suggestion intelligente**: Noms auto-générés `Carte_YYYYMMDD`

#### Phase 8: Recherche Sémantique 🆕
- **VECTOR_SEARCH intégré**: Recherche intelligente via embeddings
- **Recherche catalogues**: Bouton "🤖 Recherche Sémantique (IA)" dans Import Wizard
- **Recherche éléments**: Search bar avec VECTOR_SEARCH sur `element_vector`
- **Embeddings automatiques**: `CREATE_VECTOR(nom, type, layer_name)` dans formules
- **Fallback textuel**: Basculement automatique si recherche sémantique échoue
- **Table GIS_SearchQueries**: Stockage temporaire des requêtes de recherche

#### Phase 10: Polish & UX 🆕
- **Animations smooth**: fadeIn, slideUp sur modaux, spinner animé
- **Loading states**: Barre de progression + message de chargement
- **Error handling**: Card erreur avec bouton reload
- **Tooltips**: Tous les boutons avec `title` attribute
- **Hover effects**: Transform + boxShadow sur interactions
- **Documentation complète**: README, ROADMAP, PERFORMANCE_README.md

### 🚧 Phase Optionnelle

- **Phase 9**: Optimisations Performance (viewport filtering, WKT cache, lazy loading)
  - ✅ Code documenté dans `performanceOptimizations.js` et `PERFORMANCE_README.md`
  - Non intégré par défaut (prêt si besoin pour datasets >5000 features)

## 📦 Installation

```bash
cd packages/smart-gis
npm install
npm run build
```

Le widget sera disponible dans `build/` pour déploiement.

## 🗺️ Utilisation

### 1. Initialisation
Au premier lancement, le widget crée automatiquement:
- 3 tables système (GIS_Catalogs, GIS_Styles, GIS_Config)
- 1 table projet par défaut (`GeoMap_Project_Default`)

### 2. Import de données
1. Clic **"📥 Import"**
2. Recherche dans catalogues :
   - **Textuelle** : Filtrage classique par mots-clés
   - **Sémantique** : Clic "🤖 Recherche Sémantique (IA)" pour recherche intelligente par similarité
3. Configuration (limit, bbox)
4. Preview
5. Import → Données insérées dans table projet

### 3. Recherche intelligente
- **Search bar** (sidebar Explorer) : Recherche sémantique automatique dans les éléments
- Basée sur `VECTOR_SEARCH` de Grist
- Tri par pertinence
- Highlight résultats sur carte

### 4. Édition
- **Clic droit** sur feature → Menu contextuel
- **Éditer géométrie** → Mode Leaflet.pm
- **Modifier attributs** → Modal JSON
- **Changer style** → Color picker, sliders
- **Supprimer** → Confirmation

### 5. Sauvegarde
1. Clic **"💾 Sauvegarder"**
2. Nom du projet (ou suggestion auto)
3. Table renommée → Nouvelle table créée
4. Prêt pour nouveau projet

## 🏗️ Architecture

### Schéma Table Projet
```javascript
{
  layer_name: 'Text',          // Nom de la couche logique
  layer_type: 'Choice',        // vector | raster | wms | wfs
  source_catalog: 'Ref',       // Référence GIS_Catalogs
  geometry: 'Text',            // WKT pour vecteur
  raster_url: 'Text',          // URL tuiles pour raster
  properties: 'Text',          // JSON attributs
  nom: 'Text',
  type: 'Text',
  style_config: 'Text',        // JSON style Leaflet
  z_index: 'Int',              // Ordre affichage
  is_visible: 'Bool',          // Visibilité
  import_session: 'Int'        // Session d'import
}
```

### Workflow Complet
```
1. Widget ouvert → Infrastructure créée
2. Import données IGN/OSM → Table remplie
3. Ajout raster → Fond de carte
4. Édition features → Géométrie/attributs/style
5. Organisation couches → LayerManager
6. Sauvegarde → Table renommée, nouvelle créée
7. Export → 1 Table = 1 fichier CSV/Excel
```

## 🎨 Styles Supportés

### Point/MultiPoint
- `type`: 'circle' | 'marker'
- `color`: HEX color
- `radius`: 3-20px
- `fillOpacity`: 0-1

### LineString/MultiLineString
- `color`: HEX color
- `weight`: 1-10px
- `opacity`: 0-1
- `dashArray`: null | '5,5' | '10,5' | '10,5,2,5'

### Polygon/MultiPolygon
- `fillColor`: HEX color
- `fillOpacity`: 0-1
- `color`: HEX border color
- `weight`: 0-8px border

## 📊 Catalogues Intégrés

### IGN Géoplateforme (WFS)
- BD TOPO V3 - Bâtiments
- BD TOPO V3 - Routes
- BD TOPO V3 - Communes
- BD TOPO V3 - Hydrographie
- WMTS - Orthophotographie HR
- WMTS - Plan IGN

### OpenStreetMap
- Overpass API - Buildings
- Overpass API - Roads
- Overpass API - POIs
- XYZ Tiles - Standard

### Autres
- Stamen - Terrain
- CartoDB - Positron

## 🔧 Technologies

- **React** 18.2
- **Leaflet** 1.9.4 + React-Leaflet 4.2.1
- **Leaflet.pm** (Geoman) 2.15.0 - Édition géométries
- **MarkerClusterGroup** 2.1.0 - Clustering automatique
- **Grist Plugin API** - Intégration native

## 📈 Build

- **Taille**: 195.94 kB (gzipped)
- **Warnings**: 0 ✅
- **Compilation**: Successful

## 📝 Changelog

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique complet.

## 🛣️ Roadmap

Voir [ROADMAP.md](./ROADMAP.md) pour le plan de développement.

## 📄 License

MIT

## 👨‍💻 Auteur

Développé avec Claude Code pour Grist
