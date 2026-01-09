/**
 * LayerManager - Gestion des couches géographiques
 *
 * Responsabilités :
 * - Ajout/suppression de couches
 * - Gestion des styles multi-styles
 * - Symbolisation (categorized, graduated)
 * - Rendu sur la carte Mapbox
 */

import mapboxgl from 'mapbox-gl';
import {
  Layer,
  LayerStyle,
  LayerStyleConfig,
  GeometryType,
  SymbolizationConfig,
  COLOR_PALETTES
} from '../core/types';

export interface LayerManagerOptions {
  map: mapboxgl.Map;
}

export class LayerManager {
  private map: mapboxgl.Map;
  private layers: Map<string, Layer> = new Map();
  private modelLayers: Map<string, string[]> = new Map();

  constructor(options: LayerManagerOptions) {
    this.map = options.map;
  }

  // ============================================
  // GESTION DES COUCHES
  // ============================================

  addLayer(layer: Layer): void {
    // Migrer vers multi-styles si nécessaire
    this.migrateToMultiStyle(layer);

    // Stocker la couche
    this.layers.set(layer.id, layer);

    // Ajouter la source GeoJSON
    const sourceOptions: mapboxgl.GeoJSONSourceSpecification = {
      type: 'geojson',
      data: layer.geojson
    };

    // Supprimer l'ancien layer/source si existe
    this.removeLayerFromMap(layer.id);

    this.map.addSource(layer.id, sourceOptions);

    // Ajouter le layer selon le type de géométrie
    this.renderLayer(layer);
  }

  removeLayer(layerId: string): void {
    this.removeLayerFromMap(layerId);
    this.layers.delete(layerId);
  }

  private removeLayerFromMap(layerId: string): void {
    // Supprimer les layers Mapbox
    const suffixes = ['', '-outline', '-extrusion', '-cluster', '-cluster-count', '-heatmap'];
    suffixes.forEach(suffix => {
      const lid = layerId + suffix;
      if (this.map.getLayer(lid)) {
        this.map.removeLayer(lid);
      }
    });

    // Supprimer les layers 3D
    const sublayerIds = this.modelLayers.get(layerId) || [];
    sublayerIds.forEach(sublayerId => {
      if (this.map.getLayer(sublayerId)) {
        this.map.removeLayer(sublayerId);
      }
      const sourceId = `${sublayerId}-source`;
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    });
    this.modelLayers.delete(layerId);

    // Supprimer la source principale
    if (this.map.getSource(layerId)) {
      this.map.removeSource(layerId);
    }
  }

  getLayer(layerId: string): Layer | undefined {
    return this.layers.get(layerId);
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  updateLayerData(layerId: string, geojson: GeoJSON.FeatureCollection): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.geojson = geojson;

    const source = this.map.getSource(layerId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    }
  }

  // ============================================
  // MULTI-STYLES
  // ============================================

  private migrateToMultiStyle(layer: Layer): void {
    if (layer.styles && layer.styles.length > 0) {
      // Déjà migré, synchroniser la référence
      this.syncLayerStyleReference(layer);
      return;
    }

    // Créer un style par défaut
    const defaultStyle: LayerStyle = {
      id: 'default',
      name: 'Style 1',
      icon: '🎨',
      config: layer.style || this.getDefaultStyleConfig(layer)
    };

    layer.styles = [defaultStyle];
    layer.activeStyleId = 'default';
    this.syncLayerStyleReference(layer);
  }

  private syncLayerStyleReference(layer: Layer): void {
    const activeStyle = layer.styles.find(s => s.id === layer.activeStyleId);
    if (activeStyle) {
      layer.style = activeStyle.config;
    }
  }

  private getDefaultStyleConfig(layer: Layer): LayerStyleConfig {
    return {
      mode: 'mapbox',
      mapbox: {
        type: 'circle',
        color: layer.color || '#3b82f6',
        radius: 8,
        strokeWidth: 2,
        strokeColor: '#ffffff',
        opacity: 1,
        emissiveEnabled: false,
        emissiveStrength: 0.5
      },
      common: {
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0
      }
    };
  }

  getActiveStyle(layer: Layer): LayerStyleConfig | undefined {
    const style = layer.styles?.find(s => s.id === layer.activeStyleId);
    return style?.config;
  }

  switchStyle(layerId: string, styleId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.activeStyleId = styleId;
    this.syncLayerStyleReference(layer);
    this.renderLayer(layer);
  }

  addStyle(layerId: string, name: string, icon: string = '🎨'): LayerStyle {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error('Layer not found');

    const id = `style-${Date.now()}`;
    const newStyle: LayerStyle = {
      id,
      name,
      icon,
      config: { ...this.getDefaultStyleConfig(layer) }
    };

    layer.styles.push(newStyle);
    return newStyle;
  }

  duplicateStyle(layerId: string, styleId: string): LayerStyle {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error('Layer not found');

    const sourceStyle = layer.styles.find(s => s.id === styleId);
    if (!sourceStyle) throw new Error('Style not found');

    const id = `style-${Date.now()}`;
    const newStyle: LayerStyle = {
      id,
      name: `${sourceStyle.name} (copie)`,
      icon: sourceStyle.icon,
      config: JSON.parse(JSON.stringify(sourceStyle.config))
    };

    layer.styles.push(newStyle);
    return newStyle;
  }

  deleteStyle(layerId: string, styleId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer || layer.styles.length <= 1) return false;

    const idx = layer.styles.findIndex(s => s.id === styleId);
    if (idx === -1) return false;

    layer.styles.splice(idx, 1);

    // Si le style actif a été supprimé, basculer sur le premier
    if (layer.activeStyleId === styleId) {
      layer.activeStyleId = layer.styles[0].id;
      this.syncLayerStyleReference(layer);
    }

    return true;
  }

  // ============================================
  // RENDU DES COUCHES
  // ============================================

  renderLayer(layer: Layer): void {
    // Supprimer les anciens layers
    this.removeLayerFromMap(layer.id);

    // Ré-ajouter la source
    if (!this.map.getSource(layer.id)) {
      this.map.addSource(layer.id, {
        type: 'geojson',
        data: layer.geojson
      });
    }

    // Rendre selon le type de géométrie
    switch (layer.geometryType) {
      case 'Point':
      case 'MultiPoint':
        this.renderPointLayer(layer);
        break;
      case 'LineString':
      case 'MultiLineString':
        this.renderLineLayer(layer);
        break;
      case 'Polygon':
      case 'MultiPolygon':
        this.renderPolygonLayer(layer);
        break;
    }
  }

  private renderPointLayer(layer: Layer): void {
    const style = this.getActiveStyle(layer);
    if (!style) return;

    switch (style.mode) {
      case 'mapbox':
        this.renderMapboxPoints(layer, style);
        break;
      case 'library':
      case 'custom':
        this.render3DPoints(layer, style);
        break;
    }
  }

  private renderMapboxPoints(layer: Layer, style: LayerStyleConfig): void {
    const mapbox = style.mapbox!;

    if (mapbox.type === 'circle') {
      // Construire l'expression de couleur (symbolisation)
      const colorExpr = this.buildColorExpression(layer, mapbox.color);

      this.map.addLayer({
        id: layer.id,
        type: 'circle',
        source: layer.id,
        paint: {
          'circle-radius': mapbox.radius,
          'circle-color': colorExpr,
          'circle-stroke-width': mapbox.strokeWidth,
          'circle-stroke-color': mapbox.strokeColor,
          'circle-opacity': mapbox.opacity,
          ...(mapbox.emissiveEnabled && {
            'circle-emissive-strength': mapbox.emissiveStrength
          })
        }
      });
    } else if (mapbox.type === 'symbol') {
      this.map.addLayer({
        id: layer.id,
        type: 'symbol',
        source: layer.id,
        layout: {
          'icon-image': 'marker',
          'icon-size': mapbox.radius / 8,
          'icon-allow-overlap': true
        },
        paint: {
          'icon-opacity': mapbox.opacity
        }
      });
    }
  }

  private render3DPoints(layer: Layer, style: LayerStyleConfig): void {
    // Placeholder pour le rendu 3D avec modèles GLTF
    // Cette partie nécessite le ModelManager
    console.log(`🎯 Rendu 3D pour couche "${layer.name}" - mode: ${style.mode}`);

    // Fallback vers cercles si pas de modèle
    this.map.addLayer({
      id: layer.id,
      type: 'circle',
      source: layer.id,
      paint: {
        'circle-radius': 10,
        'circle-color': style.common?.color || layer.color || '#888888',
        'circle-stroke-width': 3,
        'circle-stroke-color': style.mode === 'library' ? '#FFD700' : '#00FF00',
        'circle-opacity': style.common?.opacity || 0.8
      }
    });
  }

  private renderLineLayer(layer: Layer): void {
    const style = this.getActiveStyle(layer);
    const color = style?.common?.color || layer.color;

    this.map.addLayer({
      id: layer.id,
      type: 'line',
      source: layer.id,
      paint: {
        'line-color': color,
        'line-width': 4,
        'line-opacity': style?.common?.opacity || 1
      }
    });
  }

  private renderPolygonLayer(layer: Layer): void {
    const style = this.getActiveStyle(layer);
    const color = style?.common?.color || layer.color;
    const colorExpr = this.buildColorExpression(layer, color);

    // Fill
    this.map.addLayer({
      id: layer.id,
      type: 'fill',
      source: layer.id,
      paint: {
        'fill-color': colorExpr,
        'fill-opacity': (style?.common?.opacity || 0.5) * 0.5
      }
    });

    // Outline
    this.map.addLayer({
      id: layer.id + '-outline',
      type: 'line',
      source: layer.id,
      paint: {
        'line-color': colorExpr,
        'line-width': 2
      }
    });
  }

  // ============================================
  // SYMBOLISATION
  // ============================================

  private buildColorExpression(layer: Layer, defaultColor: string): any {
    const sym = layer.symbolization?.color;
    if (!sym || sym.mode === 'single' || !sym.field) {
      return defaultColor;
    }

    if (sym.mode === 'categorized') {
      return this.buildCategorizedExpression(layer, sym, defaultColor);
    } else if (sym.mode === 'graduated') {
      return this.buildGraduatedExpression(layer, sym, defaultColor);
    }

    return defaultColor;
  }

  private buildCategorizedExpression(layer: Layer, sym: any, defaultColor: string): any {
    const field = sym.field;
    const palette = COLOR_PALETTES.find(p => p.id === sym.palette) || COLOR_PALETTES[0];

    // Collecter les valeurs uniques
    const uniqueValues = new Set<string>();
    layer.geojson.features.forEach(f => {
      const val = f.properties?.[field];
      if (val !== undefined && val !== null) {
        uniqueValues.add(String(val));
      }
    });

    // Construire l'expression match
    const matchExpr: any[] = ['match', ['get', field]];
    const values = Array.from(uniqueValues);

    values.forEach((val, idx) => {
      const color = palette.colors[idx % palette.colors.length];
      matchExpr.push(val, color);
    });

    matchExpr.push(defaultColor); // Valeur par défaut

    return matchExpr;
  }

  private buildGraduatedExpression(layer: Layer, sym: any, defaultColor: string): any {
    const field = sym.field;
    const palette = COLOR_PALETTES.find(p => p.id === sym.palette) || COLOR_PALETTES[4]; // Viridis
    const colors = palette.colors;

    // Calculer min/max
    let min = Infinity;
    let max = -Infinity;

    layer.geojson.features.forEach(f => {
      const val = f.properties?.[field];
      if (typeof val === 'number' && !isNaN(val)) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
    });

    if (min === Infinity || max === -Infinity || min === max) {
      return defaultColor;
    }

    // Construire l'expression interpolate
    const interpolateExpr: any[] = ['interpolate', ['linear'], ['get', field]];

    colors.forEach((color, idx) => {
      const t = idx / (colors.length - 1);
      const value = min + t * (max - min);
      interpolateExpr.push(value, color);
    });

    return interpolateExpr;
  }

  // ============================================
  // VISIBILITÉ
  // ============================================

  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.visible = visible;
    const visibility = visible ? 'visible' : 'none';

    // Mettre à jour tous les layers Mapbox associés
    const suffixes = ['', '-outline', '-extrusion', '-cluster', '-cluster-count'];
    suffixes.forEach(suffix => {
      const lid = layerId + suffix;
      if (this.map.getLayer(lid)) {
        this.map.setLayoutProperty(lid, 'visibility', visibility);
      }
    });

    // Layers 3D
    const sublayerIds = this.modelLayers.get(layerId) || [];
    sublayerIds.forEach(sublayerId => {
      if (this.map.getLayer(sublayerId)) {
        this.map.setLayoutProperty(sublayerId, 'visibility', visibility);
      }
    });
  }

  toggleLayerVisibility(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      this.setLayerVisibility(layerId, !layer.visible);
    }
  }

  // ============================================
  // ZOOM ET BOUNDS
  // ============================================

  zoomToLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer?.geojson?.features?.length) return;

    const bounds = new mapboxgl.LngLatBounds();

    layer.geojson.features.forEach(f => {
      if (!f.geometry) return;

      if (f.geometry.type === 'Point') {
        bounds.extend(f.geometry.coordinates as [number, number]);
      } else if ((f.geometry as any).coordinates) {
        const coords = (f.geometry as any).coordinates.flat(3);
        for (let i = 0; i < coords.length; i += 2) {
          if (typeof coords[i] === 'number' && typeof coords[i + 1] === 'number') {
            bounds.extend([coords[i], coords[i + 1]]);
          }
        }
      }
    });

    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds, { padding: 50, maxZoom: 17 });
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  getLayerProperties(layerId: string): string[] {
    const layer = this.layers.get(layerId);
    if (!layer?.geojson?.features?.length) return [];

    const props = new Set<string>();
    layer.geojson.features.forEach(f => {
      if (f.properties) {
        Object.keys(f.properties).forEach(k => props.add(k));
      }
    });

    return Array.from(props);
  }

  getNumericProperties(layerId: string): string[] {
    const layer = this.layers.get(layerId);
    if (!layer?.geojson?.features?.length) return [];

    const numericProps = new Set<string>();

    layer.geojson.features.forEach(f => {
      if (f.properties) {
        Object.entries(f.properties).forEach(([key, value]) => {
          if (typeof value === 'number') {
            numericProps.add(key);
          }
        });
      }
    });

    return Array.from(numericProps);
  }

  updateMap(map: mapboxgl.Map): void {
    this.map = map;
  }
}

export default LayerManager;
