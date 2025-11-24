# Étude : Stylisation Basée sur Données & Sélection par Attributs

## 📊 CONTEXTE

**Besoin 1 : Stylisation selon les données**
- Styliser une couche selon les valeurs des attributs
- Exemples :
  - Colorier communes selon population
  - Taille des cercles selon importance
  - Épaisseur des routes selon catégorie

**Besoin 2 : Sélection avancée**
- Sélectionner/filtrer entités selon critères
- Exemples :
  - Toutes les communes > 10000 habitants
  - Tous les bâtiments de type "école"
  - Routes de catégorie "autoroute"

---

## 🎨 1. STYLISATION BASÉE SUR DONNÉES

### Types de symbologie professionnelle

#### A) **Valeur Unique (Categorized)**
Couleur différente par catégorie

**Cas d'usage :**
- Type de route (Autoroute, Nationale, Départementale)
- Usage du sol (Forêt, Agriculture, Urbain)
- Statut administratif

**Exemple :**
```javascript
{
  type: 'categorized',
  field: 'type_route',
  categories: [
    { value: 'autoroute', color: '#e74c3c', label: 'Autoroute' },
    { value: 'nationale', color: '#f39c12', label: 'Nationale' },
    { value: 'departementale', color: '#f1c40f', label: 'Départementale' },
    { value: 'communale', color: '#95a5a6', label: 'Communale' }
  ],
  defaultColor: '#bdc3c7'
}
```

**Rendu visuel :**
🟥 Autoroutes
🟧 Nationales
🟨 Départementales
⬜ Communales

---

#### B) **Plages de Valeurs (Graduated/Choropleth)**
Dégradé de couleurs selon valeurs numériques

**Cas d'usage :**
- Population des communes
- Densité de population
- Revenus moyens
- Taux de chômage

**Exemple :**
```javascript
{
  type: 'graduated',
  field: 'population',
  method: 'quantile',  // ou 'equal_interval', 'natural_breaks'
  ranges: [
    { min: 0, max: 1000, color: '#ffffcc', label: '< 1000' },
    { min: 1000, max: 5000, color: '#c7e9b4', label: '1k - 5k' },
    { min: 5000, max: 20000, color: '#7fcdbb', label: '5k - 20k' },
    { min: 20000, max: 100000, color: '#41b6c4', label: '20k - 100k' },
    { min: 100000, max: Infinity, color: '#225ea8', label: '> 100k' }
  ]
}
```

**Méthodes de classification :**
- **Quantile** : Même nombre d'entités par classe
- **Intervalles égaux** : Plages de valeurs égales
- **Ruptures naturelles (Jenks)** : Minimise variance intra-classe

---

#### C) **Taille Proportionnelle**
Taille du symbole selon valeur

**Cas d'usage :**
- Cercles proportionnels à la population
- Épaisseur de ligne selon débit
- Hauteur selon altitude

**Exemple :**
```javascript
{
  type: 'proportional',
  field: 'population',
  symbol: 'circle',
  minSize: 5,    // pixels pour valeur minimale
  maxSize: 30,   // pixels pour valeur maximale
  minValue: 0,
  maxValue: 500000,
  color: '#3b82f6',
  opacity: 0.6
}
```

---

#### D) **Expression/Formule**
Style calculé à partir de plusieurs champs

**Cas d'usage :**
- Densité = population / superficie
- Taux = (valeur / total) * 100
- Conditions complexes

**Exemple :**
```javascript
{
  type: 'expression',
  expression: 'population / superficie_km2',
  ranges: [
    { min: 0, max: 50, color: '#ffffcc', label: 'Faible densité' },
    { min: 50, max: 200, color: '#a1dab4', label: 'Moyenne' },
    { min: 200, max: 1000, color: '#41b6c4', label: 'Élevée' },
    { min: 1000, max: Infinity, color: '#225ea8', label: 'Très élevée' }
  ]
}
```

---

### Architecture Technique

#### **Service : DataAnalyzer**
Analyse les données d'un layer pour aider à créer les règles

```javascript
class DataAnalyzer {
  /**
   * Analyse un champ pour obtenir statistiques
   */
  analyzeField(layerData, fieldName) {
    const values = layerData.map(f => {
      const props = JSON.parse(f.properties || '{}');
      return props[fieldName];
    }).filter(v => v != null);

    const type = this.inferType(values);

    if (type === 'number') {
      return {
        type: 'number',
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
        suggestedBreaks: this.calculateBreaks(values, 5, 'quantile')
      };
    }

    if (type === 'string') {
      const unique = [...new Set(values)];
      const counts = {};
      values.forEach(v => counts[v] = (counts[v] || 0) + 1);

      return {
        type: 'string',
        uniqueValues: unique,
        count: values.length,
        distribution: counts,
        suggestedCategories: unique.slice(0, 10) // Max 10 catégories
      };
    }
  }

  /**
   * Calcule les ruptures pour classification
   */
  calculateBreaks(values, numClasses, method) {
    switch (method) {
      case 'quantile':
        return this.quantileBreaks(values, numClasses);
      case 'equal_interval':
        return this.equalIntervalBreaks(values, numClasses);
      case 'natural_breaks':
        return this.jenksBreaks(values, numClasses);
    }
  }

  quantileBreaks(values, numClasses) {
    const sorted = values.sort((a, b) => a - b);
    const breaks = [];
    for (let i = 1; i <= numClasses; i++) {
      const index = Math.floor((i / numClasses) * sorted.length);
      breaks.push(sorted[index]);
    }
    return breaks;
  }

  // Jenks Natural Breaks (Algorithme optimisé)
  jenksBreaks(values, numClasses) {
    // Implémentation simplifiée
    // Pour production : utiliser library comme 'simple-statistics'
    return this.quantileBreaks(values, numClasses);
  }
}
```

#### **Service : StyleRuleEngine**
Évalue les règles et retourne le style final

```javascript
class StyleRuleEngine {
  /**
   * Applique une règle de style à une feature
   */
  applyStyleRule(feature, rule) {
    const properties = JSON.parse(feature.properties || '{}');
    const geometryType = feature.geometry_type;

    switch (rule.type) {
      case 'categorized':
        return this.applyCategorized(properties, geometryType, rule);

      case 'graduated':
        return this.applyGraduated(properties, geometryType, rule);

      case 'proportional':
        return this.applyProportional(properties, geometryType, rule);

      case 'expression':
        return this.applyExpression(properties, geometryType, rule);

      default:
        return StyleManager.getDefaultStyle(geometryType);
    }
  }

  applyCategorized(properties, geometryType, rule) {
    const value = properties[rule.field];
    const category = rule.categories.find(c => c.value === value);
    const color = category ? category.color : rule.defaultColor;

    return this.createStyle(geometryType, { color });
  }

  applyGraduated(properties, geometryType, rule) {
    const value = properties[rule.field];
    const range = rule.ranges.find(r => value >= r.min && value < r.max);
    const color = range ? range.color : '#cccccc';

    return this.createStyle(geometryType, { color });
  }

  applyProportional(properties, geometryType, rule) {
    const value = properties[rule.field];
    const ratio = (value - rule.minValue) / (rule.maxValue - rule.minValue);
    const size = rule.minSize + ratio * (rule.maxSize - rule.minSize);

    if (geometryType === 'POINT') {
      return {
        color: rule.color,
        fillColor: rule.color,
        fillOpacity: rule.opacity,
        radius: Math.max(rule.minSize, Math.min(size, rule.maxSize)),
        weight: 2
      };
    }

    // Pour lignes : weight proportionnel
    if (geometryType.includes('LINE')) {
      return {
        color: rule.color,
        weight: Math.max(1, Math.min(size / 3, 10)),
        opacity: rule.opacity
      };
    }

    return this.createStyle(geometryType, { color: rule.color });
  }

  applyExpression(properties, geometryType, rule) {
    // Évalue l'expression (sécurisé)
    const value = this.evaluateExpression(rule.expression, properties);
    const range = rule.ranges.find(r => value >= r.min && value < r.max);
    const color = range ? range.color : '#cccccc';

    return this.createStyle(geometryType, { color });
  }

  evaluateExpression(expression, properties) {
    // Sécurisé : whitelist d'opérations
    try {
      // Remplace noms de champs par valeurs
      let expr = expression;
      Object.keys(properties).forEach(key => {
        expr = expr.replace(new RegExp(key, 'g'), properties[key]);
      });

      // Évalue (seulement opérations math basiques)
      return Function(`"use strict"; return (${expr})`)();
    } catch (err) {
      console.error('[StyleRuleEngine] Expression error:', err);
      return 0;
    }
  }

  createStyle(geometryType, options) {
    const base = StyleManager.getDefaultStyle(geometryType);
    return { ...base, ...options };
  }
}
```

---

## 🔍 2. SÉLECTION PAR ATTRIBUTS

### Query Builder Visuel

**Interface proposée :**

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Sélection par Attributs                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Condition 1                                            │
│  ┌─────────────┐  ┌─────────┐  ┌──────────────┐       │
│  │ population  │  │    >    │  │   10000      │  [×]  │
│  └─────────────┘  └─────────┘  └──────────────┘       │
│                                                          │
│  [AND ▼]                                                │
│                                                          │
│  Condition 2                                            │
│  ┌─────────────┐  ┌─────────┐  ┌──────────────┐       │
│  │    nom      │  │  LIKE   │  │   %ville%    │  [×]  │
│  └─────────────┘  └─────────┘  └──────────────┘       │
│                                                          │
│  [+ Ajouter condition]                                  │
│                                                          │
│  Résultats : 15 entités sélectionnées                   │
│                                                          │
│  [Sélectionner]  [Filtrer (masquer autres)]  [Annuler] │
└─────────────────────────────────────────────────────────┘
```

---

### Architecture Technique

#### **Service : SelectionQueryEngine**

```javascript
class SelectionQueryEngine {
  /**
   * Évalue une requête sur un ensemble de features
   */
  executeQuery(features, query) {
    return features.filter(feature => {
      return this.evaluateConditions(feature, query.conditions, query.operator);
    });
  }

  evaluateConditions(feature, conditions, operator) {
    const properties = JSON.parse(feature.properties || '{}');

    const results = conditions.map(condition => {
      return this.evaluateCondition(properties, condition);
    });

    return operator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  evaluateCondition(properties, condition) {
    const { field, operator, value } = condition;
    const fieldValue = properties[field];

    switch (operator) {
      case '=':
        return fieldValue == value;

      case '!=':
        return fieldValue != value;

      case '>':
        return Number(fieldValue) > Number(value);

      case '<':
        return Number(fieldValue) < Number(value);

      case '>=':
        return Number(fieldValue) >= Number(value);

      case '<=':
        return Number(fieldValue) <= Number(value);

      case 'LIKE':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

      case 'IN':
        return Array.isArray(value) && value.includes(fieldValue);

      case 'BETWEEN':
        return Array.isArray(value) && value.length === 2 &&
               Number(fieldValue) >= Number(value[0]) &&
               Number(fieldValue) <= Number(value[1]);

      case 'IS NULL':
        return fieldValue == null;

      case 'IS NOT NULL':
        return fieldValue != null;

      default:
        return false;
    }
  }

  /**
   * Construit une requête SQL-like pour debug
   */
  toSQLString(query) {
    const conditions = query.conditions.map(c => {
      if (c.operator === 'LIKE') {
        return `${c.field} LIKE '${c.value}'`;
      }
      if (c.operator === 'IN') {
        return `${c.field} IN (${c.value.join(', ')})`;
      }
      return `${c.field} ${c.operator} ${c.value}`;
    });

    return conditions.join(` ${query.operator} `);
  }
}
```

---

## 🎨 3. INTERFACE UTILISATEUR

### Composant : DataDrivenStyleEditor

**Workflow utilisateur :**

1. **Choisir le layer** à styliser
2. **Choisir le type de symbologie** (Categorized, Graduated, Proportional, Expression)
3. **Sélectionner le champ** de données
4. **Configurer les paramètres** :
   - Categorized : Choisir couleurs par catégorie
   - Graduated : Choisir méthode classification + palette
   - Proportional : Définir taille min/max
   - Expression : Écrire formule
5. **Aperçu** en temps réel
6. **Appliquer**

**Maquette UI :**

```
┌────────────────────────────────────────────────────────────┐
│ 🎨 Stylisation Basée sur Données                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer : [Communes ▼]                                      │
│                                                             │
│  Type de symbologie :                                      │
│  ○ Symbole unique (couleur uniforme)                       │
│  ● Plages de valeurs (Graduated)                          │
│  ○ Valeurs uniques (Categorized)                          │
│  ○ Taille proportionnelle                                  │
│                                                             │
│  ┌─────────────────────────────────────────────┐          │
│  │ Champ : [population ▼]                      │          │
│  │                                               │          │
│  │ Méthode : [Quantile ▼]  Classes : [5 ▼]    │          │
│  │                                               │          │
│  │ Palette : [Vert-Bleu ▼]                     │          │
│  │                                               │          │
│  │ Aperçu :                                     │          │
│  │                                               │          │
│  │  < 1000     ▓▓▓ #ffffcc  (15 communes)     │          │
│  │  1k - 5k    ▓▓▓ #c7e9b4  (12 communes)     │          │
│  │  5k - 20k   ▓▓▓ #7fcdbb  (18 communes)     │          │
│  │  20k - 100k ▓▓▓ #41b6c4  (8 communes)      │          │
│  │  > 100k     ▓▓▓ #225ea8  (3 communes)      │          │
│  │                                               │          │
│  └─────────────────────────────────────────────┘          │
│                                                             │
│  [Aperçu sur carte]  [Appliquer]  [Annuler]               │
└────────────────────────────────────────────────────────────┘
```

### Composant : AttributeQueryBuilder

**Maquette UI :**

```
┌────────────────────────────────────────────────────────────┐
│ 🔍 Sélection par Attributs - Communes                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [+ Nouvelle condition]                                    │
│                                                             │
│  Condition 1                                               │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐         │
│  │ population ▼ │ │   >    ▼ │ │   10000      │  [×]    │
│  └──────────────┘ └──────────┘ └──────────────┘         │
│                                                             │
│  [ET ▼]  [OU]                                              │
│                                                             │
│  Condition 2                                               │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐         │
│  │   nom      ▼ │ │ contient ▼│ │   ville      │  [×]    │
│  └──────────────┘ └──────────┘ └──────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────┐          │
│  │ 📊 Résultats : 23 entités                   │          │
│  │                                               │          │
│  │  Paris (75056) - 2,175,601 hab.             │          │
│  │  Lyon (69123) - 513,275 hab.                │          │
│  │  Toulouse (31555) - 471,941 hab.            │          │
│  │  ...                                          │          │
│  │                                               │          │
│  │  [Voir sur carte]                            │          │
│  └─────────────────────────────────────────────┘          │
│                                                             │
│  Actions :                                                 │
│  [✓ Sélectionner] [👁️ Masquer autres] [💾 Sauvegarder]   │
└────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 4. INTÉGRATION DANS L'EXISTANT

### Modification du StyleManager

```javascript
// Ajouter support des règles de style
class StyleManager {
  // ...existant...

  /**
   * Obtenir style d'une feature avec règle data-driven
   */
  getFeatureStyle(feature, isHovered = false, isSelected = false) {
    const layerName = feature.layer_name;

    // 1. Vérifier s'il y a une règle de style data-driven
    const styleRule = StateManager.getState(`styles.rules.${layerName}`);
    if (styleRule) {
      const baseStyle = StyleRuleEngine.applyStyleRule(feature, styleRule);

      if (isSelected) {
        return this.applySelectionStyle(baseStyle);
      }
      if (isHovered) {
        return this.applyHoverEffect(baseStyle, ...);
      }

      return baseStyle;
    }

    // 2. Sinon, utiliser logique existante (preset layer)
    const layerStyle = this.getLayerStyle(layerName);
    // ... reste du code existant
  }
}
```

### Nouveau Tab dans Sidebar

Ajouter 6ème onglet : **"📊 Données"** (ou intégrer dans Layers Panel)

Options :
- **Option A** : Sous-sections dans l'onglet Layers existant
  - Layers
    - └─ Par layer : [Style simple] [Style données] [Sélection]

- **Option B** : Nouvel onglet dédié "Analyse"
  - 📊 Analyse
    - └─ Stylisation données
    - └─ Sélection attributs
    - └─ Statistiques

---

## 📈 5. EXEMPLES D'USAGE

### Exemple 1 : Carte Choroplèthe Population

```javascript
{
  type: 'graduated',
  field: 'population',
  method: 'quantile',
  numClasses: 5,
  colorScheme: 'YlGnBu',  // Yellow-Green-Blue
  ranges: [
    { min: 0, max: 847, color: '#ffffcc' },
    { min: 847, max: 3542, color: '#c7e9b4' },
    { min: 3542, max: 11234, color: '#7fcdbb' },
    { min: 11234, max: 42689, color: '#41b6c4' },
    { min: 42689, max: 2175601, color: '#225ea8' }
  ]
}
```

### Exemple 2 : Catégories Type de Bâtiment

```javascript
{
  type: 'categorized',
  field: 'usage',
  categories: [
    { value: 'résidentiel', color: '#f1c40f', icon: '🏠' },
    { value: 'commercial', color: '#e74c3c', icon: '🏬' },
    { value: 'industriel', color: '#95a5a6', icon: '🏭' },
    { value: 'public', color: '#3498db', icon: '🏛️' }
  ]
}
```

### Exemple 3 : Sélection Avancée

```javascript
{
  conditions: [
    { field: 'population', operator: '>', value: 10000 },
    { field: 'departement', operator: 'IN', value: ['75', '92', '93', '94'] }
  ],
  operator: 'AND'
}
// → Sélectionne communes > 10k hab. en Île-de-France
```

---

## ✅ 6. RECOMMANDATIONS

### Priorités d'implémentation

**Phase 1 : MVP (Most Valuable)**
1. ✅ Stylisation Graduated (choroplèthe) - Cas d'usage #1
2. ✅ Sélection par attributs simple (1-2 conditions) - Besoin immédiat
3. ✅ UI intégrée dans LayersPanel - Cohérence existante

**Phase 2 : Enrichissement**
4. Stylisation Categorized (valeurs uniques)
5. Query builder multi-conditions (AND/OR)
6. Légende dynamique

**Phase 3 : Avancé**
7. Stylisation Proportional (taille)
8. Stylisation Expression (formules)
9. Export des sélections

### Architecture recommandée

**Services** (3 nouveaux)
- DataAnalyzer.js (analyse données layer)
- StyleRuleEngine.js (évalue règles style)
- SelectionQueryEngine.js (évalue requêtes)

**Composants UI** (2 nouveaux)
- DataDrivenStyleEditor.jsx (dans LayersPanel)
- AttributeQueryBuilder.jsx (dans LayersPanel ou nouveau tab)

**Intégration**
- StyleManager : Support des règles data-driven
- LayerRenderer : Utilise StyleRuleEngine si règle active
- StateManager : Persist rules via `styles.rules.{layerName}`

---

## 🎯 CONCLUSION

**Ce qu'on peut faire :**
✅ Stylisation basée sur données (choroplèthe, catégories, taille, expression)
✅ Sélection par attributs avec query builder visuel
✅ Intégration naturelle dans l'architecture existante
✅ UI professionnelle et intuitive
✅ Performance optimisée (analyse + cache)

**Complexité estimée :**
- Services : ~800 lignes
- UI Components : ~600 lignes
- Intégration : ~200 lignes
- Total : ~1600 lignes

**Temps estimé :** 3-4h d'implémentation

**Valeur ajoutée :**
- Passe d'un visualiseur SIG à un outil d'analyse SIG complet
- Équivalent à des fonctionnalités QGIS/ArcGIS
- Différenciateur majeur vs concurrents

**Prêt à implémenter ?** 🚀
