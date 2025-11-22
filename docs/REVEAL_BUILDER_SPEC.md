# 🎨 Reveal.js Builder Widget - Spécification Complète

## 📋 Vue d'ensemble

Un widget Grist permettant de **créer, éditer et présenter** des slides Reveal.js de manière entièrement data-driven, sans coder.

### Principe
- **1 ligne** dans une table = **1 slide** ou **1 composant**
- Configuration visuelle via champs Grist standards
- Preview temps réel dans le widget
- Système de layouts et composants réutilisables

---

## 🗂️ Architecture des Tables

### **Table 1: Presentations**
*Définit une présentation complète*

| Colonne | Type | Valeurs | Description |
|---------|------|---------|-------------|
| `title` | Text | - | Titre de la présentation |
| `theme` | Choice | black, white, league, sky, beige, night, serif, simple, solarized, moon | Thème Reveal.js |
| `transition` | Choice | slide, fade, zoom, convex, concave, none | Transition globale |
| `active` | Toggle | true/false | Présentation affichée dans le widget |
| `controls` | Toggle | true/false | Afficher contrôles navigation |
| `progress_bar` | Toggle | true/false | Barre de progression |
| `slide_number` | Toggle | true/false | Numéro de slide |

**Formule calculée** :
```python
# slides_count : Nombre de slides
len(Slides.lookupRecords(presentation=$id))
```

---

### **Table 2: Slides**
*Définit chaque slide individuellement*

| Colonne | Type | Valeurs | Description |
|---------|------|---------|-------------|
| `presentation` | Ref:Presentations | - | Présentation parente |
| `order` | Integer | 1, 2, 3... | Ordre d'affichage |
| `title` | Text | - | Titre du slide (metadata) |
| `layout` | Choice | title, content, two-column, three-column, sidebar-left, sidebar-right, image-text, grid-2x2, full, custom | Disposition prédéfinie |
| `background_type` | Choice | color, image, gradient, video | Type de fond |
| `background_color` | Text | #1a1a1a, rgb(26,26,26) | Couleur de fond |
| `background_image` | Attachments | - | Image de fond |
| `background_size` | Choice | cover, contain, auto | Taille du fond |
| `background_opacity` | Numeric | 0.0 - 1.0 | Opacité du fond |
| `transition_override` | Choice | slide, fade, zoom, convex, concave, none | Transition spécifique |
| `auto_animate` | Toggle | true/false | Animation automatique |
| `notes` | Text | - | Notes de présentation |

**Formule calculée** :
```python
# preview : Aperçu du contenu
components = Components.lookupRecords(slide=$id)
", ".join([c.type + ": " + c.content[:30] for c in components[:3]])
```

---

### **Table 3: Components**
*Définit chaque élément dans un slide*

| Colonne | Type | Valeurs | Description |
|---------|------|---------|-------------|
| `slide` | Ref:Slides | - | Slide parent |
| `order` | Integer | 1, 2, 3... | Ordre d'affichage |
| `type` | Choice | text, image, code, list, table, quote, video, iframe, chart, shape, button | Type de composant |
| `content` | Text | - | Contenu (texte, markdown, code) |
| `attachment` | Attachments | - | Fichier (image, vidéo) |
| `url` | Text | - | URL externe (iframe, vidéo) |
| `position` | Choice | center, left, right, top-left, top-center, top-right, center-left, center-right, bottom-left, bottom-center, bottom-right, col-1, col-2, col-3 | Position dans le layout |
| `width` | Choice | 25%, 33%, 50%, 66%, 75%, 100%, auto | Largeur |
| `height` | Choice | auto, 25%, 50%, 75%, 100% | Hauteur |
| `style_preset` | Choice | h1, h2, h3, h4, body, lead, caption, small, code, quote | Style prédéfini |
| `align` | Choice | left, center, right, justify | Alignement texte |
| `font_size` | Choice | 0.5em, 0.75em, 1em, 1.5em, 2em, 3em, custom | Taille police |
| `font_size_custom` | Text | - | Taille personnalisée |
| `color` | Text | #ffffff, rgb(255,255,255) | Couleur texte |
| `background` | Text | - | Couleur fond composant |
| `padding` | Choice | none, small, medium, large | Padding |
| `border` | Toggle | true/false | Afficher bordure |
| `border_color` | Text | - | Couleur bordure |
| `border_radius` | Choice | none, small, medium, large, circle | Arrondi |
| `shadow` | Toggle | true/false | Ombre portée |
| `animation` | Choice | none, fade-in, slide-in-left, slide-in-right, slide-in-up, slide-in-down, zoom-in, zoom-out, fragment-fade, fragment-grow, fragment-shrink | Animation d'entrée |
| `custom_css` | Text | - | CSS personnalisé |

---

## 🎨 Layouts Prédéfinis

### **1. title** - Slide de titre
- 1 composant centré verticalement et horizontalement
- Typiquement : h1 + subtitle

### **2. content** - Contenu simple
- Contenu centré avec marges
- Layout par défaut

### **3. two-column** - Deux colonnes
```
┌─────────────┬─────────────┐
│   Left 50%  │  Right 50%  │
│             │             │
└─────────────┴─────────────┘
```

### **4. three-column** - Trois colonnes
```
┌─────┬─────┬─────┐
│ 33% │ 33% │ 33% │
└─────┴─────┴─────┘
```

### **5. sidebar-left** - Sidebar gauche
```
┌─────┬─────────────────┐
│ 30% │     70%         │
│     │                 │
└─────┴─────────────────┘
```

### **6. sidebar-right** - Sidebar droite
```
┌─────────────────┬─────┐
│     70%         │ 30% │
│                 │     │
└─────────────────┴─────┘
```

### **7. image-text** - Image + Texte superposé
- Image background + texte overlay avec fond semi-transparent

### **8. grid-2x2** - Grille 4 éléments
```
┌──────┬──────┐
│  1   │  2   │
├──────┼──────┤
│  3   │  4   │
└──────┴──────┘
```

### **9. full** - Plein écran
- 1 élément occupant tout l'espace

### **10. custom** - Libre
- Positions absolues configurables par composant

---

## 📍 Positions (pour layout custom ou grid)

**Grid 3x3** :
```
┌────────┬────────┬────────┐
│ top-   │  top-  │  top-  │
│ left   │ center │ right  │
├────────┼────────┼────────┤
│center- │ center │center- │
│ left   │        │ right  │
├────────┼────────┼────────┤
│bottom- │bottom- │bottom- │
│ left   │ center │ right  │
└────────┴────────┴────────┘
```

**Positions colonnes** (pour layouts multi-colonnes) :
- `col-1`, `col-2`, `col-3`
- `left`, `center`, `right`

---

## 🧩 Types de Composants

### **1. text**
- Texte simple ou **markdown**
- Supporte : titres, listes, gras, italique, liens, code inline

**Exemple content** :
```markdown
# Mon Titre
## Sous-titre

- Point 1
- Point 2

**Texte en gras** et *italique*
```

### **2. image**
- Image depuis `attachment` ou `url`
- Redimensionnement automatique

### **3. code**
- Code avec coloration syntaxique
- Langages : js, python, sql, html, css, bash, json, etc.

**Exemple content** :
```python
def hello_world():
    print("Hello from Grist!")
```

### **4. list**
- Liste à puces ou numérotée
- 1 ligne = 1 item

**Exemple content** :
```
Item 1
Item 2
Item 3
```

### **5. table**
- Tableau de données
- Format CSV dans `content`

**Exemple content** :
```csv
Produit,Prix,Stock
Laptop,999,45
Mouse,29,120
```

### **6. quote**
- Citation avec style
- Auteur optionnel

**Exemple content** :
```
"La donnée est le nouveau pétrole"
— Clive Humby
```

### **7. video**
- Vidéo depuis `attachment` ou `url` (YouTube, Vimeo)

### **8. iframe**
- Embed site externe

### **9. chart**
- Graphique simple (avec Chart.js)
- Types : bar, line, pie, doughnut
- Données en JSON

**Exemple content** :
```json
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
      "label": "Ventes",
      "data": [12, 19, 3]
    }]
  }
}
```

### **10. shape**
- Formes géométriques décoratives
- Types : rectangle, circle, arrow-right, arrow-down, triangle

### **11. button**
- Bouton interactif
- Action : naviguer vers slide, ouvrir URL, exécuter code

---

## 🎭 Style Presets

| Preset | Font Size | Weight | Transform | Usage |
|--------|-----------|--------|-----------|-------|
| `h1` | 3em | bold | uppercase | Titre principal |
| `h2` | 2em | bold | none | Sous-titre |
| `h3` | 1.5em | bold | none | Titre section |
| `h4` | 1.2em | semibold | none | Sous-section |
| `body` | 1em | normal | none | Texte normal |
| `lead` | 1.2em | normal | none | Introduction |
| `caption` | 0.8em | normal | italic | Légende |
| `small` | 0.7em | normal | none | Petit texte |
| `code` | 0.9em | monospace | none | Code |
| `quote` | 1.1em | italic | none | Citation |

---

## ✨ Animations

**Entrée de slide** :
- `fade-in`
- `slide-in-left`, `slide-in-right`, `slide-in-up`, `slide-in-down`
- `zoom-in`, `zoom-out`
- `rotate-in`

**Fragment (composant)** :
- `fragment-fade`
- `fragment-grow`
- `fragment-shrink`
- `fragment-highlight-red`, `fragment-highlight-blue`

---

## ⚙️ Architecture Technique du Widget

### **Structure de données en mémoire**

```javascript
const appState = {
  activePresentation: null,
  slides: [],           // Triés par order
  components: [],       // Groupés par slide_id
  currentSlideIndex: 0,
  editMode: false       // Preview vs Edit
};
```

### **Moteur de rendu**

```javascript
function buildPresentation(presentation, slides, components) {
  // 1. Récupérer slides triés
  const sortedSlides = slides
    .filter(s => s.presentation === presentation.id)
    .sort((a, b) => a.order - b.order);

  // 2. Pour chaque slide, générer HTML
  const slidesHTML = sortedSlides.map(slide => {
    const slideComponents = components
      .filter(c => c.slide === slide.id)
      .sort((a, b) => a.order - b.order);

    return renderSlide(slide, slideComponents);
  });

  // 3. Injecter dans .slides
  document.querySelector('.reveal .slides').innerHTML =
    slidesHTML.join('');

  // 4. Réinitialiser Reveal.js
  requestAnimationFrame(() => {
    Reveal.sync();
    Reveal.layout();
  });
}
```

### **Component Renderer**

```javascript
function renderComponent(component, positionOverride = null) {
  const position = positionOverride || component.position;
  const preset = STYLE_PRESETS[component.style_preset] || {};

  // Styles calculés
  const styles = {
    width: component.width,
    height: component.height,
    fontSize: component.font_size === 'custom'
      ? component.font_size_custom
      : component.font_size,
    color: component.color,
    background: component.background,
    textAlign: component.align,
    ...preset,
    ...parseCssString(component.custom_css)
  };

  const cssString = objectToCSS(styles);
  const classes = [
    'component',
    `component-${component.type}`,
    `position-${position}`,
    component.animation ? `animate-${component.animation}` : '',
    component.border ? 'has-border' : '',
    component.shadow ? 'has-shadow' : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" style="${cssString}">
      ${COMPONENT_RENDERERS[component.type](component)}
    </div>
  `;
}
```

---

## 🚀 Workflow Utilisateur Type

### **Étape 1 : Créer une présentation**
| title | theme | transition | active |
|-------|-------|------------|--------|
| Ma Présentation | black | slide | ✓ |

### **Étape 2 : Ajouter des slides**

**Slide 1 - Titre**
| presentation | order | layout | background_color |
|--------------|-------|--------|------------------|
| Ma Présentation | 1 | title | #1a1a1a |

**Slide 2 - Contenu**
| presentation | order | layout | background_color |
|--------------|-------|--------|------------------|
| Ma Présentation | 2 | two-column | #2a2a2a |

### **Étape 3 : Ajouter des composants**

**Composants Slide 1**
| slide | order | type | content | style_preset | position |
|-------|-------|------|---------|--------------|----------|
| Slide 1 | 1 | text | # Bienvenue | h1 | center |
| Slide 1 | 2 | text | Présentation 2024 | h2 | center |

**Composants Slide 2**
| slide | order | type | content | position | width |
|-------|-------|------|---------|----------|-------|
| Slide 2 | 1 | text | ## Nos Chiffres | left | 50% |
| Slide 2 | 2 | chart | {"type":"bar",...} | right | 50% |

---

## 🎯 CSS Grid System

```css
/* Layout base */
.reveal section {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(12, 1fr);
  gap: 1rem;
}

/* Positions 3x3 */
.position-top-left { grid-area: 1 / 1 / 5 / 5; }
.position-top-center { grid-area: 1 / 5 / 5 / 9; }
.position-top-right { grid-area: 1 / 9 / 5 / 13; }

.position-center-left { grid-area: 5 / 1 / 9 / 5; }
.position-center { grid-area: 5 / 5 / 9 / 9; }
.position-center-right { grid-area: 5 / 9 / 9 / 13; }

.position-bottom-left { grid-area: 9 / 1 / 13 / 5; }
.position-bottom-center { grid-area: 9 / 5 / 13 / 9; }
.position-bottom-right { grid-area: 9 / 9 / 13 / 13; }
```

---

## 📦 Fonctionnalités Avancées

### **1. Mode Édition**
- Toggle dans le widget : Preview ⇄ Edit
- En mode Edit : cliquer sur un composant → ouvre la ligne Grist correspondante
- Hover sur composant → affiche outline + nom

### **2. Copier/Coller Slides**
- Bouton "Dupliquer slide" → copie slide + tous ses composants
- Incrémente automatiquement `order`

### **3. Templates de Slides**
- Table `Slide_Templates` avec slides pré-configurés
- Bouton "Créer depuis template" → copie structure

### **4. Variables Dynamiques**
- Dans `content`, supporter : `{{table.field}}`
- Exemple : `"Ventes : {{KPI.revenue}}"`
- Remplacé au rendu par valeur temps réel

### **5. Export**
- Bouton "Export HTML" → génère fichier standalone
- Inclut toutes les images en base64
- Téléchargeable depuis le widget

### **6. Présentation Mode**
- Bouton "Démarrer présentation" → plein écran
- Raccourcis clavier Reveal.js actifs
- Timer de présentation

---

## 🎨 Exemples de Configurations

### **Exemple 1 : Slide Titre avec Logo**

**Slides**
| layout | background_color |
|--------|------------------|
| custom | linear-gradient(135deg, #667eea 0%, #764ba2 100%) |

**Components**
| order | type | content | attachment | position | width |
|-------|------|---------|------------|----------|-------|
| 1 | image | - | [logo.png] | top-right | 150px |
| 2 | text | # Ma Startup | center | auto |
| 3 | text | Innovation & Tech | center | auto |

### **Exemple 2 : Comparaison Avant/Après**

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

### **Exemple 3 : Code Demo**

**Slides**
| layout | background_color |
|--------|------------------|
| sidebar-right | #1e1e1e |

**Components**
| order | type | content | position |
|-------|------|---------|----------|
| 1 | code | ```python\ndef process(data):\n  return data * 2\n``` | left |
| 2 | text | ### Fonction de traitement\n\nDouble les valeurs entrantes | right |

---

## 📄 Version

**Version** : 1.0.0
**Date** : 2025-01-22
**Auteur** : Claude Code
**Licence** : Apache-2.0
