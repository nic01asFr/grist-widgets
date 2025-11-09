# Smart GIS Widget - Refonte UX/UI v3.0

## 📊 Analyse de l'UX/UI Actuelle (v2.0)

### Problèmes Identifiés

#### 1. **Header Surchargé**
```
🗺️ Smart GIS | ✓ System | ✓ Project | [Explorer] [Éditer] [Import] [Sauvegarder] | 7721 entités
```
**Problèmes** :
- Trop de boutons dans le header (4 boutons)
- Badges système/projet inutiles pour l'utilisateur
- Pas de nom de projet
- Header toujours visible (occupe de l'espace)

#### 2. **Sidebar Explorer (Gauche)**
- Ouverture/fermeture via bouton
- Contenu : recherche + stats + liste entités
- Prend de la place quand ouvert
- Pas de notion de couches dans la recherche

#### 3. **LayerManager (Droite)**
- Position fixe en `absolute` (top: 80px, right: 16px)
- Flottant au-dessus de la carte
- Pas intégré avec les autres contrôles
- Légendes avec emojis hardcodés

#### 4. **Outils d'édition**
- Bouton "Éditer" active Leaflet.pm
- Pas de contexte de couche pour l'édition
- Pas d'interface pour choisir la couche cible

#### 5. **Style d'entité**
- Configuration via dialogue séparé
- Interface complexe (champ JSON)
- Pas d'aperçu visuel
- Pas de pickers couleur/transparence

#### 6. **Statistiques**
- Toujours affichées dans la sidebar
- Pas de contrôle sur l'affichage
- Mélangées avec la recherche

#### 7. **Recherche**
- Input dans la sidebar
- Pas de suggestions contextuelles
- Pas de distinction texte/sémantique visible
- Résultats dans une liste scrollable

---

## 🎯 Nouvelle Architecture UX/UI v3.0

### Principes de Design

1. **Menu Unique** : Tout regrouper dans un menu latéral rétractable
2. **Carte Maximale** : Menu peut disparaître complètement
3. **Navbar Minimaliste** : Uniquement le titre du projet
4. **Contexte Couche** : Toujours savoir sur quelle couche on travaille
5. **Interfaces Simplifiées** : Pickers visuels, pas de JSON
6. **Recherche Intelligente** : Unique input avec suggestions contextuelles

---

## 📐 Nouvelle Structure

### 1. Navbar (Toujours visible, ~50px)
```
┌─────────────────────────────────────────────────────────────┐
│ [☰]  📊 Mon Projet GIS 2024  [✏️]                    [🗺️]  │
└─────────────────────────────────────────────────────────────┘
```

**Éléments** :
- `[☰]` : Toggle menu (gauche)
- `📊 Mon Projet GIS 2024` : Titre du projet (éditable au clic)
- `[✏️]` : Icône d'édition (apparaît au hover du titre)
- `[🗺️]` : Bouton mode plein écran carte (masque le menu)

### 2. Menu Latéral Rétractable (Gauche, 350px)

**Structure en onglets verticaux** :
```
┌─────────────────────────────────┐
│ 🔍 Recherche                    │
│─────────────────────────────────│
│ [Input recherche intelligente]  │
│ [Suggestions contextuelles ▼]   │
│─────────────────────────────────│
│ 📚 Couches                      │
│─────────────────────────────────│
│ ▶ IGN Bâtiments (1,234)         │
│ ▼ OSM Routes (5,678)            │
│   ├─ [Visible] [Style] [Stats]  │
│   └─ [Voir entités →]           │
│─────────────────────────────────│
│ 📥 Import                       │
│─────────────────────────────────│
│ [IGN] [OSM] [Fichier]           │
│─────────────────────────────────│
│ 💾 Projet                       │
│─────────────────────────────────│
│ [Nouveau] [Sauvegarder] [Charger│
└─────────────────────────────────┘
```

#### 2.1 Section **Recherche**
```
┌─────────────────────────────────┐
│ 🔍 [Rechercher dans le projet..│
│─────────────────────────────────│
│ Suggestions :                   │
│ ├─ 📍 Bâtiment #1234           │
│ ├─ 📊 Couche "Routes"          │
│ ├─ 📥 Import "IGN Paris"       │
│ └─ 🏷️ Tag "urbanisme"          │
└─────────────────────────────────┘
```

**Fonctionnalités** :
- Input unique
- Recherche texte + sémantique en parallèle
- Suggestions contextuelles avec icônes
- Clic → recadrage carte + sélection
- Filtres : [Tout] [Entités] [Couches] [Imports]

#### 2.2 Section **Couches**
```
┌─────────────────────────────────┐
│ 📚 Couches (3)          [+ New] │
│─────────────────────────────────│
│ ▼ IGN Bâtiments         [●] [≡] │
│   ├─ Légende: ■ #3498db        │
│   ├─ 1,234 entités             │
│   ├─ [👁️] [🎨] [📊] [📋]        │
│   └─ [Voir entités →]          │
│─────────────────────────────────│
│ ▶ OSM Routes            [●] [≡] │
│─────────────────────────────────│
│ ▶ Zones Protégées       [ ] [≡] │
└─────────────────────────────────┘
```

**Éléments par couche** :
- `▼/▶` : Dérouler/plier
- `[●]` : Visible/invisible (toggle)
- `[≡]` : Menu contextuel (supprimer, renommer, exporter)
- `[👁️]` : Toggle visibilité
- `[🎨]` : Ouvrir éditeur de style (panneau adjacent)
- `[📊]` : Statistiques (panneau adjacent)
- `[📋]` : Voir liste entités (panneau adjacent)

#### 2.3 Panneau Adjacent (Droite du menu, 300px)

**Ouvert quand on clique sur [🎨] ou [📋]** :

##### Éditeur de Style
```
┌─────────────────────────────────┐
│ 🎨 Style: IGN Bâtiments    [×]  │
│─────────────────────────────────│
│ Couleur                         │
│ [Picker: #3498db]      ◼️       │
│─────────────────────────────────│
│ Transparence                    │
│ [Slider: 70%]          ●────────│
│─────────────────────────────────│
│ Remplissage                     │
│ [✓] Remplir                     │
│ [Picker: #3498db]      ◼️       │
│ [Slider: 30%]          ●────────│
│─────────────────────────────────│
│ Bordure                         │
│ [✓] Afficher bordure            │
│ [Picker: #2c3e50]      ◼️       │
│ Épaisseur: [2 px]      ●────────│
│─────────────────────────────────│
│ Aperçu                          │
│ [Exemple visuel polygon]        │
│─────────────────────────────────│
│     [Annuler]  [Appliquer]      │
└─────────────────────────────────┘
```

**Composants** :
- Color pickers visuels (React Color, react-colorful)
- Sliders pour transparence/épaisseur
- Checkboxes pour options
- Aperçu en temps réel
- Boutons Annuler/Appliquer

##### Liste Entités
```
┌─────────────────────────────────┐
│ 📋 Entités: IGN Bâtiments  [×]  │
│─────────────────────────────────│
│ [Rechercher dans cette couche..│
│─────────────────────────────────│
│ [●] Bâtiment #1234              │
│     48.8566, 2.3522             │
│     [👁️] [🎨] [📍] [🗑️]          │
│─────────────────────────────────│
│ [●] Bâtiment #1235              │
│     48.8567, 2.3523             │
│     [👁️] [🎨] [📍] [🗑️]          │
│─────────────────────────────────│
│ ... (scroll)                    │
│─────────────────────────────────│
│ Affichage: [Tout] [Visibles]    │
│ Tri: [ID] [Nom] [Date]          │
└─────────────────────────────────┘
```

**Actions par entité** :
- `[●]` : Sélectionner (checkbox)
- `[👁️]` : Toggle visibilité individuelle
- `[🎨]` : Éditer style individuel
- `[📍]` : Centrer sur carte
- `[🗑️]` : Supprimer

#### 2.4 Section **Import**
```
┌─────────────────────────────────┐
│ 📥 Import                       │
│─────────────────────────────────│
│ Source :                        │
│ [●] IGN Géoplateforme           │
│ [ ] OpenStreetMap               │
│ [ ] Fichier (GeoJSON, KML...)   │
│─────────────────────────────────│
│ [Configurer l'import →]         │
└─────────────────────────────────┘
```

**Wizard simplifié** (modal ou panneau adjacent) :
1. Choix source
2. Sélection catalogue/zone
3. Aperçu
4. Choix couche destination
5. Import

#### 2.5 Section **Projet**
```
┌─────────────────────────────────┐
│ 💾 Projet                       │
│─────────────────────────────────│
│ Nom: Mon Projet GIS 2024        │
│ Entités: 7,721                  │
│ Couches: 3                      │
│─────────────────────────────────│
│ [🆕 Nouveau]                    │
│ [💾 Sauvegarder]                │
│ [📂 Charger]                    │
│ [📤 Exporter]                   │
└─────────────────────────────────┘
```

**Actions** :
- **Nouveau** : Nettoie GIS_WorkSpace (confirmation)
- **Sauvegarder** : Copie table avec nouveau nom
- **Charger** : Liste tables GIS_* disponibles → copie vers WorkSpace
- **Exporter** : GeoJSON, KML, CSV...

---

### 3. Carte (Reste de l'écran)

#### 3.1 Outils d'Édition (Barre au-dessus de la carte)

**Affichée seulement en mode édition** :
```
┌──────────────────────────────────────────────────┐
│ ✏️ Édition: IGN Bâtiments  [Point][Line][Polygon][Rectangle][Circle]  [✓ Terminer] │
└──────────────────────────────────────────────────┘
```

**Éléments** :
- Contexte : nom de la couche active
- Outils géométrie : Point, Line, Polygon, Rectangle, Circle
- Bouton "Terminer" pour quitter le mode édition
- Style de la couche appliqué automatiquement

#### 3.2 Indicateurs sur la Carte

**Coin supérieur gauche** (si menu fermé) :
```
┌────────────────┐
│ [☰] Ouvrir     │
└────────────────┘
```

**Coin inférieur droit** :
```
┌────────────────────┐
│ Échelle : 1:50000  │
│ Zoom : 12          │
└────────────────────┘
```

---

## 🎨 Design System

### Couleurs
- **Primary** : `#3498db` (bleu)
- **Success** : `#16B378` (vert)
- **Danger** : `#e74c3c` (rouge)
- **Warning** : `#f39c12` (orange)
- **Dark** : `#2c3e50` (gris foncé)
- **Light** : `#ecf0f1` (gris clair)
- **Background Menu** : `#ffffff`
- **Background Navbar** : `#2c3e50`

### Typographie
- **Navbar** : 16px, bold
- **Section Titles** : 14px, medium
- **Body** : 13px, regular
- **Small** : 11px, regular

### Espacements
- **Padding Menu** : 16px
- **Gap** : 12px
- **Border Radius** : 6px

### Composants Réutilisables

#### Button
```jsx
<Button variant="primary|secondary|danger" size="small|medium">
  Texte
</Button>
```

#### Input
```jsx
<Input
  placeholder="Rechercher..."
  icon="🔍"
  onSearch={handleSearch}
/>
```

#### ColorPicker
```jsx
<ColorPicker
  value="#3498db"
  onChange={handleColorChange}
  showAlpha={true}
/>
```

#### Slider
```jsx
<Slider
  value={70}
  min={0}
  max={100}
  onChange={handleChange}
  unit="%"
/>
```

---

## 🔧 Architecture Technique

### Nouveaux Composants

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.js              (Navbar minimaliste)
│   │   ├── MainMenu.js            (Menu latéral principal)
│   │   ├── AdjacentPanel.js       (Panneau adjacent droit)
│   │   └── EditionToolbar.js      (Barre outils édition)
│   │
│   ├── menu/
│   │   ├── SearchSection.js       (Section recherche intelligente)
│   │   ├── LayersSection.js       (Section couches)
│   │   ├── LayerItem.js           (Item couche avec actions)
│   │   ├── ImportSection.js       (Section import)
│   │   └── ProjectSection.js      (Section projet)
│   │
│   ├── panels/
│   │   ├── StyleEditor.js         (Éditeur style visuel)
│   │   ├── EntityList.js          (Liste entités d'une couche)
│   │   ├── LayerStats.js          (Statistiques couche)
│   │   └── ImportWizard.js        (Wizard import)
│   │
│   └── ui/
│       ├── Button.js
│       ├── Input.js
│       ├── ColorPicker.js
│       ├── Slider.js
│       ├── Checkbox.js
│       └── ContextMenu.js
│
├── hooks/
│   ├── useProject.js              (Gestion projet)
│   ├── useSearch.js               (Recherche intelligente)
│   └── useLayerEdition.js         (Édition couche)
│
└── GeoSemanticMapWidget.js        (Orchestrateur principal)
```

---

## 📋 Plan d'Implémentation

### Phase 1 : Composants UI de Base (1-2 jours)
- [x] Créer design system (Button, Input, ColorPicker, Slider)
- [x] Créer Navbar minimaliste
- [x] Créer MainMenu avec structure

### Phase 2 : Recherche Intelligente (1 jour)
- [x] SearchSection avec input
- [x] Suggestions contextuelles
- [x] Hook useSearch (texte + sémantique)
- [x] Recadrage carte sur sélection

### Phase 3 : Gestion Couches (2 jours)
- [x] LayersSection
- [x] LayerItem avec actions
- [x] AdjacentPanel
- [x] StyleEditor visuel avec pickers
- [x] EntityList avec filtres

### Phase 4 : Édition Géométrie (1 jour)
- [x] EditionToolbar au-dessus carte
- [x] Contexte couche pour édition
- [x] Application style automatique

### Phase 5 : Gestion Projet (1 jour)
- [x] ProjectSection
- [x] Nouveau/Sauvegarder/Charger
- [x] Hook useProject
- [x] Export GeoJSON

### Phase 6 : Import (1 jour)
- [x] ImportSection
- [x] Refonte ImportWizard (simplifié)
- [x] Choix couche destination

### Phase 7 : Tests & Polish (1 jour)
- [x] Tests intégration
- [x] Responsive
- [x] Animations
- [x] Documentation

**Total : ~7-8 jours**

---

## ✅ Validation

Avant de commencer l'implémentation, validation requise sur :
- [ ] Architecture menu/panneaux
- [ ] Design des composants UI
- [ ] Workflow recherche
- [ ] Workflow édition géométrie
- [ ] Gestion projet (nouveau/sauvegarder/charger)

---

## 📸 Wireframes

### Vue Principale (Menu Ouvert)
```
┌─────────────────────────────────────────────────────────┐
│ [☰] 📊 Mon Projet GIS 2024 [✏️]              [🗺️]      │
├───────────────┬─────────────────────────────────────────┤
│ 🔍 Recherche  │                                         │
│ [Input...]    │                                         │
│               │                                         │
│ 📚 Couches    │                                         │
│ ▼ Bâtiments   │         CARTE LEAFLET                   │
│ ▶ Routes      │                                         │
│               │                                         │
│ 📥 Import     │                                         │
│ [IGN] [OSM]   │                                         │
│               │                                         │
│ 💾 Projet     │                                         │
│ [Nouveau]     │                                         │
└───────────────┴─────────────────────────────────────────┘
```

### Vue Carte Plein Écran (Menu Fermé)
```
┌─────────────────────────────────────────────────────────┐
│ [☰] 📊 Mon Projet GIS 2024                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                                                         │
│                   CARTE LEAFLET                         │
│                   (PLEIN ÉCRAN)                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Vue Édition Style (Panneau Adjacent Ouvert)
```
┌──────────────────────────────────────────────────────────────┐
│ [☰] 📊 Mon Projet GIS 2024                                   │
├────────────┬──────────────────────┬────────────────────────────┤
│ 📚 Couches │ 🎨 Style: Bâtiments  │                            │
│ ▼ Bâtiments│ Couleur: #3498db ◼️  │                            │
│   [🎨][📊] │ Transparence: 70%    │                            │
│            │ [Slider ●─────]      │      CARTE LEAFLET         │
│ ▶ Routes   │                      │                            │
│            │ Aperçu:              │                            │
│            │ [Polygon preview]    │                            │
│            │                      │                            │
│            │ [Annuler][Appliquer] │                            │
└────────────┴──────────────────────┴────────────────────────────┘
```

---

## 🎯 Bénéfices Attendus

### UX
- ✅ Interface épurée et professionnelle
- ✅ Carte visible à 100% quand menu fermé
- ✅ Tout accessible depuis un seul menu
- ✅ Workflows intuitifs (recherche, édition, style)
- ✅ Moins de clics pour les actions courantes

### Performance
- ✅ Composants React optimisés
- ✅ Rendu conditionnel (panneaux adjacents)
- ✅ Memoization sur composants UI

### Maintenabilité
- ✅ Composants réutilisables
- ✅ Design system cohérent
- ✅ Hooks métier séparés
- ✅ Code mieux structuré
