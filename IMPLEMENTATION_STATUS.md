# Smart GIS Widget v3.0 - Refonte UX Complète

## ✅ Composants Créés (Prêts à utiliser)

### 1. TabbedMenu (nouveau)
**Fichier**: `src/components/layout/TabbedMenu.js`

Composant de menu avec 3 onglets horizontaux :
- 🗂️ Couches (par défaut)
- 📁 Projet
- 🔍 Recherche

**Fonctionnalités** :
- Redimensionnable avec séparateur draggable
- Cursor change à la limite (ew-resize)
- Transition smooth
- Props: `isOpen`, `initialWidth`, `minWidth`, `maxWidth`, `onWidthChange`

### 2. MenuContent (nouveau)
**Fichier**: `src/components/layout/MenuContent.js`

Switcher de contenu pour les onglets.
Props: `activeTab`, `layersContent`, `projectContent`, `searchContent`

### 3. ZoomControls (nouveau)
**Fichier**: `src/components/map/ZoomControls.js`

Contrôles de zoom positionnés sur la carte :
- Boutons : + / - / 🌍
- Se déplace automatiquement avec le menu : `left: calc(${menuWidth}px + 12px)`
- Props: `menuWidth`, `onZoomIn`, `onZoomOut`, `onResetZoom`

### 4. EntityPanel (nouveau)
**Fichier**: `src/components/panels/EntityPanel.js`

Panneau de détail d'entité (gauche, sous EditionToolbar) :
- Position : `top: 70px, left: 12px, bottom: 12px, width: 300px`
- Navigation multi-sélection (← →)
- Affichage : nom, couche, description, géométrie
- Actions : Éditer / Supprimer
- Props: `entities`, `selectedEntityIds`, `onClose`, `onEdit`

### 5. EditionToolbar (modifié)
**Fichier**: `src/components/map/EditionToolbar.js`

**Modifications appliquées** :
```css
container: {
  position: absolute;
  top: 12px;
  right: 1%;
  flex-direction: row-reverse; /* ✅ Changé */
  gap: 4px;
}

contextGroup: {
  flex-direction: column; /* ✅ Ajouté */
  justify-content: center; /* ✅ Ajouté */
}

actionsGroup: {
  display: flex;
  justify-content: center; /* ✅ Ajouté */
  flex-direction: column-reverse; /* ✅ Changé */
  gap: 4px;
}
```

### 6. MapView (existant)
**Fichier**: `src/components/map/MapView.js`

Carte Leaflet avec WKT parsing, déjà fonctionnelle.

---

## 🔄 Composants à Modifier

### 1. LayersSection (à refaire)
**Fichier**: `src/components/menu/LayersSection.js`

**Nouvelle structure demandée** :
```
┌─────────────────────────────────┐
│ [🔍 Rechercher couches...]      │ ← Search input (non scrollable)
├─────────────────────────────────┤
│ [Stats] [Tri ▼] [Actions ⚙️]   │ ← Bulk actions bar (non scrollable)
├─────────────────────────────────┤
│ ☑ BD TOPO Hydro  [👁]  23      │ ← Scrollable list
│ ☐ Bâtiments     [👁]  456      │
│ ☐ Très lon...   [👁]  12       │ ← Text-overflow: ellipsis
└─────────────────────────────────┘
```

**Changements nécessaires** :
- Retirer les options au survol de chaque couche
- Ajouter checkboxes pour sélection multiple
- Barre d'actions bulk en haut (s'applique à la sélection)
- Stats/Tri compacts et toujours visibles
- Overflow-y uniquement sur la liste de couches
- Pas d'overflow-x, masquage du nom si trop long

**Actions bulk** :
- Style (s'applique à toutes sélectionnées)
- Zoom
- Export
- Supprimer
- Merge layers (optionnel)

### 2. SearchSection (à refaire complètement)
**Fichier**: `src/components/menu/SearchSection.js`

**Nouveau concept** :
- **Barre unique** de recherche multi-types
- **Scoring** : meilleurs résultats en premier
- **Groupes de résultats** affichés
- Recherche dans :
  - Noms d'entités
  - Noms de couches
  - Descriptions
  - Propriétés custom
  - Semantic search (VECTOR_SEARCH si disponible)

**Structure UI** :
```
┌───────────────────────────────┐
│ [🔍 Recherche globale...]     │
├───────────────────────────────┤
│ Entités (12)                  │ ← Group header
│  📍 Paris (score: 0.98)       │
│  📍 Parc (score: 0.85)        │
│                               │
│ Couches (3)                   │ ← Group header
│  🗂️ BD TOPO (score: 0.75)    │
│                               │
│ Sémantique (5)                │ ← Si VECTOR_SEARCH
│  🧠 Centre ville (0.92)       │
└───────────────────────────────┘
```

### 3. ProjectSection (simplifier)
**Fichier**: `src/components/menu/ProjectSection.js`

**Changements** :
- **Retirer** la duplication du nom du projet (déjà dans Navbar)
- Garder uniquement les actions :
  - ➕ Nouveau projet
  - 💾 Sauvegarder
  - 📂 Charger...
  - 📤 Exporter

---

## 🔧 Intégration dans SmartGISWidget.js

### État à ajouter :
```javascript
const [menuWidth, setMenuWidth] = useState(320);
const [entityPanelOpen, setEntityPanelOpen] = useState(false);
```

### Structure de rendu à implémenter :
```jsx
return (
  <div style={styles.container}>
    <Navbar {...} />

    <div style={styles.content}>
      {/* Tabbed Menu */}
      {!fullscreen && menuOpen && (
        <TabbedMenu
          isOpen={menuOpen}
          initialWidth={menuWidth}
          onWidthChange={setMenuWidth}
        >
          <MenuContent
            layersContent={<LayersSection {...} />}
            projectContent={<ProjectSection {...} />}
            searchContent={<SearchSection {...} />}
          />
        </TabbedMenu>
      )}

      {/* Map Area */}
      <div style={styles.mapArea}>
        {/* ZoomControls */}
        <ZoomControls menuWidth={menuOpen ? menuWidth : 0} {...} />

        {/* EditionToolbar */}
        <EditionToolbar {...} />

        {/* SelectionTools */}
        <SelectionTools {...} />

        {/* EntityPanel */}
        {entityPanelOpen && (
          <EntityPanel
            entities={workspaceData}
            selectedEntityIds={selection}
            onClose={() => setEntityPanelOpen(false)}
          />
        )}

        {/* MapView */}
        <MapView
          onEntityClick={(id) => {
            selectEntity(id);
            setEntityPanelOpen(true);
          }}
          {...}
        />

        {/* SelectionActionsBar */}
        <SelectionActionsBar {...} />
      </div>
    </div>
  </div>
);
```

### CSS à modifier :
```javascript
const styles = {
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    // RETIRER l'overlay, carte reste visible
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    // Pas de backgroundColor masquant
  },
};
```

---

## 📝 Checklist d'Implémentation

### Phase 1 : Intégration de base ✅
- [x] Créer TabbedMenu
- [x] Créer MenuContent
- [x] Créer ZoomControls
- [x] Créer EntityPanel
- [x] Modifier EditionToolbar layout

### Phase 2 : Intégration SmartGISWidget (EN COURS)
- [ ] Remplacer MainMenu par TabbedMenu
- [ ] Ajouter états menuWidth et entityPanelOpen
- [ ] Intégrer ZoomControls dans mapArea
- [ ] Intégrer EntityPanel
- [ ] Retirer AdjacentPanel (remplacé par EntityPanel)
- [ ] Modifier styles pour enlever overlay

### Phase 3 : Refonte composants menu
- [ ] Refaire LayersSection avec bulk actions
- [ ] Refaire SearchSection avec scoring
- [ ] Simplifier ProjectSection

### Phase 4 : Sous-menus et détails
- [ ] Sous-menu de couche (liste entités)
- [ ] Sous-menu d'entité (fiche détail)
- [ ] Config popups dans EntityPanel

### Phase 5 : Polish
- [ ] Animations et transitions
- [ ] Keyboard shortcuts
- [ ] Loading states
- [ ] Error states

---

## 🚀 Pour Continuer

**Prochaine étape immediate** :
1. Modifier `SmartGISWidget.js` pour utiliser TabbedMenu
2. Tester que tout compile
3. Refaire LayersSection avec la nouvelle structure
4. Refaire SearchSection avec scoring
5. Simplifier ProjectSection

**Commande build** :
```bash
cd packages/smart-gis && npm run build
```

**Status actuel** :
- Build : 117.43 kB gzipped
- Tous les composants de base créés
- Prêt pour intégration finale
