# Cas d'Usage de l'Architecture de Synchronisation

Ce document explore l'application de l'architecture master/slave à différents types de widgets et de données.

## Table des matières

1. [Cartographie 2D](#1-cartographie-2d)
2. [Visualisation de données](#2-visualisation-de-données)
3. [Tableaux et grilles](#3-tableaux-et-grilles)
4. [Médias synchronisés](#4-médias-synchronisés)
5. [Formulaires et wizards](#5-formulaires-et-wizards)
6. [Dashboards coordonnés](#6-dashboards-coordonnés)
7. [Comparaison temporelle](#7-comparaison-temporelle)
8. [Collaboration temps réel](#8-collaboration-temps-réel)

---

## 1. Cartographie 2D

### Widgets concernés
- geo-map, smart-gis, smart-gis-v2

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `viewport` | {center, zoom, bounds} | Position de la carte |
| `selectedFeature` | number/array | Entité(s) sélectionnée(s) |
| `activeLayer` | string | Couche active |
| `visibleLayers` | string[] | Couches visibles |
| `filters` | object | Filtres actifs |
| `drawingMode` | string | Mode d'édition |

### Transforms adaptés

```javascript
// Vue décalée (grille de cartes)
class Viewport2DTransform extends BaseTransform {
    constructor({ ox = 0, oy = 0, zoomOffset = 0 }) {
        this.ox = ox;           // Décalage en mètres
        this.oy = oy;
        this.zoomOffset = zoomOffset;
    }

    apply({ center, zoom, bounds }) {
        return {
            center: [center[0] + this.ox, center[1] + this.oy],
            zoom: zoom + this.zoomOffset,
            bounds: null  // Recalculé automatiquement
        };
    }
}
```

### Configurations typiques

#### Grille 2x2 (couverture étendue)
```
┌─────────┬─────────┐
│ NW      │ NE      │
│ ox=-1km │ ox=+1km │
│ oy=+1km │ oy=+1km │
├─────────┼─────────┤
│ SW      │ SE      │
│ ox=-1km │ ox=+1km │
│ oy=-1km │ oy=-1km │
└─────────┴─────────┘
```

```
# Master (centre)
?master=true&channel=grid

# Slaves
?channel=grid&ox=-1000&oy=1000   # NW
?channel=grid&ox=1000&oy=1000    # NE
?channel=grid&ox=-1000&oy=-1000  # SW
?channel=grid&ox=1000&oy=-1000   # SE
```

#### Comparaison multi-sources
```
# Master - IGN Ortho
?master=true&channel=compare&layer=ortho

# Slave 1 - OSM
?channel=compare&layer=osm

# Slave 2 - Cadastre
?channel=compare&layer=cadastre

# Slave 3 - Plan IGN
?channel=compare&layer=plan
```

#### Contexte + Détail
```
# Master - Vue détaillée (zoom 18)
?master=true&channel=detail

# Slave - Vue contexte (zoom 14)
?channel=detail&zoomOffset=-4
```

---

## 2. Visualisation de données

### Widgets concernés
- Graphiques (bar, line, pie, scatter)
- Jauges, KPIs
- Heatmaps

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `selection` | any[] | Points/barres sélectionnés |
| `timeRange` | {start, end} | Période affichée |
| `aggregation` | string | Niveau d'agrégation |
| `metric` | string | Métrique affichée |
| `highlight` | any | Élément survolé |

### Transforms adaptés

```javascript
// Décalage temporel (comparaison période)
class TimeRangeTransform extends BaseTransform {
    constructor({ offsetDays = 0, offsetMonths = 0, offsetYears = 0 }) {
        this.offsetMs = offsetDays * 86400000 +
                        offsetMonths * 30 * 86400000 +
                        offsetYears * 365 * 86400000;
    }

    apply({ start, end }) {
        return {
            start: start - this.offsetMs,
            end: end - this.offsetMs
        };
    }
}

// Agrégation différente
class AggregationTransform extends BaseTransform {
    constructor({ level }) {
        // 'hour' < 'day' < 'week' < 'month' < 'year'
        this.level = level;
    }

    apply(masterAggregation) {
        return this.level;  // Force un niveau spécifique
    }
}
```

### Configurations typiques

#### Comparaison année N vs N-1
```
┌─────────────────────┬─────────────────────┐
│  Ventes 2024        │  Ventes 2023        │
│  (master)           │  (slave -1 an)      │
│  ████████████       │  ██████████         │
└─────────────────────┴─────────────────────┘
```

```javascript
// Master - Année courante
sync.register('timeRange', {
    get: () => state.timeRange,
    set: (range) => setTimeRange(range)
});

// Slave - Année précédente
sync.register('timeRange', {
    get: () => state.timeRange,
    set: (range) => setTimeRange(range),
    transform: new TimeRangeTransform({ offsetYears: -1 })
});
```

#### Multi-métriques synchronisées
```
┌─────────────────┬─────────────────┬─────────────────┐
│  Chiffre        │  Marge          │  Volume         │
│  d'affaires     │                 │                 │
│  (master)       │  (slave)        │  (slave)        │
└─────────────────┴─────────────────┴─────────────────┘
      │                 │                 │
      └────────── Même sélection ─────────┘
              Même période
```

---

## 3. Tableaux et grilles

### Widgets concernés
- Data tables, grilles éditables
- Listes avec détail

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `selectedRows` | number[] | Lignes sélectionnées |
| `sortColumn` | string | Colonne de tri |
| `sortDirection` | 'asc'/'desc' | Direction du tri |
| `filters` | object | Filtres colonnes |
| `scrollPosition` | number | Position scroll |
| `pageIndex` | number | Page courante |
| `expandedRows` | number[] | Lignes dépliées |

### Transforms adaptés

```javascript
// Navigation relative (page suivante/précédente)
class PageOffsetTransform extends BaseTransform {
    constructor({ offset = 0 }) {
        this.offset = offset;
    }

    apply(pageIndex) {
        return Math.max(0, pageIndex + this.offset);
    }
}

// Tri inverse
class SortInverseTransform extends BaseTransform {
    apply({ column, direction }) {
        return {
            column,
            direction: direction === 'asc' ? 'desc' : 'asc'
        };
    }
}
```

### Configurations typiques

#### Liste-Détail synchronisé
```
┌─────────────────────┬─────────────────────────────────┐
│ Liste (master)      │  Détail (slave)                 │
│                     │                                 │
│ > Ligne 1          │  ┌─────────────────────────────┐│
│   Ligne 2           │  │  Détails de Ligne 1        ││
│   Ligne 3           │  │  Champ A: valeur           ││
│   Ligne 4           │  │  Champ B: valeur           ││
│                     │  └─────────────────────────────┘│
└─────────────────────┴─────────────────────────────────┘
```

```javascript
// Propriété partagée: sélection
sync.register('selectedRows', {
    get: () => state.selected,
    set: (rows) => loadDetail(rows[0])  // Charge le détail du premier
});
```

#### Tri bidirectionnel (comparaison top/bottom)
```
┌─────────────────────┬─────────────────────┐
│ Top 10 (master)     │ Bottom 10 (slave)   │
│ Tri: valeur DESC    │ Tri: valeur ASC     │
│                     │                     │
│ 1. Item A  1000    │ 1. Item Z    10     │
│ 2. Item B   950    │ 2. Item Y    15     │
│ ...                 │ ...                 │
└─────────────────────┴─────────────────────┘
```

---

## 4. Médias synchronisés

### Widgets concernés
- Lecteurs vidéo/audio
- Panoramax, vues 360°
- Timelines

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `currentTime` | number | Position de lecture (ms) |
| `playbackState` | 'playing'/'paused' | État lecture |
| `playbackRate` | number | Vitesse de lecture |
| `volume` | number | Volume (0-1) |
| `viewAngle` | {yaw, pitch} | Angle de vue (360°) |

### Transforms adaptés

```javascript
// Décalage temporel (multi-caméra)
class MediaTimeTransform extends BaseTransform {
    constructor({ offsetMs = 0, scale = 1 }) {
        this.offsetMs = offsetMs;
        this.scale = scale;
    }

    apply(currentTime) {
        return currentTime * this.scale + this.offsetMs;
    }
}

// Vue opposée (360°)
class View360Transform extends BaseTransform {
    constructor({ yawOffset = 0, pitchOffset = 0 }) {
        this.yawOffset = yawOffset;
        this.pitchOffset = pitchOffset;
    }

    apply({ yaw, pitch }) {
        return {
            yaw: (yaw + this.yawOffset) % 360,
            pitch: Math.max(-90, Math.min(90, pitch + this.pitchOffset))
        };
    }
}
```

### Configurations typiques

#### Multi-caméra synchronisée
```
┌──────────────────┬──────────────────┬──────────────────┐
│ Caméra 1         │ Caméra 2         │ Caméra 3         │
│ (master)         │ (+2s offset)     │ (+5s offset)     │
│ 00:15:30         │ 00:15:32         │ 00:15:35         │
└──────────────────┴──────────────────┴──────────────────┘
```

#### Panoramax multi-angle
```
┌──────────────────┬──────────────────┐
│ Vue avant        │ Vue arrière      │
│ (master)         │ (yaw +180°)      │
│                  │                  │
└──────────────────┴──────────────────┘
```

---

## 5. Formulaires et wizards

### Widgets concernés
- Formulaires multi-étapes
- Wizards de configuration
- Éditeurs avec preview

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `currentStep` | number | Étape actuelle |
| `formValues` | object | Valeurs du formulaire |
| `validationState` | object | État de validation |
| `focusedField` | string | Champ actif |

### Transforms adaptés

```javascript
// Preview temps réel (formulaire → résultat)
class FormPreviewTransform extends BaseTransform {
    constructor({ template }) {
        this.template = template;
    }

    apply(formValues) {
        // Génère le preview à partir des valeurs
        return this.template.render(formValues);
    }
}

// Étape suivante (wizard multi-panel)
class StepOffsetTransform extends BaseTransform {
    constructor({ offset = 1, max = Infinity }) {
        this.offset = offset;
        this.max = max;
    }

    apply(step) {
        return Math.min(this.max, Math.max(0, step + this.offset));
    }
}
```

### Configurations typiques

#### Éditeur avec preview live
```
┌─────────────────────┬─────────────────────┐
│ Éditeur (master)    │ Preview (slave)     │
│                     │                     │
│ Titre: [Mon doc  ]  │  ┌─────────────┐   │
│ Contenu:            │  │ Mon doc     │   │
│ [Lorem ipsum...]    │  │             │   │
│                     │  │ Lorem ipsum │   │
└─────────────────────┴──┴─────────────┴───┘
```

#### Wizard avec récapitulatif
```
┌─────────────────────┬─────────────────────┐
│ Wizard (master)     │ Récap (slave)       │
│                     │                     │
│ Étape 2/4           │ ✓ Étape 1: OK      │
│ [Formulaire...]     │ → Étape 2: En cours │
│                     │ ○ Étape 3: À faire  │
│ [Suivant]           │ ○ Étape 4: À faire  │
└─────────────────────┴─────────────────────┘
```

---

## 6. Dashboards coordonnés

### Principe

Un dashboard peut utiliser un widget "contrôleur" master qui synchronise tous les autres widgets slaves (filtres globaux).

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `globalFilters` | object | Filtres appliqués partout |
| `selectedEntity` | any | Entité sélectionnée (cross-filter) |
| `dateRange` | {start, end} | Période globale |
| `comparePeriod` | boolean | Mode comparaison activé |
| `drilldownPath` | string[] | Chemin de drill-down |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CONTRÔLEUR (master)                     │
│  [Période: 2024 ▼]  [Région: IDF ▼]  [Statut: Tous ▼]  │
└─────────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   KPI 1     │  │  Graphique  │  │    Carte    │
│   (slave)   │  │   (slave)   │  │   (slave)   │
└─────────────┘  └─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Tableau   │  │  Timeline   │  │   Détail    │
│   (slave)   │  │   (slave)   │  │   (slave)   │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Cross-filtering

Chaque widget peut aussi émettre des sélections qui affectent les autres :

```javascript
// Widget graphique - émet une sélection au clic
sync.register('crossFilter', {
    get: () => state.selectedBar,
    set: (filter) => applyFilter(filter),
    // Pas de transform - valeur identique partout
});

// Au clic sur une barre
onBarClick(bar) {
    state.selectedBar = { dimension: 'category', value: bar.category };
    sync.emit('crossFilter');
}
```

---

## 7. Comparaison temporelle

### Principe

Comparer des données à différentes périodes avec la même navigation.

### Configurations

#### Avant/Après (2 vues)
```
┌─────────────────────┬─────────────────────┐
│ AVANT (2020)        │ APRÈS (2024)        │
│ (slave -4 ans)      │ (master)            │
│                     │                     │
│   [Carte/Image]     │   [Carte/Image]     │
│                     │                     │
└─────────────────────┴─────────────────────┘
        ↑                     ↑
        └───── Même viewport ─┘
              Même zoom
              Même sélection
```

#### Timeline glissante (N vues)
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  -4 ans │  -3 ans │  -2 ans │  -1 an  │ Actuel  │
│  2020   │  2021   │  2022   │  2023   │  2024   │
│         │         │         │         │ (master)│
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

```javascript
// Configuration automatique pour N années
function createTimelineSync(years) {
    return years.map((year, i) => ({
        channel: 'timeline',
        master: i === years.length - 1,  // Dernière année = master
        transform: new TimeRangeTransform({
            offsetYears: year - years[years.length - 1]
        })
    }));
}

const configs = createTimelineSync([2020, 2021, 2022, 2023, 2024]);
```

### Application aux widgets existants

#### territoire-3d : Évolution urbaine
- Master: LiDAR 2024
- Slaves: LiDAR 2021, 2019 (si disponibles)
- Même position de caméra, données différentes

#### smart-gis : Évolution cadastrale
- Master: Cadastre actuel
- Slave: Cadastre historique
- Highlight des parcelles modifiées

---

## 8. Collaboration temps réel

### Principe

Plusieurs utilisateurs voient les actions des autres en temps réel.

### Propriétés synchronisables

| Propriété | Type | Description |
|-----------|------|-------------|
| `cursor` | {x, y, userId, color} | Position curseur utilisateur |
| `selection` | {items, userId} | Sélection utilisateur |
| `editing` | {field, userId} | Champ en cours d'édition |
| `presence` | User[] | Utilisateurs présents |

### Architecture multi-master

Dans ce cas, tous les widgets sont à la fois master ET slave :

```javascript
const sync = new SyncManager({
    channel: `collab-${documentId}`,
    master: true,  // Tous émettent
    acceptMasterUpdates: true  // Tous reçoivent aussi
});

// Curseur local
sync.register('cursor', {
    get: () => ({
        x: mouse.x,
        y: mouse.y,
        userId: currentUser.id,
        color: currentUser.color
    }),
    set: (cursor) => {
        if (cursor.userId !== currentUser.id) {
            remoteCursors.set(cursor.userId, cursor);
            renderRemoteCursor(cursor);
        }
    }
});
```

### Gestion des conflits

```javascript
// Verrouillage optimiste d'une cellule
sync.register('editing', {
    get: () => state.editingCell,
    set: (edit) => {
        if (edit.userId !== currentUser.id) {
            // Quelqu'un d'autre édite cette cellule
            lockCell(edit.field);
            showEditingIndicator(edit.field, edit.userId);
        }
    }
});

// Avant de commencer à éditer
async function startEdit(field) {
    const current = sync.getValue('editing');
    if (current && current.field === field && current.userId !== currentUser.id) {
        showConflictWarning(`${current.userId} édite déjà ce champ`);
        return false;
    }
    state.editingCell = { field, userId: currentUser.id };
    sync.emit('editing');
    return true;
}
```

---

## Synthèse des Transforms

| Transform | Usage | Paramètres |
|-----------|-------|------------|
| `IdentityTransform` | Valeur identique | - |
| `Camera3DTransform` | Vue 3D relative | d, rx, ry, ox, oy, oz |
| `Viewport2DTransform` | Carte 2D décalée | ox, oy, zoomOffset |
| `TimeRangeTransform` | Période décalée | offsetDays/Months/Years |
| `ScaleTransform` | Valeur mise à l'échelle | scale, offset |
| `MirrorTransform` | Valeur inversée | axis, center |
| `PageOffsetTransform` | Page relative | offset |
| `View360Transform` | Angle 360° décalé | yawOffset, pitchOffset |
| `MediaTimeTransform` | Temps média décalé | offsetMs, scale |

---

## Patterns réutilisables

### 1. Comparaison côte à côte
```javascript
// 2+ vues du même élément avec paramètres différents
{ transform: IdentityTransform }  // Même position/sélection
{ dataSource: different }         // Données/couches différentes
```

### 2. Contexte + Détail
```javascript
// Vue principale + vue éloignée/rapprochée
{ transform: new ScaleTransform({ scale: 2 }) }  // Zoom 2x plus large
```

### 3. Grille de couverture
```javascript
// N vues couvrant une zone plus large
{ transform: new Offset2DTransform({ ox: i * width, oy: j * height }) }
```

### 4. Timeline/Historique
```javascript
// Même vue à différentes périodes
{ transform: new TimeRangeTransform({ offsetYears: -n }) }
```

### 5. Multi-angle (360°/3D)
```javascript
// Vues autour du même sujet
{ transform: new Camera3DTransform({ ry: n * 90 }) }
```

### 6. Cross-filter dashboard
```javascript
// Tous les widgets réagissent à une sélection
{ transform: IdentityTransform }  // Filtre propagé tel quel
```

---

## Prochaines étapes

1. **Implémenter les transforms manquants** dans widget-core
2. **Ajouter le support multi-master** pour la collaboration
3. **Créer des presets par type de widget** (geo, chart, table, media)
4. **Documenter les patterns** avec exemples visuels
5. **Tester avec smart-gis** comme second widget synchronisé
