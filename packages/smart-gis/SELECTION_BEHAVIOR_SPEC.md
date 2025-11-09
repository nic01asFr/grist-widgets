# Spécification : Comportements de Sélection sur Carte

## 🎯 Objectif

Définir tous les comportements de sélection d'entités depuis la carte en fonction du contexte (couche active, mode, outils).

---

## 📊 États et Contextes

### 1. États Globaux

| État | Valeurs Possibles | Description |
|------|------------------|-------------|
| **Mode** | `view` / `edit` / `select` | Mode actuel du widget |
| **Couche Active** | `null` / `layer_id` | Couche sélectionnée dans le menu |
| **Outil Actif** | `pointer` / `rectangle` / `lasso` / `circle` | Outil de sélection |
| **Modificateur** | `none` / `ctrl` / `shift` | Touche clavier enfoncée |

### 2. États de Sélection

| État | Description |
|------|-------------|
| **Sélection Vide** | Aucune entité sélectionnée |
| **Sélection Simple** | 1 entité sélectionnée |
| **Sélection Multiple** | 2+ entités sélectionnées |
| **Sélection Couche** | Toutes les entités d'une couche |

---

## 🖱️ Comportements de Sélection

### 1. Clic Simple sur Entité

#### Cas 1.1 : Pas de couche active
```
État Initial : Couche Active = null
Action       : Clic sur entité E1 (couche "Bâtiments")
Résultat     :
  - E1 sélectionnée
  - Couche "Bâtiments" devient active automatiquement
  - Panneau "Détails Entité" s'ouvre à droite
  - Menu déroule la couche "Bâtiments"
  - Carte recentre sur E1 (zoom léger)
```

#### Cas 1.2 : Couche active = couche de l'entité
```
État Initial : Couche Active = "Bâtiments"
Action       : Clic sur entité E1 (couche "Bâtiments")
Résultat     :
  - E1 sélectionnée (remplace sélection précédente)
  - Panneau "Détails Entité" affiche E1
  - Highlight E1 sur carte
```

#### Cas 1.3 : Couche active ≠ couche de l'entité
```
État Initial : Couche Active = "Routes"
Action       : Clic sur entité E1 (couche "Bâtiments")
Options      :

  Option A (Strict) :
    - Clic ignoré
    - Toast : "Couche 'Routes' active. Cliquez sur une entité de cette couche."

  Option B (Flexible - RECOMMANDÉ) :
    - E1 sélectionnée
    - Couche Active passe à "Bâtiments"
    - Toast : "Couche basculée vers 'Bâtiments'"
```

**⭐ Recommandation : Option B (Flexible)**

#### Cas 1.4 : Clic avec Ctrl (ajout à sélection)
```
État Initial : E1 sélectionnée (couche "Bâtiments")
Action       : Ctrl + Clic sur E2 (couche "Bâtiments")
Résultat     :
  - E1 ET E2 sélectionnées
  - Panneau "Détails Entités" affiche liste [E1, E2]
  - Carte affiche les deux avec highlight
```

#### Cas 1.5 : Clic avec Ctrl sur entité déjà sélectionnée
```
État Initial : [E1, E2, E3] sélectionnées
Action       : Ctrl + Clic sur E2
Résultat     :
  - E2 désélectionnée
  - Sélection = [E1, E3]
```

#### Cas 1.6 : Clic avec Shift (sélection plage)
```
État Initial : E1 sélectionnée (ID = 100)
Action       : Shift + Clic sur E5 (ID = 104)
Résultat     :
  - Sélection = [E1, E2, E3, E4, E5] (plage ID 100-104)
  - Uniquement dans la même couche
```

---

### 2. Sélection Rectangle (Outil Rectangle)

#### Cas 2.1 : Pas de couche active
```
État Initial : Couche Active = null
Action       : Tracer rectangle englobant E1, E2 (couche A) et E3 (couche B)
Résultat     :
  - Toutes les entités dans le rectangle sont sélectionnées (multi-couches)
  - Toast : "3 entités sélectionnées (2 couches)"
  - Panneau "Sélection Multiple" affiche liste groupée par couche
  - Aucune couche n'est activée
```

#### Cas 2.2 : Couche active définie
```
État Initial : Couche Active = "Bâtiments"
Action       : Tracer rectangle englobant E1, E2 (Bâtiments) et E3 (Routes)
Résultat     :
  - Seules E1 et E2 sont sélectionnées (filtre par couche active)
  - E3 ignorée (couche différente)
  - Toast : "2 entités sélectionnées dans 'Bâtiments'"
```

#### Cas 2.3 : Rectangle + Ctrl (ajout à sélection)
```
État Initial : [E1] sélectionnée
Action       : Ctrl + Rectangle sur [E2, E3, E4]
Résultat     :
  - Sélection = [E1, E2, E3, E4]
  - Pas de désélection
```

#### Cas 2.4 : Rectangle + Shift (intersection)
```
État Initial : [E1, E2, E3, E4, E5] sélectionnées
Action       : Shift + Rectangle sur [E3, E4, E5, E6]
Résultat     :
  - Sélection = [E3, E4, E5] (intersection)
```

---

### 3. Sélection Lasso (Forme Libre)

**Même comportement que Rectangle**, mais avec forme libre tracée à la souris.

#### Activation
```
1. Clic sur bouton "Lasso" dans barre outils
2. Tracer forme libre sur carte
3. Relâcher pour finaliser
4. Entités englobées = sélectionnées
```

---

### 4. Sélection Circle (Rayon)

#### Activation
```
1. Clic sur bouton "Circle" dans barre outils
2. Clic sur carte = centre
3. Déplacer souris = rayon
4. Clic = finaliser
5. Entités dans cercle = sélectionnées
```

**Comportement : identique à Rectangle**

---

### 5. Sélection depuis Menu/Liste

#### Cas 5.1 : Clic sur entité dans liste
```
Menu > Couches > "Bâtiments" > [Voir entités] > Clic sur E1
Résultat :
  - E1 sélectionnée
  - Carte recentre sur E1
  - Highlight E1
  - Couche "Bâtiments" active
```

#### Cas 5.2 : Checkbox multiple dans liste
```
Menu > Couches > "Bâtiments" > [Voir entités] > [✓] E1, E2, E3
Résultat :
  - [E1, E2, E3] sélectionnées
  - Carte ajuste emprise pour montrer les 3
  - Highlight multiple
```

#### Cas 5.3 : Clic sur couche entière
```
Menu > Couches > "Bâtiments" > [Sélectionner tout]
Résultat :
  - Toutes les entités de "Bâtiments" sélectionnées
  - Toast : "1,234 entités sélectionnées"
  - Carte ajuste emprise sur toute la couche
```

---

### 6. Sélection depuis Recherche

#### Cas 6.1 : Recherche textuelle
```
Input Recherche : "Mairie"
Résultat :
  - Liste suggestions affichée
  - Clic sur suggestion "Bâtiment #123 - Mairie"
  → E123 sélectionnée
  → Carte recentre sur E123
  → Couche active = couche de E123
```

#### Cas 6.2 : Recherche sémantique
```
Input Recherche : "bâtiments publics"
Résultat (sémantique) :
  - 15 résultats trouvés
  - Clic sur "Voir tous les résultats"
  → [E1...E15] sélectionnées
  → Carte ajuste emprise sur ensemble
  → Panneau "Sélection Multiple" ouvert
```

---

## 🛠️ Outils de Sélection

### Barre d'Outils Sélection (Au-dessus carte)

```
┌──────────────────────────────────────────────────────────────┐
│ 🎯 Sélection : Bâtiments  [👆][▢][⭕][✏️] [×] 3 sélectionnées │
└──────────────────────────────────────────────────────────────┘
```

**Boutons** :
- `👆` : Pointeur (sélection au clic)
- `▢` : Rectangle
- `⭕` : Cercle
- `✏️` : Lasso (forme libre)
- `×` : Tout désélectionner
- `3 sélectionnées` : Compteur + clic ouvre panneau détails

### Activation
- Automatique en mode `view` (toujours disponible)
- Si couche active → filtre par couche
- Sinon → sélection multi-couches

---

## 🎨 Feedback Visuel

### Sur la Carte

#### Entité Normale (Non Sélectionnée)
```css
{
  fillOpacity: 0.3,
  weight: 2,
  color: layerColor
}
```

#### Entité Sélectionnée
```css
{
  fillOpacity: 0.6,          // +100%
  weight: 4,                 // +100%
  color: '#f39c12',          // Orange
  dashArray: '5, 5'          // Pointillés
}
```

#### Entité Hover
```css
{
  fillOpacity: 0.45,         // +50%
  weight: 3,                 // +50%
  color: layerColor,
  cursor: 'pointer'
}
```

#### Zone de Sélection (Rectangle/Lasso/Circle)
```css
{
  fillColor: '#3498db',
  fillOpacity: 0.1,
  color: '#3498db',
  weight: 2,
  dashArray: '5, 5'
}
```

### Dans le Menu

#### Entité Sélectionnée dans Liste
```
[●] Bâtiment #123          ← Fond bleu clair
    48.8566, 2.3522
    [👁️] [🎨] [📍] [🗑️]
```

#### Couche avec Entités Sélectionnées
```
▼ Bâtiments (3/1,234)      ← Badge orange "3"
```

---

## 📋 Actions sur Sélection Multiple

### Menu Contextuel (Clic Droit sur Sélection)
```
┌─────────────────────────┐
│ 3 entités sélectionnées │
├─────────────────────────┤
│ 🎨 Appliquer style      │
│ 📋 Copier               │
│ ✂️ Couper               │
│ 🗑️ Supprimer            │
│ 📊 Statistiques         │
│ 📤 Exporter             │
│ ─────────────────────   │
│ 🔍 Zoomer sur sélection │
│ × Tout désélectionner   │
└─────────────────────────┘
```

### Barre d'Actions (Bas de la carte)
```
┌──────────────────────────────────────────────────────────┐
│ 3 entités sélectionnées                                  │
│ [🎨 Style] [📋 Copier] [🗑️ Supprimer] [📤 Exporter] [×] │
└──────────────────────────────────────────────────────────┘
```

**Apparaît seulement si sélection active**

---

## 🔄 États de Sélection Persistants

### Comportement Mémoire

#### Changement de Couche Active
```
État Initial : Couche "Bâtiments", [E1, E2] sélectionnées
Action       : Changer couche active → "Routes"
Résultat     :
  - [E1, E2] restent sélectionnées
  - Highlight maintenu
  - Toast : "Sélection préservée (2 entités dans 'Bâtiments')"
  - Possibilité de sélectionner aussi dans "Routes" avec Ctrl
```

#### Changement de Mode (View → Edit)
```
État Initial : Mode view, [E1, E2] sélectionnées
Action       : Passer en mode edit
Résultat     :
  - Sélection conservée
  - Actions édition disponibles sur sélection
```

#### Fermeture/Ouverture Menu
```
État Initial : [E1, E2] sélectionnées, menu ouvert
Action       : Fermer menu
Résultat     :
  - Sélection conservée
  - Highlight maintenu
  - Compteur affiché dans coin carte
```

---

## 🎯 Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + A` | Sélectionner tout (couche active ou tout) |
| `Ctrl + Clic` | Ajouter/Retirer de sélection |
| `Shift + Clic` | Sélection plage (par ID) |
| `Shift + Drag` | Rectangle sélection (intersection) |
| `Échap` | Tout désélectionner |
| `Suppr` | Supprimer sélection (avec confirmation) |
| `Ctrl + C` | Copier sélection |
| `Ctrl + V` | Coller |
| `F` | Zoomer sur sélection (Fit) |

---

## 🧪 Cas d'Usage Complets

### Scénario 1 : Sélection Simple pour Édition

```
1. User ouvre widget → mode view
2. Clic sur "Bâtiments" dans menu → couche active
3. Clic sur entité E1 sur carte → E1 sélectionnée
4. Panneau "Détails" s'ouvre → affiche propriétés E1
5. User clique [🎨 Éditer style]
6. Panneau "Style" s'ouvre avec pickers
7. Change couleur → aperçu temps réel
8. Clique [Appliquer] → E1 mise à jour
```

### Scénario 2 : Sélection Multiple pour Export

```
1. User active outil Rectangle
2. Trace rectangle sur zone → 15 entités sélectionnées
3. Barre actions apparaît : "15 entités sélectionnées"
4. Clique [📤 Exporter]
5. Dialogue export : format GeoJSON / KML / CSV
6. Choix GeoJSON → téléchargement selection.geojson
```

### Scénario 3 : Recherche puis Sélection

```
1. User tape "écoles" dans recherche
2. 23 résultats affichés (sémantique + texte)
3. Clique "Voir tous (23)"
4. 23 entités sélectionnées
5. Carte zoom sur emprise globale
6. User clique [🎨 Style] → applique style groupe
7. Toutes les écoles deviennent vertes
```

### Scénario 4 : Sélection Multi-Couches

```
1. Pas de couche active (null)
2. Ctrl + Clic sur E1 (Bâtiments)
3. Ctrl + Clic sur E2 (Routes)
4. Ctrl + Clic sur E3 (Zones)
5. Sélection = [E1, E2, E3] (3 couches)
6. Panneau "Sélection Multiple" groupe par couche
7. Actions communes disponibles (suppr, export)
```

---

## 🚀 Implémentation Technique

### Hook `useMapSelection`

```jsx
const useMapSelection = (records, activeLayer) => {
  const [selection, setSelection] = useState([]);
  const [selectionMode, setSelectionMode] = useState('pointer'); // pointer | rectangle | lasso | circle

  const selectEntity = (entityId, modifier = 'none') => {
    if (modifier === 'ctrl') {
      // Toggle in selection
      setSelection(prev =>
        prev.includes(entityId)
          ? prev.filter(id => id !== entityId)
          : [...prev, entityId]
      );
    } else if (modifier === 'shift') {
      // Range selection
      const lastSelected = selection[selection.length - 1];
      const range = getIDRange(lastSelected, entityId, records);
      setSelection(range);
    } else {
      // Replace selection
      setSelection([entityId]);
    }
  };

  const selectInBounds = (bounds, modifier = 'none') => {
    const entitiesInBounds = records.filter(r =>
      isInBounds(r.geometry, bounds) &&
      (!activeLayer || r.layer_name === activeLayer)
    );

    const ids = entitiesInBounds.map(r => r.id);

    if (modifier === 'ctrl') {
      setSelection(prev => [...new Set([...prev, ...ids])]);
    } else if (modifier === 'shift') {
      setSelection(prev => prev.filter(id => ids.includes(id)));
    } else {
      setSelection(ids);
    }
  };

  const clearSelection = () => setSelection([]);

  const selectAll = () => {
    const ids = activeLayer
      ? records.filter(r => r.layer_name === activeLayer).map(r => r.id)
      : records.map(r => r.id);
    setSelection(ids);
  };

  return {
    selection,
    selectionMode,
    setSelectionMode,
    selectEntity,
    selectInBounds,
    clearSelection,
    selectAll
  };
};
```

### Component `MapSelectionTools`

```jsx
const MapSelectionTools = ({ selection, onModeChange, onClear }) => {
  return (
    <div style={styles.toolbar}>
      <span>🎯 Sélection : {activeLayerName || 'Toutes couches'}</span>

      <div style={styles.tools}>
        <button onClick={() => onModeChange('pointer')} title="Pointeur">👆</button>
        <button onClick={() => onModeChange('rectangle')} title="Rectangle">▢</button>
        <button onClick={() => onModeChange('circle')} title="Cercle">⭕</button>
        <button onClick={() => onModeChange('lasso')} title="Lasso">✏️</button>
      </div>

      {selection.length > 0 && (
        <>
          <button onClick={onClear}>×</button>
          <span>{selection.length} sélectionnée{selection.length > 1 ? 's' : ''}</span>
        </>
      )}
    </div>
  );
};
```

### Leaflet Draw Integration

```jsx
<FeatureGroup>
  <EditControl
    position="topright"
    onCreated={handleShapeCreated}
    draw={{
      rectangle: selectionMode === 'rectangle',
      circle: selectionMode === 'circle',
      polygon: selectionMode === 'lasso',
      marker: false,
      polyline: false,
      circlemarker: false
    }}
  />
</FeatureGroup>

const handleShapeCreated = (e) => {
  const { layer } = e;
  const bounds = layer.getBounds();
  const modifier = getKeyModifier(); // Ctrl/Shift
  selectInBounds(bounds, modifier);

  // Remove shape after selection
  layer.remove();
};
```

---

## ✅ Checklist Implémentation

- [ ] Hook `useMapSelection` avec tous les modes
- [ ] Component `MapSelectionTools` (barre outils)
- [ ] Component `SelectionActionsBar` (actions sur sélection)
- [ ] Intégration Leaflet Draw (rectangle, circle, lasso)
- [ ] Gestion modificateurs clavier (Ctrl, Shift)
- [ ] Feedback visuel (highlight, hover)
- [ ] Persistance sélection entre changements état
- [ ] Menu contextuel sur sélection
- [ ] Panneau "Détails Sélection"
- [ ] Export sélection (GeoJSON, KML, CSV)
- [ ] Tests comportements selon contexte

---

## 📊 Matrice de Décision

| Contexte | Action | Comportement |
|----------|--------|--------------|
| Couche=null, Clic simple | Clic E1 | Sélectionne E1, active sa couche |
| Couche=A, Clic simple | Clic E1 (couche A) | Sélectionne E1 |
| Couche=A, Clic simple | Clic E1 (couche B) | Bascule vers couche B, sélectionne E1 |
| Couche=null, Rectangle | Rectangle sur zone | Sélectionne toutes entités (multi-couches) |
| Couche=A, Rectangle | Rectangle sur zone | Sélectionne uniquement entités de A |
| Sélection=[E1], Ctrl+Clic | Ctrl+Clic E2 | Sélection=[E1,E2] |
| Sélection=[E1,E2], Ctrl+Clic | Ctrl+Clic E2 | Sélection=[E1] (toggle) |
| Sélection=[E1], Shift+Clic | Shift+Clic E5 | Sélection=[E1...E5] (plage) |
| Mode=view→edit | Changement mode | Sélection préservée |
| Menu ouvert→fermé | Toggle menu | Sélection préservée |

---

Cette spécification définit tous les comportements de sélection. Prêt pour implémentation.
