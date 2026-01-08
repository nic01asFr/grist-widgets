# Territoire 3D Component

Widget Grist pour la visualisation multi-vues synchronisée de nuages de points LiDAR HD IGN au format COPC.

## Fonctionnalités

- **Visualisation COPC** : Chargement de fichiers Cloud-Optimized Point Cloud
- **5 modes de colorisation** :
  - Classification IGN (classes LiDAR HD)
  - Élévation (gradient altitude)
  - Intensité du signal
  - Orthophoto (imagerie satellite)
  - RGB natif
- **Synchronisation multi-vues avancée** :
  - Architecture master/slave
  - Paramètres de vue relative (distance, rotation, offset)
  - Mode miroir pour mouvements inversés
  - Sync temps réel via BroadcastChannel
  - Persistance Grist pour reprise de session
- **Mode standalone** : Test direct avec saisie d'URL

## Installation

### Dans Grist

1. Ajouter un widget "Custom" à votre page
2. URL du widget :
   ```
   https://nic01asfr.github.io/grist-widgets/territoire-3d-component/
   ```
3. Configurer l'accès : "Full document access"
4. Mapper la colonne contenant l'URL COPC

### Test standalone

Ouvrir directement dans un navigateur :
```
https://nic01asfr.github.io/grist-widgets/territoire-3d-component/?ui=full
```

## Paramètres URL

### Synchronisation

| Paramètre | Valeurs | Défaut | Description |
|-----------|---------|--------|-------------|
| `channel` | string | `default` | Groupe de synchronisation |
| `master` | `true`, `false` | `false` | Définit le widget maître |

### Affichage

| Paramètre | Valeurs | Défaut | Description |
|-----------|---------|--------|-------------|
| `display` | `classification`, `elevation`, `intensity`, `ortho`, `rgb` | `classification` | Mode de colorisation |
| `ui` | `full`, `minimal`, `none` | `full` | Niveau d'interface |
| `url` | URL | - | URL COPC à charger |

### Position de la caméra (rotation)

Ces paramètres positionnent la caméra du slave sur une sphère autour du même point visé (target) que le master.

| Paramètre | Plage | Défaut | Description |
|-----------|-------|--------|-------------|
| `d` | > 0 | `1` | Coefficient de distance (multiplicateur) |
| `rx` | -360 à 360 | `0` | Rotation d'élévation en degrés |
| `ry` | -360 à 360 | `0` | Rotation azimutale en degrés |

**Mode miroir** : Un signe négatif active le mode miroir où les mouvements sont inversés.
- `ry=180` : Vue opposée, slave suit le master
- `ry=-180` : Vue opposée, quand master tourne à droite, slave tourne à gauche

### Décalage du point visé (translation)

Ces paramètres décalent le target du slave par rapport au target du master. Les offsets sont orientés selon la direction de vue du master.

| Paramètre | Unité | Défaut | Description |
|-----------|-------|--------|-------------|
| `ox` | mètres | `0` | Décalage latéral (droite/gauche) |
| `oy` | mètres | `0` | Décalage en profondeur (avant/arrière) |
| `oz` | mètres | `0` | Décalage vertical (haut/bas) |

## Configuration Multi-Vues

### Principe

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   MASTER                              SLAVE (ry=180)        │
│   ┌─────────┐                        ┌─────────┐           │
│   │  Cam ●  │                        │  ● Cam  │           │
│   │    ↘    │                        │    ↙    │           │
│   │     Target ●──────────────────────● Target │           │
│   └─────────┘    (même point visé)   └─────────┘           │
│                                                             │
│   Le slave maintient sa position relative (ry=180°)        │
│   quand le master orbite autour du target                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Exemples de configurations

#### Configuration 1 : Comparaison multi-modes (même angle)

4 vues du même angle avec différentes colorisations :

```
# Master - Orthophoto
?master=true&channel=compare&display=ortho

# Slave 1 - Classification
?channel=compare&display=classification

# Slave 2 - Élévation
?channel=compare&display=elevation

# Slave 3 - Intensité
?channel=compare&display=intensity
```

#### Configuration 2 : Vues orthogonales

Vue libre + 3 vues fixes (dessus, face, côté) :

```
# Master - Vue libre
?master=true&channel=ortho&display=classification

# Slave 1 - Vue de dessus
?channel=ortho&rx=90

# Slave 2 - Vue de face (nord)
?channel=ortho&ry=0&rx=0

# Slave 3 - Vue de droite (est)
?channel=ortho&ry=90
```

#### Configuration 3 : Rotation 360°

4 vues à 90° chacune autour du sujet :

```
# Master - Angle 0°
?master=true&channel=360

# Slave 1 - Angle 90° (droite)
?channel=360&ry=90

# Slave 2 - Angle 180° (arrière)
?channel=360&ry=180

# Slave 3 - Angle 270° (gauche)
?channel=360&ry=270
```

#### Configuration 4 : Vue contexte + détail

Master en vue rapprochée, slave en vue éloignée :

```
# Master - Vue détaillée
?master=true&channel=detail&display=classification

# Slave - Vue contexte (2x plus loin, légèrement en hauteur)
?channel=detail&d=2&rx=30
```

#### Configuration 5 : Survol de carte (grille 2x2)

4 widgets couvrant une zone étendue :

```
# Master - Centre
?master=true&channel=grid

# Slave 1 - Nord-Ouest
?channel=grid&ox=-100&oy=100

# Slave 2 - Nord-Est
?channel=grid&ox=100&oy=100

# Slave 3 - Sud-Ouest
?channel=grid&ox=-100&oy=-100

# Slave 4 - Sud-Est
?channel=grid&ox=100&oy=-100
```

#### Configuration 6 : Vue miroir (façades opposées)

Quand master explore un côté, slave explore l'autre en miroir :

```
# Master - Face avant
?master=true&channel=mirror&display=classification

# Slave - Face arrière, mouvements inversés
?channel=mirror&ry=-180&display=classification
```

## Table Grist

### Table source

Le widget attend une table avec une colonne contenant l'URL COPC :

| Colonne | Type | Description |
|---------|------|-------------|
| `COPC_URL` ou `url` | Text | URL du fichier COPC |

### Table de synchronisation (auto-créée)

Une table `T3D_Sync` est automatiquement créée pour stocker l'état de la caméra :

| Colonne | Type | Description |
|---------|------|-------------|
| `Channel` | Text | Groupe de synchronisation |
| `CopcUrl` | Text | URL du nuage chargé |
| `Display` | Text | Mode d'affichage actuel |
| `Px`, `Py`, `Pz` | Numeric | Position caméra |
| `Tx`, `Ty`, `Tz` | Numeric | Point de visée (target) |
| `Zoom` | Numeric | Niveau de zoom |
| `MasterId` | Text | ID du widget master |
| `UpdatedAt` | Numeric | Timestamp de mise à jour |

## Classification IGN LiDAR HD

| Code | Classe | Couleur |
|------|--------|---------|
| 1 | Non classé | Gris |
| 2 | Sol | Marron |
| 3 | Végétation basse | Vert clair |
| 4 | Végétation moyenne | Vert |
| 5 | Végétation haute | Vert foncé |
| 6 | Bâtiment | Orange |
| 9 | Eau | Bleu |
| 17 | Pont | Gris |
| 64 | Sursol pérenne | Vert olive |
| 65 | Artefacts | Jaune |
| 67 | Points virtuels | Vert cyan |

## Référentiel de coordonnées

Le widget utilise le système de coordonnées **Lambert 93 (EPSG:2154)** avec :
- **X** : Est (croissant vers l'est)
- **Y** : Nord (croissant vers le nord)
- **Z** : Altitude (vertical, vers le haut)

Les paramètres de rotation utilisent ce référentiel Z-up :
- `ry` (azimut) : rotation dans le plan horizontal XY
- `rx` (élévation) : angle depuis le plan horizontal

## Technologies

- [Giro3D](https://giro3d.org/) - Moteur 3D géospatial
- [Three.js](https://threejs.org/) - Rendu WebGL
- [COPC](https://copc.io/) - Format nuage de points optimisé cloud
- [Vite](https://vitejs.dev/) - Build tool

## Debug

La variable globale `window.t3d` expose l'état interne :

```javascript
// Dans la console du navigateur
t3d.instance      // Instance Giro3D
t3d.pointCloud    // Nuage de points actuel
t3d.sync          // Module de synchronisation
t3d.currentUrl    // URL chargée
t3d.controls      // MapControls (orbit)

// Status sync
t3d.sync.getStatus()
// → { id, channel, isMaster, viewParams, mirrorX, mirrorY, ... }
```

## Développement

```bash
# Installation
cd packages/territoire-3d-component
npm install

# Développement (port 3004)
npm run dev

# Build production
npm run build
```

## Exemples d'URLs COPC

Données LiDAR HD IGN disponibles sur :
- [Géoplateforme IGN](https://geoservices.ign.fr/lidarhd)
- [Data.gouv.fr](https://www.data.gouv.fr/)

## Licence

MIT
