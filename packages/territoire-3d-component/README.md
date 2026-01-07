# Territoire 3D Component

Widget Grist pour la visualisation de nuages de points LiDAR HD IGN au format COPC.

## 🚀 Fonctionnalités

- **Visualisation COPC** : Chargement de fichiers Cloud-Optimized Point Cloud
- **5 modes de colorisation** :
  - Classification IGN (classes LiDAR HD)
  - Élévation (gradient altitude)
  - Intensité du signal
  - Orthophoto IGN
  - RGB natif
- **Synchronisation multi-vues** : Plusieurs widgets synchronisés sur la même page
- **Mode standalone** : Test direct avec saisie d'URL

## 📦 Installation

### Dans Grist

1. Ajouter un widget "Custom" à votre page
2. URL du widget :
   ```
   https://nic01asfr.github.io/grist-widgets/packages/territoire-3d-component/
   ```
3. Configurer l'accès : "Full document access"
4. Mapper la colonne contenant l'URL COPC

### Test standalone

Ouvrir directement dans un navigateur :
```
https://nic01asfr.github.io/grist-widgets/packages/territoire-3d-component/?ui=full
```

## ⚙️ Paramètres URL

| Paramètre | Valeurs | Défaut | Description |
|-----------|---------|--------|-------------|
| `display` | `classification`, `elevation`, `intensity`, `ortho`, `rgb` | `classification` | Mode de colorisation |
| `master` | `true`, `false` | `false` | Widget maître (écrit la sync) |
| `group` | string | `default` | Groupe de synchronisation |
| `ui` | `full`, `minimal`, `none` | `full` | Niveau d'interface |
| `url` | URL | - | URL COPC à charger |

## 🔄 Configuration Multi-Vues

Pour synchroniser plusieurs widgets sur la même page Grist :

### Widget 1 (Master - Classification)
```
?display=classification&master=true
```

### Widget 2 (Slave - Élévation)
```
?display=elevation
```

### Widget 3 (Slave - Intensité)
```
?display=intensity
```

### Widget 4 (Slave - Orthophoto)
```
?display=ortho
```

**Note** : Un seul widget doit avoir `master=true`. Les autres suivront automatiquement les mouvements de caméra du master.

## 📊 Table Grist

Le widget attend une table avec au minimum une colonne contenant l'URL COPC :

| Colonne | Type | Description |
|---------|------|-------------|
| `COPC_URL` ou `url` | Text | URL du fichier COPC |

### Table de synchronisation (auto-créée)

Une table `Camera_Sync` est automatiquement créée pour stocker l'état de la caméra :

| Colonne | Type | Description |
|---------|------|-------------|
| Px, Py, Pz | Numeric | Position caméra |
| Tx, Ty, Tz | Numeric | Point de visée |
| Zm | Numeric | Zoom |
| Wr | Text | ID du widget writer |
| Ts | Numeric | Timestamp |

## 🎨 Classification IGN LiDAR HD

| Code | Classe | Couleur |
|------|--------|--------|
| 1 | Non classé | Gris |
| 2 | Sol | Marron |
| 3 | Végétation basse | Vert clair |
| 4 | Végétation moyenne | Vert |
| 5 | Végétation haute | Vert vif |
| 6 | Bâtiment | Rouge |
| 9 | Eau | Bleu |
| 17 | Pont | Jaune |
| 64 | Sursol pérenne | Magenta |
| 65 | Artefacts | Cyan |
| 66 | Points virtuels | Gris |
| 67 | Sursol synthétique | Orange |

## 🔧 Technologies

- [Giro3D](https://giro3d.org/) v0.43.7 - Moteur 3D géospatial
- [Three.js](https://threejs.org/) v0.165 - Rendu WebGL
- [COPC](https://copc.io/) - Format nuage de points optimisé
- CRS : Lambert 93 (EPSG:2154)

## 📝 Exemples d'URLs COPC

Données LiDAR HD IGN disponibles sur :
- [Géoplateforme IGN](https://geoservices.ign.fr/lidarhd)
- [Data.gouv.fr](https://www.data.gouv.fr/)

## 🐛 Debug

La variable globale `window.t3d` expose l'état interne pour le debug :

```javascript
// Dans la console du navigateur
t3d.instance      // Instance Giro3D
t3d.copc          // Nuage de points actuel
t3d.sync          // Module de synchronisation
t3d.currentUrl    // URL chargée
```

## 📄 Licence

MIT
