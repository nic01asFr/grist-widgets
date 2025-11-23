# Guide Complet pour Agent IA - Création de Présentations Reveal.js dans Grist

Ce guide permet à un agent IA équipé de MCP tools Grist de créer des présentations Reveal.js complètes de bout en bout.

## Table des matières

1. [Architecture des tables](#architecture-des-tables)
2. [Workflow de création](#workflow-de-création)
3. [Référence des layouts](#référence-des-layouts)
4. [Référence des composants](#référence-des-composants)
5. [Système de positionnement](#système-de-positionnement)
6. [Règles de validation](#règles-de-validation)
7. [Exemples complets](#exemples-complets)
8. [Checklist finale](#checklist-finale)

---

## Architecture des tables

### Table 1: `Presentations`

Contient les métadonnées de chaque présentation.

**Colonnes obligatoires:**

| Colonne | Type | Valeurs possibles | Défaut | Description |
|---------|------|-------------------|--------|-------------|
| `title` | Text | - | - | Titre de la présentation |
| `theme` | Choice | 'black', 'white', 'league', 'beige', 'sky', 'night', 'serif', 'simple', 'solarized', 'blood', 'moon' | 'black' | Thème Reveal.js |
| `transition` | Choice | 'slide', 'fade', 'zoom', 'convex', 'concave', 'none' | 'slide' | Transition par défaut |
| `active` | Bool | true, false | true | Présentation active |
| `controls` | Bool | true, false | true | Afficher les contrôles |
| `progress_bar` | Bool | true, false | true | Afficher la barre de progression |
| `slide_number` | Bool | true, false | true | Afficher le numéro de slide |

**Exemple de création:**
```python
# Avec MCP Grist tools
presentations_table.add_record({
    'title': 'Ma Présentation',
    'theme': 'black',
    'transition': 'slide',
    'active': True,
    'controls': True,
    'progress_bar': True,
    'slide_number': True
})
```

---

### Table 2: `Slides`

Contient les slides de chaque présentation.

**Colonnes obligatoires:**

| Colonne | Type | Valeurs possibles | Défaut | Description |
|---------|------|-------------------|--------|-------------|
| `presentation` | Reference | ID de Presentations | - | **CRITIQUE**: Lien vers la présentation |
| `order` | Int | 0, 1, 2, ... | 0 | **CRITIQUE**: Ordre d'affichage (0 = première slide) |
| `title` | Text | - | - | Titre de la slide (facultatif) |
| `layout` | Choice | Voir [Référence des layouts](#référence-des-layouts) | 'content' | **CRITIQUE**: Type de mise en page |
| `background_type` | Choice | 'color', 'image', 'gradient', null | null | Type de fond |
| `background_color` | Text | Code couleur hex (#RRGGBB) | null | Couleur de fond |
| `background_image` | Text | URL de l'image | null | Image de fond |
| `background_size` | Choice | 'cover', 'contain', 'auto' | 'cover' | Taille de l'image de fond |
| `background_opacity` | Numeric | 0.0 - 1.0 | 1.0 | Opacité du fond |
| `transition_override` | Choice | 'slide', 'fade', 'zoom', 'convex', 'concave', 'none', null | null | Transition spécifique à cette slide |
| `auto_animate` | Bool | true, false | false | Animation automatique |
| `notes` | Text | - | null | Notes du présentateur |

**Exemple de création:**
```python
slides_table.add_record({
    'presentation': presentation_id,  # ID de la présentation parente
    'order': 0,                        # Première slide
    'title': 'Introduction',
    'layout': 'title',                 # Layout titre
    'background_type': 'color',
    'background_color': '#1a1a2e'
})
```

---

### Table 3: `Components`

Contient les composants (éléments) de chaque slide.

**Colonnes obligatoires:**

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `slide` | Reference | **OBLIGATOIRE** | ID de la slide parente |
| `order` | Int | **OBLIGATOIRE** | Ordre d'affichage (0 = premier) |
| `type` | Choice | **OBLIGATOIRE** | Type de composant (voir ci-dessous) |
| `content` | Text | - | Contenu du composant |
| `attachment` | Attachments | - | Fichier attaché (pour images) |
| `url` | Text | - | URL (pour images/videos) |
| `position` | Text | **CRITIQUE pour layouts modernes** | Position dans le layout |
| `width_percent` | Int | 1-100 | Largeur en % |
| `height_percent` | Int | 1-100 | Hauteur en % |
| `x_percent` | Numeric | 0-100 | Position X en % (custom uniquement) |
| `y_percent` | Numeric | 0-100 | Position Y en % (custom uniquement) |
| `style_preset` | Choice | 'default', 'box', 'highlight', 'muted' | Style prédéfini |
| `align` | Choice | 'left', 'center', 'right', 'justify' | Alignement du texte |
| `font_size` | Choice | 'xs', 'sm', 'md', 'lg', 'xl', 'custom' | Taille de police |
| `font_size_custom` | Int | px | Taille personnalisée (si font_size='custom') |
| `color` | Text | Code hex | Couleur du texte |
| `background` | Text | Code hex | Couleur de fond |
| `padding` | Int | px | Espacement intérieur |
| `border` | Int | px | Épaisseur de bordure |
| `border_color` | Text | Code hex | Couleur de bordure |
| `border_radius` | Int | px | Arrondi des coins |
| `shadow` | Bool | true/false | Ombre portée |
| `animation` | Choice | 'none', 'fade-in', 'slide-in', 'zoom-in', 'bounce' | Animation d'entrée |
| `custom_css` | Text | - | CSS personnalisé |

---

## Workflow de création

### Étape 1: Créer la présentation

```python
# 1. Créer l'enregistrement dans Presentations
presentation = presentations_table.add_record({
    'title': 'Titre de ma présentation',
    'theme': 'black',
    'transition': 'slide',
    'active': True,
    'controls': True,
    'progress_bar': True,
    'slide_number': True
})

presentation_id = presentation.id
```

### Étape 2: Créer les slides dans l'ordre

**RÈGLE CRITIQUE**: Les slides doivent être créées avec des numéros `order` séquentiels commençant à 0.

```python
# Slide 1: Titre (order = 0)
slide_1 = slides_table.add_record({
    'presentation': presentation_id,
    'order': 0,
    'layout': 'title'
})

# Slide 2: Contenu (order = 1)
slide_2 = slides_table.add_record({
    'presentation': presentation_id,
    'order': 1,
    'layout': 'content'
})

# Slide 3: Deux colonnes (order = 2)
slide_3 = slides_table.add_record({
    'presentation': presentation_id,
    'order': 2,
    'layout': 'two-column'
})
```

### Étape 3: Ajouter des composants à chaque slide

**RÈGLE CRITIQUE**: Pour chaque slide, les composants doivent avoir des numéros `order` séquentiels commençant à 0.

```python
# Composants pour slide_1 (layout: title)
components_table.add_record({
    'slide': slide_1.id,
    'order': 0,
    'type': 'text',
    'content': '# Ma Présentation',
    'position': 'center',  # CRITIQUE pour layout 'title'
    'width_percent': 80,
    'height_percent': 30
})

components_table.add_record({
    'slide': slide_1.id,
    'order': 1,
    'type': 'text',
    'content': 'Par John Doe',
    'position': 'center',  # CRITIQUE
    'width_percent': 60,
    'height_percent': 10,
    'font_size': 'sm'
})
```

---

## Référence des layouts

### Layouts disponibles

| Layout | Description | Positions disponibles | Usage |
|--------|-------------|----------------------|-------|
| `title` | Page de titre centrée | `center` | Première slide |
| `content` | Contenu centré simple | `center` | Contenu unique |
| `two-column` | Deux colonnes égales | `left`, `right` | Comparaisons |
| `three-column` | Trois colonnes égales | `col-1`, `col-2`, `col-3` | Listes multiples |
| `sidebar-left` | Barre latérale gauche (30%) + contenu (70%) | `col-1` (gauche), `col-2` (droite) | Menu + contenu |
| `sidebar-right` | Contenu (70%) + barre latérale droite (30%) | `col-1` (gauche), `col-2` (droite) | Contenu + notes |
| `grid-2x2` | Grille 2×2 | `top-left`, `top-right`, `bottom-left`, `bottom-right` | Dashboard |
| `full` | Plein écran | `center` | Images, vidéos |
| `custom` | Positionnement libre | **N'utilise PAS `position`** | Layouts complexes |

### Détails par layout

#### Layout: `title`
- **Usage**: Page de titre, introduction
- **Position obligatoire**: `center`
- **Exemple**:
  ```python
  {
      'layout': 'title',
      'components': [
          {'type': 'text', 'content': '# Titre Principal', 'position': 'center'},
          {'type': 'text', 'content': 'Sous-titre', 'position': 'center'}
      ]
  }
  ```

#### Layout: `content`
- **Usage**: Contenu simple centré
- **Position obligatoire**: `center`
- **Exemple**:
  ```python
  {
      'layout': 'content',
      'components': [
          {'type': 'text', 'content': '## Section', 'position': 'center'},
          {'type': 'list', 'content': '- Point 1\n- Point 2', 'position': 'center'}
      ]
  }
  ```

#### Layout: `two-column`
- **Usage**: Deux colonnes égales (50/50)
- **Positions obligatoires**: `left`, `right`
- **RÈGLE**: Chaque composant doit avoir `position` = `left` OU `right`
- **Exemple**:
  ```python
  {
      'layout': 'two-column',
      'components': [
          {'type': 'text', 'content': '## Colonne Gauche', 'position': 'left'},
          {'type': 'list', 'content': '- Item 1\n- Item 2', 'position': 'left'},
          {'type': 'text', 'content': '## Colonne Droite', 'position': 'right'},
          {'type': 'image', 'url': 'image.jpg', 'position': 'right'}
      ]
  }
  ```

#### Layout: `three-column`
- **Usage**: Trois colonnes égales (33/33/33)
- **Positions obligatoires**: `col-1`, `col-2`, `col-3`
- **Exemple**:
  ```python
  {
      'layout': 'three-column',
      'components': [
          {'type': 'text', 'content': '### Col 1', 'position': 'col-1'},
          {'type': 'text', 'content': '### Col 2', 'position': 'col-2'},
          {'type': 'text', 'content': '### Col 3', 'position': 'col-3'}
      ]
  }
  ```

#### Layout: `sidebar-left`
- **Usage**: Menu/navigation à gauche (30%) + contenu principal (70%)
- **Positions obligatoires**: `col-1` (gauche 30%), `col-2` (droite 70%)
- **Exemple**:
  ```python
  {
      'layout': 'sidebar-left',
      'components': [
          {'type': 'list', 'content': '- Menu 1\n- Menu 2', 'position': 'col-1'},
          {'type': 'text', 'content': '## Contenu principal', 'position': 'col-2'}
      ]
  }
  ```

#### Layout: `sidebar-right`
- **Usage**: Contenu principal (70%) + notes à droite (30%)
- **Positions obligatoires**: `col-1` (gauche 70%), `col-2` (droite 30%)
- **Exemple**:
  ```python
  {
      'layout': 'sidebar-right',
      'components': [
          {'type': 'text', 'content': '## Contenu', 'position': 'col-1'},
          {'type': 'text', 'content': 'Notes', 'position': 'col-2', 'font_size': 'sm'}
      ]
  }
  ```

#### Layout: `grid-2x2`
- **Usage**: Grille 2×2 pour dashboard
- **Positions obligatoires**: `top-left`, `top-right`, `bottom-left`, `bottom-right`
- **Exemple**:
  ```python
  {
      'layout': 'grid-2x2',
      'components': [
          {'type': 'text', 'content': 'Case 1', 'position': 'top-left'},
          {'type': 'text', 'content': 'Case 2', 'position': 'top-right'},
          {'type': 'text', 'content': 'Case 3', 'position': 'bottom-left'},
          {'type': 'text', 'content': 'Case 4', 'position': 'bottom-right'}
      ]
  }
  ```

#### Layout: `full`
- **Usage**: Image/vidéo plein écran
- **Position obligatoire**: `center`
- **Exemple**:
  ```python
  {
      'layout': 'full',
      'components': [
          {'type': 'image', 'url': 'photo.jpg', 'position': 'center', 'width_percent': 100, 'height_percent': 100}
      ]
  }
  ```

#### Layout: `custom`
- **Usage**: Positionnement pixel-perfect personnalisé
- **RÈGLE CRITIQUE**: Ne PAS utiliser `position`, utiliser `x_percent` et `y_percent`
- **RÈGLE**: Tous les composants DOIVENT avoir `x_percent`, `y_percent`, `width_percent`, `height_percent`
- **Exemple**:
  ```python
  {
      'layout': 'custom',
      'components': [
          {
              'type': 'text',
              'content': 'Titre',
              'x_percent': 50,      # Centre horizontal
              'y_percent': 15,      # 15% du haut
              'width_percent': 80,
              'height_percent': 12
              # PAS de 'position' !
          },
          {
              'type': 'image',
              'url': 'logo.png',
              'x_percent': 10,      # 10% de la gauche
              'y_percent': 50,      # Centre vertical
              'width_percent': 30,
              'height_percent': 30
              # PAS de 'position' !
          }
      ]
  }
  ```

---

## Référence des composants

### Types de composants disponibles

| Type | Description | Champs obligatoires | Champs optionnels |
|------|-------------|---------------------|-------------------|
| `text` | Texte/Markdown | `content` | `align`, `font_size`, `color` |
| `list` | Liste à puces ou numérotée | `content` | `align`, `font_size`, `color` |
| `image` | Image | `url` OU `attachment` | `background_size` |
| `video` | Vidéo | `url` | - |
| `code` | Bloc de code | `content` | `font_size` |
| `quote` | Citation | `content` | `align`, `font_size`, `color` |
| `shape` | Forme géométrique | `background` | `border`, `border_color`, `border_radius` |
| `separator` | Ligne de séparation | - | `color`, `height_percent` |
| `button` | Bouton cliquable | `content`, `url` | `background`, `color` |
| `chart` | Graphique (placeholder) | `content` | - |
| `table` | Tableau HTML | `content` | `font_size` |

### Détails par type

#### Type: `text`
- **Format**: Markdown supporté
- **Balises Markdown**:
  - `# Titre 1`, `## Titre 2`, `### Titre 3`
  - `**gras**`, `*italique*`
  - `[lien](url)`
- **Exemple**:
  ```python
  {
      'type': 'text',
      'content': '## Titre de section\n\nCeci est un paragraphe avec **texte en gras** et *italique*.',
      'position': 'center',
      'width_percent': 80,
      'height_percent': 30,
      'align': 'left',
      'font_size': 'md',
      'color': '#ffffff'
  }
  ```

#### Type: `list`
- **Format**: Liste Markdown
- **Types**: Puces (`-`) ou numérotées (`1.`)
- **RÈGLE**: TOUJOURS utiliser `align: 'left'` pour les listes (sinon les puces sont décalées)
- **Exemple**:
  ```python
  {
      'type': 'list',
      'content': '- Point 1\n- Point 2\n- Point 3',
      'position': 'left',
      'width_percent': 80,
      'height_percent': 40,
      'align': 'left',  # CRITIQUE !
      'font_size': 'md'
  }
  ```

#### Type: `image`
- **Sources**: `url` (prioritaire) OU `attachment`
- **Exemple avec URL**:
  ```python
  {
      'type': 'image',
      'url': 'https://example.com/photo.jpg',
      'position': 'center',
      'width_percent': 60,
      'height_percent': 60
  }
  ```

#### Type: `code`
- **Format**: Bloc de code avec coloration syntaxique
- **Exemple**:
  ```python
  {
      'type': 'code',
      'content': 'function hello() {\n  console.log("Hello!");\n}',
      'position': 'center',
      'width_percent': 70,
      'height_percent': 40,
      'font_size': 'sm'
  }
  ```

#### Type: `quote`
- **Format**: Citation avec style distinct
- **Exemple**:
  ```python
  {
      'type': 'quote',
      'content': 'La vie est comme une bicyclette, il faut avancer pour ne pas perdre l\'équilibre.',
      'position': 'center',
      'width_percent': 80,
      'height_percent': 20,
      'align': 'center',
      'font_size': 'lg'
  }
  ```

#### Type: `shape`
- **Usage**: Rectangle coloré, cercle, ligne
- **Exemple**:
  ```python
  {
      'type': 'shape',
      'position': 'center',
      'width_percent': 50,
      'height_percent': 30,
      'background': '#4CAF50',
      'border_radius': 10,
      'shadow': True
  }
  ```

---

## Système de positionnement

### Règle d'OR EXCLUSIF

**CRITIQUE**: Un composant utilise SOIT le système moderne, SOIT le système custom. JAMAIS les deux.

```
SI layout = 'custom':
    ✅ UTILISER: x_percent, y_percent, width_percent, height_percent
    ❌ NE PAS UTILISER: position

SINON (layouts modernes):
    ✅ UTILISER: position, width_percent, height_percent
    ❌ NE PAS UTILISER: x_percent, y_percent
```

### Système moderne (layouts: title, content, two-column, etc.)

**Propriétés utilisées:**
- `position`: Emplacement dans le layout (obligatoire)
- `width_percent`: Largeur en % (optionnel, défaut automatique)
- `height_percent`: Hauteur en % (optionnel, défaut automatique)

**Valeurs de `position` par layout:**

| Layout | Positions valides |
|--------|-------------------|
| title | `center` |
| content | `center` |
| two-column | `left`, `right` |
| three-column | `col-1`, `col-2`, `col-3` |
| sidebar-left | `col-1`, `col-2` |
| sidebar-right | `col-1`, `col-2` |
| grid-2x2 | `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| full | `center` |

### Système custom (layout: custom)

**Propriétés utilisées:**
- `x_percent`: Position X (0-100, centre = 50) - OBLIGATOIRE
- `y_percent`: Position Y (0-100, centre = 50) - OBLIGATOIRE
- `width_percent`: Largeur en % - OBLIGATOIRE
- `height_percent`: Hauteur en % - OBLIGATOIRE

**Coordonnées:**
- `x_percent`: 0 = gauche, 50 = centre, 100 = droite
- `y_percent`: 0 = haut, 50 = centre, 100 = bas
- Les composants sont centrés sur leurs coordonnées (pas top-left)

**Exemple:**
```python
# Placer un titre en haut au centre
{
    'type': 'text',
    'content': '## Titre',
    'x_percent': 50,    # Centre horizontal
    'y_percent': 15,    # 15% du haut
    'width_percent': 80,
    'height_percent': 12
}

# Placer une image en bas à gauche
{
    'type': 'image',
    'url': 'logo.png',
    'x_percent': 20,    # 20% de la gauche
    'y_percent': 85,    # 85% du haut (donc en bas)
    'width_percent': 25,
    'height_percent': 20
}
```

---

## Règles de validation

### Validation globale

1. **Présentation**:
   - ✅ `title` non vide
   - ✅ `theme` dans la liste des thèmes valides
   - ✅ `transition` dans la liste des transitions valides

2. **Slide**:
   - ✅ `presentation` référence une présentation existante
   - ✅ `order` >= 0
   - ✅ `order` unique par présentation (pas de doublons)
   - ✅ `layout` dans la liste des layouts valides
   - ✅ Si `background_type` = 'color', alors `background_color` non null
   - ✅ Si `background_type` = 'image', alors `background_image` non null

3. **Composant**:
   - ✅ `slide` référence une slide existante
   - ✅ `order` >= 0
   - ✅ `type` dans la liste des types valides
   - ✅ Selon le type, champs obligatoires présents (ex: `content` pour `text`)

### Validation du positionnement

**Pour layouts modernes (NON custom):**
```python
def validate_modern_component(component, slide_layout):
    assert component.position is not None, "position est obligatoire"
    assert component.position in VALID_POSITIONS[slide_layout], f"position invalide pour layout {slide_layout}"
    assert component.x_percent is None, "x_percent interdit en layout moderne"
    assert component.y_percent is None, "y_percent interdit en layout moderne"
    # width_percent et height_percent sont optionnels
```

**Pour layout custom:**
```python
def validate_custom_component(component):
    assert component.x_percent is not None, "x_percent obligatoire en layout custom"
    assert component.y_percent is not None, "y_percent obligatoire en layout custom"
    assert component.width_percent is not None, "width_percent obligatoire en layout custom"
    assert component.height_percent is not None, "height_percent obligatoire en layout custom"
    assert component.position is None, "position interdit en layout custom"
    assert 0 <= component.x_percent <= 100, "x_percent doit être entre 0 et 100"
    assert 0 <= component.y_percent <= 100, "y_percent doit être entre 0 et 100"
```

---

## Exemples complets

### Exemple 1: Présentation simple (3 slides)

```python
# 1. Créer la présentation
pres = presentations_table.add_record({
    'title': 'Introduction au Projet',
    'theme': 'black',
    'transition': 'slide',
    'active': True
})

# 2. Slide 1: Page de titre
slide1 = slides_table.add_record({
    'presentation': pres.id,
    'order': 0,
    'layout': 'title',
    'background_type': 'color',
    'background_color': '#1a1a2e'
})

components_table.add_record({
    'slide': slide1.id,
    'order': 0,
    'type': 'text',
    'content': '# Introduction au Projet',
    'position': 'center',
    'width_percent': 80,
    'height_percent': 30,
    'font_size': 'xl'
})

components_table.add_record({
    'slide': slide1.id,
    'order': 1,
    'type': 'text',
    'content': 'Par l\'équipe de développement',
    'position': 'center',
    'width_percent': 60,
    'height_percent': 10,
    'font_size': 'md',
    'color': '#999999'
})

# 3. Slide 2: Contenu avec liste
slide2 = slides_table.add_record({
    'presentation': pres.id,
    'order': 1,
    'layout': 'content'
})

components_table.add_record({
    'slide': slide2.id,
    'order': 0,
    'type': 'text',
    'content': '## Objectifs',
    'position': 'center',
    'width_percent': 80,
    'height_percent': 15
})

components_table.add_record({
    'slide': slide2.id,
    'order': 1,
    'type': 'list',
    'content': '- Améliorer la performance\n- Réduire les bugs\n- Optimiser l\'UX',
    'position': 'center',
    'width_percent': 70,
    'height_percent': 40,
    'align': 'left',  # CRITIQUE pour les listes
    'font_size': 'lg'
})

# 4. Slide 3: Deux colonnes
slide3 = slides_table.add_record({
    'presentation': pres.id,
    'order': 2,
    'layout': 'two-column'
})

# Colonne gauche
components_table.add_record({
    'slide': slide3.id,
    'order': 0,
    'type': 'text',
    'content': '## Avantages',
    'position': 'left',
    'width_percent': 80,
    'height_percent': 15
})

components_table.add_record({
    'slide': slide3.id,
    'order': 1,
    'type': 'list',
    'content': '- Rapide\n- Efficace\n- Scalable',
    'position': 'left',
    'width_percent': 80,
    'height_percent': 40,
    'align': 'left'
})

# Colonne droite
components_table.add_record({
    'slide': slide3.id,
    'order': 2,
    'type': 'text',
    'content': '## Défis',
    'position': 'right',
    'width_percent': 80,
    'height_percent': 15
})

components_table.add_record({
    'slide': slide3.id,
    'order': 3,
    'type': 'list',
    'content': '- Complexité\n- Temps\n- Ressources',
    'position': 'right',
    'width_percent': 80,
    'height_percent': 40,
    'align': 'left'
})
```

### Exemple 2: Présentation avec layout custom

```python
# Slide avec positionnement custom
slide_custom = slides_table.add_record({
    'presentation': pres.id,
    'order': 3,
    'layout': 'custom',
    'background_type': 'gradient',
    'background_color': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
})

# Titre en haut
components_table.add_record({
    'slide': slide_custom.id,
    'order': 0,
    'type': 'text',
    'content': '## Architecture Système',
    'x_percent': 50,
    'y_percent': 10,
    'width_percent': 80,
    'height_percent': 10
    # PAS de 'position'
})

# Image à gauche
components_table.add_record({
    'slide': slide_custom.id,
    'order': 1,
    'type': 'image',
    'url': 'https://example.com/diagram.png',
    'x_percent': 25,
    'y_percent': 50,
    'width_percent': 40,
    'height_percent': 60
    # PAS de 'position'
})

# Texte à droite
components_table.add_record({
    'slide': slide_custom.id,
    'order': 2,
    'type': 'text',
    'content': 'Description du système et de ses composants principaux.',
    'x_percent': 70,
    'y_percent': 50,
    'width_percent': 35,
    'height_percent': 50,
    'align': 'left'
    # PAS de 'position'
})

# Logo en bas à droite
components_table.add_record({
    'slide': slide_custom.id,
    'order': 3,
    'type': 'image',
    'url': 'https://example.com/logo.png',
    'x_percent': 90,
    'y_percent': 90,
    'width_percent': 15,
    'height_percent': 15
    # PAS de 'position'
})
```

### Exemple 3: Dashboard avec grid-2x2

```python
slide_grid = slides_table.add_record({
    'presentation': pres.id,
    'order': 4,
    'layout': 'grid-2x2'
})

# Case haut-gauche: Métrique 1
components_table.add_record({
    'slide': slide_grid.id,
    'order': 0,
    'type': 'text',
    'content': '### Utilisateurs\n\n**12,456**',
    'position': 'top-left',
    'style_preset': 'box',
    'background': '#2196F3',
    'padding': 20
})

# Case haut-droite: Métrique 2
components_table.add_record({
    'slide': slide_grid.id,
    'order': 1,
    'type': 'text',
    'content': '### Revenus\n\n**$54,320**',
    'position': 'top-right',
    'style_preset': 'box',
    'background': '#4CAF50',
    'padding': 20
})

# Case bas-gauche: Métrique 3
components_table.add_record({
    'slide': slide_grid.id,
    'order': 2,
    'type': 'text',
    'content': '### Taux de conversion\n\n**3.2%**',
    'position': 'bottom-left',
    'style_preset': 'box',
    'background': '#FF9800',
    'padding': 20
})

# Case bas-droite: Métrique 4
components_table.add_record({
    'slide': slide_grid.id,
    'order': 3,
    'type': 'text',
    'content': '### Satisfaction\n\n**4.8/5**',
    'position': 'bottom-right',
    'style_preset': 'box',
    'background': '#9C27B0',
    'padding': 20
})
```

---

## Checklist finale

Avant de considérer une présentation comme complète, vérifier:

### ✅ Présentation
- [ ] Table `Presentations` créée
- [ ] Enregistrement créé avec `title` non vide
- [ ] `theme` est valide
- [ ] `transition` est valide
- [ ] `active` = True

### ✅ Slides
- [ ] Au moins 1 slide créée
- [ ] Chaque slide a un `order` unique et séquentiel (0, 1, 2, ...)
- [ ] Chaque slide référence la bonne `presentation`
- [ ] Chaque slide a un `layout` valide
- [ ] Si fond coloré/image, champs correspondants remplis

### ✅ Composants
- [ ] Chaque slide a au moins 1 composant
- [ ] Chaque composant a un `order` unique par slide (0, 1, 2, ...)
- [ ] Chaque composant a un `type` valide
- [ ] Champs obligatoires selon le type sont remplis
- [ ] **CRITIQUE**: Pour layouts modernes → `position` présent, PAS de `x_percent/y_percent`
- [ ] **CRITIQUE**: Pour layout custom → `x_percent/y_percent/width_percent/height_percent` présents, PAS de `position`
- [ ] Pour les listes → `align: 'left'`
- [ ] Pour les images → `url` OU `attachment`

### ✅ Cohérence globale
- [ ] Numéros `order` des slides sans trous (0, 1, 2, 3, ...)
- [ ] Numéros `order` des composants par slide sans trous
- [ ] Toutes les références (presentation_id, slide_id) sont valides
- [ ] Pas de valeurs null dans les champs obligatoires
- [ ] Valeurs des enums (`theme`, `layout`, `type`, etc.) sont valides

---

## Conseils pour agents IA

### Ordre des opérations

1. **Toujours créer dans cet ordre:**
   1. Presentations
   2. Slides (dans l'ordre `order`)
   3. Components (pour chaque slide, dans l'ordre `order`)

2. **Toujours incrémenter `order` séquentiellement:**
   ```python
   # ✅ CORRECT
   slide_orders = [0, 1, 2, 3, 4]
   component_orders_per_slide = [0, 1, 2]

   # ❌ INCORRECT
   slide_orders = [0, 2, 5, 7]  # Trous !
   ```

3. **Toujours vérifier le layout avant d'ajouter un composant:**
   ```python
   if slide.layout == 'custom':
       # Utiliser x_percent, y_percent, width_percent, height_percent
       component['x_percent'] = 50
       component['y_percent'] = 50
       component['width_percent'] = 80
       component['height_percent'] = 30
       # NE PAS ajouter 'position'
   else:
       # Utiliser position
       component['position'] = get_position_for_layout(slide.layout, component_index)
       # NE PAS ajouter x_percent/y_percent
   ```

### Gestion des erreurs courantes

**Erreur: Composants ne s'affichent pas**
- Vérifier que `position` correspond au layout
- Vérifier que `width_percent` et `height_percent` sont raisonnables (10-100)
- Vérifier que `content` n'est pas vide pour les composants texte

**Erreur: Listes mal alignées**
- Toujours mettre `align: 'left'` pour les composants de type `list`

**Erreur: Slides dans le désordre**
- Vérifier que les `order` sont séquentiels: 0, 1, 2, 3...
- Pas de doublons, pas de trous

**Erreur: Superposition au chargement**
- Ne pas s'inquiéter, c'est géré par le CSS du widget (opacity: 0 au départ)

### Templates de démarrage rapide

**Présentation basique 3 slides:**
```
Slide 0: layout='title', 2 composants text (titre + sous-titre)
Slide 1: layout='content', 1 composant text + 1 composant list
Slide 2: layout='two-column', 2 composants text + 2 composants list
```

**Présentation complète 5 slides:**
```
Slide 0: layout='title'
Slide 1: layout='content' (introduction)
Slide 2: layout='two-column' (comparaison)
Slide 3: layout='grid-2x2' (dashboard)
Slide 4: layout='content' (conclusion)
```

**Présentation avancée avec custom:**
```
Slide 0: layout='title'
Slide 1: layout='content'
Slide 2: layout='custom' (diagramme complexe)
Slide 3: layout='sidebar-left' (navigation)
Slide 4: layout='full' (image plein écran)
```

---

## Résumé des règles CRITIQUES

1. **Order séquentiels**: Toujours 0, 1, 2, 3... (pas de trous, pas de doublons)
2. **Position vs Custom**: JAMAIS les deux systèmes ensemble
   - Layouts modernes → `position` obligatoire, `x_percent/y_percent` interdits
   - Layout custom → `x_percent/y_percent/width_percent/height_percent` obligatoires, `position` interdit
3. **Listes**: Toujours `align: 'left'`
4. **Références**: `presentation` pour slides, `slide` pour components
5. **Champs obligatoires**:
   - Slide: `presentation`, `order`, `layout`
   - Component: `slide`, `order`, `type`
6. **Layouts et positions**: Respecter les positions valides par layout
7. **Images**: `url` OU `attachment`, jamais les deux vides

---

## Support et documentation

- **CLAUDE.md**: Vue d'ensemble du projet
- **ARCHITECTURE.md**: Principes architecturaux
- **REVEAL_WIDGET_GUIDE.md**: Guide complet Reveal.js
- **API_REFERENCE.md**: API Grist widgets

Ce guide permet à un agent IA de créer des présentations Reveal.js complètes et fonctionnelles sans intervention humaine. Suivre ces règles garantit une présentation sans bugs et visuellement correcte.
