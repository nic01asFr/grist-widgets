# Smart Map 3D

Widget cartographique 3D synchronisable pour Grist avec Mapbox GL JS.

## Fonctionnalités

### Carte Mapbox GL JS v3
- Style Standard avec bâtiments, arbres et monuments 3D
- Terrain 3D avec relief et exagération configurable
- Styles alternatifs : Streets, Satellite, Satellite-Streets
- Navigation fluide avec pitch, bearing et zoom

### Éclairage Réaliste
- Position solaire astronomique via SunCalc
- Ombres dynamiques selon l'heure et la date
- Presets d'ambiance : jour, aube, crépuscule, nuit
- Slider temporel pour simuler la journée

### Synchronisation Multi-Vues
- BroadcastChannel pour synchronisation temps réel
- 3 rôles : Master, Peer, Slave
- Sync caméra : position, zoom, pitch, bearing
- Sync sélection : objets sélectionnés partagés
- Sync couches : visibilité synchronisée
- Sync ambiance : heure et éclairage partagés
- Transforms : vues décalées, miroir, satellite

### Couches et Styles
- Multi-styles par couche (créer, dupliquer, renommer)
- Symbolisation fixe, catégorisée ou graduée
- Palettes de couleurs (Tableau10, Viridis, Blues, etc.)
- Points, lignes, polygones
- Import GeoJSON, KML, GPX, OSM

### Modèles 3D
- Chargement GLB/GLTF
- Bibliothèque de modèles depuis Grist
- Paramètres : échelle, rotation, offset
- Overrides par feature

### Intégration Grist
- 3 tables : Models_3D, Maquette_Layers, Maquette_Features
- Sauvegarde/chargement automatique
- Batch processing pour gros volumes

## Architecture

```
smart-map-3d/
├── src/
│   ├── core/
│   │   ├── MapCore.ts      # Carte, terrain, éclairage
│   │   └── types.ts        # Types TypeScript
│   ├── layers/
│   │   └── LayerManager.ts # Couches, styles, symbolisation
│   ├── sync/
│   │   └── SyncManager.ts  # Synchronisation multi-vues
│   ├── grist/
│   │   └── GristIntegration.ts # API Grist
│   └── index.ts            # Exports
└── public/
    └── index.html          # Widget standalone
```

## Utilisation

### Widget Standalone

```html
<!-- Dans Grist : URL du widget -->
https://nic01asfr.github.io/grist-widgets/smart-map-3d/index.html
```

### Module TypeScript

```typescript
import { MapCore, SyncManager, LayerManager, SyncPresets } from 'smart-map-3d';

// Créer le sync manager
const sync = new SyncManager('mon-groupe', SyncPresets.peer());
sync.start();

// Créer la carte
const mapCore = new MapCore({
  container: 'map',
  config: { mapbox: { token: 'pk...' } },
  settings: DEFAULT_SETTINGS,
  syncManager: sync
});

// Écouter les changements de caméra des autres
sync.setOnCameraChange((camera) => {
  mapCore.setCameraState(camera);
});
```

## Configuration Sync

### Rôles

| Rôle | Description |
|------|-------------|
| **master** | Contrôle les autres, n'écoute pas |
| **peer** | Émet et reçoit (bidirectionnel) |
| **slave** | Écoute seulement, n'émet pas |

### Presets

```typescript
// Vue décalée (autre quartier)
SyncPresets.offsetView(0.01, 0.005);

// Vue satellite (zoom arrière)
SyncPresets.satelliteView(3);

// Vue miroir (180°)
SyncPresets.mirrorView();

// Sélection uniquement
SyncPresets.selectionOnly();
```

## Développement

```bash
cd packages/smart-map-3d
npm install
npm start
```

## License

Apache-2.0
