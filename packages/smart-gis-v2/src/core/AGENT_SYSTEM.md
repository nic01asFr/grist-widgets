# Agent-Driven Query System

## Vue d'ensemble

Système permettant d'exécuter des requêtes GIS en langage naturel via un agent IA (n8n + LLM).

**Architecture complète** :

```
┌─────────────────┐
│ Utilisateur     │
│ "Toutes les     │
│ écoles à 500m   │
│ d'un hôpital    │
│ à Paris"        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ n8n Workflow    │
│ - Webhook       │
│ - LLM Parse     │
│ - Grist Write   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Grist Table     │
│ "AgentQueries"  │
│ status=pending  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebhookHandler  │
│ - Detect query  │
│ - Validate JSON │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QueryExecutor   │
│ 1. Fetch zone   │
│ 2. Fetch ref    │
│ 3. Treatments   │
│ 4. Fetch target │
│ 5. Filter       │
│ 6. Visualize    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Map Display     │
│ + Result saved  │
│   to Grist      │
└─────────────────┘
```

## Composants

### 1. DataCatalog (DataCatalog.js)

Registre des sources de données disponibles :

- **IGN Géoplateforme** : communes, départements, bâtiments, routes, cours d'eau
- **OpenStreetMap** : amenity, highway, building, natural, landuse
- **Projet Grist** : tables du workspace

**Fonctionnalités** :
- Matching NLP : "école" → OSM amenity=school
- Générateurs de requêtes WFS/Overpass
- Recherche par alias

```javascript
import dataCatalog from './DataCatalog';

// Recherche par NLP
const match = dataCatalog.findByNLP('écoles');
// → { source: 'osm', tag: 'amenity', value: 'school' }

// Récupération d'une source
const ignSource = dataCatalog.getSource('ign');
const url = ignSource.buildRequest('BDTOPO_V3:commune', {
  bbox: [2.2, 48.8, 2.4, 48.9],
  filter: "nom = 'Paris'"
});
```

### 2. TreatmentRegistry (TreatmentRegistry.js)

Catalogue des 30+ traitements spatiaux avec métadonnées NLP :

- **Mesures** : area, length, perimeter, centroid
- **Transformations** : buffer, simplify, convexHull, envelope
- **Analyse** : intersection, union, difference, clip
- **Requêtes spatiales** : contains, intersects, within, distance

**Fonctionnalités** :
- Pattern matching : "à moins de 500m" → buffer treatment
- Paramètres auto-détectés
- Exemples d'usage

```javascript
import treatmentRegistry from './TreatmentRegistry';

// Recherche par phrase
const match = treatmentRegistry.findByNLP('zone tampon de 500m');
// → { id: 'buffer', params: { distance: 500, unit: 'm' } }

// Récupération d'un traitement
const buffer = treatmentRegistry.get('buffer');
const formula = buffer.formula(geometry, { distance: 500, unit: 'm' });
```

### 3. QueryExecutor (QueryExecutor.js)

Moteur d'exécution multi-étapes :

**Workflow** :
1. **Fetch zone** : Zone géographique de référence (commune, département)
2. **Fetch reference** : Données de référence (hôpitaux, écoles)
3. **Apply treatments** : Transformations spatiales (buffer, intersection)
4. **Fetch target** : Données cibles à filtrer
5. **Spatial filter** : Filtre spatial (contains, intersects, within)
6. **Compose view** : Génération de la visualisation

```javascript
import queryExecutor from './QueryExecutor';

const parsedQuery = {
  target: { source: 'osm', tag: 'amenity', value: 'school' },
  reference: { source: 'osm', tag: 'amenity', value: 'hospital' },
  zone: { source: 'ign', layer: 'communes', filter: { nom: 'Paris' } },
  treatments: [
    { id: 'buffer', params: { distance: 500, unit: 'm' }, apply_to: 'reference' }
  ],
  spatialFilter: { predicate: 'within' },
  visualization: {
    layers: ['zone', 'reference', 'target'],
    basemap: 'osm-standard'
  }
};

const result = await queryExecutor.execute(parsedQuery);
// → { executionId, steps, result: { layers, bounds, center }, success: true }
```

### 4. WebhookHandler (WebhookHandler.js)

Gestionnaire d'intégration n8n/webhook :

**Fonctionnalités** :
- Écoute des nouvelles requêtes dans table Grist
- Validation des requêtes JSON
- Exécution via QueryExecutor
- Mise à jour du statut (pending → processing → success/error)
- Historique des requêtes

```javascript
import webhookHandler from './WebhookHandler';
import gristAPI from './GristAPI';

// Initialisation
await webhookHandler.initialize(gristAPI, 'AgentQueries');

// Traitement automatique
grist.onRecords((records) => {
  webhookHandler.handleRecords(records);
});

// Exécution manuelle (testing)
const result = await webhookHandler.executeQuery(parsedQuery);
```

## Configuration Grist

### Créer la table AgentQueries

```python
# Colonnes requises :
- query_json (Text) : Requête structurée du LLM
- status (Choice) : pending | processing | success | error
- result_json (Text) : Résultat de l'exécution
- error_message (Text) : Message d'erreur si échec
- created_at (DateTime) : Date de création
- executed_at (DateTime) : Date d'exécution
```

**Formule pour created_at** :
```python
NOW()
```

## Workflow n8n

### Structure du workflow

```
1. Webhook Trigger
   ↓
2. OpenAI/Claude Node
   - Prompt: Parse natural language → JSON
   ↓
3. Grist Insert Node
   - Table: AgentQueries
   - Fields: query_json, status='pending'
   ↓
4. Widget detects & executes
   ↓
5. Results displayed
```

### Exemple de prompt LLM

```
Tu es un parseur de requêtes GIS. Convertis la requête en JSON structuré.

Requête utilisateur: "Donne moi toutes les écoles à moins de 500m d'un hôpital à Paris"

Retourne UNIQUEMENT un JSON avec cette structure:
{
  "target": { "source": "osm", "tag": "amenity", "value": "school" },
  "reference": { "source": "osm", "tag": "amenity", "value": "hospital" },
  "zone": { "source": "ign", "layer": "communes", "filter": { "nom": "Paris" } },
  "treatments": [
    { "id": "buffer", "params": { "distance": 500, "unit": "m" }, "apply_to": "reference" }
  ],
  "spatialFilter": { "predicate": "within" },
  "visualization": {
    "layers": ["zone", "reference", "target"],
    "basemap": "osm-standard"
  }
}

Sources disponibles:
- OSM tags: amenity (school, hospital, pharmacy), highway, building, natural, landuse
- IGN layers: communes, departements, regions, batiments, routes, cours_eau

Treatments disponibles:
- buffer (distance, unit)
- intersection, union, difference
- contains, within, intersects

Prédicats spatiaux:
- within, contains, intersects, near
```

## Exemples de requêtes

### 1. Écoles près des hôpitaux

**Requête NL** : "Toutes les écoles à moins de 500m d'un hôpital à Paris"

**JSON** :
```json
{
  "target": { "source": "osm", "tag": "amenity", "value": "school" },
  "reference": { "source": "osm", "tag": "amenity", "value": "hospital" },
  "zone": { "source": "ign", "layer": "communes", "filter": { "nom": "Paris" } },
  "treatments": [
    { "id": "buffer", "params": { "distance": 500, "unit": "m" }, "apply_to": "reference" }
  ],
  "spatialFilter": { "predicate": "within" },
  "visualization": {
    "layers": ["zone", "reference", "target"],
    "styles": {
      "zone": { "fillOpacity": 0.1, "strokeColor": "#1e40af" },
      "reference": { "fillColor": "#10b981", "fillOpacity": 0.3 },
      "target": { "color": "#ef4444", "radius": 8 }
    }
  }
}
```

### 2. Pharmacies accessibles

**Requête NL** : "Pharmacies à moins de 200m d'une station de métro dans le 15ème arrondissement"

**JSON** :
```json
{
  "target": { "source": "osm", "tag": "amenity", "value": "pharmacy" },
  "reference": { "source": "osm", "tag": "railway", "value": "station" },
  "zone": { "source": "ign", "layer": "arrondissements", "filter": { "nom": "Paris 15e" } },
  "treatments": [
    { "id": "buffer", "params": { "distance": 200, "unit": "m" }, "apply_to": "reference" }
  ],
  "spatialFilter": { "predicate": "within" },
  "visualization": {
    "layers": ["zone", "reference", "target"],
    "basemap": "osm-standard"
  }
}
```

### 3. Bâtiments dans une zone

**Requête NL** : "Tous les bâtiments commerciaux dans un rayon de 1km autour de la Tour Eiffel"

**JSON** :
```json
{
  "target": { "source": "ign", "layer": "batiments", "filter": { "usage": "commercial" } },
  "reference": {
    "source": "custom",
    "geometry": {
      "type": "Point",
      "coordinates": [2.2945, 48.8584]
    }
  },
  "treatments": [
    { "id": "buffer", "params": { "distance": 1, "unit": "km" }, "apply_to": "reference" }
  ],
  "spatialFilter": { "predicate": "within" },
  "visualization": {
    "layers": ["reference", "target"],
    "basemap": "osm-standard"
  }
}
```

## Testing

### Test manuel dans la console

```javascript
import queryExecutor from './core/QueryExecutor';

const testQuery = {
  target: { source: 'osm', tag: 'amenity', value: 'school' },
  zone: { source: 'ign', layer: 'communes', filter: { nom: 'Paris' } },
  visualization: {
    layers: ['zone', 'target']
  }
};

const result = await queryExecutor.execute(testQuery);
console.log('Result:', result);
```

### Test via table Grist

1. Ouvrir la table `AgentQueries`
2. Ajouter un enregistrement :
   - `query_json` : (coller le JSON)
   - `status` : pending
3. Le widget détecte et exécute automatiquement
4. Vérifier `status` → success et `result_json`

## État du système (StateManager)

Le système utilise StateManager pour tracking :

```javascript
import StateManager from './StateManager';

// Requête en cours
const currentQuery = StateManager.getState('data.currentQuery');

// Étapes d'exécution
const steps = StateManager.getState('data.executionSteps');

// Historique
const history = StateManager.getState('data.queryHistory');

// Subscribe to changes
StateManager.subscribe('data.executionSteps', (steps) => {
  console.log('Execution steps updated:', steps);
});
```

## Limitations actuelles

1. **Traitements simulés** : Les traitements (buffer, intersection) sont marqués mais pas exécutés (nécessite formulas Grist ou turf.js)
2. **Filtres spatiaux basiques** : Les prédicats spatiaux ne sont pas encore implémentés (nécessite ST_* functions dans Grist)
3. **Pas de validation géométrique** : Les géométries OSM/IGN ne sont pas validées avant utilisation

## Roadmap

### Phase suivante (POST-fondations)

- [ ] WebhookHandler integration dans App.jsx
- [ ] Panel UI pour historique des requêtes
- [ ] Retry logic pour requêtes échouées
- [ ] Streaming execution steps (temps réel)
- [ ] Cache des résultats OSM/IGN
- [ ] Validation de schéma JSON (ajv)

### Future améliorations

- [ ] Support multi-zones (plusieurs communes)
- [ ] Agrégation de résultats
- [ ] Export résultats vers nouvelle table Grist
- [ ] Templates de requêtes pré-définies
- [ ] UI conversationnelle (chat)
- [ ] Rate limiting pour Overpass API
- [ ] Fallback si service externe down

## Support

Pour questions ou bugs, voir :
- `/packages/smart-gis-v2/README.md`
- `/docs/ARCHITECTURE.md`
