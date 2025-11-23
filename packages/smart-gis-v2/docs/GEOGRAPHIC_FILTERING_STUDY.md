# Étude: Filtrage Géographique Intelligent

## 🎯 Objectif

Étudier et implémenter des méthodes avancées de filtrage géographique pour optimiser les imports de données SIG dans Smart-GIS v2.

**Date**: 2025-11-23
**Auteur**: Claude
**Status**: Analyse et recommandations

---

## 📋 Table des matières

1. [Approche 1: Chaînage d'imports (Admin → Détails)](#approche-1-chaînage-dimports)
2. [Approche 2: Filtrage par entités Grist existantes](#approche-2-filtrage-par-entités-grist)
3. [Approche 3: Géocodage (recherche par adresse/proximité)](#approche-3-géocodage)
4. [Comparaison des performances](#comparaison-des-performances)
5. [Recommandations d'implémentation](#recommandations-dimplémentation)

---

## Approche 1: Chaînage d'imports

### 🎯 Principe

Utiliser une géométrie administrative (légère) comme **emprise spatiale** pour filtrer un import détaillé.

### 📝 Cas d'usage

**Exemple 1: Bâtiments dans une commune**
```
Étape 1: Importer géométrie de la commune "Lyon" (IGN Admin Light)
  → Result: 1 polygon (~50 KB simplifié)

Étape 2: Extraire BBOX de la géométrie
  → BBOX: 4.7775,45.7267,4.8947,45.7835

Étape 3: Importer bâtiments dans ce BBOX (IGN BDTOPO)
  → Result: ~15,000 bâtiments au lieu de 500,000+ pour tout le département
```

**Exemple 2: Routes dans une région**
```
Étape 1: Importer géométrie "Auvergne-Rhône-Alpes" (IGN Admin Light)
  → Result: 1 multipolygon (~200 KB simplifié)

Étape 2: Calculer BBOX englobant
  → BBOX: 3.68,44.12,7.18,46.49

Étape 3: Importer réseau routier dans ce BBOX
  → Result: ~50,000 segments au lieu de 2M+ pour toute la France
```

### ⚙️ Implémentation technique

#### 1. Extraction automatique du BBOX

```javascript
/**
 * Extraire BBOX d'une géométrie WKT
 */
function extractBBOXFromWKT(wkt) {
  // Parse WKT → GeoJSON
  const geojson = wktToGeoJSON(wkt);

  // Calculate bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  function processCoor ds(coords) {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoords);
    } else {
      const [x, y] = coords;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  processCoords(geojson.coordinates);

  return {
    minX, minY, maxX, maxY,
    formatted: `${minX},${minY},${maxX},${maxY}`
  };
}
```

#### 2. Workflow d'import chaîné

```javascript
class ChainedImportWorkflow {
  async execute(config) {
    const { adminLevel, adminFilter, detailLayer } = config;

    // Step 1: Import admin geometry (lightweight)
    console.log('[Chained] Step 1: Fetching admin boundary...');
    const adminFeatures = await this.importAdminBoundary(adminLevel, adminFilter);

    if (adminFeatures.length === 0) {
      throw new Error('No admin boundary found');
    }

    // Step 2: Extract BBOX from admin geometry
    console.log('[Chained] Step 2: Computing BBOX...');
    const adminGeometry = adminFeatures[0].geometry; // WKT
    const bbox = extractBBOXFromWKT(adminGeometry);

    console.log(`[Chained] BBOX: ${bbox.formatted}`);

    // Step 3: Import detailed features within BBOX
    console.log('[Chained] Step 3: Fetching features within BBOX...');
    const detailFeatures = await this.importWithinBBOX(detailLayer, bbox);

    console.log(`[Chained] Found ${detailFeatures.length} features`);

    return {
      adminBoundary: adminFeatures[0],
      features: detailFeatures,
      bbox
    };
  }

  async importAdminBoundary(level, filter) {
    // Use IGN Admin Light (optimized)
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: `ADMINEXPRESS-COG-CARTO.LATEST:${level}`,
      outputFormat: 'application/json',
      count: 1,
      cql_filter: filter // e.g., "nom = 'Lyon'"
    });

    const response = await fetch(`https://data.geopf.fr/wfs?${params}`);
    const geojson = await response.json();

    return geojson.features.map(f => ({
      geometry: geoJSONToWKT(f.geometry),
      properties: f.properties
    }));
  }

  async importWithinBBOX(layer, bbox) {
    const cqlFilter = `BBOX(geometry, ${bbox.minX}, ${bbox.minY}, ${bbox.maxX}, ${bbox.maxY}, 'EPSG:4326')`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: layer,
      outputFormat: 'application/json',
      count: 5000,
      cql_filter: cqlFilter
    });

    const response = await fetch(`https://data.geopf.fr/wfs?${params}`);
    const geojson = await response.json();

    return geojson.features.map(f => ({
      geometry: geoJSONToWKT(f.geometry),
      properties: f.properties
    }));
  }
}
```

### 📊 Avantages

✅ **Précision**: Filtre exact selon les limites administratives réelles
✅ **Performance**: Réduit drastiquement le volume de données récupéré
✅ **Automatique**: Pas besoin de connaître les coordonnées BBOX manuellement
✅ **Léger**: Admin Light = géométries simplifiées (~95% plus petit)
✅ **Réutilisable**: La géométrie admin peut servir pour plusieurs imports

### ⚠️ Limitations

❌ **2 requêtes**: Nécessite 2 appels API (admin puis détails)
❌ **BBOX approximatif**: Le BBOX englobe mais n'est pas précis (rectangle autour de la forme)
❌ **Hors limites**: Le BBOX peut inclure des features hors des limites admin exactes

### 📈 Gains de performance estimés

| Scénario | Sans BBOX | Avec BBOX admin | Gain |
|----------|-----------|-----------------|------|
| Bâtiments commune (Lyon) | 500k features | 15k features | **97% ↓** |
| Routes département (Rhône) | 2M features | 80k features | **96% ↓** |
| POI région (AURA) | 5M features | 200k features | **96% ↓** |

**Temps d'exécution estimé**:
- Import admin (1 feature): ~500ms
- Calcul BBOX: ~10ms
- Import détails filtrés: ~2-5s (vs 30-60s sans filtre)
- **Total: ~3-6 secondes au lieu de 30-60s**

---

## Approche 2: Filtrage par entités Grist

### 🎯 Principe

Utiliser une **géométrie déjà dans Grist** (parcelle, zone, emprise) comme filtre spatial pour de nouveaux imports.

### 📝 Cas d'usage

**Exemple 1: POI autour d'une parcelle**
```
Contexte: J'ai une parcelle dans ma table "Parcelles"
  → Geometry: POLYGON((4.85 45.75, ...))

Action: Importer tous les commerces (OSM) dans un rayon de 500m

Étapes:
1. Lire la géométrie depuis Grist
2. Calculer buffer de 500m → nouveau BBOX
3. Importer amenity=shop dans ce BBOX
4. Filtrer par distance exacte côté client
```

**Exemple 2: Bâtiments dans une zone de projet**
```
Contexte: J'ai défini une zone de projet (polygon dessiné sur la carte)
  → Geometry: POLYGON((2.3 48.85, ...))

Action: Importer tous les bâtiments dans cette zone

Étapes:
1. Lire la géométrie depuis Grist
2. Extraire BBOX de la zone
3. Importer BDTOPO batiments dans le BBOX
4. (Optionnel) Filtrer avec ST_CONTAINS côté Grist
```

### ⚙️ Implémentation technique

#### 1. Lecture de géométrie depuis Grist

```javascript
class GristEntityFilter {
  constructor(gristApi, docApi) {
    this.gristApi = gristApi;
    this.docApi = docApi;
  }

  /**
   * Get geometry from a Grist record
   */
  async getEntityGeometry(tableName, recordId, geometryColumn = 'geometry_wgs84') {
    const records = await this.docApi.fetchTable(tableName);

    // Find record
    const record = records.find(r => r.id === recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found in ${tableName}`);
    }

    // Get geometry
    const geometry = record[geometryColumn];
    if (!geometry) {
      throw new Error(`No geometry found in column ${geometryColumn}`);
    }

    return geometry; // WKT format
  }

  /**
   * Compute buffer around geometry (in meters)
   */
  computeBuffer(wkt, radiusMeters) {
    // Convert WKT → GeoJSON
    const geojson = wktToGeoJSON(wkt);

    // Compute BBOX with buffer
    // Note: Simple approximation - 1° ≈ 111km at equator
    const bufferDegrees = radiusMeters / 111000;

    const bbox = extractBBOXFromWKT(wkt);

    return {
      minX: bbox.minX - bufferDegrees,
      minY: bbox.minY - bufferDegrees,
      maxX: bbox.maxX + bufferDegrees,
      maxY: bbox.maxY + bufferDegrees,
      formatted: `${bbox.minX - bufferDegrees},${bbox.minY - bufferDegrees},${bbox.maxX + bufferDegrees},${bbox.maxY + bufferDegrees}`
    };
  }

  /**
   * Import features within entity bounds
   */
  async importWithinEntity(config) {
    const {
      sourceTable,
      sourceRecordId,
      sourceGeometryColumn,
      bufferMeters = 0,
      targetService,
      targetLayer
    } = config;

    // Step 1: Get source geometry
    console.log('[EntityFilter] Reading source geometry...');
    const sourceGeometry = await this.getEntityGeometry(
      sourceTable,
      sourceRecordId,
      sourceGeometryColumn
    );

    // Step 2: Compute BBOX (with optional buffer)
    console.log(`[EntityFilter] Computing BBOX (buffer: ${bufferMeters}m)...`);
    const bbox = bufferMeters > 0
      ? this.computeBuffer(sourceGeometry, bufferMeters)
      : extractBBOXFromWKT(sourceGeometry);

    console.log(`[EntityFilter] BBOX: ${bbox.formatted}`);

    // Step 3: Import within BBOX
    console.log('[EntityFilter] Importing features...');
    const features = await this.importWithBBOX(targetService, targetLayer, bbox);

    return {
      sourceEntity: {
        table: sourceTable,
        recordId: sourceRecordId,
        geometry: sourceGeometry
      },
      bbox,
      features,
      count: features.length
    };
  }

  async importWithBBOX(service, layer, bbox) {
    if (service === 'IGN') {
      return this.importIGNWithBBOX(layer, bbox);
    } else if (service === 'OSM') {
      return this.importOSMWithBBOX(layer, bbox);
    }
    throw new Error(`Unknown service: ${service}`);
  }

  async importIGNWithBBOX(layer, bbox) {
    const cqlFilter = `BBOX(geometry, ${bbox.minX}, ${bbox.minY}, ${bbox.maxX}, ${bbox.maxY}, 'EPSG:4326')`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: layer,
      outputFormat: 'application/json',
      count: 5000,
      cql_filter: cqlFilter
    });

    const response = await fetch(`https://data.geopf.fr/wfs?${params}`);
    const geojson = await response.json();

    return geojson.features.map(f => ({
      geometry: geoJSONToWKT(f.geometry),
      properties: f.properties
    }));
  }

  async importOSMWithBBOX(osmType, bbox) {
    const [tag, value] = osmType.split('=');

    const query = `[out:json][timeout:25];
(
  node["${tag}"="$ {value}"](${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX});
  way["${tag}"="${value}"](${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX});
);
out geom;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });

    const osmData = await response.json();

    return osmData.elements.map(el => ({
      geometry: convertOSMToWKT(el),
      properties: el.tags
    }));
  }
}
```

### 📊 Avantages

✅ **Réutilisation**: Exploite les données déjà dans Grist
✅ **Contexte métier**: Les emprises sont souvent liées au projet
✅ **Précision**: Filtrage basé sur les géométries réelles du projet
✅ **Flexibilité**: Buffer configurable pour proximité
✅ **Pas de duplication**: Pas besoin de réimporter les limites admin

### ⚠️ Limitations

❌ **Dépendance**: Nécessite des géométries déjà présentes dans Grist
❌ **Complexité**: Nécessite identifier table/record/colonne source
❌ **BBOX simple**: Le filtre BBOX est approximatif (pas ST_CONTAINS exact)

### 📈 Gains de performance estimés

| Scénario | Gain |
|----------|------|
| POI autour parcelle (500m) | ~99% ↓ données |
| Bâtiments dans zone projet | ~98% ↓ données |
| Routes dans emprise | ~97% ↓ données |

**Temps d'exécution estimé**:
- Lecture géométrie Grist: ~100ms
- Calcul BBOX: ~10ms
- Import filtré: ~2-5s
- **Total: ~2-5 secondes**

---

## Approche 3: Géocodage

### 🎯 Principe

Convertir une **adresse texte** ou **lieu** en coordonnées géographiques, puis créer un BBOX de recherche autour.

### 📚 API disponibles

#### 1. **API Géoplateforme (ex-BAN)**

**Endpoint**: `https://data.geopf.fr/geocodage/search`

**Sources**: Base Adresse Nationale (BAN), BD TOPO® POI, Parcellaire Express
**Mise à jour**: BAN hebdomadaire, POI/Parcelles trimestrielle
**Rate limit**: 50 req/s par IP

**Paramètres principaux**:
```
GET https://data.geopf.fr/geocodage/search
  ?q=<adresse>          // Texte libre
  &limit=<n>            // Nombre de résultats (défaut: 5)
  &lon=<x>&lat=<y>      // Point de référence pour priorisation
  &type=<type>          // housenumber, street, locality, municipality
  &postcode=<cp>        // Code postal
  &citycode=<insee>     // Code INSEE
```

**Exemple de réponse**:
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [2.3488, 48.8534]
    },
    "properties": {
      "label": "5 Rue de la République 75001 Paris",
      "score": 0.98,
      "housenumber": "5",
      "street": "Rue de la République",
      "postcode": "75001",
      "city": "Paris",
      "citycode": "75101",
      "type": "housenumber"
    }
  }]
}
```

#### 2. **Géocodage inverse** (coords → adresse)

**Endpoint**: `https://data.geopf.fr/geocodage/reverse`

**Paramètres**:
```
GET https://data.geopf.fr/geocodage/reverse
  ?lon=<x>&lat=<y>
  &type=<type>          // Filtrer type de résultat
  &index=<index>        // address, parcel, poi
```

### ⚙️ Implémentation technique

```javascript
class GeocodingService {
  constructor() {
    this.baseUrl = 'https://data.geopf.fr/geocodage';
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24h
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address, options = {}) {
    const cacheKey = `geocode:${address}:${JSON.stringify(options)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('[Geocoding] Using cached result');
      return cached.data;
    }

    // Build query
    const params = new URLSearchParams({
      q: address,
      limit: options.limit || 5
    });

    if (options.type) params.append('type', options.type);
    if (options.postcode) params.append('postcode', options.postcode);
    if (options.citycode) params.append('citycode', options.citycode);

    const url = `${this.baseUrl}/search?${params}`;

    console.log('[Geocoding] Searching:', address);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error(`No results found for: ${address}`);
    }

    const results = data.features.map(f => ({
      coordinates: f.geometry.coordinates, // [lon, lat]
      label: f.properties.label,
      score: f.properties.score,
      type: f.properties.type,
      city: f.properties.city,
      postcode: f.properties.postcode,
      properties: f.properties
    }));

    // Cache
    this.cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    return results;
  }

  /**
   * Reverse geocode (coordinates to address)
   */
  async reverseGeocode(lon, lat, options = {}) {
    const params = new URLSearchParams({
      lon: lon.toString(),
      lat: lat.toString()
    });

    if (options.type) params.append('type', options.type);
    if (options.index) params.append('index', options.index);

    const url = `${this.baseUrl}/reverse?${params}`;

    console.log(`[Geocoding] Reverse geocoding: ${lon}, ${lat}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    return data.features.map(f => ({
      label: f.properties.label,
      distance: f.properties.distance,
      type: f.properties.type,
      properties: f.properties
    }));
  }

  /**
   * Create BBOX around geocoded location
   */
  createSearchBBOX(coordinates, radiusMeters = 1000) {
    const [lon, lat] = coordinates;

    // Approximate: 1 degree ≈ 111km
    // At latitude, 1° longitude ≈ 111km * cos(lat)
    const latDelta = radiusMeters / 111000;
    const lonDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));

    return {
      minX: lon - lonDelta,
      minY: lat - latDelta,
      maxX: lon + lonDelta,
      maxY: lat + latDelta,
      formatted: `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`,
      center: { lon, lat },
      radius: radiusMeters
    };
  }

  /**
   * Complete workflow: address → geocode → import within radius
   */
  async importNearAddress(config) {
    const {
      address,
      radiusMeters = 1000,
      targetService,
      targetLayer,
      geocodeOptions = {}
    } = config;

    // Step 1: Geocode address
    console.log('[GeoImport] Step 1: Geocoding address...');
    const results = await this.geocode(address, geocodeOptions);

    if (results.length === 0) {
      throw new Error('No geocoding results');
    }

    // Use first result (highest score)
    const location = results[0];
    console.log(`[GeoImport] Found: ${location.label} (score: ${location.score})`);

    // Step 2: Create search BBOX
    console.log(`[GeoImport] Step 2: Creating ${radiusMeters}m radius BBOX...`);
    const bbox = this.createSearchBBOX(location.coordinates, radiusMeters);

    // Step 3: Import within BBOX
    console.log('[GeoImport] Step 3: Importing features...');
    const features = await importWithBBOX(targetService, targetLayer, bbox);

    // Step 4: (Optional) Filter by exact distance
    console.log('[GeoImport] Step 4: Filtering by distance...');
    const [centerLon, centerLat] = location.coordinates;
    const filteredFeatures = features.filter(feature => {
      const distance = calculateDistance(
        centerLat, centerLon,
        feature.lat, feature.lon
      );
      return distance <= radiusMeters;
    });

    return {
      geocoding: {
        query: address,
        result: location,
        allResults: results
      },
      bbox,
      features: filteredFeatures,
      stats: {
        total: features.length,
        withinRadius: filteredFeatures.length,
        culled: features.length - filteredFeatures.length
      }
    };
  }
}

/**
 * Calculate distance between two points (Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

### 📝 Cas d'usage

**Exemple 1: Écoles près d'une adresse**
```javascript
const importer = new GeocodingService();

const result = await importer.importNearAddress({
  address: "5 Rue de la République, 75001 Paris",
  radiusMeters: 500, // 500m autour
  targetService: 'OSM',
  targetLayer: 'amenity=school'
});

console.log(`Found ${result.stats.withinRadius} schools within 500m`);
// → Import dans Grist
```

**Exemple 2: Commerces autour d'un lieu**
```javascript
const result = await importer.importNearAddress({
  address: "Tour Eiffel, Paris",
  radiusMeters: 1000,
  targetService: 'OSM',
  targetLayer: 'amenity=restaurant'
});
```

**Exemple 3: Bâtiments autour d'un code postal**
```javascript
const result = await importer.importNearAddress({
  address: "Lyon",
  radiusMeters: 2000,
  targetService: 'IGN',
  targetLayer: 'BDTOPO_V3:batiment',
  geocodeOptions: {
    postcode: '69001',
    type: 'municipality'
  }
});
```

### 📊 Avantages

✅ **Simplicité**: Recherche en langage naturel (adresse, lieu)
✅ **Précision**: API BAN très précise pour adresses françaises
✅ **Rayon configurable**: Recherche de proximité personnalisable
✅ **Multi-sources**: BAN (adresses) + POI (lieux) + Parcellaire
✅ **Scoring**: Résultats triés par pertinence
✅ **Gratuit**: Pas de coût, 50 req/s

### ⚠️ Limitations

❌ **France uniquement**: API BAN limitée au territoire français
❌ **Qualité variable**: Dépend de la complétude de la BAN
❌ **BBOX circulaire approximatif**: Le BBOX est carré, pas circulaire
❌ **Filtrage supplémentaire**: Nécessite calcul de distance exact côté client
❌ **Rate limit**: 50 req/s peut être limitant pour batch

### 📈 Gains de performance estimés

| Scénario | Sans géocodage | Avec géocodage | Gain |
|----------|----------------|----------------|------|
| Écoles à Paris (manuellement chercher coords) | ~30s | ~3s | **90% ↓ temps** |
| Commerces autour adresse | Import global impossible | Ciblé 200 features | **99% ↓ données** |
| POI proximité | Recherche manuelle | Automatique | **Expérience améliorée** |

**Temps d'exécution estimé**:
- Géocodage: ~200-500ms
- Calcul BBOX: ~10ms
- Import filtré: ~2-5s
- Filtrage distance: ~100ms
- **Total: ~3-6 secondes**

---

## Comparaison des performances

### 📊 Tableau comparatif

| Critère | Chaînage Admin | Entités Grist | Géocodage |
|---------|----------------|---------------|-----------|
| **Setup** | Aucun | Tables existantes | Aucun |
| **Requêtes API** | 2 (admin + détails) | 1 (détails) | 2 (geocode + détails) |
| **Temps total** | 3-6s | 2-5s | 3-6s |
| **Précision filtre** | BBOX (approximatif) | BBOX (approximatif) | Cercle → BBOX → Distance |
| **Réduction données** | 95-97% | 95-99% | 95-99% |
| **Cas d'usage** | Limites admin connues | Emprises projet | Recherche textuelle |
| **Complexité** | Faible | Moyenne | Faible |
| **Dépendances** | Aucune | Géométries dans Grist | API externe |
| **Scalabilité** | Excellente | Excellente | Très bonne (rate limit 50/s) |

### 🎯 Recommandations par cas d'usage

#### 1. **Import dans limite administrative** → **Chaînage Admin**
```
Exemple: "Tous les bâtiments dans la commune de Lyon"
Meilleure approche: Chaînage Admin Light → BBOX → Import bâtiments
Raison: Précis, optimisé (COG-CARTO), automatique
```

#### 2. **Import dans zone de projet** → **Entités Grist**
```
Exemple: "Tous les POI dans ma zone d'étude"
Meilleure approche: Entité Grist (zone) → BBOX → Import POI
Raison: Réutilise données existantes, contexte métier
```

#### 3. **Import autour d'une adresse** → **Géocodage**
```
Exemple: "Toutes les écoles à 500m de mon adresse"
Meilleure approche: Géocodage → Cercle/BBOX → Import écoles
Raison: Recherche naturelle, précision adresse
```

#### 4. **Import autour d'un lieu connu** → **Géocodage**
```
Exemple: "Tous les restaurants autour de la Tour Eiffel"
Meilleure approche: Géocodage lieu → BBOX → Import restaurants
Raison: POI bien référencés dans BD TOPO
```

---

## Recommandations d'implémentation

### 🚀 Phase 1: Quick Wins (1-2 jours)

#### 1. Service de géocodage basique
```javascript
// src/services/GeocodingService.js
- geocode(address)
- reverseGeocode(lon, lat)
- createSearchBBOX(coords, radius)
- Cache 24h
```

#### 2. UI d'import avec géocodage
```javascript
// Ajout dans ImportWizard
- Nouveau champ "address_search"
- Autocomplete avec API géocodage
- Sélection rayon (100m, 500m, 1km, 2km)
- Prévisualisation BBOX sur carte
```

**Impact**: Permet imports ciblés par adresse immédiatement

---

### 🔧 Phase 2: Chaînage admin (2-3 jours)

#### 1. Service de chaînage
```javascript
// src/services/ChainedImportService.js
- importAdminBoundary(level, filter)
- extractBBOX(wkt)
- importWithinBBOX(layer, bbox)
- execute(workflow)
```

#### 2. UI workflow chaîné
```javascript
// Nouveau composant ImportWorkflowBuilder
- Step 1: Sélectionner admin (région/dept/commune)
- Step 2: Choisir couche détaillée
- Step 3: Prévisualisation
- Step 4: Import
```

**Impact**: Import rapide dans limites admin

---

### 🎨 Phase 3: Entités Grist (3-4 jours)

#### 1. Service de filtrage par entités
```javascript
// src/services/GristEntityFilterService.js
- getEntityGeometry(table, recordId, column)
- computeBuffer(wkt, radius)
- importWithinEntity(config)
```

#### 2. UI sélection d'entités
```javascript
// Composant EntitySelector
- Dropdown: Sélection table
- Dropdown: Sélection record (avec nom)
- Slider: Buffer radius (0-5000m)
- Preview: Affichage emprise sur carte
```

**Impact**: Réutilisation contexte projet

---

### 📦 Phase 4: Service unifié (1 jour)

#### Service d'import géographique intelligent
```javascript
// src/services/SmartGeoImportService.js

class SmartGeoImportService {
  async import(config) {
    const { mode, ...params } = config;

    switch (mode) {
      case 'address':
        return this.geocodingService.importNearAddress(params);

      case 'admin':
        return this.chainedService.execute(params);

      case 'entity':
        return this.entityFilterService.importWithinEntity(params);

      case 'bbox':
        return this.directBBOXImport(params);

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }
}
```

---

## 📈 Bénéfices attendus

### Performance
- **Temps d'import**: 80-95% plus rapide (30-60s → 3-6s)
- **Volume de données**: 95-99% de réduction
- **Bande passante**: 95% de réduction
- **Expérience utilisateur**: Import quasi-instantané

### Utilisabilité
- **Recherche naturelle**: Adresse texte au lieu de coordonnées
- **Contexte métier**: Réutilisation données projet
- **Automatisation**: Pas besoin de calculer BBOX manuellement
- **Précision**: Filtres basés sur géométries réelles

### Scalabilité
- **Rate limiting**: Respecté (2-3 req par import max)
- **Cache**: Réutilisation géocodage et géométries admin
- **Pagination**: Toujours < 5000 features grâce aux filtres

---

## Sources

- [API Géoplateforme - Géocodage](https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage)
- [Documentation technique de l'API de géocodage](https://geoservices.ign.fr/documentation/services/api-et-services-ogc/geocodage-20/doc-technique-api-geocodage)
- [API Adresse (Base Adresse Nationale - BAN)](https://www.data.gouv.fr/dataservices/api-adresse-base-adresse-nationale-ban/)
- [API Adresse | guides.etalab.gouv.fr](https://guides.etalab.gouv.fr/apis-geo/1-api-adresse)

---

**Date de création**: 2025-11-23
**Auteur**: Claude
**Version**: 1.0
**Statut**: Étude complète - Prêt pour implémentation
