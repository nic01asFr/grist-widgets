# Chart Agent Pro

Widget Grist de génération de visualisations intelligentes avec assistant IA. Analysez vos données et créez des graphiques (bar, pie, line, sankey, scatter, treemap) via un chat conversationnel ou des suggestions automatiques.

## Fonctionnalités

- **Analyse automatique du schéma** : Détection des tables, colonnes, types et relations
- **Suggestions intelligentes** : Propositions de visualisations basées sur les données réelles
- **Chat conversationnel** : Décrivez le graphique souhaité en langage naturel
- **Types de graphiques** : Bar, Pie, Line, Sankey, Scatter, Treemap
- **Export** : Téléchargement HTML ou ouverture en plein écran
- **Intégration n8n** : Backend configurable via webhook

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GRIST DOCUMENT                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │ Table A │  │ Table B │  │ Table C │  ... (schéma)        │
│  └────┬────┘  └────┬────┘  └────┬────┘                      │
└───────┼────────────┼────────────┼───────────────────────────┘
        │            │            │
        ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│              CHART AGENT PRO (Widget)                        │
│  ┌──────────────┐ ┌─────────────────────────────────┐       │
│  │ Suggestions  │ │ Zone de visualisation           │       │
│  │ (IA-driven)  │ │ ┌───────────────────────────┐   │       │
│  ├──────────────┤ │ │     Chart.js / Google     │   │       │
│  │ Chat IA      │ │ │     Charts (iframe)       │   │       │
│  │ (prompts)    │ │ └───────────────────────────┘   │       │
│  └──────────────┘ └─────────────────────────────────┘       │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /webhook
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     N8N WORKFLOW                             │
│  ┌─────────┐    ┌─────────────┐    ┌────────────────┐       │
│  │ Webhook │───▶│ Route Action │───▶│ Analyze/Generate│      │
│  └─────────┘    └─────────────┘    └────────┬───────┘       │
│                                              │               │
│  ┌─────────────────────────────────────────┐ │               │
│  │ Albert API (LLM)                        │◀┘               │
│  │ - Analyse des données                   │                 │
│  │ - Génération de config chart            │                 │
│  │ - Suggestions contextualisées           │                 │
│  └─────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### 1. Widget Grist

1. Ajouter le widget personnalisé dans Grist
2. URL : `https://nic01asfr.github.io/grist-widgets/chart-agent-pro/index.html`
3. Niveau d'accès : **Complet** (full)
4. Cliquer sur ⚙️ pour configurer l'URL du webhook n8n

### 2. Backend n8n

Le widget nécessite un workflow n8n pour fonctionner. Le workflow gère :

- **Action `analyze`** : Analyse le schéma et génère des suggestions
- **Action `generate`** : Génère le HTML du graphique à partir d'un prompt

#### Installation du workflow

1. Importer le fichier `workflow/chart-agent-pro.json` dans votre instance n8n
2. Configurer les credentials pour l'API Albert (ou autre LLM compatible OpenAI)
3. Activer le workflow
4. Copier l'URL du webhook dans les paramètres du widget

> **Note**: Le workflow se trouve dans le dossier `workflow/` à côté du dossier `public/`

## Types de graphiques supportés

| Type | Description | Colonnes requises |
|------|-------------|-------------------|
| `bar` | Barres verticales | Catégorie + Valeur |
| `pie` | Camembert/donut | Catégorie |
| `line` | Courbe temporelle | Date + Valeur |
| `sankey` | Diagramme de flux | Source + Target |
| `scatter` | Nuage de points | X + Y |
| `treemap` | Carte hiérarchique | Catégorie + Valeur |

## API du workflow n8n

### Requête `analyze`

```json
{
  "action": "analyze",
  "schema": {
    "tables": {
      "TableName": {
        "columns": [
          { "id": "col1", "label": "Colonne 1", "type": "Choice" }
        ]
      }
    },
    "relations": []
  },
  "dataSummary": {
    "TableName": {
      "count": 100,
      "columns": [...],
      "sample": [...]
    }
  }
}
```

### Réponse `analyze`

```json
{
  "success": true,
  "suggestions": [
    {
      "icon": "🥧",
      "title": "Répartition par statut",
      "description": "Distribution des enregistrements",
      "config": {
        "type": "pie",
        "table": "TableName",
        "mapping": { "category": "status" },
        "aggregation": "count"
      }
    }
  ]
}
```

### Requête `generate`

```json
{
  "action": "generate",
  "prompt": "Répartition par statut",
  "config": {
    "type": "pie",
    "table": "TableName",
    "mapping": { "category": "status" },
    "aggregation": "count"
  },
  "table": "TableName",
  "data": [...],
  "columns": [...],
  "schema": {...}
}
```

### Réponse `generate`

```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "title": "Répartition par statut",
  "chartType": "pie",
  "recordCount": 100
}
```

## Mode sans webhook (fallback)

Si aucun webhook n'est configuré, le widget génère des suggestions locales basées sur le schéma détecté :

- Colonnes `Choice` → Suggestions pie/bar
- Colonnes numériques + catégorie → Suggestions bar avec agrégation
- Colonnes date → Suggestions line/timeline
- Relations entre tables → Suggestions sankey

## Développement local

```bash
cd packages/chart-agent-pro/public
python -m http.server 8000
```

Puis configurer Grist avec `http://localhost:8000` comme URL du widget personnalisé.

## Technologies

- **Frontend** : Vanilla JS, CSS Variables
- **Graphiques** : Chart.js 4.4, Google Charts (Sankey, Treemap)
- **Backend** : n8n workflow + Albert API (LLM français)
- **Intégration** : Grist Plugin API

## Licence

MIT
