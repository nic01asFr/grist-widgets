# Territoire 3D - Jumeau Numérique LiDAR HD

Widget Grist pour la visualisation et l'enrichissement de dalles LiDAR HD IGN avec Giro3D.

## Concept

**1 Document Grist = 1 Dalle LiDAR HD IGN (1km x 1km)**

Le widget permet de :
- Visualiser un nuage de points COPC (Cloud Optimized Point Cloud)
- Coloriser selon la classification IGN, l'orthophoto, l'élévation ou l'intensité
- Filtrer les classes de points (sol, végétation, bâtiments, etc.)
- Gérer des objets géolocalisés synchronisés avec Grist
- Importer depuis BD TOPO IGN, OSM ou GeoJSON

## Spécifications IGN LiDAR HD

- **Densité** : ~10 points/m²
- **Taille de dalle** : 1km x 1km (~10M points)
- **Format** : COPC (Cloud Optimized Point Cloud) - ~100 Mo
- **CRS** : EPSG:2154 (Lambert 93)
- **Classifications** :
  - 1 : Non classifié
  - 2 : Sol
  - 3 : Végétation basse (0-50cm)
  - 4 : Végétation moyenne (50cm-1.5m)
  - 5 : Végétation haute (>1.5m)
  - 6 : Bâtiment
  - 9 : Eau
  - 17 : Pont
  - 64 : Sursol pérenne (mobilier urbain)
  - 65 : Artefacts
  - 67 : Points virtuels

## Tables Grist

### Config (1 enregistrement)
| Colonne | Type | Description |
|---------|------|-------------|
| CopcUrl | Text | URL du fichier COPC |
| TileName | Text | Nom de la dalle |
| Bbox_MinX | Numeric | Coordonnée X min (Lambert 93) |
| Bbox_MinY | Numeric | Coordonnée Y min |
| Bbox_MaxX | Numeric | Coordonnée X max |
| Bbox_MaxY | Numeric | Coordonnée Y max |

### Objects (multi-enregistrements)
| Colonne | Type | Description |
|---------|------|-------------|
| Name | Text | Nom de l'objet |
| Type | Text | Type (lampadaire, arbre, banc...) |
| Category | Text | Catégorie (Mobilier urbain, Végétation...) |
| X | Numeric | Coordonnée X (Lambert 93) |
| Y | Numeric | Coordonnée Y |
| Z | Numeric | Coordonnée Z (altitude) |
| Status | Choice | Importé / Vérifié / Corrigé |
| SourceBD | Text | Source (BD TOPO, OSM, Manuel) |
| Model3D | Ref: Models_Lib | Modèle 3D associé |

## Modes d'affichage

1. **Classification IGN** : Couleurs par classe (sol, végétation, bâtiments...)
2. **Orthophoto IGN** : Couleurs réelles depuis le WMS IGN
3. **Élévation** : Gradient altimétrique (viridis)
4. **Intensité** : Retour du signal LiDAR (niveaux de gris)

## Technologies

- **Giro3D** v0.43.7 : Visualisation 3D géospatiale
- **Three.js** v0.165.0 : Rendu 3D WebGL
- **OpenLayers** v9.0.0 : Sources WMS
- **laz-perf** : Décompression LAZ/COPC

## Installation

Le widget est statique (HTML/JS/CSS). Aucun build requis.

### Utilisation locale
```bash
cd packages/territoire-3d/public
python -m http.server 8000
# Ouvrir http://localhost:8000
```

### Dans Grist
1. Ajouter un widget personnalisé
2. URL : `https://nic01asfr.github.io/grist-widgets/territoire-3d/index.html`
3. Configurer les colonnes mappées (CopcUrl, TileName)

## Démo

Le widget inclut une connexion démo au jeu de données Paris d'Oslandia :
- Dalle : `LHD_FXX_0643_6862_PTS_O_LAMB93_IGN69.copc.laz`
- ~10 millions de points
- Centre de Paris

## Feuille de route

- [x] Chargement COPC avec streaming
- [x] 4 modes de colorisation
- [x] Filtrage par classification
- [x] Eye Dome Lighting
- [x] Intégration Grist (Config, Objects)
- [ ] Import BD TOPO IGN (WFS)
- [ ] Import OSM (Overpass API)
- [ ] Import GeoJSON
- [ ] Ajout de modèles 3D (GLTF)
- [ ] Outils de mesure
- [ ] Export de vues

## Licence

MIT
