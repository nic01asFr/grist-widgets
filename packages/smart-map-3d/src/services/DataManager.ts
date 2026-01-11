/**
 * DataManager - Gestionnaire de données et couches
 *
 * Gère l'import, le stockage, l'affichage et la persistance des données
 * géographiques sur la carte Mapbox.
 */

import type { Map as MapboxMap } from 'mapbox-gl';
import type { Layer, LayerStyle } from '../core/types';

// ============================================
// TYPES
// ============================================

export interface GeoFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJSON.Geometry;
  properties: Record<string, any>;
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'geojson' | 'grist' | 'url';
  data: GeoFeatureCollection;
  metadata: SourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface SourceMetadata {
  featureCount: number;
  geometryType: string;
  bounds?: [[number, number], [number, number]];
  fields: FieldInfo[];
  crs?: string;
}

export interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'geometry';
  sampleValues: any[];
  uniqueCount?: number;
  nullCount?: number;
}

export interface MapLayer {
  id: string;
  sourceId: string;
  name: string;
  visible: boolean;
  opacity: number;
  style: LayerStyleConfig;
  mapboxLayerIds: string[]; // IDs des couches Mapbox créées
}

export interface LayerStyleConfig {
  type: 'simple' | 'categorized' | 'graduated';
  // Simple style
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  pointRadius?: number;
  pointColor?: string;
  // Categorized/Graduated
  field?: string;
  categories?: CategoryStyle[];
  breaks?: GraduatedBreak[];
  colorRamp?: string[];
  // 3D
  extrusion?: boolean;
  extrusionField?: string;
  extrusionHeight?: number;
  extrusionBase?: number;
}

export interface CategoryStyle {
  value: any;
  color: string;
  label?: string;
}

export interface GraduatedBreak {
  min: number;
  max: number;
  color: string;
  label?: string;
}

export interface ImportOptions {
  name?: string;
  geometryColumn?: string;
  latColumn?: string;
  lngColumn?: string;
  crs?: string;
  delimiter?: string;
}

// ============================================
// DATA MANAGER
// ============================================

export class DataManager {
  private map: MapboxMap | null = null;
  private sources: Map<string, DataSource> = new Map();
  private layers: Map<string, MapLayer> = new Map();

  // Callbacks
  private onLayerChange?: (layers: MapLayer[]) => void;
  private onSourceChange?: (sources: DataSource[]) => void;
  private onFeatureClick?: (feature: GeoFeature, layer: MapLayer) => void;
  private onFeatureHover?: (feature: GeoFeature | null, layer: MapLayer | null) => void;

  // Default styles
  private defaultStyles: Record<string, LayerStyleConfig> = {
    Point: {
      type: 'simple',
      pointColor: '#4a9eff',
      pointRadius: 8,
      strokeColor: '#ffffff',
      strokeWidth: 2
    },
    LineString: {
      type: 'simple',
      strokeColor: '#4a9eff',
      strokeWidth: 3
    },
    Polygon: {
      type: 'simple',
      fillColor: '#4a9eff',
      strokeColor: '#2563eb',
      strokeWidth: 2
    }
  };

  // Color palettes
  private colorPalettes: Record<string, string[]> = {
    categorical: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
    sequential: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
    diverging: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4']
  };

  /**
   * Initialise avec la carte Mapbox
   */
  init(map: MapboxMap): void {
    this.map = map;
    this.setupMapEvents();
  }

  /**
   * Configure les événements de la carte
   */
  private setupMapEvents(): void {
    if (!this.map) return;

    // Click sur feature
    this.map.on('click', (e) => {
      const features = this.map!.queryRenderedFeatures(e.point);
      for (const feature of features) {
        const layer = this.findLayerByMapboxId(feature.layer.id);
        if (layer) {
          const geoFeature = this.convertMapboxFeature(feature);
          this.onFeatureClick?.(geoFeature, layer);
          break;
        }
      }
    });

    // Hover sur feature
    let hoveredFeatureId: string | number | null = null;
    this.map.on('mousemove', (e) => {
      const features = this.map!.queryRenderedFeatures(e.point);

      if (features.length > 0) {
        const feature = features[0];
        const layer = this.findLayerByMapboxId(feature.layer.id);

        if (layer && feature.id !== hoveredFeatureId) {
          hoveredFeatureId = feature.id ?? null;
          const geoFeature = this.convertMapboxFeature(feature);
          this.onFeatureHover?.(geoFeature, layer);
          this.map!.getCanvas().style.cursor = 'pointer';
        }
      } else if (hoveredFeatureId !== null) {
        hoveredFeatureId = null;
        this.onFeatureHover?.(null, null);
        this.map!.getCanvas().style.cursor = '';
      }
    });
  }

  // ============================================
  // IMPORT
  // ============================================

  /**
   * Import depuis un fichier
   */
  async importFile(file: File, options?: ImportOptions): Promise<DataSource> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const content = await this.readFile(file);

    switch (extension) {
      case 'geojson':
      case 'json':
        return this.importGeoJSON(content, options?.name || file.name);

      case 'csv':
        return this.importCSV(content, options);

      case 'kml':
        return this.importKML(content, options?.name || file.name);

      case 'gpx':
        return this.importGPX(content, options?.name || file.name);

      default:
        throw new Error(`Format non supporté: ${extension}`);
    }
  }

  /**
   * Import GeoJSON
   */
  importGeoJSON(content: string, name: string): DataSource {
    const data = JSON.parse(content);
    let featureCollection: GeoFeatureCollection;

    if (data.type === 'FeatureCollection') {
      featureCollection = data;
    } else if (data.type === 'Feature') {
      featureCollection = { type: 'FeatureCollection', features: [data] };
    } else if (data.type && data.coordinates) {
      // Geometry only
      featureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: data, properties: {} }]
      };
    } else {
      throw new Error('Format GeoJSON invalide');
    }

    return this.createSource(name, featureCollection);
  }

  /**
   * Import CSV avec colonnes géométriques
   */
  importCSV(content: string, options?: ImportOptions): DataSource {
    const delimiter = options?.delimiter || this.detectDelimiter(content);
    const lines = content.split('\n').filter(l => l.trim());

    if (lines.length < 2) {
      throw new Error('CSV vide ou invalide');
    }

    const headers = this.parseCSVLine(lines[0], delimiter);
    const features: GeoFeature[] = [];

    // Détecter les colonnes géométriques
    const geomCol = options?.geometryColumn || this.findGeometryColumn(headers);
    const latCol = options?.latColumn || this.findLatColumn(headers);
    const lngCol = options?.lngColumn || this.findLngColumn(headers);

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length !== headers.length) continue;

      const properties: Record<string, any> = {};
      headers.forEach((h, idx) => {
        properties[h] = this.parseValue(values[idx]);
      });

      let geometry: GeoJSON.Geometry | null = null;

      // WKT ou GeoJSON dans une colonne
      if (geomCol && properties[geomCol]) {
        geometry = this.parseGeometry(properties[geomCol]);
        delete properties[geomCol];
      }
      // Lat/Lng columns
      else if (latCol && lngCol && properties[latCol] && properties[lngCol]) {
        const lat = parseFloat(properties[latCol]);
        const lng = parseFloat(properties[lngCol]);
        if (!isNaN(lat) && !isNaN(lng)) {
          geometry = { type: 'Point', coordinates: [lng, lat] };
        }
      }

      if (geometry) {
        features.push({
          type: 'Feature',
          id: i,
          geometry,
          properties
        });
      }
    }

    if (features.length === 0) {
      throw new Error('Aucune géométrie valide trouvée dans le CSV');
    }

    const name = options?.name || 'Import CSV';
    return this.createSource(name, { type: 'FeatureCollection', features });
  }

  /**
   * Import depuis Grist (table avec colonne géométrie)
   */
  importFromGrist(
    records: Record<string, any>[],
    geometryColumn: string,
    name: string
  ): DataSource {
    const features: GeoFeature[] = [];

    for (const record of records) {
      const geomValue = record[geometryColumn];
      if (!geomValue) continue;

      const geometry = this.parseGeometry(geomValue);
      if (!geometry) continue;

      const properties: Record<string, any> = { ...record };
      delete properties[geometryColumn];

      features.push({
        type: 'Feature',
        id: record.id,
        geometry,
        properties
      });
    }

    return this.createSource(name, { type: 'FeatureCollection', features }, 'grist');
  }

  /**
   * Import KML
   */
  private importKML(content: string, name: string): DataSource {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const features: GeoFeature[] = [];

    // Parse Placemarks
    const placemarks = doc.getElementsByTagName('Placemark');
    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const feature = this.parseKMLPlacemark(pm, i);
      if (feature) features.push(feature);
    }

    return this.createSource(name, { type: 'FeatureCollection', features });
  }

  /**
   * Import GPX
   */
  private importGPX(content: string, name: string): DataSource {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const features: GeoFeature[] = [];

    // Waypoints
    const wpts = doc.getElementsByTagName('wpt');
    for (let i = 0; i < wpts.length; i++) {
      const wpt = wpts[i];
      const lat = parseFloat(wpt.getAttribute('lat') || '0');
      const lon = parseFloat(wpt.getAttribute('lon') || '0');
      const name = wpt.getElementsByTagName('name')[0]?.textContent || `Point ${i}`;

      features.push({
        type: 'Feature',
        id: `wpt-${i}`,
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: { name, type: 'waypoint' }
      });
    }

    // Tracks
    const trks = doc.getElementsByTagName('trk');
    for (let i = 0; i < trks.length; i++) {
      const trk = trks[i];
      const trkName = trk.getElementsByTagName('name')[0]?.textContent || `Track ${i}`;
      const trksegs = trk.getElementsByTagName('trkseg');

      for (let j = 0; j < trksegs.length; j++) {
        const coords: number[][] = [];
        const trkpts = trksegs[j].getElementsByTagName('trkpt');

        for (let k = 0; k < trkpts.length; k++) {
          const lat = parseFloat(trkpts[k].getAttribute('lat') || '0');
          const lon = parseFloat(trkpts[k].getAttribute('lon') || '0');
          coords.push([lon, lat]);
        }

        if (coords.length >= 2) {
          features.push({
            type: 'Feature',
            id: `trk-${i}-${j}`,
            geometry: { type: 'LineString', coordinates: coords },
            properties: { name: trkName, type: 'track' }
          });
        }
      }
    }

    return this.createSource(name, { type: 'FeatureCollection', features });
  }

  // ============================================
  // SOURCE MANAGEMENT
  // ============================================

  /**
   * Crée une source de données
   */
  private createSource(
    name: string,
    data: GeoFeatureCollection,
    type: 'geojson' | 'grist' | 'url' = 'geojson'
  ): DataSource {
    const id = this.generateId('src');
    const metadata = this.analyzeData(data);
    const now = new Date().toISOString();

    const source: DataSource = {
      id,
      name,
      type,
      data,
      metadata,
      createdAt: now,
      updatedAt: now
    };

    this.sources.set(id, source);
    this.onSourceChange?.(this.getSources());

    return source;
  }

  /**
   * Analyse les données pour extraire les métadonnées
   */
  private analyzeData(data: GeoFeatureCollection): SourceMetadata {
    const features = data.features;
    const geometryTypes = new Set<string>();
    const fieldMap = new Map<string, FieldInfo>();
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    for (const feature of features) {
      // Geometry type
      if (feature.geometry) {
        geometryTypes.add(feature.geometry.type);

        // Bounds
        const coords = this.extractCoordinates(feature.geometry);
        for (const [lng, lat] of coords) {
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        }
      }

      // Fields
      for (const [key, value] of Object.entries(feature.properties || {})) {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            name: key,
            type: this.detectValueType(value),
            sampleValues: [],
            uniqueCount: 0,
            nullCount: 0
          });
        }

        const field = fieldMap.get(key)!;
        if (value === null || value === undefined) {
          field.nullCount!++;
        } else if (field.sampleValues.length < 10) {
          field.sampleValues.push(value);
        }
      }
    }

    // Calculate unique counts
    for (const field of fieldMap.values()) {
      const uniqueValues = new Set(features.map(f => f.properties?.[field.name]));
      field.uniqueCount = uniqueValues.size;
    }

    return {
      featureCount: features.length,
      geometryType: [...geometryTypes].join(', ') || 'Unknown',
      bounds: minLng !== Infinity ? [[minLng, minLat], [maxLng, maxLat]] : undefined,
      fields: [...fieldMap.values()]
    };
  }

  /**
   * Supprime une source
   */
  removeSource(sourceId: string): void {
    // Supprimer les couches associées
    for (const layer of this.layers.values()) {
      if (layer.sourceId === sourceId) {
        this.removeLayer(layer.id);
      }
    }

    // Supprimer la source Mapbox
    if (this.map?.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }

    this.sources.delete(sourceId);
    this.onSourceChange?.(this.getSources());
  }

  // ============================================
  // LAYER MANAGEMENT
  // ============================================

  /**
   * Crée une couche à partir d'une source
   */
  createLayer(sourceId: string, options?: Partial<MapLayer>): MapLayer {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} non trouvée`);
    }

    const id = this.generateId('lyr');
    const geomType = this.getMainGeometryType(source.metadata.geometryType);
    const defaultStyle = this.defaultStyles[geomType] || this.defaultStyles.Point;

    const layer: MapLayer = {
      id,
      sourceId,
      name: options?.name || source.name,
      visible: options?.visible ?? true,
      opacity: options?.opacity ?? 1,
      style: options?.style || { ...defaultStyle },
      mapboxLayerIds: []
    };

    this.layers.set(id, layer);
    this.addLayerToMap(layer, source);
    this.onLayerChange?.(this.getLayers());

    return layer;
  }

  /**
   * Ajoute la couche à Mapbox
   */
  private addLayerToMap(layer: MapLayer, source: DataSource): void {
    if (!this.map) return;

    // Ajouter la source si pas déjà présente
    if (!this.map.getSource(source.id)) {
      this.map.addSource(source.id, {
        type: 'geojson',
        data: source.data,
        generateId: true
      });
    }

    const geomType = this.getMainGeometryType(source.metadata.geometryType);
    const style = layer.style;

    // Créer les couches Mapbox selon le type de géométrie
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      // Fill layer
      const fillId = `${layer.id}-fill`;
      this.map.addLayer({
        id: fillId,
        type: 'fill',
        source: source.id,
        paint: {
          'fill-color': this.getColorExpression(style, 'fillColor'),
          'fill-opacity': layer.opacity * 0.6
        },
        filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'MultiPolygon']]
      });
      layer.mapboxLayerIds.push(fillId);

      // Stroke layer
      const strokeId = `${layer.id}-stroke`;
      this.map.addLayer({
        id: strokeId,
        type: 'line',
        source: source.id,
        paint: {
          'line-color': style.strokeColor || '#2563eb',
          'line-width': style.strokeWidth || 2,
          'line-opacity': layer.opacity
        },
        filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'MultiPolygon']]
      });
      layer.mapboxLayerIds.push(strokeId);

      // 3D extrusion if enabled
      if (style.extrusion) {
        const extrusionId = `${layer.id}-extrusion`;
        this.map.addLayer({
          id: extrusionId,
          type: 'fill-extrusion',
          source: source.id,
          paint: {
            'fill-extrusion-color': this.getColorExpression(style, 'fillColor'),
            'fill-extrusion-height': style.extrusionField
              ? ['get', style.extrusionField]
              : style.extrusionHeight || 10,
            'fill-extrusion-base': style.extrusionBase || 0,
            'fill-extrusion-opacity': layer.opacity * 0.8
          },
          filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'MultiPolygon']]
        });
        layer.mapboxLayerIds.push(extrusionId);
      }
    }

    if (geomType === 'LineString' || geomType === 'MultiLineString') {
      const lineId = `${layer.id}-line`;
      this.map.addLayer({
        id: lineId,
        type: 'line',
        source: source.id,
        paint: {
          'line-color': this.getColorExpression(style, 'strokeColor'),
          'line-width': style.strokeWidth || 3,
          'line-opacity': layer.opacity
        },
        filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'MultiLineString']]
      });
      layer.mapboxLayerIds.push(lineId);
    }

    if (geomType === 'Point' || geomType === 'MultiPoint') {
      const pointId = `${layer.id}-point`;
      this.map.addLayer({
        id: pointId,
        type: 'circle',
        source: source.id,
        paint: {
          'circle-color': this.getColorExpression(style, 'pointColor'),
          'circle-radius': style.pointRadius || 8,
          'circle-stroke-color': style.strokeColor || '#ffffff',
          'circle-stroke-width': style.strokeWidth || 2,
          'circle-opacity': layer.opacity
        },
        filter: ['any', ['==', '$type', 'Point'], ['==', '$type', 'MultiPoint']]
      });
      layer.mapboxLayerIds.push(pointId);
    }
  }

  /**
   * Génère l'expression de couleur pour le style
   */
  private getColorExpression(style: LayerStyleConfig, property: string): any {
    const defaultColor = (style as any)[property] || '#4a9eff';

    if (style.type === 'simple') {
      return defaultColor;
    }

    if (style.type === 'categorized' && style.field && style.categories) {
      const expr: any[] = ['match', ['get', style.field]];
      for (const cat of style.categories) {
        expr.push(cat.value, cat.color);
      }
      expr.push(defaultColor); // fallback
      return expr;
    }

    if (style.type === 'graduated' && style.field && style.breaks) {
      const expr: any[] = ['step', ['get', style.field]];
      expr.push(style.breaks[0]?.color || defaultColor);
      for (const brk of style.breaks) {
        expr.push(brk.max, brk.color);
      }
      return expr;
    }

    return defaultColor;
  }

  /**
   * Met à jour la visibilité d'une couche
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer || !this.map) return;

    layer.visible = visible;
    const visibility = visible ? 'visible' : 'none';

    for (const mapboxId of layer.mapboxLayerIds) {
      if (this.map.getLayer(mapboxId)) {
        this.map.setLayoutProperty(mapboxId, 'visibility', visibility);
      }
    }

    this.onLayerChange?.(this.getLayers());
  }

  /**
   * Met à jour l'opacité d'une couche
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layers.get(layerId);
    if (!layer || !this.map) return;

    layer.opacity = Math.max(0, Math.min(1, opacity));

    for (const mapboxId of layer.mapboxLayerIds) {
      if (!this.map.getLayer(mapboxId)) continue;

      const layerType = this.map.getLayer(mapboxId)?.type;
      switch (layerType) {
        case 'fill':
          this.map.setPaintProperty(mapboxId, 'fill-opacity', layer.opacity * 0.6);
          break;
        case 'line':
          this.map.setPaintProperty(mapboxId, 'line-opacity', layer.opacity);
          break;
        case 'circle':
          this.map.setPaintProperty(mapboxId, 'circle-opacity', layer.opacity);
          break;
        case 'fill-extrusion':
          this.map.setPaintProperty(mapboxId, 'fill-extrusion-opacity', layer.opacity * 0.8);
          break;
      }
    }

    this.onLayerChange?.(this.getLayers());
  }

  /**
   * Met à jour le style d'une couche
   */
  updateLayerStyle(layerId: string, style: Partial<LayerStyleConfig>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.style = { ...layer.style, ...style };

    // Recréer la couche avec le nouveau style
    const source = this.sources.get(layer.sourceId);
    if (source) {
      this.removeMapboxLayers(layer);
      layer.mapboxLayerIds = [];
      this.addLayerToMap(layer, source);
    }

    this.onLayerChange?.(this.getLayers());
  }

  /**
   * Supprime une couche
   */
  removeLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    this.removeMapboxLayers(layer);
    this.layers.delete(layerId);
    this.onLayerChange?.(this.getLayers());
  }

  /**
   * Supprime les couches Mapbox
   */
  private removeMapboxLayers(layer: MapLayer): void {
    if (!this.map) return;

    for (const mapboxId of layer.mapboxLayerIds) {
      if (this.map.getLayer(mapboxId)) {
        this.map.removeLayer(mapboxId);
      }
    }
  }

  /**
   * Zoom sur une couche
   */
  zoomToLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer || !this.map) return;

    const source = this.sources.get(layer.sourceId);
    if (!source?.metadata.bounds) return;

    const [[minLng, minLat], [maxLng, maxLat]] = source.metadata.bounds;
    this.map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
      padding: 50,
      maxZoom: 18
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const d of delimiters) {
      const count = (firstLine.match(new RegExp(d, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private parseValue(value: string): any {
    if (value === '' || value === 'null' || value === 'NULL') return null;

    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    const num = Number(value);
    if (!isNaN(num)) return num;

    return value;
  }

  private findGeometryColumn(headers: string[]): string | undefined {
    const patterns = [/geom/i, /geometry/i, /wkt/i, /shape/i, /the_geom/i];
    return headers.find(h => patterns.some(p => p.test(h)));
  }

  private findLatColumn(headers: string[]): string | undefined {
    const patterns = [/^lat$/i, /latitude/i, /^y$/i];
    return headers.find(h => patterns.some(p => p.test(h)));
  }

  private findLngColumn(headers: string[]): string | undefined {
    const patterns = [/^lng$/i, /^lon$/i, /longitude/i, /^x$/i];
    return headers.find(h => patterns.some(p => p.test(h)));
  }

  private parseGeometry(value: any): GeoJSON.Geometry | null {
    if (!value) return null;

    // Already a geometry object
    if (typeof value === 'object' && value.type && value.coordinates) {
      return value as GeoJSON.Geometry;
    }

    // WKT string
    if (typeof value === 'string') {
      return this.parseWKT(value);
    }

    // JSON string
    if (typeof value === 'string' && value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.type && parsed.coordinates) {
          return parsed as GeoJSON.Geometry;
        }
      } catch (e) {}
    }

    return null;
  }

  private parseWKT(wkt: string): GeoJSON.Geometry | null {
    const cleaned = wkt.trim().toUpperCase();

    // Point
    const pointMatch = cleaned.match(/^POINT\s*\(\s*([^\)]+)\s*\)$/i);
    if (pointMatch) {
      const coords = pointMatch[1].split(/\s+/).map(Number);
      return { type: 'Point', coordinates: coords };
    }

    // LineString
    const lineMatch = cleaned.match(/^LINESTRING\s*\(\s*([^\)]+)\s*\)$/i);
    if (lineMatch) {
      const coords = lineMatch[1].split(',').map(pair => pair.trim().split(/\s+/).map(Number));
      return { type: 'LineString', coordinates: coords };
    }

    // Polygon
    const polyMatch = cleaned.match(/^POLYGON\s*\(\s*\(([^\)]+)\)\s*\)$/i);
    if (polyMatch) {
      const coords = polyMatch[1].split(',').map(pair => pair.trim().split(/\s+/).map(Number));
      return { type: 'Polygon', coordinates: [coords] };
    }

    // MultiPolygon (simplified)
    if (cleaned.startsWith('MULTIPOLYGON')) {
      // Basic support - extract all coordinate sets
      const coordSets = cleaned.match(/\(\([^\)]+\)\)/g);
      if (coordSets) {
        const polygons = coordSets.map(set => {
          const inner = set.replace(/^\(\(|\)\)$/g, '');
          return [inner.split(',').map(pair => pair.trim().split(/\s+/).map(Number))];
        });
        return { type: 'MultiPolygon', coordinates: polygons };
      }
    }

    return null;
  }

  private parseKMLPlacemark(pm: Element, index: number): GeoFeature | null {
    const name = pm.getElementsByTagName('name')[0]?.textContent || `Feature ${index}`;
    const description = pm.getElementsByTagName('description')[0]?.textContent || '';

    // Point
    const point = pm.getElementsByTagName('Point')[0];
    if (point) {
      const coordsStr = point.getElementsByTagName('coordinates')[0]?.textContent;
      if (coordsStr) {
        const [lng, lat] = coordsStr.trim().split(',').map(Number);
        return {
          type: 'Feature',
          id: index,
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { name, description }
        };
      }
    }

    // LineString
    const lineString = pm.getElementsByTagName('LineString')[0];
    if (lineString) {
      const coordsStr = lineString.getElementsByTagName('coordinates')[0]?.textContent;
      if (coordsStr) {
        const coords = coordsStr.trim().split(/\s+/).map(c => {
          const [lng, lat] = c.split(',').map(Number);
          return [lng, lat];
        });
        return {
          type: 'Feature',
          id: index,
          geometry: { type: 'LineString', coordinates: coords },
          properties: { name, description }
        };
      }
    }

    // Polygon
    const polygon = pm.getElementsByTagName('Polygon')[0];
    if (polygon) {
      const outerRing = polygon.getElementsByTagName('outerBoundaryIs')[0];
      const coordsStr = outerRing?.getElementsByTagName('coordinates')[0]?.textContent;
      if (coordsStr) {
        const coords = coordsStr.trim().split(/\s+/).map(c => {
          const [lng, lat] = c.split(',').map(Number);
          return [lng, lat];
        });
        return {
          type: 'Feature',
          id: index,
          geometry: { type: 'Polygon', coordinates: [coords] },
          properties: { name, description }
        };
      }
    }

    return null;
  }

  private extractCoordinates(geometry: GeoJSON.Geometry): number[][] {
    const coords: number[][] = [];

    const extract = (c: any) => {
      if (Array.isArray(c) && typeof c[0] === 'number') {
        coords.push(c as number[]);
      } else if (Array.isArray(c)) {
        c.forEach(extract);
      }
    };

    extract((geometry as any).coordinates);
    return coords;
  }

  private detectValueType(value: any): 'string' | 'number' | 'boolean' | 'date' | 'geometry' {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object' && value.type && value.coordinates) return 'geometry';

    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    if (typeof value === 'string' && datePattern.test(value)) return 'date';

    return 'string';
  }

  private getMainGeometryType(types: string): string {
    if (types.includes('Polygon')) return 'Polygon';
    if (types.includes('Line')) return 'LineString';
    return 'Point';
  }

  private findLayerByMapboxId(mapboxId: string): MapLayer | undefined {
    for (const layer of this.layers.values()) {
      if (layer.mapboxLayerIds.includes(mapboxId)) {
        return layer;
      }
    }
    return undefined;
  }

  private convertMapboxFeature(feature: any): GeoFeature {
    return {
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties: feature.properties
    };
  }

  // ============================================
  // CATEGORIZED/GRADUATED STYLE HELPERS
  // ============================================

  /**
   * Crée un style catégorisé automatiquement
   */
  createCategorizedStyle(
    layerId: string,
    field: string,
    colorPalette?: string[]
  ): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const source = this.sources.get(layer.sourceId);
    if (!source) return;

    const fieldInfo = source.metadata.fields.find(f => f.name === field);
    if (!fieldInfo) return;

    const palette = colorPalette || this.colorPalettes.categorical;
    const uniqueValues = [...new Set(source.data.features.map(f => f.properties?.[field]))];

    const categories: CategoryStyle[] = uniqueValues.slice(0, 10).map((value, i) => ({
      value,
      color: palette[i % palette.length],
      label: String(value)
    }));

    this.updateLayerStyle(layerId, {
      type: 'categorized',
      field,
      categories
    });
  }

  /**
   * Crée un style gradué automatiquement
   */
  createGraduatedStyle(
    layerId: string,
    field: string,
    numBreaks: number = 5,
    colorPalette?: string[]
  ): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const source = this.sources.get(layer.sourceId);
    if (!source) return;

    const values = source.data.features
      .map(f => f.properties?.[field])
      .filter(v => typeof v === 'number')
      .sort((a, b) => a - b);

    if (values.length === 0) return;

    const palette = colorPalette || this.colorPalettes.sequential;
    const min = values[0];
    const max = values[values.length - 1];
    const step = (max - min) / numBreaks;

    const breaks: GraduatedBreak[] = [];
    for (let i = 0; i < numBreaks; i++) {
      breaks.push({
        min: min + i * step,
        max: min + (i + 1) * step,
        color: palette[Math.floor(i * (palette.length - 1) / (numBreaks - 1))],
        label: `${(min + i * step).toFixed(1)} - ${(min + (i + 1) * step).toFixed(1)}`
      });
    }

    this.updateLayerStyle(layerId, {
      type: 'graduated',
      field,
      breaks
    });
  }

  // ============================================
  // GETTERS & SETTERS
  // ============================================

  getSources(): DataSource[] {
    return [...this.sources.values()];
  }

  getSource(id: string): DataSource | undefined {
    return this.sources.get(id);
  }

  getLayers(): MapLayer[] {
    return [...this.layers.values()];
  }

  getLayer(id: string): MapLayer | undefined {
    return this.layers.get(id);
  }

  setOnLayerChange(callback: (layers: MapLayer[]) => void): void {
    this.onLayerChange = callback;
  }

  setOnSourceChange(callback: (sources: DataSource[]) => void): void {
    this.onSourceChange = callback;
  }

  setOnFeatureClick(callback: (feature: GeoFeature, layer: MapLayer) => void): void {
    this.onFeatureClick = callback;
  }

  setOnFeatureHover(callback: (feature: GeoFeature | null, layer: MapLayer | null) => void): void {
    this.onFeatureHover = callback;
  }
}

export default DataManager;
