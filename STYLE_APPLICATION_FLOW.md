# Flow d'Application des Styles par Élément

## Architecture Actuelle : ✅ CORRECT

Le système applique correctement les styles **individuellement** à chaque feature, même si le style rule est défini au niveau de la couche.

---

## Flow Détaillé

### 1. **Définition du Style (Niveau Couche)**

**Où**: DataDrivenStyleEditor.jsx
**Quoi**: L'utilisateur définit UN style rule pour toute la couche

```javascript
const rule = {
  type: 'categorized',
  field: 'code_insee',
  layer_name: 'Régions',  // ← Pour TOUTE la couche
  categories: [
    { value: 1, color: '#ff0000' },
    { value: 2, color: '#00ff00' },
    // ...
  ]
};
```

**Sauvegarde**: Une metadata row par couche dans `GIS_WorkSpace`

---

### 2. **Chargement du Style (Niveau Couche)**

**Où**: SmartGISWidget.jsx (lignes 67-86)

```javascript
// Charge les style rules au startup
workspaceData.forEach(record => {
  if (!record.geometry_wgs84 && record.style_rule) {
    const rule = JSON.parse(record.style_rule);
    styleRules[record.layer_name] = rule;  // ← Une rule par layer_name
  }
});

StateManager.setState('layers.styleRules', styleRules);
```

**Résultat**: `layers.styleRules = { "Régions": {...}, "Départements": {...} }`

---

### 3. **Rendu Individuel des Features (Niveau Élément)**

**Où**: MapView.jsx (lignes 178-191)

```javascript
// CHAQUE feature est rendu individuellement
{otherLayers.map(layer => (
  <LayerRenderer
    key={layer.id}        // ← ID unique du feature
    layer={layer}         // ← Feature individuel avec ses properties
  />
))}
```

**Important**:
- `otherLayers` contient TOUS les features (ex: 13 régions)
- Chaque feature a son propre `LayerRenderer` component
- Chaque `LayerRenderer` reçoit SON feature avec SES properties

---

### 4. **Calcul du Style (Niveau Élément)**

**Où**: LayerRenderer.jsx (lignes 61-83)

```javascript
const style = useMemo(() => {
  // Récupère le style rule de la couche
  const rule = styleRules[layer.layer_name];  // Ex: rule pour "Régions"

  if (rule) {
    // APPLIQUE le rule à CE feature spécifique
    const dataDrivenStyle = StyleRuleEngine.applyStyleRule(
      layer,  // ← Ce feature avec SES properties
      rule    // ← La rule de la couche
    );
    return dataDrivenStyle;
  }
}, [layer, isSelected, styleRules]);
```

**Clé**: `StyleRuleEngine.applyStyleRule(layer, rule)`
- Reçoit le **feature individuel** (`layer`)
- Lit les **properties de CE feature**
- Calcule un **style spécifique à CE feature**

---

### 5. **Application du Style Rule (Niveau Élément)**

**Où**: StyleRuleEngine.js (lignes 17-59)

```javascript
applyStyleRule(feature, rule) {
  // Extrait les properties de CE feature
  const properties = typeof feature.properties === 'string'
    ? JSON.parse(feature.properties)
    : feature.properties;

  // Pour Categorized: Lit la valeur de CE feature
  if (rule.type === 'categorized') {
    return this.applyCategorized(properties, geometryType, rule);
  }
  // ...
}

applyCategorized(properties, geometryType, rule) {
  // Lit la valeur de CE feature
  const value = properties[rule.field];  // Ex: properties['code_insee'] = 1

  // Trouve la catégorie correspondante à CE feature
  const category = rule.categories?.find(c => String(c.value) === String(value));

  // Retourne la couleur pour CE feature spécifiquement
  const color = category ? category.color : rule.defaultColor;

  return { color, fillColor: color, ... };
}
```

**Résultat**: Chaque feature obtient SA propre couleur selon SA valeur

---

## Exemple Concret

### Données

**Table GIS_WorkSpace**:
```
| id | layer_name | geometry_wgs84    | properties                     | style_rule     |
|----|------------|-------------------|--------------------------------|----------------|
| 1  | Régions    | POLYGON(...)      | {"code_insee": 1, "nom": "A"}  | null           |
| 2  | Régions    | POLYGON(...)      | {"code_insee": 2, "nom": "B"}  | null           |
| 3  | Régions    | POLYGON(...)      | {"code_insee": 1, "nom": "C"}  | null           |
| 4  | Régions    | NULL              | {}                             | {"type":"categorized",...} |  ← Metadata row
```

### Style Rule (metadata row id=4):
```json
{
  "type": "categorized",
  "field": "code_insee",
  "categories": [
    {"value": 1, "color": "#ff0000"},
    {"value": 2, "color": "#00ff00"}
  ]
}
```

### Rendu

**MapView rend 3 LayerRenderer** (un par feature):

```jsx
<LayerRenderer layer={{id: 1, layer_name: "Régions", properties: {"code_insee": 1, ...}}} />
<LayerRenderer layer={{id: 2, layer_name: "Régions", properties: {"code_insee": 2, ...}}} />
<LayerRenderer layer={{id: 3, layer_name: "Régions", properties: {"code_insee": 1, ...}}} />
```

**Chaque LayerRenderer calcule SON style**:

- **Feature id=1**:
  - `properties['code_insee']` = 1
  - Match: `{"value": 1, "color": "#ff0000"}`
  - **Style appliqué**: Rouge (#ff0000) ✅

- **Feature id=2**:
  - `properties['code_insee']` = 2
  - Match: `{"value": 2, "color": "#00ff00"}`
  - **Style appliqué**: Vert (#00ff00) ✅

- **Feature id=3**:
  - `properties['code_insee']` = 1
  - Match: `{"value": 1, "color": "#ff0000"}`
  - **Style appliqué**: Rouge (#ff0000) ✅

---

## Vérification : Chaque Élément Reçoit Son Style

### ✅ Confirmé par le Code

1. **Un LayerRenderer par feature** (MapView.jsx:178-191)
   - Pas de boucle interne
   - Chaque feature = composant React indépendant

2. **Calcul individuel du style** (LayerRenderer.jsx:61-83)
   - `useMemo` recalcule pour chaque instance
   - Dépend de `layer` (le feature)

3. **Lecture des properties individuelles** (StyleRuleEngine.js:23-25)
   - Parse les properties du feature passé
   - Lit la valeur spécifique au feature

4. **Retour d'un style unique** (StyleRuleEngine.js:64-86)
   - Chaque appel retourne un objet style différent
   - Basé sur les valeurs du feature

---

## Types de Styles et Application Individuelle

### Categorized
**Individuel**: ✅ Oui
**Pourquoi**: Chaque feature a sa propre valeur → sa propre catégorie → sa propre couleur

```
Feature A: code=1 → Rouge
Feature B: code=2 → Vert
Feature C: code=1 → Rouge
```

### Graduated
**Individuel**: ✅ Oui
**Pourquoi**: Chaque feature a sa propre valeur numérique → sa propre plage → sa propre couleur

```
Feature A: population=500 → Plage [0-1000] → Jaune clair
Feature B: population=5000 → Plage [1000-10000] → Orange
Feature C: population=50000 → Plage [10000-∞] → Rouge
```

### Proportional
**Individuel**: ✅ Oui
**Pourquoi**: Chaque feature a sa propre valeur → son propre ratio → sa propre taille

```
Feature A: superficie=10 → Ratio=0.1 → Petit
Feature B: superficie=50 → Ratio=0.5 → Moyen
Feature C: superficie=90 → Ratio=0.9 → Grand
```

---

## Problème Potentiel Identifié: Logs Insuffisants

**Actuellement**: Les logs montrent seulement le PREMIER feature

```javascript
if (!this._hasLogged) {
  console.log(`[StyleRuleEngine] Applying ${rule.type} rule`);
  this._hasLogged = true;  // ← Ne log que UNE fois
}
```

**Impact**:
- On ne voit pas que le style est appliqué aux autres features
- Peut donner l'impression que seul le premier feature est stylé
- Difficile de déboguer les problèmes par feature

**Solution proposée**: Ajouter un mode debug qui log tous les features

---

## Recommandation

Le système fonctionne **CORRECTEMENT** : chaque feature reçoit son style individuel.

**Pour améliorer la visibilité**, ajouter un flag de debug:

```javascript
const DEBUG_STYLES = false;  // Mettre à true pour déboguer

if (DEBUG_STYLES || !this._hasLogged) {
  console.log(`[StyleRuleEngine] Feature ${feature.id}: field="${rule.field}", value="${properties[rule.field]}", color="${color}"`);
  this._hasLogged = true;
}
```

Cela permettrait de voir dans la console:
```
[StyleRuleEngine] Feature 1: field="code_insee", value="1", color="#ff0000"
[StyleRuleEngine] Feature 2: field="code_insee", value="2", color="#00ff00"
[StyleRuleEngine] Feature 3: field="code_insee", value="1", color="#ff0000"
```

---

## Conclusion

✅ **Le système applique correctement les styles à CHAQUE élément individuellement**

- Le style rule est défini au niveau de la **couche** (efficacité)
- Le style est calculé au niveau de l'**élément** (flexibilité)
- Chaque feature obtient son style selon ses propres valeurs
- Architecture optimale pour performance et fonctionnalité

**Aucune correction nécessaire** - le comportement est conforme aux attentes.
