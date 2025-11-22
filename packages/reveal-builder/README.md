# 🎨 Reveal.js Builder

Widget Grist pour créer des présentations Reveal.js de manière entièrement data-driven, sans coder.

## 🎯 Concept

Créez des présentations professionnelles directement depuis Grist :
- **1 ligne** dans une table = **1 slide** ou **1 composant**
- Configuration visuelle via champs Grist standards
- Preview temps réel dans le widget
- Système de layouts et composants réutilisables

## 🚀 Démarrage Rapide

### 1. Ajouter le Widget dans Grist

1. Ouvrez votre document Grist
2. Ajoutez une section → **Custom Widget**
3. URL du widget : `https://nic01asfr.github.io/grist-widgets/reveal-builder/`
4. Le widget vérifiera automatiquement les tables requises

### 2. Créer les Tables (Automatique)

Au premier lancement, le widget détecte les tables manquantes et propose :
- **Option 1** : Cliquer sur "🔨 Créer les tables automatiquement"
- **Option 2** : Les créer manuellement (voir structure ci-dessous)

Les tables créées :
- `Presentations` - Configuration des présentations
- `Slides` - Définition des slides
- `Components` - Éléments dans chaque slide

### 3. Créer Votre Première Présentation

#### Étape 1 : Table Presentations

| title | theme | transition | active |
|-------|-------|------------|--------|
| Ma Présentation | black | slide | ✓ |

#### Étape 2 : Table Slides

| presentation | order | layout | background_color |
|--------------|-------|--------|------------------|
| Ma Présentation | 1 | title | #1a1a1a |
| Ma Présentation | 2 | two-column | #2a2a2a |

#### Étape 3 : Table Components

**Slide 1 - Titre**
| slide | order | type | content | style_preset | position |
|-------|-------|------|---------|--------------|----------|
| Slide 1 | 1 | text | # Bienvenue | h1 | center |
| Slide 1 | 2 | text | Ma première présentation | h2 | center |

**Slide 2 - Contenu**
| slide | order | type | content | position |
|-------|-------|------|---------|----------|
| Slide 2 | 1 | text | ## Point Important | left |
| Slide 2 | 2 | list | Item 1\nItem 2\nItem 3 | right |

✅ **Votre présentation s'affiche automatiquement dans le widget !**

---

## 📚 Guides Détaillés

### Structure des Tables

#### Table : Presentations

| Colonne | Type | Description | Valeurs |
|---------|------|-------------|---------|
| `title` | Text | Titre de la présentation | - |
| `theme` | Choice | Thème Reveal.js | black, white, league, sky, beige, night, serif, simple, solarized, moon |
| `transition` | Choice | Transition entre slides | slide, fade, zoom, convex, concave, none |
| `active` | Toggle | Présentation affichée dans le widget | ✓/✗ |
| `controls` | Toggle | Afficher les contrôles de navigation | ✓/✗ |
| `progress_bar` | Toggle | Afficher la barre de progression | ✓/✗ |
| `slide_number` | Toggle | Afficher les numéros de slide | ✓/✗ |

#### Table : Slides

| Colonne | Type | Description | Valeurs |
|---------|------|-------------|---------|
| `presentation` | Ref:Presentations | Présentation parente | - |
| `order` | Integer | Ordre d'affichage | 1, 2, 3... |
| `title` | Text | Titre du slide (metadata) | - |
| `layout` | Choice | Disposition prédéfinie | title, content, two-column, three-column, sidebar-left, sidebar-right, grid-2x2, full, custom |
| `background_color` | Text | Couleur de fond | #1a1a1a, rgb(26,26,26) |
| `background_image` | Attachments | Image de fond | - |
| `background_size` | Choice | Taille du fond | cover, contain, auto |
| `background_opacity` | Numeric | Opacité du fond | 0.0 - 1.0 |
| `transition_override` | Choice | Transition spécifique | - |
| `auto_animate` | Toggle | Animation automatique | ✓/✗ |
| `notes` | Text | Notes de présentation | - |

#### Table : Components

| Colonne | Type | Description | Valeurs |
|---------|------|-------------|---------|
| `slide` | Ref:Slides | Slide parent | - |
| `order` | Integer | Ordre d'affichage | 1, 2, 3... |
| `type` | Choice | Type de composant | text, image, code, list, table, quote, video, iframe, chart, shape, button |
| `content` | Text | Contenu (texte, markdown, code) | - |
| `attachment` | Attachments | Fichier (image, vidéo) | - |
| `url` | Text | URL externe | - |
| `position` | Choice | Position dans le layout | center, left, right, top-left, top-center, top-right, etc. |
| `width` | Choice | Largeur | auto, 25%, 33%, 50%, 66%, 75%, 100% |
| `style_preset` | Choice | Style prédéfini | h1, h2, h3, h4, body, lead, caption, small, code, quote |
| `align` | Choice | Alignement texte | left, center, right, justify |
| `font_size` | Choice | Taille police | 0.5em, 0.75em, 1em, 1.5em, 2em, 3em, custom |
| `color` | Text | Couleur texte | #ffffff, rgb(255,255,255) |
| `background` | Text | Couleur fond composant | - |
| `padding` | Choice | Padding | none, small, medium, large |
| `border` | Toggle | Afficher bordure | ✓/✗ |
| `shadow` | Toggle | Ombre portée | ✓/✗ |
| `animation` | Choice | Animation d'entrée | fade-in, slide-in-left, zoom-in, etc. |

---

## 🎨 Layouts Disponibles

### 1. **title** - Slide de titre
Contenu centré verticalement et horizontalement.

**Utilisation** : Slides de titre, couverture, conclusions

### 2. **content** - Contenu simple
Layout par défaut avec marges.

**Utilisation** : Contenu standard, texte, listes

### 3. **two-column** - Deux colonnes
```
┌─────────────┬─────────────┐
│   Left 50%  │  Right 50%  │
│             │             │
└─────────────┴─────────────┘
```

**Utilisation** : Comparaisons, avant/après, texte + image

**Positions** : `left` ou `col-1`, `right` ou `col-2`

### 4. **three-column** - Trois colonnes
```
┌─────┬─────┬─────┐
│ 33% │ 33% │ 33% │
└─────┴─────┴─────┘
```

**Positions** : `col-1`, `col-2`, `col-3`

### 5. **sidebar-left** - Sidebar gauche (30% / 70%)

**Utilisation** : Menu de navigation, table des matières

**Positions** : `left` (sidebar), `right` (contenu principal)

### 6. **sidebar-right** - Sidebar droite (70% / 30%)

**Utilisation** : Notes, compléments d'information

### 7. **grid-2x2** - Grille 4 éléments
```
┌──────┬──────┐
│  1   │  2   │
├──────┼──────┤
│  3   │  4   │
└──────┴──────┘
```

**Utilisation** : Galerie d'images, dashboard KPIs

### 8. **full** - Plein écran

**Utilisation** : Image plein écran, vidéo, iframe

### 9. **custom** - Libre

Grid 3x3 avec positions absolues.

**Positions** : `top-left`, `top-center`, `top-right`, `center-left`, `center`, `center-right`, `bottom-left`, `bottom-center`, `bottom-right`

---

## 🧩 Types de Composants

### 1. **text** - Texte et Markdown

Supporte Markdown complet :

```markdown
# Titre H1
## Titre H2

**Gras** et *italique*

- Liste
- À puces

[Lien](https://example.com)
```

### 2. **image** - Image

Source : `attachment` (Grist) ou `url`

**Exemple** :
- Attachment : Glisser une image dans le champ
- URL : `https://example.com/image.jpg`

### 3. **code** - Code avec coloration

Détection automatique du langage.

**Exemple** :
```python
def hello():
    print("Hello from Grist!")
```

Langages supportés : JavaScript, Python, SQL, HTML, CSS, JSON, etc.

### 4. **list** - Liste à puces

Format : 1 ligne = 1 item (séparés par `\n`)

**Exemple** :
```
Premier point
Deuxième point
Troisième point
```

### 5. **table** - Tableau de données

Format : CSV (virgule ou tabulation)

**Exemple** :
```csv
Produit,Prix,Stock
Laptop,999€,45
Mouse,29€,120
```

### 6. **quote** - Citation

Format : `"Citation"\n— Auteur`

**Exemple** :
```
"La donnée est le nouveau pétrole"
— Clive Humby
```

### 7. **video** - Vidéo

Sources supportées :
- YouTube : URL complète (ex: `https://youtube.com/watch?v=...`)
- Vimeo : URL complète
- Fichier : via `attachment`

### 8. **iframe** - Site web embarqué

**Exemple** :
```
https://example.com
```

### 9. **chart** - Graphique (Chart.js)

Format : JSON

**Exemple** :
```json
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Fev", "Mar"],
    "datasets": [{
      "label": "Ventes",
      "data": [12, 19, 3],
      "backgroundColor": "rgba(75, 192, 192, 0.2)"
    }]
  }
}
```

Types : `bar`, `line`, `pie`, `doughnut`, `radar`

### 10. **shape** - Formes géométriques

Valeurs dans `content` :
- `rectangle`
- `circle`
- `arrow-right`
- `arrow-down`
- `triangle`

### 11. **button** - Bouton interactif

Format : `Label|Action`

**Exemples** :
- `En savoir plus|https://example.com` - Ouvre URL
- `Slide suivant|slide:2` - Navigue vers slide 2

---

## 🎭 Styles et Animations

### Style Presets

| Preset | Taille | Usage |
|--------|--------|-------|
| `h1` | 3em | Titre principal |
| `h2` | 2em | Sous-titre |
| `h3` | 1.5em | Titre de section |
| `body` | 1em | Texte normal |
| `lead` | 1.2em | Introduction |
| `caption` | 0.8em | Légende |
| `code` | 0.9em | Code |
| `quote` | 1.1em | Citation |

### Animations

| Animation | Description |
|-----------|-------------|
| `fade-in` | Apparition en fondu |
| `slide-in-left` | Glisse depuis la gauche |
| `slide-in-right` | Glisse depuis la droite |
| `slide-in-up` | Glisse depuis le bas |
| `slide-in-down` | Glisse depuis le haut |
| `zoom-in` | Zoom avant |
| `zoom-out` | Zoom arrière |
| `fragment-fade` | Fragment Reveal.js (clic) |
| `fragment-grow` | Fragment croissant |
| `fragment-shrink` | Fragment rétrécissant |

---

## 📖 Exemples Complets

### Exemple 1 : Slide de Titre avec Logo

**Slides**
| presentation | order | layout | background_color |
|--------------|-------|--------|------------------|
| Ma Pres | 1 | custom | linear-gradient(135deg, #667eea 0%, #764ba2 100%) |

**Components**
| slide | order | type | content | attachment | position | width |
|-------|-------|------|---------|------------|----------|-------|
| Slide 1 | 1 | image | - | [logo.png] | top-right | 150px |
| Slide 1 | 2 | text | # Ma Startup | - | center | auto |
| Slide 1 | 3 | text | Innovation & Tech | - | center | auto |

### Exemple 2 : Comparaison Avant/Après

**Slides**
| layout |
|--------|
| two-column |

**Components**
| order | type | content | position | background |
|-------|------|---------|----------|------------|
| 1 | text | ## ❌ Avant | left | rgba(255,0,0,0.1) |
| 2 | list | Lent\nComplexe\nCoûteux | left | - |
| 3 | text | ## ✅ Après | right | rgba(0,255,0,0.1) |
| 4 | list | Rapide\nSimple\nÉconomique | right | - |

### Exemple 3 : Code + Explication

**Slides**
| layout | background_color |
|--------|------------------|
| sidebar-right | #1e1e1e |

**Components**
| order | type | content | position |
|-------|------|---------|----------|
| 1 | code | ```python\ndef process(data):\n  return data * 2\n``` | left |
| 2 | text | ### Fonction de traitement\n\nDouble les valeurs | right |

### Exemple 4 : Dashboard KPIs

**Slides**
| layout |
|--------|
| grid-2x2 |

**Components**
| order | type | content | style_preset |
|-------|------|---------|--------------|
| 1 | text | ## 1,234\nUtilisateurs | h2 |
| 2 | text | ## 89%\nSatisfaction | h2 |
| 3 | text | ## 456\nVentes | h2 |
| 4 | text | ## +23%\nCroissance | h2 |

---

## ⌨️ Raccourcis Clavier (Présentation)

| Touche | Action |
|--------|--------|
| `→` ou `Space` | Slide suivant |
| `←` | Slide précédent |
| `Esc` | Vue d'ensemble |
| `F` | Plein écran |
| `S` | Mode présentateur (notes) |

---

## 🔧 Développement Local

```bash
# Depuis la racine du projet
cd packages/reveal-builder/public
python -m http.server 8000

# Ouvrir dans Grist
# URL: http://localhost:8000
```

---

## 🐛 Dépannage

### Aucune présentation ne s'affiche

✅ **Solutions** :
1. Vérifier qu'une présentation a le toggle `active` à ✓
2. Vérifier que les tables existent
3. Recharger le widget (bouton 🔄)

### Les images ne s'affichent pas

✅ **Solutions** :
1. Vérifier que le fichier est bien dans le champ `attachment`
2. Ou utiliser une URL complète dans le champ `url`
3. Vérifier les permissions d'accès Grist

### Les slides sont dans le désordre

✅ **Solutions** :
1. Vérifier la colonne `order` dans Slides
2. S'assurer que les valeurs sont uniques et croissantes (1, 2, 3...)

### Le code n'a pas de coloration

✅ **Solutions** :
1. Vérifier que Highlight.js est chargé (console navigateur)
2. Le langage est détecté automatiquement, mais vous pouvez forcer avec ` ```python`

---

## 📚 Documentation Complète

- [Spécification complète](/docs/REVEAL_BUILDER_SPEC.md)
- [Guide Reveal.js widgets](/docs/REVEAL_WIDGET_GUIDE.md)
- [Architecture générale](/docs/ARCHITECTURE.md)

---

## 📄 Licence

Apache-2.0

---

## 🎉 Bon à Savoir

### Fonctionnalités Avancées

- **Live Preview** : Modifications instantanées dans le widget
- **Multi-présentations** : Gérez plusieurs présentations, activez celle à afficher
- **Export** : Utilisez le navigateur pour sauvegarder en PDF (Ctrl+P)
- **Thèmes** : 10 thèmes Reveal.js prédéfinis
- **Responsive** : S'adapte automatiquement à la taille de l'écran

### Limitations Connues

- 1 seule présentation active à la fois
- Les graphiques complexes nécessitent JSON Chart.js valide
- Les vidéos locales doivent être uploadées comme attachments

### Roadmap

- [ ] Templates de slides prédéfinis
- [ ] Export HTML standalone
- [ ] Variables dynamiques `{{table.field}}`
- [ ] Mode édition interactif
- [ ] Copier/coller slides

---

**Créé avec ❤️ pour Grist**
