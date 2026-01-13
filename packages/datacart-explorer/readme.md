# DataCart Explorer 🗺️

Widget Grist pour l'exploration et la requête des bases de données géographiques DataCart du CEREMA.

## 🎯 Fonctionnalités

### Exploration de données
- **Arborescence des schémas** : Navigation hiérarchique Base → Schéma → Table
- **Détails des tables** : Colonnes, types, clés, géométries
- **Filtrage** : Recherche rapide dans les tables

### Assistant IA
- **NL2SQL** : Conversion de questions en français vers SQL
- **Contexte intelligent** : Utilise la table sélectionnée pour plus de précision
- **Explications** : Comprend ce que fait chaque requête générée

### Éditeur SQL
- **Syntaxe colorée** : CodeMirror avec thème Dracula
- **Autocomplétion** : Tables, colonnes, fonctions PostGIS
- **Raccourcis** : Ctrl+Enter pour exécuter, Ctrl+S pour sauvegarder

### Visualisation des résultats
- **Vue tableau** : Pagination, tri, sélection
- **Vue carte** : Leaflet avec clustering automatique
- **Vue split** : Tableau et carte côte à côte
- **Synchronisation** : Sélection liée entre tableau et carte

### Exports
- **CSV** : Export Excel-compatible (UTF-8 BOM)
- **GeoJSON** : Export géographique standard
- **Grist** : Création directe de tables dans Grist

## 📁 Structure du projet

```
datacart-explorer/
├── public/
│   ├── index.html          # Page principale
│   ├── styles.css          # Styles CSS (thème CEREMA)
│   ├── app.js              # Application principale
│   └── modules/
│       ├── config.js       # Configuration
│       ├── utils.js        # Fonctions utilitaires
│       ├── grist-bridge.js # Interface Grist API
│       ├── explorer.js     # Explorateur de schémas
│       ├── assistant.js    # Assistant IA NL2SQL
│       ├── editor.js       # Éditeur SQL CodeMirror
│       └── results.js      # Affichage résultats
└── workflows/
    ├── datacart-schema.json   # API schémas
    ├── datacart-execute.json  # API exécution SQL
    └── datacart-nl2sql.json   # API NL2SQL (agents IA)
```

## 🚀 Installation

### 1. Déployer le widget

Héberger les fichiers du dossier `public/` sur un serveur web (ou Grist).

### 2. Importer les workflows n8n

1. Ouvrir n8n
2. Importer chaque fichier JSON du dossier `workflows/`
3. Configurer les credentials :
   - `DataCart PostgreSQL` : Connexion aux bases r/e/m_datacart
   - `Anthropic API` : Clé API pour les agents IA

### 3. Configurer les bases de données

Créer 3 credentials PostgreSQL dans n8n :
- `r-datacart-postgres` : Référentiels (BDTOPO, AdminExpress...)
- `e-datacart-postgres` : Données externes
- `m-datacart-postgres` : Données métiers

### 4. Ajouter le widget à Grist

1. Dans un document Grist, ajouter un widget "Custom"
2. URL : `https://votre-serveur/datacart-explorer/`
3. Accès : "Full document access"

## ⚙️ Configuration

### Tables Grist créées automatiquement

| Table | Description |
|-------|-------------|
| `DC_Config` | Paramètres du widget |
| `DC_Queries` | Requêtes sauvegardées |

### Paramètres configurables

| Clé | Description | Défaut |
|-----|-------------|--------|
| `n8n_base_url` | URL webhooks n8n | `https://n8n.pocfactory.cerema.fr/webhook` |
| `default_database` | Base par défaut | `r_datacart` |
| `max_results` | Limite résultats | `1000` |
| `map_default_center` | Centre carte | `[43.2965, 5.3698]` |
| `map_default_zoom` | Zoom initial | `10` |

## 🔌 API Endpoints

### GET /dc/schema

Récupère les schémas et tables.

**Paramètres** :
- `database` : r_datacart | e_datacart | m_datacart
- `schema` : (optionnel) Nom du schéma
- `table` : (optionnel) Nom de la table

**Réponse** :
```json
[
  {
    "schema": "bdtopo",
    "table": "batiment",
    "comment": "Bâtiments BDTOPO",
    "row_count": 1234567,
    "has_geometry": true,
    "columns": [...]
  }
]
```

### POST /dc/execute

Exécute une requête SQL (SELECT uniquement).

**Body** :
```json
{
  "database": "r_datacart",
  "sql": "SELECT * FROM bdtopo.batiment LIMIT 100",
  "limit": 1000
}
```

**Réponse** :
```json
{
  "success": true,
  "rows": [...],
  "columns": [...],
  "row_count": 100,
  "execution_time": 234
}
```

### POST /dc/nl2sql

Convertit une question en SQL via agents IA.

**Body** :
```json
{
  "question": "Les bâtiments de plus de 10 étages à Marseille",
  "database": "r_datacart",
  "context": {
    "selectedTable": {...}
  }
}
```

**Réponse** :
```json
{
  "success": true,
  "sql": "SELECT ...",
  "explanation": "Cette requête...",
  "tables_used": ["bdtopo.batiment"],
  "warnings": []
}
```

## 🤖 Agents IA (NL2SQL)

Le workflow NL2SQL utilise 3 agents Claude en chaîne :

### 1. Agent Router
Analyse la question et détermine :
- Type de requête (simple, agrégation, jointure, spatial)
- Tables probables
- Opérations spatiales nécessaires

### 2. Agent SQL Builder
Génère le SQL optimisé :
- Conventions BDTOPO/AdminExpress/Cadastre
- Fonctions PostGIS appropriées
- SRID et transformations

### 3. Agent Validator
Vérifie et corrige :
- Sécurité (injection SQL)
- Syntaxe
- Performance
- Optimisations

## 🔒 Sécurité

- **Requêtes SELECT uniquement** : INSERT, UPDATE, DELETE, DROP bloqués
- **Validation serveur** : Double vérification côté n8n
- **Timeout** : 30 secondes par requête
- **Limite résultats** : Maximum 10 000 lignes
- **Pas d'accès fichiers** : Fonctions système PostgreSQL bloquées

## 🎨 Personnalisation

### Thème CSS

Les variables CSS sont dans `:root` dans `styles.css` :

```css
:root {
  --color-primary: #1565C0;      /* Bleu CEREMA */
  --color-secondary: #2E7D32;    /* Vert */
  --color-accent: #F57C00;       /* Orange */
  /* ... */
}
```

### Bases de données

Modifier `CONFIG.databases` dans `config.js` pour ajouter des bases.

## 📋 Dépendances

### Frontend
- [Leaflet](https://leafletjs.com/) 1.9.4 - Cartographie
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) - Clustering
- [CodeMirror](https://codemirror.net/) 5.65.16 - Éditeur SQL
- [Grist Plugin API](https://support.getgrist.com/widget-custom/) - Intégration Grist

### Backend (n8n)
- PostgreSQL node - Requêtes BDD
- Anthropic Claude node - Agents IA
- Webhook node - API REST

## 🐛 Dépannage

### Le widget ne se charge pas
- Vérifier l'URL n8n dans les paramètres
- Vérifier que les workflows sont actifs
- Consulter les logs n8n

### Erreur de connexion Grist
- Vérifier "Full document access"
- Recharger le widget

### Requête IA incorrecte
- Sélectionner une table dans l'explorateur
- Reformuler la question avec plus de détails
- Mentionner explicitement le département/commune

## 📝 Licence

Propriété CEREMA - Usage interne

---

Développé par **GIDI - CEREMA Méditerranée**
