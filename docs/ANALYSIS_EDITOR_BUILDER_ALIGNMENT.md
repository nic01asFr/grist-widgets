# Analyse : Alignement éditeur/visualisateur Reveal.js

## Date : 2025-11-24

## Objectif
Identifier et corriger les incohérences d'affichage entre le widget de visualisation (reveal-builder) et le widget de composition (reveal-editor).

---

## 1. WIDGET DE VISUALISATION (reveal-builder)

### Configuration actuelle

**Reveal.js (app.js:936-952):**
```javascript
Reveal.initialize({
    width: 960,
    height: 700,
    minScale: 1.0,  // Censé forcer scale 1:1
    maxScale: 1.0,  // Censé empêcher zoom
    margin: 0,
    center: false
});
```

**CSS (styles.css:22-57):**
```css
html, body {
    overflow: auto;  /* Scroll si nécessaire */
}

.reveal {
    width: 100%;    /* ⚠️ PROBLÈME */
    height: 100%;   /* ⚠️ PROBLÈME */
    position: absolute;
}

.reveal .slides {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}
```

### Problèmes identifiés

#### 🔴 PROBLÈME 1 : Sensibilité au zoom navigateur
**Cause:** `.reveal` utilise `width: 100%` et `height: 100%`
- Reveal.js prend 100% de la zone disponible
- Même avec `minScale: 1.0`, Reveal.js applique un scaling CSS interne pour faire tenir le contenu de 960x700 dans la zone disponible
- Quand l'utilisateur zoom le navigateur, la zone disponible change
- Reveal.js recalcule le scaling → les dispositions changent

**Manifestation:**
- Le contenu des slides s'ajuste selon le zoom du navigateur
- Les layouts changent d'apparence
- Incohérence avec l'éditeur qui affiche toujours à l'échelle fixe

#### 🔴 PROBLÈME 2 : Scaling automatique non désiré
**Cause:** Reveal.js a son propre système de scaling responsive
- Même avec `minScale: 1.0`, `maxScale: 1.0`, Reveal.js peut appliquer un transform CSS
- La logique interne de Reveal.js essaie d'"optimiser" l'affichage
- Cela contredit l'objectif d'affichage 1:1

**Manifestation:**
- Sur grand écran, les slides peuvent apparaître plus grandes que 960x700
- Sur petit écran, impossible de voir le contenu complet même avec scroll

### Ce qui devrait être

**Comportement attendu:**
1. Les slides doivent s'afficher à exactement 960x700 pixels (échelle 1:1)
2. Le zoom navigateur ne doit PAS affecter la disposition du contenu
3. Si l'écran est plus petit que 960x700, des scrollbars doivent apparaître
4. Si l'écran est plus grand que 960x700, les slides doivent rester centrées à leur taille native

**Solution théorique:**
```css
.reveal {
    width: 960px;   /* Taille fixe, pas % */
    height: 700px;  /* Taille fixe, pas % */
    position: relative;
    margin: 0 auto;  /* Centrage horizontal */
}
```

Mais attention : Reveal.js peut réagir mal à des dimensions fixes si mal configuré.

---

## 2. WIDGET COMPOSER (reveal-editor)

### Configuration actuelle

**Canvas Fabric.js (app.js:174-180):**
```javascript
appState.canvas = new fabric.Canvas('canvas', {
    width: 960,   // CONFIG.CANVAS.WIDTH
    height: 700,  // CONFIG.CANVAS.HEIGHT
    backgroundColor: '#1a1a2e',
    selection: true
});
```

**CSS (styles.css:353-378):**
```css
#canvas-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.canvas-frame {
    position: relative;
    width: 960px;
    height: 700px;
    transform-origin: center center;
    /* ⚠️ transform: scale() appliqué dynamiquement par JS */
}

#canvas {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
}
```

**Fonction scaleCanvasToFit (app.js:199-223):**
```javascript
function scaleCanvasToFit() {
    const containerWidth = canvasContainer.clientWidth - 80;
    const containerHeight = canvasContainer.clientHeight - 80;

    const scaleX = containerWidth / 960;
    const scaleY = containerHeight / 700;
    const scale = Math.min(scaleX, scaleY, 1);

    canvasFrame.style.transform = `scale(${scale})`;  // ⚠️ PROBLÈME CRITIQUE
}
```

### Problèmes identifiés

#### 🔴🔴🔴 PROBLÈME CRITIQUE : Scaling CSS vs Fabric.js

**Cause:** Conflit entre le scaling CSS et Fabric.js

**Architecture problématique:**
```
#canvas-container
  └── .canvas-frame (transform: scale(0.8) par exemple)
       └── #canvas (Fabric.js)
            └── Objets Fabric.js (texte, images...)
```

**Ce qui se passe:**
1. Fabric.js crée un canvas de 960×700px
2. Fabric.js dessine les objets aux positions calculées (ex: x=480, y=350 pour centre)
3. JavaScript applique `transform: scale(0.8)` sur `.canvas-frame`
4. Visuellement, tout est réduit à 80% (768×560px)
5. **MAIS** Fabric.js ne sait PAS que le conteneur est scalé !

**Conséquences:**
- Les coordonnées de souris sont fausses (Fabric.js pense que le canvas fait 960px, mais visuellement il fait 768px)
- Les objets apparaissent à des positions décalées
- On ne voit qu'une partie du canvas (généralement le coin bas-droite)
- Les interactions (clic, drag) sont complètement cassées

**Manifestation rapportée par l'utilisateur:**
> "tout est décalé en plus grand. résultat dans la vue de composition, on ne voit qu'une petite partie de la slide totale, soit son coin en bas a droite."

#### 🔴 PROBLÈME 2 : Incompréhension fondamentale du scaling

**Erreur conceptuelle:**
- L'idée était de "scaler le canvas pour qu'il tienne dans l'espace disponible"
- Mais Fabric.js n'est pas conçu pour être scalé par CSS transform
- Fabric.js a son propre système de zoom/scaling : `canvas.setZoom()`

**Ce qui devrait être fait:**
- Soit utiliser `canvas.setZoom()` de Fabric.js (mais cela change aussi les objets)
- Soit ne jamais scaler et laisser des scrollbars

#### 🔴 PROBLÈME 3 : Incohérence avec le visualisateur

**Différence d'approche:**
- **Éditeur:** Essaie de scaler pour tout faire tenir → casse tout
- **Visualisateur:** Reveal.js gère son propre scaling → imprécis

**Résultat:**
- Les deux widgets n'affichent pas la même chose
- L'éditeur est censé être "WYSIWYG" mais ment complètement
- L'utilisateur édite quelque chose qui n'a rien à voir avec le résultat final

### Ce qui devrait être

**Comportement attendu:**
1. Le canvas Fabric.js doit TOUJOURS être affiché à l'échelle 1:1
2. AUCUN `transform: scale()` CSS ne doit être appliqué
3. Si l'espace est insuffisant, des scrollbars doivent apparaître dans `#canvas-container`
4. Les composants doivent être positionnés exactement comme dans le visualisateur

**Solution:**
```css
#canvas-container {
    flex: 1;
    overflow: auto;  /* Scroll au lieu de scale */
    display: flex;
    align-items: center;
    justify-content: center;
}

.canvas-frame {
    width: 960px;
    height: 700px;
    /* PAS de transform: scale() */
}
```

```javascript
// SUPPRIMER la fonction scaleCanvasToFit()
// NE JAMAIS appeler canvasFrame.style.transform
```

---

## 3. CORRESPONDANCE ENTRE LES DEUX WIDGETS

### Tableau comparatif

| Aspect | Visualisateur (builder) | Éditeur (editor) | Correspondance |
|--------|------------------------|------------------|----------------|
| Dimensions natives | 960×700 | 960×700 | ✅ OK |
| Système de rendu | Reveal.js (HTML/CSS) | Fabric.js (Canvas) | ⚠️ Différent |
| Scaling appliqué | Reveal.js automatique | CSS transform | ❌ Incohérent |
| Gestion petit écran | Scaling Reveal.js | CSS transform (cassé) | ❌ Incohérent |
| Font size | CSS (px, em) | Fabric.js (px) | ⚠️ À vérifier |
| Position composants | CSS Flexbox/Grid | Fabric.js coords pixels | ✅ OK (si scale = 1) |
| Réaction zoom nav | ✅ S'adapte (problème) | ❌ Cassé | ❌ Incohérent |

### Incohérences majeures

1. **Système de scaling différent**
   - Builder : Reveal.js (logique interne complexe)
   - Éditeur : CSS transform (incompatible avec Fabric.js)

2. **Gestion de l'espace disponible**
   - Builder : Essaie de s'adapter (responsive)
   - Éditeur : Essaie de scaler (casse tout)

3. **Réaction au zoom navigateur**
   - Builder : Change les dispositions (problème)
   - Éditeur : Complètement cassé

### Ce qu'il faudrait

**Principe fondamental : WYSIWYG strict**

Les deux widgets doivent afficher EXACTEMENT la même chose :
- Même échelle (1:1, toujours 960×700px)
- Mêmes positions de composants
- Mêmes tailles de police
- Même comportement face au zoom navigateur (aucun changement de disposition)

---

## 4. ANALYSE DES CAUSES RACINES

### Cause racine 1 : Mentalité "responsive"

**Problème:**
- Les développeurs ont essayé de rendre les widgets "responsive"
- Ils veulent que le contenu "s'adapte" à la taille de l'écran
- C'est antinomique avec un éditeur WYSIWYG pour des slides de taille fixe

**Solution:**
- Accepter que les slides font 960×700px, point final
- Accepter qu'il y aura des scrollbars si l'écran est trop petit
- C'est le comportement standard de PowerPoint, Keynote, etc.

### Cause racine 2 : Incompréhension de Fabric.js

**Problème:**
- Fabric.js n'est pas conçu pour être scalé par CSS transform
- Les coordonnées deviennent fausses, les interactions cassées

**Solution:**
- Ne JAMAIS appliquer de transform CSS sur le conteneur du canvas Fabric.js
- Si scaling nécessaire, utiliser `canvas.setZoom()` (mais pas nécessaire ici)

### Cause racine 3 : Reveal.js mal configuré

**Problème:**
- Reveal.js a son propre système de scaling "intelligent"
- Difficile de le forcer à rester à l'échelle 1:1

**Solution:**
- Tester si `minScale: 1.0, maxScale: 1.0` suffit
- Sinon, forcer des dimensions fixes en CSS et désactiver le scaling de Reveal.js

---

## 5. PLAN DE CORRECTION

### Priorité 1 : Corriger l'éditeur (CRITIQUE)

**Changements:**

1. **Supprimer le scaling CSS**
   - Supprimer la fonction `scaleCanvasToFit()`
   - Supprimer tous les appels à cette fonction
   - Ne JAMAIS appliquer `transform: scale()` sur `.canvas-frame`

2. **Ajouter scrollbars**
   ```css
   #canvas-container {
       overflow: auto;  /* Au lieu de hidden */
   }
   ```

3. **Vérifier les dimensions**
   - S'assurer que Fabric.js canvas est bien à 960×700
   - S'assurer que `.canvas-frame` est bien à 960×700

**Résultat attendu:**
- L'éditeur affiche le canvas à l'échelle 1:1
- Si l'écran est trop petit, des scrollbars apparaissent
- Les interactions Fabric.js fonctionnent correctement

### Priorité 2 : Corriger le visualisateur

**Changements:**

1. **Forcer dimensions fixes**
   ```css
   .reveal {
       width: 960px !important;
       height: 700px !important;
       position: relative;
       margin: 0 auto;
   }
   ```

2. **Vérifier que Reveal.js respecte ces dimensions**
   - Tester avec `minScale: 1.0, maxScale: 1.0`
   - Si ça ne suffit pas, chercher d'autres options Reveal.js

3. **Gérer le centrage**
   - Centrer horizontalement avec `margin: 0 auto`
   - Centrer verticalement si nécessaire avec Flexbox sur le parent

**Résultat attendu:**
- Le visualisateur affiche les slides à exactement 960×700px
- Le zoom navigateur n'affecte pas les dispositions
- Si l'écran est trop petit, des scrollbars apparaissent

### Priorité 3 : Vérifier la correspondance

**Tests à effectuer:**

1. **Test visuel:** Comparer côte à côte éditeur et visualisateur
   - Même taille de police ?
   - Mêmes positions de composants ?
   - Mêmes espacements ?

2. **Test de zoom navigateur:**
   - Zoomer à 50%, 100%, 150%, 200%
   - Les dispositions doivent rester identiques
   - Seuls les pixels changent, pas les layouts

3. **Test de petit écran:**
   - Simuler un écran 800×600
   - Des scrollbars doivent apparaître dans les deux widgets
   - Le contenu reste à 960×700 dans les deux

---

## 6. RECOMMANDATIONS

### Recommandation 1 : Principe WYSIWYG strict

**Ce qui doit être vrai :**
```
Éditeur à 100% ≡ Visualisateur à 100%
```

Pas d'approximation. Pas de "presque pareil". Identique au pixel près.

### Recommandation 2 : Pas de scaling CSS

**Règle d'or:**
- Ne JAMAIS appliquer `transform: scale()` sur un conteneur de canvas Fabric.js
- Ne JAMAIS appliquer `transform: scale()` sur un conteneur Reveal.js
- Si scaling nécessaire, utiliser les APIs natives (Fabric.js: `setZoom()`, Reveal.js: `minScale/maxScale`)

### Recommandation 3 : Accepter les scrollbars

**Philosophie:**
- Les slides font 960×700px, c'est un fait
- Si l'écran est trop petit, c'est la responsabilité de l'utilisateur (zoom out, écran plus grand)
- Les scrollbars sont le comportement standard et attendu

### Recommandation 4 : Simplifier le CSS

**Supprimer toute complexité inutile:**
- Pas de scaling dynamique
- Pas de calculs JavaScript pour adapter les dimensions
- Dimensions fixes, positionnement simple

### Recommandation 5 : Documentation

**Ajouter dans CLAUDE.md ou README:**
```markdown
## Important : Dimensions des slides

Les slides Reveal.js font TOUJOURS 960×700 pixels.

- L'éditeur affiche à l'échelle 1:1 (pas de zoom)
- Le visualisateur affiche à l'échelle 1:1 (pas de zoom)
- Si votre écran est plus petit, utilisez les scrollbars
- Le zoom du navigateur ne doit pas affecter les dispositions

Ne tentez PAS de rendre les widgets "responsive" en appliquant
des transform: scale() CSS. Cela casse Fabric.js et Reveal.js.
```

---

## 7. RÉSUMÉ EXÉCUTIF

### Problèmes actuels

1. **Visualisateur:** Sensible au zoom navigateur, dispositions changeantes
2. **Éditeur:** Complètement cassé par CSS transform, ne montre qu'un coin de la slide
3. **Correspondance:** Aucune, les deux widgets affichent des choses différentes

### Causes

1. Tentative de rendre les widgets "responsive" (erreur conceptuelle)
2. Utilisation de `transform: scale()` CSS sur Fabric.js (erreur technique)
3. Mauvaise configuration de Reveal.js (scaling automatique non désiré)

### Solution

1. **Éditeur:** Supprimer tout scaling CSS, afficher à 1:1, ajouter scrollbars
2. **Visualisateur:** Forcer dimensions fixes 960×700, désactiver scaling Reveal.js
3. **Vérification:** Tests visuels et fonctionnels de la correspondance

### Priorité

🔴🔴🔴 **CRITIQUE** : L'éditeur est inutilisable dans son état actuel.

**Action immédiate requise:**
1. Supprimer `scaleCanvasToFit()` et tous ses appels
2. Changer `#canvas-container` overflow en `auto`
3. Tester que Fabric.js fonctionne correctement

---

## Conclusion

L'objectif final est simple : **ce que tu vois dans l'éditeur = ce que tu obtiens dans le visualisateur**.

Pour y arriver, il faut abandonner toute tentative de "responsive design" et accepter que les slides font 960×700px, point final.

La correction est relativement simple (supprimer du code, pas en ajouter), mais nécessite de comprendre pourquoi le code actuel est fondamentalement cassé.
