# 🎨 Reveal.js Editor

Éditeur visuel WYSIWYG pour créer et éditer des présentations Reveal.js directement dans Grist avec glisser-déposer et édition en temps réel.

## 🎯 Concept

Créez et éditez visuellement vos présentations Reveal.js :
- **Interface 3 panneaux** : Liste de slides, canvas d'édition, propriétés
- **Glisser-déposer** : Ajoutez des composants depuis la palette
- **Édition visuelle** : Déplacez, redimensionnez, alignez
- **Double-clic** : Éditez le texte en ligne
- **Templates** : Démarrez rapidement avec des modèles prédéfinis
- **Synchronisation Grist** : Toutes les modifications sont sauvegardées automatiquement

## 🔗 Utilisation avec Reveal.js Builder

Cet éditeur fonctionne de pair avec **Reveal.js Builder** :
- **Reveal.js Editor** (ce widget) : Création et édition visuelle des slides
- **Reveal.js Builder** : Visualisation et présentation des slides créés

Les deux widgets partagent les **mêmes 3 tables Grist** :
- `Presentations` - Configuration des présentations
- `Slides` - Définition des slides
- `Components` - Éléments dans chaque slide

## 🚀 Démarrage Rapide

### 1. Ajouter le Widget dans Grist

1. Ouvrez votre document Grist
2. Ajoutez une section → **Custom Widget**
3. URL du widget : `https://nic01asfr.github.io/grist-widgets/reveal-editor/`
4. Le widget vérifiera automatiquement les tables requises

### 2. Créer les Tables (Automatique)

Au premier lancement, le widget détecte les tables manquantes et propose :
- **🔨 Créer les tables automatiquement** (bouton dans le widget)

Les tables créées :
- `Presentations` - Configuration des présentations
- `Slides` - Définition des slides
- `Components` - Éléments dans chaque slide

> **Note** : Si vous avez déjà créé ces tables avec Reveal.js Builder, vous pouvez directement commencer à éditer.

### 3. Créer Votre Première Présentation

#### Étape 1 : Nouvelle Présentation

1. Cliquer sur **➕ Nouvelle présentation**
2. Entrer un titre
3. Choisir un thème (black, white, league, etc.)
4. Créer

#### Étape 2 : Ajouter un Slide

1. Cliquer sur **➕ Slide** dans la barre d'outils
2. Ou utiliser un **Template** (bouton 📋)

#### Étape 3 : Ajouter des Composants

**Glisser-déposer** depuis la palette en bas :
- **T** : Texte
- **🖼️** : Image
- **&lt;/&gt;** : Code
- **•** : Liste
- **⊞** : Tableau
- **❝** : Citation
- **▶** : Vidéo
- **📊** : Graphique
- **■** : Forme
- **🔘** : Bouton

#### Étape 4 : Éditer et Organiser

**Éditer un composant** :
- Sélectionner → Panneau de droite affiche les propriétés
- Double-clic sur texte → Éditeur enrichi
- Modifier position/taille → Sauvegarder automatique

**Aligner** :
- Sélectionner un composant
- Utiliser les boutons d'alignement : ⬅ ↔ ➡ ⬆ ↕ ⬇

**Supprimer** :
- Sélectionner → Bouton 🗑️ ou touche `Delete`

---

## 🎨 Interface

### Barre d'Outils (Haut)

| Bouton | Action |
|--------|--------|
| **➕ Présentation** | Créer une nouvelle présentation |
| **➕ Slide** | Ajouter un slide à la présentation actuelle |
| **📋 Templates** | Insérer un slide depuis un modèle |
| **↶** | Annuler (Ctrl+Z) |
| **↷** | Rétablir (Ctrl+Shift+Z) |
| **⬅ ↔ ➡** | Aligner horizontalement |
| **⬆ ↕ ⬇** | Aligner verticalement |
| **🔍+** | Zoom avant |
| **🔍-** | Zoom arrière |
| **🎨** | Couleur de fond du slide |
| **🗑️** | Supprimer le composant sélectionné |

### Panneau Gauche - Liste de Slides

Affiche tous les slides de la présentation actuelle :
- **Clic** sur un slide pour le charger dans le canvas
- Le slide actif est **surligné en vert**
- Numéro et titre affichés

### Panneau Central - Canvas

Zone d'édition visuelle :
- **960 x 700 px** (dimensions standard Reveal.js)
- **Glisser-déposer** des composants
- **Sélectionner** : Clic sur un composant
- **Déplacer** : Glisser un composant
- **Redimensionner** : Tirer sur les poignées
- **Double-clic** : Éditer le texte (pour composants texte)

### Panneau Droit - Propriétés

Affiche les propriétés du composant sélectionné :
- **Type** de composant
- **Position** (X, Y)
- **Taille** (Largeur, Hauteur)
- **Texte** (pour composants texte) :
  - Contenu
  - Taille de police
  - Couleur

Bouton **💾 Appliquer** pour sauvegarder les modifications.

### Palette de Composants (Bas)

Glissez les composants sur le canvas :

| Icône | Type | Description |
|-------|------|-------------|
| **T** | text | Texte et Markdown |
| **🖼️** | image | Image (URL ou pièce jointe Grist) |
| **&lt;/&gt;** | code | Code avec coloration syntaxique |
| **•** | list | Liste à puces |
| **⊞** | table | Tableau de données |
| **❝** | quote | Citation |
| **▶** | video | Vidéo (YouTube, Vimeo, fichier) |
| **🌐** | iframe | Site web embarqué |
| **📊** | chart | Graphique Chart.js |
| **■** | shape | Forme géométrique |
| **🔘** | button | Bouton interactif |

---

## 📋 Templates Disponibles

### 1. Titre + Logo

Slide de titre avec logo en haut à droite :
- Image (logo) : 150x150px, coin supérieur droit
- Texte (titre) : Centré, grande taille

**Usage** : Slide de couverture, début de section

### 2. Deux Colonnes

Texte à gauche, liste à droite :
- Texte explicatif dans colonne gauche
- Liste de points dans colonne droite

**Usage** : Comparaisons, avantages/inconvénients

### 3. Dashboard 4 KPIs

Grille 2x2 avec 4 métriques :
- 4 zones de texte avec chiffres clés
- Disposition équilibrée

**Usage** : Tableaux de bord, indicateurs de performance

---

## ⌨️ Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Z` | Annuler |
| `Ctrl+Shift+Z` ou `Ctrl+Y` | Rétablir |
| `Delete` ou `Backspace` | Supprimer le composant sélectionné |

---

## 🔄 Synchronisation avec Grist

### Sauvegarde Automatique

Toutes les modifications sont **automatiquement sauvegardées** dans Grist :
- **Position/Taille** : Sauvegardé après 500ms de déplacement (debouncing)
- **Propriétés** : Sauvegardé via bouton "💾 Appliquer"
- **Nouveau composant** : Créé immédiatement dans la table Components

### Visualisation

Pour voir votre présentation :
1. Ouvrez le widget **Reveal.js Builder** dans le même document Grist
2. Activez votre présentation (toggle `active` dans la table Presentations)
3. La présentation s'affiche automatiquement
4. Utilisez les flèches ou `Space` pour naviguer

---

## 🎭 Layouts de Slides

Vous pouvez changer le layout d'un slide via le menu déroulant en haut du canvas.

| Layout | Description | Usage |
|--------|-------------|-------|
| **title** | Contenu centré | Slide de titre, couverture |
| **content** | Layout par défaut avec marges | Contenu standard |
| **two-column** | 2 colonnes 50/50 | Comparaisons, texte + image |
| **three-column** | 3 colonnes égales | Listes de features |
| **sidebar-left** | Sidebar gauche 30/70 | Menu, table des matières |
| **sidebar-right** | Sidebar droite 70/30 | Notes, compléments |
| **grid-2x2** | Grille 4 éléments | Dashboard KPIs, galerie |
| **full** | Plein écran | Image/vidéo plein écran |
| **custom** | Grille libre 3x3 | Positionnement personnalisé |

---

## 🔧 Développement Local

```bash
# Depuis packages/reveal-editor/public
python -m http.server 8000

# Ouvrir dans Grist
# URL: http://localhost:8000
```

---

## 🐛 Dépannage

### Le canvas ne s'affiche pas

✅ **Solutions** :
1. Vérifier que Fabric.js est chargé (console navigateur)
2. Recharger la page
3. Vérifier les dimensions du canvas (doit être 960x700)

### Les composants ne se glissent pas

✅ **Solutions** :
1. Vérifier qu'un slide est sélectionné (panneau gauche)
2. Essayer de glisser jusqu'au **milieu** du canvas
3. Vérifier les permissions Grist (accès `full` requis)

### Les modifications ne sont pas sauvegardées

✅ **Solutions** :
1. Vérifier le statut de connexion (indicateur vert en haut)
2. Cliquer sur **💾 Appliquer** dans le panneau de propriétés
3. Vérifier les erreurs dans la console navigateur
4. Vérifier que vous avez les droits d'édition sur le document Grist

### L'éditeur de texte ne s'ouvre pas

✅ **Solutions** :
1. Vérifier que Quill.js est chargé (console navigateur)
2. Essayer un **double-clic** franc sur le texte
3. Utiliser le panneau de propriétés pour éditer le contenu

---

## 📚 Documentation Complète

- [Spécification complète](/docs/REVEAL_BUILDER_SPEC.md)
- [Guide Reveal.js widgets](/docs/REVEAL_WIDGET_GUIDE.md)
- [Architecture générale](/docs/ARCHITECTURE.md)
- [README Reveal.js Builder](/packages/reveal-builder/README.md)

---

## 🎉 Fonctionnalités Avancées

### Édition Visuelle

- **Sélection multiple** : Maintenez `Shift` pour sélectionner plusieurs composants (Fabric.js)
- **Alignement précis** : Utilisez les boutons d'alignement pour un positionnement parfait
- **Zoom** : Zoomez pour éditer les détails (50% à 200%)

### Gestion d'État

- **Undo/Redo** : Jusqu'à 50 actions mémorisées
- **Sauvegarde différée** : Évite les écritures excessives dans Grist

### Composants

- **Rendus spécialisés** :
  - Texte avec police configurable
  - Code avec fond sombre et police monospace
  - Listes avec puces automatiques
  - Citations en italique
  - Boutons avec fond coloré

---

## 📄 Licence

Apache-2.0

---

## 🔗 Workflows

### Workflow Type : Création d'une Présentation

1. **Créer présentation** → Bouton ➕ Présentation
2. **Choisir thème** → Modal de création
3. **Ajouter slides** → Templates ou bouton ➕ Slide
4. **Glisser composants** → Depuis la palette
5. **Éditer contenu** → Double-clic ou propriétés
6. **Aligner** → Boutons d'alignement
7. **Prévisualiser** → Reveal.js Builder widget
8. **Présenter** → Mode plein écran dans Builder

### Workflow Type : Édition Rapide

1. **Sélectionner présentation** → Menu déroulant
2. **Sélectionner slide** → Panneau gauche
3. **Modifier composants** → Glisser ou propriétés
4. **Sauvegarder** → Automatique
5. **Rafraîchir Builder** → Modifications visibles immédiatement

---

**Créé avec ❤️ pour Grist**

Édition visuelle simplifiée pour des présentations professionnelles.
