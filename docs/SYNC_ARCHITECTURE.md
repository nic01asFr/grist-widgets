# Architecture de Synchronisation Multi-Widgets

Ce document décrit l'architecture générique pour synchroniser des propriétés et des paramètres de configuration entre widgets Grist avec un système master/slave.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [WidgetConfig : Gestion des paramètres](#widgetconfig--gestion-des-paramètres)
3. [SyncManager : Synchronisation des valeurs](#syncmanager--synchronisation-des-valeurs)
4. [Transforms : Transformations master/slave](#transforms)
5. [Presets : Configurations réutilisables](#presets--configurations-réutilisables)
6. [API complète](#api-complète)
7. [Cas d'usage](#cas-dusage-par-widget)

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SyncManager                                    │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │   Broadcast      │  │   Grist Table    │  │   Property Registry   │  │
│  │   Adapter        │  │   Adapter        │  │                       │  │
│  │   (temps réel)   │  │   (persistance)  │  │  ┌─────┐ ┌─────┐     │  │
│  │                  │  │                  │  │  │prop1│ │prop2│     │  │
│  │  BroadcastChannel│  │  T_{Widget}_Sync │  │  └─────┘ └─────┘     │  │
│  └──────────────────┘  └──────────────────┘  │  ┌─────┐ ┌─────┐     │  │
│                                               │  │prop3│ │ ... │     │  │
│                                               │  └─────┘ └─────┘     │  │
│                                               └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
       ┌─────────────┐                           ┌─────────────┐
       │   MASTER    │                           │   SLAVE     │
       │             │                           │             │
       │  get() ─────┼───── broadcast ──────────▶│  transform  │
       │  emit()     │                           │  set()      │
       └─────────────┘                           └─────────────┘
```

---

## WidgetConfig : Gestion des paramètres

Avant la synchronisation des valeurs, il faut gérer les **paramètres de configuration** des widgets. Ces paramètres définissent le comportement du widget (pas les données qu'il affiche).

### Types de paramètres

| Catégorie | Exemples | Caractéristiques |
|-----------|----------|------------------|
| **View params** | d, rx, ry, ox, oy, oz | Position relative, transformation |
| **Sync params** | channel, master | Configuration du groupe |
| **Display params** | display, ui, theme | Mode d'affichage |
| **Data params** | url, filters, layers | Sources de données |
| **Preset params** | preset, viewName | Référence à une configuration |

### Sources de paramètres (priorité décroissante)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sources de configuration                      │
│                                                                  │
│  1. URL Params     ?d=1.5&ry=180          (priorité maximale)   │
│         ↓                                                        │
│  2. Grist Options  Widget configuration panel                   │
│         ↓                                                        │
│  3. Grist Table    Table Widget_Config                          │
│         ↓                                                        │
│  4. Sync Channel   Partagé par le master                        │
│         ↓                                                        │
│  5. Defaults       Valeurs par défaut du code                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Définition des paramètres

```javascript
class ParamDefinition {
    name: string;           // Identifiant unique
    type: 'number' | 'string' | 'boolean' | 'object' | 'array';
    default: any;           // Valeur par défaut

    // Sources autorisées (par ordre de priorité)
    sources: ('url' | 'options' | 'table' | 'sync' | 'default')[];

    // Comportement
    syncable: boolean;      // Peut être partagé via sync channel
    persistent: boolean;    // Sauvegardé dans Grist
    reactive: boolean;      // Déclenche un re-render si modifié

    // Validation
    validate?: (value: any) => boolean;
    transform?: (value: any) => any;  // Transformation à l'application

    // Pour les slaves
    slaveTransform?: Transform;  // Transformation de la valeur master
}
```

### Exemple de configuration

```javascript
const config = new WidgetConfig({
    tableName: 'Widget_Config',  // Table Grist pour stockage
    channel: 'demo'              // Channel de sync
});

// Paramètres de vue (statiques, depuis URL)
config.define('d', {
    type: 'number',
    default: 1,
    sources: ['url', 'table', 'default'],
    syncable: false,        // Chaque widget a sa propre valeur
    persistent: true,       // Sauvegardé si modifié
    validate: (v) => v > 0
});

config.define('ry', {
    type: 'number',
    default: 0,
    sources: ['url', 'table', 'default'],
    syncable: false,
    persistent: true,
    validate: (v) => v >= -360 && v <= 360
});

// Paramètre synchronisé (vient du master)
config.define('activeLayer', {
    type: 'string',
    default: 'default',
    sources: ['sync', 'url', 'default'],
    syncable: true,         // Partagé entre widgets
    persistent: true
});

// Paramètre de preset (référence)
config.define('preset', {
    type: 'string',
    default: null,
    sources: ['url', 'table', 'default'],
    syncable: false,
    persistent: false,
    // Quand un preset est défini, charger ses valeurs
    onSet: (presetName) => config.loadPreset(presetName)
});
```

### API WidgetConfig

```javascript
class WidgetConfig {
    constructor(options: ConfigOptions);

    // Définition
    define(name: string, definition: ParamDefinition): void;

    // Accès
    get(name: string): any;
    getAll(): Record<string, any>;

    // Modification
    set(name: string, value: any): void;
    setMany(values: Record<string, any>): void;
    reset(name: string): void;  // Revient au défaut

    // Presets
    loadPreset(name: string): Promise<void>;
    saveAsPreset(name: string): Promise<void>;
    listPresets(): Promise<string[]>;

    // Réactivité
    onChange(name: string, callback: (value: any) => void): void;
    onAnyChange(callback: (name: string, value: any) => void): void;

    // Persistence
    async save(): Promise<void>;
    async load(): Promise<void>;
}
```

### Différence Config vs Sync

| Aspect | WidgetConfig | SyncManager |
|--------|--------------|-------------|
| **Quoi** | Paramètres de configuration | Valeurs de données |
| **Exemples** | d, ry, channel, preset | camera position, selection |
| **Fréquence** | Rarement modifié | Temps réel |
| **Source** | URL, Table, Options | Master widget |
| **Stockage** | Widget_Config table | Widget_Sync table |

---

## SyncManager : Synchronisation des valeurs

## Concepts clés

### 1. SyncManager

Gestionnaire central qui coordonne la synchronisation entre widgets.

**Responsabilités :**
- Gestion du channel de communication (BroadcastChannel)
- Persistance dans Grist (table auto-créée)
- Registre des propriétés à synchroniser
- Gestion du rôle master/slave
- Throttling et debouncing

**Configuration :**
```javascript
const sync = new SyncManager({
    channel: 'projet-demo',     // Groupe de sync (widgets avec même channel se synchronisent)
    master: true,               // Ce widget est le master
    table: 'Widget_Sync',       // Nom de la table Grist pour persistance
    throttleMs: 33,             // Throttle pour broadcast (~30fps)
    debounceMs: 500             // Debounce pour sauvegarde Grist
});
```

### 2. SyncProperty

Abstraction d'une propriété synchronisée entre widgets.

**Structure :**
```javascript
class SyncProperty {
    name: string;                              // Identifiant unique
    get: () => any;                            // Getter de la valeur
    set: (value: any) => void;                 // Setter de la valeur
    transform?: Transform;                      // Transformation pour slaves
    serialize?: (value: any) => string;        // Sérialisation (défaut: JSON)
    deserialize?: (str: string) => any;        // Désérialisation
    throttle?: number;                         // Throttle spécifique (ms)
    persistent?: boolean;                      // Sauvegarder dans Grist (défaut: true)
}
```

**Exemple :**
```javascript
sync.register('camera', {
    get: () => ({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom
    }),
    set: (value) => {
        camera.position.fromArray(value.position);
        controls.target.fromArray(value.target);
        camera.zoom = value.zoom;
        controls.update();
    },
    transform: new Camera3DTransform({ d: 1.5, ry: 180 })
});
```

### 3. Transforms

Classes qui définissent comment transformer une valeur master en valeur slave.

**Interface :**
```javascript
class BaseTransform {
    constructor(params: object);
    apply(masterValue: any): any;    // Retourne la valeur transformée pour le slave
}
```

## Transforms disponibles

### IdentityTransform (défaut)

Aucune transformation, le slave reçoit la même valeur que le master.

```javascript
class IdentityTransform extends BaseTransform {
    apply(value) {
        return value;
    }
}
```

**Usage :** Sélection, filtres, état UI partagé.

### Camera3DTransform

Transformation de vue 3D avec position relative sur une sphère.

**Paramètres :**
| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `d` | number | 1 | Coefficient de distance |
| `rx` | number | 0 | Rotation élévation (degrés) |
| `ry` | number | 0 | Rotation azimut (degrés) |
| `ox` | number | 0 | Offset latéral (mètres) |
| `oy` | number | 0 | Offset profondeur (mètres) |
| `oz` | number | 0 | Offset vertical (mètres) |

**Mode miroir :**
- Valeur négative pour rx/ry active le mode miroir
- Miroir = mouvements inversés (master droite → slave gauche)

**Exemple :**
```javascript
// Vue opposée qui suit le master
new Camera3DTransform({ ry: 180 })

// Vue opposée avec mouvements miroir
new Camera3DTransform({ ry: -180 })

// Vue de dessus, 2x plus loin
new Camera3DTransform({ rx: 90, d: 2 })

// Vue décalée de 100m vers l'avant
new Camera3DTransform({ oy: 100 })
```

### Offset2DTransform

Décalage simple pour vues 2D (cartes).

**Paramètres :**
| Param | Type | Description |
|-------|------|-------------|
| `ox` | number | Offset X (mètres ou pixels) |
| `oy` | number | Offset Y (mètres ou pixels) |

**Exemple :**
```javascript
// Slave regarde 100m plus à l'est
new Offset2DTransform({ ox: 100, oy: 0 })
```

### ScaleTransform

Mise à l'échelle d'une valeur numérique.

**Paramètres :**
| Param | Type | Description |
|-------|------|-------------|
| `scale` | number | Facteur multiplicatif |
| `offset` | number | Décalage additionnel |

**Exemple :**
```javascript
// Slave affiche un zoom 2x plus large
new ScaleTransform({ scale: 0.5 })

// Slave affiche le slide suivant
new ScaleTransform({ scale: 1, offset: 1 })
```

### MirrorTransform

Inversion de valeur (utile pour axes).

**Paramètres :**
| Param | Type | Description |
|-------|------|-------------|
| `axis` | 'x' \| 'y' \| 'z' | Axe à inverser |
| `center` | number | Centre de la réflexion |

**Exemple :**
```javascript
// Miroir horizontal autour de x=500000
new MirrorTransform({ axis: 'x', center: 500000 })
```

## Flux de données

### Master → Slaves (temps réel)

```
1. Événement utilisateur (orbit, pan, click...)
      │
      ▼
2. Détection de changement
      │
      ▼
3. sync.emit('propertyName')
      │
      ▼
4. property.get() → valeur
      │
      ▼
5. Throttle (33ms)
      │
      ▼
6. BroadcastChannel.postMessage({
       type: 'sync',
       property: 'propertyName',
       value: serializedValue,
       masterId: 'xxx',
       channel: 'projet',
       ts: Date.now()
   })
      │
      ▼
7. [Slaves reçoivent]
      │
      ▼
8. property.transform.apply(value) → slaveValue
      │
      ▼
9. property.set(slaveValue)
```

### Persistance Grist

```
1. Événement 'end' (fin de mouvement)
      │
      ▼
2. Debounce (500ms)
      │
      ▼
3. Collecter toutes les propriétés persistantes
      │
      ▼
4. grist.docApi.applyUserActions([
       ['UpdateRecord', 'Widget_Sync', rowId, {
           Channel: 'projet',
           Property_camera: JSON.stringify(cameraValue),
           Property_selection: JSON.stringify(selectionValue),
           ...
           MasterId: 'xxx',
           UpdatedAt: timestamp
       }]
   ])
```

### Chargement initial (Slave)

```
1. Widget démarre
      │
      ▼
2. sync.connect()
      │
      ▼
3. Charger depuis table Grist (si existe)
      │
      ▼
4. Pour chaque propriété:
      property.transform.apply(savedValue)
      property.set(transformedValue)
      │
      ▼
5. Écouter BroadcastChannel pour updates
```

## Table Grist auto-créée

Le SyncManager crée automatiquement une table de synchronisation si elle n'existe pas.

**Structure :**
| Colonne | Type | Description |
|---------|------|-------------|
| `Channel` | Text | Identifiant du groupe |
| `Property_{name}` | Text | Valeur sérialisée (JSON) pour chaque propriété |
| `MasterId` | Text | ID unique du widget master |
| `UpdatedAt` | Numeric | Timestamp de dernière mise à jour |

**Exemple pour territoire-3d-component :**
| Channel | Property_camera | Property_url | Property_display | MasterId | UpdatedAt |
|---------|-----------------|--------------|------------------|----------|-----------|
| demo | {"px":700000,...} | "https://..." | "classification" | w1a2b3 | 1704700000 |

## Cas d'usage par widget

### territoire-3d-component

| Propriété | Type | Transform |
|-----------|------|-----------|
| `camera` | {position, target, zoom} | Camera3DTransform |
| `url` | string | Identity |
| `display` | string | Identity |

### geo-map / smart-gis

| Propriété | Type | Transform |
|-----------|------|-----------|
| `viewport` | {center, zoom, bounds} | Offset2DTransform |
| `selectedFeature` | number | Identity |
| `activeLayer` | string | Identity |

### scrollytelling

| Propriété | Type | Transform |
|-----------|------|-----------|
| `currentSlide` | number | ScaleTransform (offset) |
| `scrollPosition` | number | Identity |

### reveal-builder

| Propriété | Type | Transform |
|-----------|------|-----------|
| `slideIndex` | number | Identity |
| `fragmentIndex` | number | Identity |

### data-table (hypothétique)

| Propriété | Type | Transform |
|-----------|------|-----------|
| `selectedRow` | number | Identity |
| `sortColumn` | string | Identity |
| `filters` | object | Identity |

## API complète

### SyncManager

```javascript
class SyncManager {
    // Configuration
    constructor(options: SyncManagerOptions);

    // Enregistrement de propriétés
    register(name: string, property: SyncPropertyOptions): void;
    unregister(name: string): void;

    // Connexion
    async connect(): Promise<void>;
    disconnect(): void;

    // Émission (master only)
    emit(propertyName: string): void;
    emitAll(): void;

    // État
    getStatus(): SyncStatus;
    isConnected(): boolean;
    isMaster(): boolean;

    // Callbacks
    onStatusChange: (status: SyncStatus) => void;
    onError: (error: Error) => void;
}
```

### SyncPropertyOptions

```typescript
interface SyncPropertyOptions {
    get: () => any;
    set: (value: any) => void;
    transform?: BaseTransform;
    serialize?: (value: any) => string;
    deserialize?: (str: string) => any;
    throttle?: number;
    persistent?: boolean;
}
```

### SyncStatus

```typescript
interface SyncStatus {
    id: string;
    channel: string;
    isMaster: boolean;
    isConnected: boolean;
    properties: string[];
    lastSync: number;
    gristReady: boolean;
}
```

## Bonnes pratiques

### 1. Un seul master par channel

```javascript
// Widget A
new SyncManager({ channel: 'demo', master: true });

// Widget B, C, D
new SyncManager({ channel: 'demo', master: false });
```

### 2. Throttle adapté au type de donnée

```javascript
// Caméra 3D: 30fps suffisant
sync.register('camera', { throttle: 33, ... });

// Sélection: immédiat
sync.register('selection', { throttle: 0, ... });

// Filtres complexes: debounce
sync.register('filters', { throttle: 200, ... });
```

### 3. Transforms immuables

Les transforms ne doivent pas modifier la valeur originale :
```javascript
// BON
apply(value) {
    return { ...value, x: value.x + this.offset };
}

// MAUVAIS
apply(value) {
    value.x += this.offset;  // Mutation!
    return value;
}
```

### 4. Gestion des erreurs

```javascript
sync.onError = (error) => {
    console.error('Sync error:', error);
    showNotification('Synchronisation perdue');
};
```

### 5. Nettoyage à la destruction

```javascript
// Dans le cleanup du widget
window.addEventListener('beforeunload', () => {
    sync.disconnect();
});
```

## Migration depuis l'implémentation actuelle

Le `sync.js` de territoire-3d-component peut être refactoré pour utiliser cette architecture :

```javascript
// Avant (spécifique)
import { MultiViewSync } from './sync.js';
const sync = new MultiViewSync();
sync.connect(instance, controls);

// Après (générique)
import { SyncManager, Camera3DTransform } from '@grist-widgets/sync';

const sync = new SyncManager({
    channel: params.get('channel'),
    master: params.get('master') === 'true',
    table: 'T3D_Sync'
});

sync.register('camera', {
    get: () => ({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom
    }),
    set: (value) => {
        camera.position.fromArray(value.position);
        controls.target.fromArray(value.target);
        camera.zoom = value.zoom;
        controls.update();
        instance.notifyChange();
    },
    transform: new Camera3DTransform({
        d: parseFloat(params.get('d')) || 1,
        rx: parseFloat(params.get('rx')) || 0,
        ry: parseFloat(params.get('ry')) || 0,
        ox: parseFloat(params.get('ox')) || 0,
        oy: parseFloat(params.get('oy')) || 0,
        oz: parseFloat(params.get('oz')) || 0
    })
});

sync.register('url', {
    get: () => state.currentUrl,
    set: (url) => loadPointCloud(url)
});

sync.register('display', {
    get: () => state.currentDisplay,
    set: (mode) => setDisplayMode(mode)
});

await sync.connect();
```

---

## Presets : Configurations réutilisables

Les presets permettent de stocker des configurations nommées dans Grist et de les référencer par leur nom.

### Table des presets

Une table `Widget_Presets` stocke les configurations réutilisables :

| Colonne | Type | Description |
|---------|------|-------------|
| `Name` | Text | Nom unique du preset |
| `Widget` | Text | Type de widget (territoire-3d, geo-map, etc.) |
| `Channel` | Text | Channel de sync (optionnel) |
| `Params` | Text | JSON des paramètres |
| `Description` | Text | Description pour l'utilisateur |
| `CreatedAt` | DateTime | Date de création |

### Presets prédéfinis (exemple territoire-3d)

| Name | d | rx | ry | ox | oy | oz | Description |
|------|---|----|----|----|----|-----|-------------|
| `follow` | 1 | 0 | 0 | 0 | 0 | 0 | Suit le master (défaut) |
| `top` | 1 | 90 | 0 | 0 | 0 | 0 | Vue de dessus |
| `front` | 1 | 0 | 0 | 0 | 0 | 0 | Vue de face |
| `back` | 1 | 0 | 180 | 0 | 0 | 0 | Vue arrière |
| `left` | 1 | 0 | 270 | 0 | 0 | 0 | Vue de gauche |
| `right` | 1 | 0 | 90 | 0 | 0 | 0 | Vue de droite |
| `iso` | 1 | 45 | 45 | 0 | 0 | 0 | Vue isométrique |
| `opposite` | 1 | 0 | 180 | 0 | 0 | 0 | Vue opposée (sync) |
| `mirror` | 1 | 0 | -180 | 0 | 0 | 0 | Vue opposée (miroir) |
| `context` | 2 | 30 | 0 | 0 | 0 | 0 | Vue éloignée contexte |
| `detail` | 0.5 | 0 | 0 | 0 | 0 | 0 | Vue rapprochée détail |

### Usage des presets

```
# Via URL (simple)
?channel=demo&preset=top

# Via URL (avec override)
?channel=demo&preset=top&d=2

# Via table Grist
Widget_Config.Preset = "opposite"
```

### API Presets

```javascript
// Charger un preset
await config.loadPreset('top');

// Sauvegarder la config actuelle comme preset
await config.saveAsPreset('ma-vue-custom', {
    description: 'Vue personnalisée pour le projet X'
});

// Lister les presets disponibles
const presets = await config.listPresets();
// → ['follow', 'top', 'front', 'back', 'left', 'right', 'iso', 'opposite', 'mirror', 'context', 'detail', 'ma-vue-custom']

// Supprimer un preset
await config.deletePreset('ma-vue-custom');
```

### Presets dynamiques

Les presets peuvent aussi être générés dynamiquement :

```javascript
// Générer une grille de 4 vues
const gridPresets = [
    { name: 'grid-nw', ox: -100, oy: 100 },
    { name: 'grid-ne', ox: 100, oy: 100 },
    { name: 'grid-sw', ox: -100, oy: -100 },
    { name: 'grid-se', ox: 100, oy: -100 }
];

// Générer une rotation 360° en N vues
function generate360Presets(n) {
    return Array.from({ length: n }, (_, i) => ({
        name: `rot-${i}`,
        ry: (360 / n) * i
    }));
}
```

---

## Structure de fichiers proposée

```
packages/
  widget-core/                      # Package partagé
    src/
      config/
        WidgetConfig.js             # Gestionnaire de configuration
        ParamDefinition.js          # Définition de paramètre
        sources/
          URLParamsSource.js        # Lecture URL
          GristTableSource.js       # Lecture table Grist
          GristOptionsSource.js     # Lecture options widget
          SyncSource.js             # Lecture depuis sync channel
        PresetManager.js            # Gestion des presets

      sync/
        SyncManager.js              # Gestionnaire de synchronisation
        SyncProperty.js             # Propriété synchronisée
        adapters/
          BroadcastAdapter.js       # Communication temps réel
          GristTableAdapter.js      # Persistance Grist

      transforms/
        BaseTransform.js
        Camera3DTransform.js
        Offset2DTransform.js
        ScaleTransform.js
        MirrorTransform.js

      index.js                      # Exports publics
    package.json

  territoire-3d-component/
    src/
      main.js
      sync.js  →  import { SyncManager, Camera3DTransform } from 'widget-core'
      config.js → import { WidgetConfig } from 'widget-core'
```

---

## Exemple complet d'intégration

```javascript
import { WidgetConfig, SyncManager, Camera3DTransform } from '@grist-widgets/core';

// === CONFIGURATION ===
const config = new WidgetConfig({
    tableName: 'Widget_Config',
    presetsTable: 'Widget_Presets'
});

// Paramètres de sync
config.define('channel', { type: 'string', default: 'default', sources: ['url'] });
config.define('master', { type: 'boolean', default: false, sources: ['url'] });

// Paramètres de vue
config.define('d', { type: 'number', default: 1, sources: ['url', 'table', 'default'], persistent: true });
config.define('rx', { type: 'number', default: 0, sources: ['url', 'table', 'default'], persistent: true });
config.define('ry', { type: 'number', default: 0, sources: ['url', 'table', 'default'], persistent: true });
config.define('ox', { type: 'number', default: 0, sources: ['url', 'table', 'default'], persistent: true });
config.define('oy', { type: 'number', default: 0, sources: ['url', 'table', 'default'], persistent: true });
config.define('oz', { type: 'number', default: 0, sources: ['url', 'table', 'default'], persistent: true });

// Paramètre de preset
config.define('preset', {
    type: 'string',
    default: null,
    sources: ['url', 'table'],
    onSet: (name) => config.loadPreset(name)
});

// Charger la configuration
await config.load();

// === SYNCHRONISATION ===
const sync = new SyncManager({
    channel: config.get('channel'),
    master: config.get('master'),
    table: 'Widget_Sync'
});

// Propriété camera avec transformation basée sur la config
sync.register('camera', {
    get: () => ({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom
    }),
    set: (value) => {
        camera.position.fromArray(value.position);
        controls.target.fromArray(value.target);
        camera.zoom = value.zoom;
        controls.update();
    },
    transform: new Camera3DTransform({
        d: config.get('d'),
        rx: config.get('rx'),
        ry: config.get('ry'),
        ox: config.get('ox'),
        oy: config.get('oy'),
        oz: config.get('oz')
    })
});

// Autres propriétés
sync.register('url', { get: () => state.url, set: loadUrl });
sync.register('display', { get: () => state.display, set: setDisplay });

// Connecter
await sync.connect();

// === RÉACTIVITÉ ===
// Si la config change (ex: utilisateur modifie dans Grist), mettre à jour le transform
config.onAnyChange((name, value) => {
    if (['d', 'rx', 'ry', 'ox', 'oy', 'oz'].includes(name)) {
        sync.updateTransform('camera', new Camera3DTransform({
            d: config.get('d'),
            rx: config.get('rx'),
            ry: config.get('ry'),
            ox: config.get('ox'),
            oy: config.get('oy'),
            oz: config.get('oz')
        }));
    }
});
```

---

## Roadmap

1. **Phase 1** : Créer le package `widget-core` avec WidgetConfig
2. **Phase 2** : Extraire SyncManager de sync.js
3. **Phase 3** : Implémenter les transforms
4. **Phase 4** : Ajouter le système de presets
5. **Phase 5** : Migrer territoire-3d-component
6. **Phase 6** : Migrer geo-map et smart-gis
7. **Phase 7** : Documentation et exemples
