# Guide des Fonctions ST_* dans Smart-GIS v2

> **Architecture**: Le widget **LIT** les résultats, Grist **CALCULE** avec ST_*

Smart-GIS v2 s'appuie sur les extensions géospatiales de Grist pour tous les calculs géométriques.

Voir: [grist-core/feature/sqlite-extensions](https://github.com/nic01asFr/grist-core/tree/feature/sqlite-extensions)

---

## 🏗️ Architecture Widget + Grist

### ❌ Ce que le widget NE FAIT PAS

```javascript
// ❌ MAUVAIS: Calculer côté client
const area = turf.area(feature);
const center = turf.centroid(feature);
const distance = turf.distance(point1, point2);
```

### ✅ Ce que le widget FAIT

```javascript
// ✅ BON: Lire les résultats calculés par Grist
const area = record.area_km2;          // Calculé par ST_AREA()
const center = record.centroid;         // Calculé par ST_CENTROID()
const distance = record.distance_km;    // Calculé par ST_DISTANCE()
```

**Formules Grist correspondantes:**
```python
# Colonnes dans GIS_WorkSpace
area_km2 = ST_AREA($geometry_wgs84, "km2")
centroid = ST_CENTROID($geometry_wgs84)
center_lat = ST_Y(ST_CENTROID($geometry_wgs84))
center_lon = ST_X(ST_CENTROID($geometry_wgs84))
```

---

## 📚 Fonctions ST_* Disponibles

### 1. Import & Conversion

| Fonction | Usage | Exemple |
|----------|-------|---------|
| `ST_GeomFromText(wkt, srid=4326)` | WKT → Géométrie | `ST_GeomFromText('POINT(2.35 48.85)')` |
| `ST_GeomFromGeoJSON(json)` | GeoJSON → WKT | `ST_GeomFromGeoJSON($geojson_column)` |
| `ST_AsText(geometry)` | Géométrie → WKT | `ST_AsText($geometry)` |
| `ST_ASGEOJSON(wkt)` | WKT → GeoJSON | `ST_ASGEOJSON($geometry_wgs84)` |
| `MAKE_POINT(lat, lon)` | Créer point | `MAKE_POINT(48.8584, 2.2945)` |

**Exemple dans TableSchema:**
```javascript
{
  id: 'geojson',
  type: 'Text',
  formula: 'ST_ASGEOJSON($geometry_wgs84)'
}
```

### 2. Transformations de Coordonnées

| Fonction | Usage | Exemple |
|----------|-------|---------|
| `ST_Transform(geom, from_srid, to_srid)` | Changer CRS | `ST_Transform($geom_l93, 2154, 4326)` |
| `DETECT_CRS(geometry)` | Détecter SRID | `DETECT_CRS($geometry)` |

**Exemple: Convertir Lambert93 → WGS84**
```python
# Colonne formule
geometry_wgs84 = ST_Transform($geometry_l93, 2154, 4326)
```

**SRIDs supportés:**
- `4326` - WGS84 (GPS, web)
- `3857` - Web Mercator (cartes Leaflet/OSM)
- `2154` - Lambert 93 (France)
- `27572` - Lambert II étendu (ancienne France)

### 3. Mesures

| Fonction | Usage | Unités | Exemple |
|----------|-------|--------|---------|
| `ST_DISTANCE(g1, g2, unit)` | Distance | `'m'`, `'km'`, `'mi'` | `ST_DISTANCE($p1, $p2, 'km')` |
| `ST_AREA(geom, unit)` | Surface | `'m2'`, `'km2'`, `'ha'` | `ST_AREA($polygon, 'km2')` |
| `ST_LENGTH(geom, unit)` | Longueur | `'m'`, `'km'`, `'mi'` | `ST_LENGTH($linestring, 'km')` |
| `ST_PERIMETER(geom, unit)` | Périmètre | `'m'`, `'km'` | `ST_PERIMETER($polygon, 'm')` |

**Exemple dans TableSchema:**
```javascript
{
  id: 'area_km2',
  type: 'Numeric',
  formula: 'ST_AREA($geometry_wgs84, "km2") if GEOMETRY_TYPE($geometry_wgs84) in ["Polygon", "MultiPolygon"] else None'
}
```

**Cas d'usage widget:**
```javascript
// Afficher la surface dans un tooltip
const displayArea = (record) => {
  if (record.area_km2) {
    return `${record.area_km2.toFixed(2)} km²`;
  }
  return 'N/A';
};
```

### 4. Relations Topologiques

| Fonction | Usage | Retour | Exemple |
|----------|-------|--------|---------|
| `ST_CONTAINS(g1, g2)` | g1 contient g2 ? | Bool | `ST_CONTAINS($department, $city)` |
| `ST_INTERSECTS(g1, g2)` | Se croisent ? | Bool | `ST_INTERSECTS($zone1, $zone2)` |
| `ST_WITHIN(g1, g2)` | g1 dans g2 ? | Bool | `ST_WITHIN($point, $zone)` |
| `ST_CROSSES(g1, g2)` | Se traversent ? | Bool | `ST_CROSSES($road, $river)` |
| `ST_TOUCHES(g1, g2)` | Se touchent ? | Bool | `ST_TOUCHES($parcel1, $parcel2)` |

**Exemple: Filtrer points dans une zone**
```python
# Colonne formule dans table Points
is_in_zone = ST_WITHIN($geometry, ZoneReference.lookupOne(name='Paris').geometry)
```

**Cas d'usage widget:**
```javascript
// Filtrer les features à afficher
const featuresInZone = records.filter(r => r.is_in_zone === true);
```

### 5. Opérations Géométriques

| Fonction | Usage | Exemple |
|----------|-------|---------|
| `ST_BUFFER(geom, distance, unit)` | Zone tampon | `ST_BUFFER($point, 500, 'm')` |
| `ST_CENTROID(geometry)` | Centre | `ST_CENTROID($polygon)` |
| `ST_SIMPLIFY(geom, tolerance)` | Simplifier | `ST_SIMPLIFY($detailed, 0.001)` |
| `ST_UNION(g1, g2)` | Fusionner | `ST_UNION($zone1, $zone2)` |
| `ST_INTERSECTION(g1, g2)` | Intersection | `ST_INTERSECTION($z1, $z2)` |

**Exemple: Buffer autour d'un point**
```python
# Colonne formule
buffer_500m = ST_BUFFER($geometry_wgs84, 500, 'm')
```

**Cas d'usage widget:**
```javascript
// Afficher le buffer sur la carte
if (record.buffer_500m) {
  const bufferLayer = L.geoJSON(
    JSON.parse(record.buffer_geojson),
    { style: { color: 'blue', fillOpacity: 0.2 } }
  );
  map.addLayer(bufferLayer);
}
```

### 6. Utilitaires

| Fonction | Usage | Exemple |
|----------|-------|---------|
| `ST_X(point)` | Longitude | `ST_X(ST_CENTROID($geom))` |
| `ST_Y(point)` | Latitude | `ST_Y(ST_CENTROID($geom))` |
| `GEOMETRY_TYPE(geometry)` | Type géométrie | `GEOMETRY_TYPE($geometry)` |
| `IS_VALID(geometry)` | Validation | `IS_VALID($geometry)` |

**Exemple dans TableSchema:**
```javascript
{
  id: 'center_lat',
  type: 'Numeric',
  formula: 'ST_Y(ST_CENTROID($geometry_wgs84))'
},
{
  id: 'center_lon',
  type: 'Numeric',
  formula: 'ST_X(ST_CENTROID($geometry_wgs84))'
}
```

---

## 🎯 Workflows Courants

### Workflow 1: Import IGN → Affichage Carte

**1. Import (widget fait):**
```javascript
// importMethods.js: IGN fetch
const wkt = geoJSONToWKT(feature.geometry);
return { geometry: wkt, properties: {...} };
```

**2. Calculs (Grist fait via formules):**
```python
# Colonnes auto-calculées
area_km2 = ST_AREA($geometry_wgs84, 'km2')
center_lat = ST_Y(ST_CENTROID($geometry_wgs84))
center_lon = ST_X(ST_CENTROID($geometry_wgs84))
geojson = ST_ASGEOJSON($geometry_wgs84)
```

**3. Affichage (widget lit et affiche):**
```javascript
// MapView.jsx
records.forEach(record => {
  const geojson = JSON.parse(record.geojson);
  const layer = L.geoJSON(geojson, {
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`
        <b>${record.feature_name}</b><br>
        Surface: ${record.area_km2?.toFixed(2)} km²<br>
        Centre: ${record.center_lat?.toFixed(4)}, ${record.center_lon?.toFixed(4)}
      `);
    }
  });
  map.addLayer(layer);
});
```

### Workflow 2: Recherche Spatiale "Points à X km"

**1. Créer colonne distance (Grist):**
```python
# Dans table Points
distance_to_target = ST_DISTANCE(
  $geometry_wgs84,
  TargetPoints.lookupOne(id=1).geometry_wgs84,
  'km'
)
```

**2. Filtrer dans widget:**
```javascript
const pointsWithin5km = records.filter(r => r.distance_to_target <= 5);
```

### Workflow 3: Transformation CRS (Lambert93 → WGS84)

**1. Import avec CRS source:**
```javascript
// CSV avec géométries Lambert93
return {
  geometry_l93: wkt_from_csv,
  source_srid: 2154
};
```

**2. Transformation automatique (Grist):**
```python
# Colonne formule
geometry_wgs84 = ST_Transform($geometry_l93, 2154, 4326)
```

**3. Widget utilise WGS84:**
```javascript
const geojson = JSON.parse(record.geojson); // Déjà en WGS84
```

---

## 📊 Schéma Complet GIS_WorkSpace

Voir `src/core/TableSchema.js` pour le schéma avec toutes les colonnes ST_*.

**Colonnes de base (widget écrit):**
- `layer_name`, `geometry_wgs84`, `properties`, `feature_name`, `import_session`

**Colonnes calculées (Grist calcule via ST_*):**
- `geometry_type`, `centroid`, `center_lat`, `center_lon`
- `area_km2`, `perimeter_km`, `length_km`
- `is_valid_geom`, `geojson`

**Colonnes display (widget utilise):**
- `is_visible`, `z_index`

---

## 🚀 Exemples Pratiques

### Exemple 1: Popup avec Mesures

```javascript
// MapView.jsx
const createPopup = (record) => {
  const type = record.geometry_type;
  let measures = '';

  if (type === 'Polygon' || type === 'MultiPolygon') {
    measures = `
      Surface: ${record.area_km2?.toFixed(2)} km²<br>
      Périmètre: ${record.perimeter_km?.toFixed(2)} km
    `;
  } else if (type === 'LineString' || type === 'MultiLineString') {
    measures = `Longueur: ${record.length_km?.toFixed(2)} km`;
  } else if (type === 'Point') {
    measures = `
      Latitude: ${record.center_lat?.toFixed(6)}<br>
      Longitude: ${record.center_lon?.toFixed(6)}
    `;
  }

  return `
    <div class="feature-popup">
      <h4>${record.feature_name}</h4>
      <p><em>${record.layer_name}</em></p>
      ${measures}
    </div>
  `;
};
```

### Exemple 2: Filtrage Spatial

```javascript
// DataPanel.jsx - Recherche spatiale
const filterByDistance = async (targetGeometry, maxDistance) => {
  // Grist a déjà calculé les distances via formule ST_DISTANCE
  const filtered = records.filter(r =>
    r.distance_to_target && r.distance_to_target <= maxDistance
  );

  // Afficher sur carte
  displayFeatures(filtered);
};
```

### Exemple 3: Validation Géométries

```javascript
// Import validation
const validateImport = (records) => {
  const invalid = records.filter(r => !r.is_valid_geom);

  if (invalid.length > 0) {
    console.warn(`${invalid.length} géométries invalides détectées`);
    // Afficher warnings dans UI
  }
};
```

---

## 🔍 Debugging

### Vérifier que les fonctions ST_* fonctionnent

**1. Dans Grist, créer colonne test:**
```python
test_area = ST_AREA($geometry_wgs84, 'km2')
```

**2. Si erreur "Unknown function ST_AREA":**
- Vérifier que vous utilisez grist-core avec feature/sqlite-extensions
- Rebuild Docker container si nécessaire

**3. Logs widget:**
```javascript
console.log('Record with ST_* calculations:', {
  name: record.feature_name,
  area: record.area_km2,
  center: [record.center_lat, record.center_lon],
  geojson: record.geojson?.substring(0, 100) + '...'
});
```

---

## 📖 Ressources

- [Grist ST_* Functions](https://github.com/nic01asFr/grist-core/tree/feature/sqlite-extensions)
- [PostGIS Reference](https://postgis.net/docs/reference.html) (syntaxe similaire)
- [SpatiaLite Documentation](https://www.gaia-gis.it/fossil/libspatialite/index)
- [Shapely 2.0 Documentation](https://shapely.readthedocs.io/)

---

## ⚠️ Limitations Actuelles

1. **Pas de calculs côté widget**: Tout doit passer par formules Grist
2. **Performance**: Formules ST_* peuvent être lentes sur grandes tables (>10k rows)
3. **Cache**: Widget doit cacher les résultats ST_* pour éviter recalculs
4. **Types supportés**: Voir GEOMETRY_TYPE() pour liste complète

---

## 🎯 Best Practices

1. ✅ **Toujours utiliser WGS84 (4326)** pour `geometry_wgs84`
2. ✅ **Créer colonnes formules** pour calculs répétés
3. ✅ **Valider avec IS_VALID()** après import
4. ✅ **Utiliser ST_SIMPLIFY()** pour géométries très détaillées
5. ✅ **Cacher dans widget** les résultats ST_ASGEOJSON
6. ❌ **Jamais recalculer** côté widget ce que Grist peut faire
