# Services d'Import - Capacités de Filtrage Avancées

## 🔍 Analyse des Services Actuels

### État Actuel (Limitations)
```javascript
// IGN: Filtrage basique sur 'nom'
cql_filter: `nom LIKE '%${searchText}%'`

// OSM: Filtrage par zone nommée
area[name="${placeName}"]

// Résultat:
// ❌ Pas de filtrage spatial (bbox)
// ❌ Pas de filtrage multi-critères
// ❌ Pas de tri des résultats
// ❌ Pas de filtrage par territoire administratif
// ❌ Charge tout dans l'ordre par défaut
```

---

## 🎯 Capacités Natives des Services

### 1. IGN WFS 2.0.0 (Géoplateforme)

#### Filtres Disponibles

**A. CQL_FILTER (Attribute Filtering)**
```sql
-- Opérateurs supportés
=, !=, <, >, <=, >=, LIKE, ILIKE, IN, BETWEEN, IS NULL

-- Combinaisons logiques
AND, OR, NOT

-- Fonctions
UPPER(), LOWER(), SUBSTRING()
```

**Exemples CQL**:
```javascript
// Filtrage simple
"nom = 'Paris'"

// Filtrage LIKE (case-sensitive)
"nom LIKE 'Saint%'"

// ILIKE (case-insensitive) - MEILLEUR
"nom ILIKE '%bretagne%'"

// Multi-critères
"nom ILIKE '%paris%' AND population > 100000"

// IN (liste de valeurs)
"code_dept IN ('75', '92', '93', '94')"

// BETWEEN
"population BETWEEN 10000 AND 50000"

// NULL check
"code_postal IS NOT NULL"
```

**B. BBOX (Spatial Filtering)**
```javascript
// Format: minX,minY,maxX,maxY (EPSG:4326)
bbox: "-2.0,47.0,2.0,49.0"  // Bretagne + Île-de-France

// Dans requête WFS
const params = new URLSearchParams({
  service: 'WFS',
  version: '2.0.0',
  request: 'GetFeature',
  typeName: 'BDTOPO_V3:commune',
  outputFormat: 'application/json',
  bbox: `${minX},${minY},${maxX},${maxY},EPSG:4326`
});
```

**C. sortBy (Ordering)**
```javascript
// Tri par attribut
sortBy: "population D"  // Descendant
sortBy: "nom A"         // Ascendant

// Multi-colonnes
sortBy: "code_dept A,population D"
```

**D. propertyName (Select Columns)**
```javascript
// Sélectionner seulement certaines propriétés
propertyName: "nom,code_insee,population,geometry"

// Réduit la taille de réponse
```

**E. startIndex + count (Pagination)**
```javascript
startIndex: 0,    // Offset
count: 100        // Limit

// Exemple: Page 2 (100-200)
startIndex: 100,
count: 100
```

#### Filtrage Hiérarchique IGN

**Relation Région → Département → Commune**:
```javascript
// 1. Filtrer départements par région
cql_filter: "code_reg = '11'"  // Île-de-France

// 2. Filtrer communes par département
cql_filter: "code_dept = '75'"  // Paris

// 3. Filtrer communes par région (via département)
cql_filter: "code_dept IN ('75','92','93','94','95','77','78','91')"

// 4. Recherche textuelle multi-critères
cql_filter: "nom ILIKE '%saint%' AND population > 5000 AND code_reg = '53'"
```

**Codes Régions Françaises**:
```javascript
const REGIONS = {
  '11': 'Île-de-France',
  '24': 'Centre-Val de Loire',
  '27': 'Bourgogne-Franche-Comté',
  '28': 'Normandie',
  '32': 'Hauts-de-France',
  '44': 'Grand Est',
  '52': 'Pays de la Loire',
  '53': 'Bretagne',
  '75': 'Nouvelle-Aquitaine',
  '76': 'Occitanie',
  '84': 'Auvergne-Rhône-Alpes',
  '93': 'Provence-Alpes-Côte d\'Azur',
  '94': 'Corse',
  '01': 'Guadeloupe',
  '02': 'Martinique',
  '03': 'Guyane',
  '04': 'La Réunion',
  '06': 'Mayotte'
};
```

---

### 2. OSM Overpass API

#### Filtres Disponibles

**A. Area Queries (Par Territoire)**
```javascript
// Par nom (current)
area[name="Paris"]->.searchArea;

// Par relation ID (plus précis)
area(3600007444)->.searchArea;  // France
area(3600008649)->.searchArea;  // Île-de-France
area(3600071525)->.searchArea;  // Bretagne

// Par type admin_level
area["admin_level"="6"]->.searchArea;  // Départements
area["admin_level"="8"]->.searchArea;  // Communes

// Par ISO code
area["ISO3166-2"="FR-75"]->.searchArea;  // Paris
```

**B. Bbox Queries (Spatial)**
```javascript
// Format: (south,west,north,east)
(bbox:48.8,2.2,48.9,2.5);  // Rectangle autour de Paris

// Dans requête
[out:json][timeout:25];
(
  node["amenity"="school"](48.8,2.2,48.9,2.5);
  way["amenity"="school"](48.8,2.2,48.9,2.5);
  relation["amenity"="school"](48.8,2.2,48.9,2.5);
);
out geom;
```

**C. Tag Filters (Multi-critères)**
```javascript
// Filtrage par tag
node["amenity"="school"]["access"="public"]

// Négation
node["amenity"="school"]["access"!="private"]

// Regex
node["name"~"École"]
node["name"~"Saint.*"]

// Multiple values (OR)
node["amenity"~"school|university|college"]

// Exists
node["wheelchair"]  // Tag exists
node[!"wheelchair"] // Tag doesn't exist
```

**D. Combinaisons Complexes**
```javascript
// École publique à Paris avec accessibilité
[out:json][timeout:25];
area[name="Paris"]->.searchArea;
(
  node["amenity"="school"]
      ["access"="public"]
      ["wheelchair"="yes"]
      (area.searchArea);
  way["amenity"="school"]
     ["access"="public"]
     ["wheelchair"="yes"]
     (area.searchArea);
);
out geom;
```

**E. Ordering & Limiting**
```javascript
// Limiter résultats
out geom 100;  // Max 100 résultats

// Ordering (pas natif, à faire côté client)
// Mais on peut utiliser around pour proximité
node(around:1000,48.8566,2.3522)["amenity"="restaurant"];
```

**F. Recursive Queries**
```javascript
// Récupérer relations complètes
(
  way["building"="yes"](area.searchArea);
);
out geom;  // Inclut la géométrie complète

// Vs out center (seulement centre)
out center;
```

#### OSM Nominatim (Geocoding pour Areas)

**Recherche avancée de territoires**:
```javascript
// API Nominatim pour trouver relation ID
const nominatimUrl = 'https://nominatim.openstreetmap.org/search?' +
  new URLSearchParams({
    q: 'Bretagne, France',
    format: 'json',
    limit: 1,
    featuretype: 'region'  // ou 'state', 'county', 'city'
  });

// Réponse inclut osm_id pour utiliser dans Overpass
{
  "osm_type": "relation",
  "osm_id": 71525,
  "boundingbox": [...]
}

// Utiliser dans Overpass
area(3600071525)->.searchArea;  // 3600000000 + osm_id
```

---

### 3. Comparaison des Capacités

| Fonctionnalité | IGN WFS | OSM Overpass |
|----------------|---------|--------------|
| **Filtrage attribut** | ✅ CQL (très flexible) | ✅ Tags (flexible) |
| **Filtrage spatial (bbox)** | ✅ Natif | ✅ Natif |
| **Filtrage territoire** | ✅ Via codes région/dept | ✅ Via areas |
| **Multi-critères** | ✅ AND/OR/NOT | ✅ Combinaisons tags |
| **Regex** | ❌ Seulement LIKE | ✅ Regex complet |
| **Tri** | ✅ sortBy | ❌ (client-side) |
| **Pagination** | ✅ startIndex/count | ⚠️ Limité (out N) |
| **Sélection colonnes** | ✅ propertyName | ⚠️ Limité |
| **Performance** | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Bon |

---

## 🎯 Améliorations Proposées

### Amélioration 1: Filtrage Hiérarchique IGN

**Interface de filtrage par territoire**:
```javascript
{
  name: 'territory_filter',
  label: 'Filtrer par territoire',
  type: 'cascade_select',  // Nouveau type
  levels: [
    {
      name: 'region',
      label: 'Région',
      options: REGIONS,  // Liste des 18 régions
      cql_field: 'code_reg'
    },
    {
      name: 'departement',
      label: 'Département',
      options: 'dynamic',  // Chargé selon région
      cql_field: 'code_dept',
      depends_on: 'region'
    },
    {
      name: 'commune',
      label: 'Commune',
      options: 'dynamic',
      cql_field: 'code_insee',
      depends_on: 'departement'
    }
  ]
}
```

### Amélioration 2: Filtrage Spatial (Bbox)

**Dessiner zone sur carte**:
```javascript
{
  name: 'bbox_filter',
  label: 'Zone géographique',
  type: 'map_drawer',
  modes: [
    'current_view',    // Vue actuelle de la carte
    'draw_rectangle',  // Dessiner rectangle
    'draw_polygon',    // Dessiner polygone (converti en bbox)
    'manual_coords'    // Saisie manuelle
  ]
}
```

### Amélioration 3: Filtres Avancés Multi-critères

**Builder de filtres**:
```javascript
{
  name: 'advanced_filters',
  label: 'Filtres avancés',
  type: 'filter_builder',
  fields: [
    // Attributs disponibles selon layer
    { name: 'population', type: 'number', operators: ['=', '>', '<', 'between'] },
    { name: 'nom', type: 'text', operators: ['=', 'like', 'ilike'] },
    { name: 'code_postal', type: 'text', operators: ['=', 'in'] }
  ]
}
```

### Amélioration 4: Tri et Pagination

**Options de tri**:
```javascript
{
  name: 'sort_options',
  label: 'Trier par',
  type: 'sort_selector',
  fields: [
    { value: 'nom_A', label: 'Nom (A→Z)' },
    { value: 'nom_D', label: 'Nom (Z→A)' },
    { value: 'population_D', label: 'Population (décroissant)' },
    { value: 'population_A', label: 'Population (croissant)' }
  ]
}
```

---

## 💻 Implémentation Proposée

### IGN avec Filtres Avancés

```javascript
ign_geoplateforme_advanced: {
  id: 'ign_geoplateforme_advanced',
  label: 'IGN Avancé',
  icon: '🇫🇷🔍',
  description: 'Import IGN avec filtres avancés',

  steps: [
    {
      id: 'config',
      label: 'Configuration',
      component: 'ImportConfig',
      fields: [
        {
          name: 'ign_layer',
          label: 'Couche',
          type: 'choice',
          options: [...] // layers
        },
        // === NOUVEAU: Filtrage Territoire ===
        {
          name: 'filter_type',
          label: 'Type de filtre',
          type: 'choice',
          options: [
            { value: 'none', label: 'Aucun (tous)' },
            { value: 'territory', label: 'Par territoire' },
            { value: 'bbox', label: 'Par zone géographique' },
            { value: 'advanced', label: 'Filtres avancés' }
          ],
          defaultValue: 'none'
        },

        // Filtrage territoire (affiché si filter_type = 'territory')
        {
          name: 'region',
          label: 'Région',
          type: 'choice',
          showIf: (config) => config.filter_type === 'territory',
          options: [
            { value: '', label: 'Toutes' },
            { value: '11', label: 'Île-de-France' },
            { value: '53', label: 'Bretagne' },
            { value: '84', label: 'Auvergne-Rhône-Alpes' },
            // ... toutes les régions
          ]
        },
        {
          name: 'departement',
          label: 'Département',
          type: 'choice',
          showIf: (config) => config.filter_type === 'territory' && config.region,
          options: 'dynamic',  // Chargé selon région
          loadOptions: async (config) => {
            // Charger départements de la région
            return fetchDepartements(config.region);
          }
        },

        // Filtrage spatial (affiché si filter_type = 'bbox')
        {
          name: 'bbox_mode',
          label: 'Mode bbox',
          type: 'choice',
          showIf: (config) => config.filter_type === 'bbox',
          options: [
            { value: 'current_view', label: 'Vue carte actuelle' },
            { value: 'manual', label: 'Coordonnées manuelles' }
          ]
        },
        {
          name: 'bbox_coords',
          label: 'Coordonnées (minX,minY,maxX,maxY)',
          type: 'text',
          showIf: (config) =>
            config.filter_type === 'bbox' && config.bbox_mode === 'manual',
          placeholder: '-2.0,47.0,2.0,49.0',
          validate: (value) => {
            const parts = value.split(',').map(Number);
            return parts.length === 4 && parts.every(n => !isNaN(n));
          }
        },

        // Filtres avancés (affiché si filter_type = 'advanced')
        {
          name: 'cql_custom',
          label: 'Filtre CQL personnalisé',
          type: 'textarea',
          showIf: (config) => config.filter_type === 'advanced',
          placeholder: 'nom ILIKE \'%paris%\' AND population > 100000',
          help: 'Syntaxe CQL: https://docs.geoserver.org/stable/en/user/filter/ecql_reference.html'
        },

        // === Tri ===
        {
          name: 'sort_by',
          label: 'Trier par',
          type: 'choice',
          options: [
            { value: '', label: 'Par défaut' },
            { value: 'nom A', label: 'Nom (A→Z)' },
            { value: 'nom D', label: 'Nom (Z→A)' },
            { value: 'population D', label: 'Population ↓' },
            { value: 'population A', label: 'Population ↑' }
          ]
        },

        // === Pagination ===
        {
          name: 'max_features',
          label: 'Nombre de résultats',
          type: 'number',
          min: 1,
          max: 10000,
          defaultValue: 1000
        }
      ]
    }
  ],

  fetch: async (config) => {
    const {
      ign_layer,
      filter_type,
      region,
      departement,
      bbox_mode,
      bbox_coords,
      cql_custom,
      sort_by,
      max_features
    } = config;

    // Build WFS params
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: ign_layer,
      outputFormat: 'application/json',
      count: max_features || 1000
    });

    // === BUILD CQL FILTER ===
    let cqlFilter = null;

    if (filter_type === 'territory') {
      const filters = [];

      if (region) {
        filters.push(`code_reg = '${region}'`);
      }
      if (departement) {
        filters.push(`code_dept = '${departement}'`);
      }

      if (filters.length > 0) {
        cqlFilter = filters.join(' AND ');
      }
    } else if (filter_type === 'advanced' && cql_custom) {
      cqlFilter = cql_custom;
    }

    if (cqlFilter) {
      params.append('cql_filter', cqlFilter);
    }

    // === ADD BBOX ===
    if (filter_type === 'bbox') {
      let bbox;

      if (bbox_mode === 'current_view') {
        // Récupérer bounds de la carte actuelle
        const mapBounds = StateManager.getState('map.bounds');
        if (mapBounds) {
          bbox = `${mapBounds.getWest()},${mapBounds.getSouth()},` +
                 `${mapBounds.getEast()},${mapBounds.getNorth()},EPSG:4326`;
        }
      } else if (bbox_coords) {
        bbox = `${bbox_coords},EPSG:4326`;
      }

      if (bbox) {
        params.append('bbox', bbox);
      }
    }

    // === ADD SORTING ===
    if (sort_by) {
      params.append('sortBy', sort_by);
    }

    const url = `https://data.geopf.fr/wfs?${params.toString()}`;

    console.log('[IGN Advanced] Fetching:', url);
    console.log('[IGN Advanced] Filters:', {
      type: filter_type,
      cql: cqlFilter,
      bbox: params.get('bbox'),
      sort: sort_by
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur IGN: ${response.status}`);
    }

    const geojson = await response.json();

    console.log(`[IGN Advanced] Retrieved ${geojson.features.length} features`);

    return geojson.features.map((feature, idx) => ({
      geometry: geoJSONToWKT(feature.geometry),
      properties: feature.properties || {},
      feature_index: idx
    }));
  }
}
```

### OSM avec Filtres Avancés

```javascript
osm_overpass_advanced: {
  id: 'osm_overpass_advanced',
  label: 'OSM Avancé',
  icon: '🗺️🔍',
  description: 'OpenStreetMap avec filtres avancés',

  steps: [...],

  fetch: async (config) => {
    const {
      osm_type,
      filter_mode,  // 'name', 'bbox', 'relation_id'
      place_name,
      bbox_coords,
      relation_id,
      additional_tags,  // Filtres supplémentaires
      timeout
    } = config;

    const [tag, value] = osm_type.split('=');

    let overpassQuery;

    if (filter_mode === 'bbox' && bbox_coords) {
      // Query par bbox
      const [south, west, north, east] = bbox_coords.split(',').map(Number);

      overpassQuery = `[out:json][timeout:${timeout}];
(
  node["${tag}"="${value}"](${south},${west},${north},${east});
  way["${tag}"="${value}"](${south},${west},${north},${east});
  relation["${tag}"="${value}"](${south},${west},${north},${east});
);
out geom;`;

    } else if (filter_mode === 'relation_id' && relation_id) {
      // Query par relation ID (plus précis)
      overpassQuery = `[out:json][timeout:${timeout}];
area(${relation_id})->.searchArea;
(
  node["${tag}"="${value}"](area.searchArea);
  way["${tag}"="${value}"](area.searchArea);
  relation["${tag}"="${value}"](area.searchArea);
);
out geom;`;

    } else {
      // Query par nom (défaut)
      overpassQuery = `[out:json][timeout:${timeout}];
area[name="${place_name}"]->.searchArea;
(
  node["${tag}"="${value}"](area.searchArea);
  way["${tag}"="${value}"](area.searchArea);
  relation["${tag}"="${value}"](area.searchArea);
);
out geom;`;
    }

    // Ajouter filtres additionnels si présents
    if (additional_tags && additional_tags.length > 0) {
      // Modifier la query pour ajouter des tags supplémentaires
      // Ex: ["access"="public"]["wheelchair"="yes"]
      additional_tags.forEach(({ key, value, operator }) => {
        const tagFilter = operator === '='
          ? `["${key}"="${value}"]`
          : `["${key}"!="${value}"]`;

        overpassQuery = overpassQuery.replace(
          /\[".*?"\]/g,
          `$&${tagFilter}`
        );
      });
    }

    console.log('[OSM Advanced] Query:', overpassQuery);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery
    });

    // ... rest of processing
  }
}
```

---

## 📊 Bénéfices Attendus

### Avant (Actuel)
```
IGN: Recherche textuelle simple sur 'nom'
OSM: Recherche par nom de lieu
Résultat: Récupère tous les éléments ou un nombre fixe
```

### Après (Amélioré)
```
IGN:
- Filtrage hiérarchique (région → département → commune)
- Filtrage spatial (bbox)
- Filtrage multi-critères (CQL)
- Tri des résultats
- Contrôle précis de la quantité

OSM:
- Filtrage par bbox
- Filtrage par relation ID (plus précis)
- Multi-tags
- Contrôle de zone exacte
```

### Gains
- ✅ **Précision**: Récupérer exactement ce qui est nécessaire
- ✅ **Performance**: Moins de données transférées
- ✅ **UX**: Filtres intuitifs et puissants
- ✅ **Flexibilité**: S'adapter à tous les cas d'usage

---

## 🎯 Prochaines Étapes

1. Implémenter filtrage hiérarchique IGN (région → dept → commune)
2. Ajouter filtrage spatial (bbox) pour IGN et OSM
3. Créer UI pour filter builder
4. Ajouter options de tri
5. Implémenter pagination côté serveur
6. Ajouter sauvegarde de filtres favoris
