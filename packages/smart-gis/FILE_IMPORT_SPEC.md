# Spécification : Import de Fichiers Géographiques

## 🎯 Objectif

Permettre l'import de fichiers géographiques standards avec détection automatique des formats, projections, et configuration intelligente.

---

## 📁 Formats Supportés

### Formats Vectoriels

| Format | Extension | Description | Priorité |
|--------|-----------|-------------|----------|
| **GeoJSON** | `.geojson`, `.json` | Standard web, JSON natif | ⭐⭐⭐ Haute |
| **Shapefile** | `.shp` + `.dbf` + `.shx` | Standard SIG, multi-fichiers | ⭐⭐⭐ Haute |
| **KML/KMZ** | `.kml`, `.kmz` | Google Earth | ⭐⭐ Moyenne |
| **GPX** | `.gpx` | Traces GPS | ⭐⭐ Moyenne |
| **GML** | `.gml` | Geography Markup Language | ⭐ Basse |
| **TopoJSON** | `.topojson` | GeoJSON optimisé | ⭐ Basse |

### Formats Tabulaires (avec coordonnées)

| Format | Extension | Description | Priorité |
|--------|-----------|-------------|----------|
| **CSV** | `.csv` | Avec colonnes lat/lon ou X/Y | ⭐⭐⭐ Haute |
| **Excel** | `.xlsx`, `.xls` | Tableur avec coordonnées | ⭐⭐ Moyenne |
| **TSV** | `.tsv` | Tab-separated values | ⭐ Basse |

### Formats Raster (Futur)

| Format | Extension | Description | Priorité |
|--------|-----------|-------------|----------|
| **GeoTIFF** | `.tif`, `.tiff` | Raster géoréférencé | 📅 v4.0 |
| **PNG World** | `.png` + `.pgw` | Image + worldfile | 📅 v4.0 |

---

## 🔍 Détection Automatique

### 1. Détection Format Fichier

#### Par Extension
```javascript
const detectFormatByExtension = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();

  const formats = {
    'geojson': 'geojson',
    'json': 'geojson',
    'kml': 'kml',
    'kmz': 'kmz',
    'gpx': 'gpx',
    'shp': 'shapefile',
    'csv': 'csv',
    'xlsx': 'excel',
    'xls': 'excel',
  };

  return formats[ext] || 'unknown';
};
```

#### Par Contenu (Magic Bytes / Signature)
```javascript
const detectFormatByContent = (content) => {
  // GeoJSON
  if (content.trim().startsWith('{') && content.includes('\"type\":')) {
    try {
      const json = JSON.parse(content);
      if (json.type === 'FeatureCollection' || json.type === 'Feature') {
        return 'geojson';
      }
    } catch (e) {}
  }

  // KML
  if (content.includes('<?xml') && content.includes('<kml')) {
    return 'kml';
  }

  // GPX
  if (content.includes('<?xml') && content.includes('<gpx')) {
    return 'gpx';
  }

  // CSV
  if (content.includes(',') && !content.startsWith('{') && !content.startsWith('<')) {
    return 'csv';
  }

  return 'unknown';
};
```

### 2. Détection Projection (CRS)

#### Sources de projection

```javascript
const detectCRS = (data, format) => {
  // 1. Explicite dans les données
  if (format === 'geojson' && data.crs) {
    return parseCRS(data.crs);
  }

  // 2. Fichier .prj (Shapefile)
  if (format === 'shapefile' && data.prjContent) {
    return parseWKT_CRS(data.prjContent);
  }

  // 3. Analyse des coordonnées (heuristique)
  const coords = extractSampleCoordinates(data, 10);
  return guessCRSFromCoords(coords);
};

const guessCRSFromCoords = (coords) => {
  // WGS84 (EPSG:4326) : lat [-90, 90], lon [-180, 180]
  const isWGS84 = coords.every(([x, y]) =>
    x >= -180 && x <= 180 && y >= -90 && y <= 90
  );
  if (isWGS84) return 'EPSG:4326';

  // Web Mercator (EPSG:3857) : très grandes valeurs
  const isWebMercator = coords.some(([x, y]) =>
    Math.abs(x) > 180 || Math.abs(y) > 90
  );
  if (isWebMercator) return 'EPSG:3857';

  // Lambert 93 (France) : X ~ 100000-1300000, Y ~ 6000000-7200000
  const isLambert93 = coords.every(([x, y]) =>
    x > 50000 && x < 1500000 && y > 6000000 && y < 7500000
  );
  if (isLambert93) return 'EPSG:2154';

  // Défaut
  return 'EPSG:4326';
};
```

### 3. Détection Colonnes Géographiques (CSV/Excel)

#### Détection automatique lat/lon

```javascript
const detectGeoColumns = (headers) => {
  // Normaliser headers (lowercase, sans accents)
  const normalized = headers.map(h => normalize(h));

  // Patterns latitude
  const latPatterns = ['lat', 'latitude', 'y', 'northing', 'lat_dd'];
  const lonPatterns = ['lon', 'lng', 'long', 'longitude', 'x', 'easting', 'lon_dd'];

  const latCol = headers.find((h, i) =>
    latPatterns.some(p => normalized[i].includes(p))
  );

  const lonCol = headers.find((h, i) =>
    lonPatterns.some(p => normalized[i].includes(p))
  );

  // Pattern WKT
  const wktCol = headers.find((h, i) =>
    ['wkt', 'geom', 'geometry', 'the_geom', 'shape'].some(p =>
      normalized[i].includes(p)
    )
  );

  return {
    latColumn: latCol,
    lonColumn: lonCol,
    wktColumn: wktCol,
    detected: !!(latCol && lonCol) || !!wktCol,
  };
};
```

---

## 🛠️ Workflow d'Import

### Étape 1 : Sélection Fichier

```
┌─────────────────────────────────┐
│ 📥 Import Fichier               │
│─────────────────────────────────│
│ [📁 Choisir fichier(s)]         │
│                                 │
│ ou Glisser-déposer              │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    Déposez vos fichiers     │ │
│ │         ici                 │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ Formats supportés :             │
│ GeoJSON, SHP, KML, CSV, XLSX... │
└─────────────────────────────────┘
```

**Fichiers multiples** :
- Shapefile : `.shp` + `.dbf` + `.shx` + `.prj` (optionnel)
- Détection automatique des fichiers associés
- Glisser-déposer de dossier complet

### Étape 2 : Analyse & Détection

```
┌─────────────────────────────────┐
│ 🔍 Analyse du fichier...        │
│─────────────────────────────────│
│ ✓ Format détecté : GeoJSON      │
│ ✓ Projection : EPSG:4326        │
│ ✓ 1,234 features trouvées      │
│ ✓ Type : Polygon                │
│                                 │
│ Champs détectés :               │
│ - id (number)                   │
│ - nom (text)                    │
│ - superficie (number)           │
│ - date_creation (date)          │
│                                 │
│ [Continuer →]                   │
└─────────────────────────────────┘
```

**Cas spéciaux** :

#### CSV avec coordonnées
```
┌─────────────────────────────────┐
│ 🔍 Configuration CSV            │
│─────────────────────────────────│
│ Colonnes géographiques :        │
│                                 │
│ Latitude  : [lat      ▼]        │
│ Longitude : [lon      ▼]        │
│                                 │
│ ou                              │
│                                 │
│ WKT       : [geometry ▼]        │
│                                 │
│ Projection :                    │
│ [●] WGS84 (EPSG:4326)           │
│ [ ] Web Mercator (EPSG:3857)    │
│ [ ] Lambert 93 (EPSG:2154)      │
│ [ ] Autre : [____]              │
│                                 │
│ [Aperçu données ↓]              │
│ ┌───────────────────────────┐   │
│ │ lat     | lon      | nom  │   │
│ │ 48.8566 | 2.3522   | A    │   │
│ │ 48.8567 | 2.3523   | B    │   │
│ └───────────────────────────┘   │
│                                 │
│ [Annuler] [Importer →]          │
└─────────────────────────────────┘
```

#### Projection incorrecte
```
┌─────────────────────────────────┐
│ ⚠️ Projection à vérifier        │
│─────────────────────────────────│
│ Projection détectée :           │
│ EPSG:2154 (Lambert 93)          │
│                                 │
│ Coordonnées échantillon :       │
│ X: 652380.50                    │
│ Y: 6862305.32                   │
│                                 │
│ Voulez-vous convertir en WGS84 ?│
│                                 │
│ [●] Oui, convertir              │
│ [ ] Non, garder tel quel        │
│                                 │
│ Aperçu après conversion :       │
│ Lat: 48.8566                    │
│ Lon: 2.3522                     │
│                                 │
│ [Annuler] [Continuer →]         │
└─────────────────────────────────┘
```

### Étape 3 : Configuration Import

```
┌─────────────────────────────────┐
│ ⚙️ Configuration                │
│─────────────────────────────────│
│ Nom de la couche :              │
│ [Bâtiments Paris            ]   │
│                                 │
│ Importer dans :                 │
│ [●] Nouvelle couche             │
│ [ ] Couche existante : [___ ▼]  │
│                                 │
│ Champs à importer :             │
│ [✓] id                          │
│ [✓] nom                         │
│ [✓] superficie                  │
│ [✓] date_creation               │
│ [ ] _internal_id (ignorer)      │
│                                 │
│ Style par défaut :              │
│ [Couleur : #3498db ◼️]          │
│ [Opacité : 30% ───●──────]      │
│                                 │
│ [Annuler] [Importer]            │
└─────────────────────────────────┘
```

### Étape 4 : Import & Validation

```
┌─────────────────────────────────┐
│ 📥 Import en cours...           │
│─────────────────────────────────│
│ ████████████░░░░░░░░  60%       │
│                                 │
│ 740 / 1,234 features importées  │
│                                 │
│ Conversion WGS84...             │
└─────────────────────────────────┘
```

**Après import** :
```
┌─────────────────────────────────┐
│ ✅ Import terminé               │
│─────────────────────────────────│
│ 1,234 entités importées         │
│ Couche : "Bâtiments Paris"      │
│                                 │
│ ⚠️ 3 avertissements :           │
│ - 2 géométries invalides        │
│ - 1 enregistrement sans géom    │
│                                 │
│ [Voir la couche] [Fermer]       │
└─────────────────────────────────┘
```

---

## 🔧 Implémentation Technique

### Bibliothèques

```json
{
  "dependencies": {
    "shpjs": "^4.0.4",           // Shapefile parser
    "togeojson": "^0.16.0",      // KML/GPX → GeoJSON
    "papaparse": "^5.4.1",       // CSV parser
    "xlsx": "^0.18.5",           // Excel parser
    "proj4": "^2.9.0",           // Reprojection
    "@tmcw/togeojson": "^5.8.1"  // KML/GPX parser
  }
}
```

### Service FileImportService

```javascript
// services/fileImportService.js
import shp from 'shpjs';
import toGeoJSON from '@tmcw/togeojson';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import proj4 from 'proj4';

class FileImportService {
  /**
   * Import fichier géographique
   */
  async importFile(file) {
    // 1. Détection format
    const format = detectFormatByExtension(file.name);

    // 2. Lecture fichier
    const content = await this.readFile(file, format);

    // 3. Parsing selon format
    let geoData;
    switch (format) {
      case 'geojson':
        geoData = this.parseGeoJSON(content);
        break;
      case 'shapefile':
        geoData = await this.parseShapefile(content);
        break;
      case 'kml':
        geoData = this.parseKML(content);
        break;
      case 'gpx':
        geoData = this.parseGPX(content);
        break;
      case 'csv':
        geoData = await this.parseCSV(content);
        break;
      case 'excel':
        geoData = this.parseExcel(content);
        break;
      default:
        throw new Error(`Format non supporté : ${format}`);
    }

    // 4. Détection CRS
    const crs = detectCRS(geoData, format);

    // 5. Conversion WGS84 si nécessaire
    if (crs !== 'EPSG:4326') {
      geoData = this.reproject(geoData, crs, 'EPSG:4326');
    }

    // 6. Validation
    const validation = this.validate(geoData);

    return {
      success: true,
      data: geoData,
      crs,
      validation,
      metadata: {
        filename: file.name,
        format,
        featureCount: geoData.features?.length || 0,
      },
    };
  }

  /**
   * Parse Shapefile
   */
  async parseShapefile(arrayBuffer) {
    try {
      const geojson = await shp(arrayBuffer);
      return geojson;
    } catch (error) {
      throw new Error(`Erreur parsing Shapefile : ${error.message}`);
    }
  }

  /**
   * Parse KML
   */
  parseKML(content) {
    const dom = new DOMParser().parseFromString(content, 'text/xml');
    const geojson = toGeoJSON.kml(dom);
    return geojson;
  }

  /**
   * Parse GPX
   */
  parseGPX(content) {
    const dom = new DOMParser().parseFromString(content, 'text/xml');
    const geojson = toGeoJSON.gpx(dom);
    return geojson;
  }

  /**
   * Parse CSV avec colonnes géographiques
   */
  async parseCSV(content, config = {}) {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            // Auto-detect geo columns si non spécifiées
            const geoColumns = config.geoColumns || detectGeoColumns(results.meta.fields);

            if (!geoColumns.detected) {
              reject(new Error('Aucune colonne géographique détectée'));
              return;
            }

            // Conversion en GeoJSON
            const features = results.data.map(row => {
              let geometry;

              if (geoColumns.wktColumn) {
                // WKT
                geometry = parseWKT(row[geoColumns.wktColumn]);
              } else if (geoColumns.latColumn && geoColumns.lonColumn) {
                // Lat/Lon
                const lat = parseFloat(row[geoColumns.latColumn]);
                const lon = parseFloat(row[geoColumns.lonColumn]);

                if (isNaN(lat) || isNaN(lon)) return null;

                geometry = {
                  type: 'Point',
                  coordinates: [lon, lat],
                };
              }

              if (!geometry) return null;

              // Propriétés (tous les champs sauf géo)
              const properties = { ...row };
              delete properties[geoColumns.latColumn];
              delete properties[geoColumns.lonColumn];
              delete properties[geoColumns.wktColumn];

              return {
                type: 'Feature',
                geometry,
                properties,
              };
            }).filter(f => f !== null);

            resolve({
              type: 'FeatureCollection',
              features,
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error),
      });
    });
  }

  /**
   * Parse Excel
   */
  parseExcel(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csvContent = XLSX.utils.sheet_to_csv(firstSheet);

    return this.parseCSV(csvContent);
  }

  /**
   * Reprojection
   */
  reproject(geojson, fromCRS, toCRS) {
    // Définir projections communes
    proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
    proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs');
    proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    const transform = proj4(fromCRS, toCRS);

    // Transformer toutes les géométries
    geojson.features = geojson.features.map(feature => {
      feature.geometry = this.transformGeometry(feature.geometry, transform);
      return feature;
    });

    return geojson;
  }

  transformGeometry(geometry, transform) {
    if (geometry.type === 'Point') {
      geometry.coordinates = transform.forward(geometry.coordinates);
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      geometry.coordinates = geometry.coordinates.map(coord => transform.forward(coord));
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      geometry.coordinates = geometry.coordinates.map(ring =>
        ring.map(coord => transform.forward(coord))
      );
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates.map(polygon =>
        polygon.map(ring => ring.map(coord => transform.forward(coord)))
      );
    }

    return geometry;
  }

  /**
   * Validation
   */
  validate(geojson) {
    const warnings = [];
    const errors = [];

    geojson.features.forEach((feature, idx) => {
      // Géométrie manquante
      if (!feature.geometry) {
        warnings.push(`Feature ${idx}: géométrie manquante`);
      }

      // Coordonnées invalides
      if (feature.geometry?.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        if (isNaN(lon) || isNaN(lat)) {
          errors.push(`Feature ${idx}: coordonnées invalides (${lon}, ${lat})`);
        }
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          warnings.push(`Feature ${idx}: coordonnées hors limite (${lon}, ${lat})`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Lecture fichier
   */
  readFile(file, format) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);

      // Format binaire ou texte
      if (['shapefile', 'excel'].includes(format)) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }
}

export default new FileImportService();
```

### Composant FileImportWizard

```javascript
// components/panels/FileImportWizard.js
import React, { useState } from 'react';
import Button from '../ui/Button';
import Select from '../ui/Select';
import ColorPicker from '../ui/ColorPicker';
import fileImportService from '../../services/fileImportService';

const FileImportWizard = ({ onImport, onCancel }) => {
  const [step, setStep] = useState(1); // 1: select, 2: config, 3: import
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [config, setConfig] = useState({
    layerName: '',
    targetLayer: 'new',
    selectedFields: [],
    style: {
      color: '#3498db',
      fillOpacity: 0.3,
    },
  });

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      // Parse fichier
      const result = await fileImportService.importFile(selectedFile);

      setParsedData(result);
      setConfig({
        ...config,
        layerName: selectedFile.name.replace(/\.[^/.]+$/, ''),
        selectedFields: result.data.features[0]
          ? Object.keys(result.data.features[0].properties)
          : [],
      });

      setStep(2); // Configuration
    } catch (error) {
      alert(`Erreur lors de l'import : ${error.message}`);
    }
  };

  const handleImport = async () => {
    setStep(3); // Loading

    try {
      // Convertir en format GIS_WorkSpace
      const records = parsedData.data.features.map(feature => ({
        layer_name: config.layerName,
        layer_type: 'vector',
        geometry: feature.geometry,
        nom: feature.properties.nom || feature.properties.name || 'Sans nom',
        description: JSON.stringify(feature.properties),
        style_config: JSON.stringify(config.style),
        is_visible: true,
        z_index: 1,
      }));

      await onImport(records);
    } catch (error) {
      alert(`Erreur lors de l'import : ${error.message}`);
    }
  };

  // Step 1: Sélection fichier
  if (step === 1) {
    return (
      <div style={styles.wizard}>
        <h2>📥 Import Fichier</h2>
        <input
          type="file"
          accept=".geojson,.json,.kml,.kmz,.gpx,.shp,.csv,.xlsx,.xls"
          onChange={handleFileSelect}
          style={styles.fileInput}
        />
        <p>Formats supportés : GeoJSON, SHP, KML, GPX, CSV, Excel</p>
        <Button onClick={onCancel}>Annuler</Button>
      </div>
    );
  }

  // Step 2: Configuration
  if (step === 2) {
    return (
      <div style={styles.wizard}>
        <h2>⚙️ Configuration</h2>

        <label>Nom de la couche :</label>
        <input
          type="text"
          value={config.layerName}
          onChange={(e) => setConfig({ ...config, layerName: e.target.value })}
          style={styles.input}
        />

        <label>Style par défaut :</label>
        <ColorPicker
          value={config.style.color}
          onChange={(color) => setConfig({
            ...config,
            style: { ...config.style, color },
          })}
        />

        <p>{parsedData.metadata.featureCount} features détectées</p>

        <div style={styles.actions}>
          <Button onClick={onCancel} variant="secondary">Annuler</Button>
          <Button onClick={handleImport}>Importer</Button>
        </div>
      </div>
    );
  }

  // Step 3: Import en cours
  return (
    <div style={styles.wizard}>
      <h2>📥 Import en cours...</h2>
      <p>Veuillez patienter...</p>
    </div>
  );
};

const styles = {
  wizard: {
    padding: '24px',
  },
  fileInput: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '8px',
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};

export default FileImportWizard;
```

---

## ✅ Checklist Implémentation

### Phase 1 : Support GeoJSON (Rapide)
- [ ] Détection format GeoJSON
- [ ] Parser GeoJSON natif
- [ ] Validation structure
- [ ] Import dans GIS_WorkSpace

### Phase 2 : Support CSV (Important)
- [ ] Parser CSV avec PapaParse
- [ ] Détection auto colonnes lat/lon
- [ ] Détection colonne WKT
- [ ] UI configuration colonnes
- [ ] Conversion Point → WKT

### Phase 3 : Support Shapefile (Standard SIG)
- [ ] Intégration shpjs
- [ ] Support multi-fichiers (.shp + .dbf + .shx + .prj)
- [ ] Lecture .prj pour CRS
- [ ] Conversion en GeoJSON

### Phase 4 : Support KML/GPX
- [ ] Parser KML avec togeojson
- [ ] Parser GPX
- [ ] Support styles KML

### Phase 5 : Gestion Projections
- [ ] Intégration proj4
- [ ] Définitions CRS communes (4326, 3857, 2154)
- [ ] Détection auto CRS
- [ ] UI choix projection
- [ ] Reprojection vers WGS84

### Phase 6 : Support Excel
- [ ] Parser Excel avec xlsx
- [ ] Conversion en CSV
- [ ] Import via CSV parser

### Phase 7 : UI/UX
- [ ] Composant FileImportWizard
- [ ] Glisser-déposer
- [ ] Aperçu données
- [ ] Gestion erreurs
- [ ] Affichage warnings

### Phase 8 : Tests
- [ ] Tests unitaires parsers
- [ ] Tests projections
- [ ] Tests fichiers réels
- [ ] Documentation

---

## 📦 Installation Dépendances

```bash
npm install shpjs @tmcw/togeojson papaparse xlsx proj4
```

---

Cette spécification complète le système d'import du widget Smart GIS v3.0.
