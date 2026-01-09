/**
 * GristIntegration - Intégration avec Grist
 *
 * Responsabilités :
 * - Initialisation de l'API Grist
 * - Chargement/sauvegarde des modèles 3D
 * - Chargement/sauvegarde des couches
 * - Gestion des features
 */

import { Layer, Model3D, GRIST_TABLE_SCHEMAS } from '../core/types';

// Types Grist (simplifié)
declare const grist: any;

export interface GristConfig {
  ready: boolean;
  documentId?: string;
}

export class GristIntegration {
  private config: GristConfig = { ready: false };
  private models: Model3D[] = [];
  private initCallbacks: (() => void)[] = [];

  constructor() {
    this.initializeGrist();
  }

  private async initializeGrist(): Promise<void> {
    if (typeof grist === 'undefined') {
      console.log('⚠️ Grist API non disponible - mode standalone');
      return;
    }

    try {
      grist.ready({
        requiredAccess: 'full',
        columns: []
      });

      // Attendre que Grist soit prêt
      await new Promise<void>((resolve) => {
        grist.onRecords((records: any) => {
          this.config.ready = true;
          resolve();
        });

        // Timeout si Grist ne répond pas
        setTimeout(() => {
          if (!this.config.ready) {
            console.warn('⚠️ Timeout Grist - utilisation mode standalone');
            resolve();
          }
        }, 3000);
      });

      if (this.config.ready) {
        console.log('✅ Grist connecté');
        await this.initializeTables();
        await this.loadModels();

        // Notifier les callbacks
        this.initCallbacks.forEach(cb => cb());
      }
    } catch (error) {
      console.error('Erreur initialisation Grist:', error);
    }
  }

  // ============================================
  // TABLES
  // ============================================

  private async initializeTables(): Promise<void> {
    try {
      const tables = await grist.docApi.listTables();
      const tableNames = tables.map((t: any) => t.id);

      // Créer les tables manquantes
      for (const [tableName, schema] of Object.entries(GRIST_TABLE_SCHEMAS)) {
        if (!tableNames.includes(tableName)) {
          console.log(`📋 Création table ${tableName}...`);
          await this.createTable(tableName, schema);
        }
      }
    } catch (error) {
      console.error('Erreur initialisation tables:', error);
    }
  }

  private async createTable(name: string, schema: Record<string, string>): Promise<void> {
    const columns = Object.entries(schema).map(([colId, type]) => ({
      id: colId,
      fields: { type }
    }));

    await grist.docApi.applyUserActions([
      ['AddTable', name, columns]
    ]);
  }

  // ============================================
  // MODÈLES 3D
  // ============================================

  async loadModels(): Promise<Model3D[]> {
    if (!this.config.ready) return [];

    try {
      const data = await grist.docApi.fetchTable('Models_3D');
      const ids = data.id || [];

      this.models = ids.map((id: number, idx: number) => ({
        id,
        name: data.Name?.[idx] || 'Sans nom',
        category: data.Category?.[idx] || 'autre',
        url: data.URL?.[idx] || '',
        previewUrl: data.PreviewURL?.[idx] || '',
        scale: Number(data.Scale?.[idx]) || 1,
        rotationX: Number(data.RotationX?.[idx]) || 0,
        rotationY: Number(data.RotationY?.[idx]) || 0,
        rotationZ: Number(data.RotationZ?.[idx]) || 0,
        offsetX: Number(data.OffsetX?.[idx]) || 0,
        offsetY: Number(data.OffsetY?.[idx]) || 0,
        offsetZ: Number(data.OffsetZ?.[idx]) || 0,
        tags: data.Tags?.[idx]?.split(',').map((t: string) => t.trim()) || []
      }));

      console.log(`📦 ${this.models.length} modèles 3D chargés depuis Grist`);
      return this.models;
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
      return [];
    }
  }

  getModel(modelId: number): Model3D | undefined {
    return this.models.find(m => m.id === modelId);
  }

  getModelsByCategory(category: string): Model3D[] {
    return this.models.filter(m => m.category === category);
  }

  getAllModels(): Model3D[] {
    return this.models;
  }

  // ============================================
  // COUCHES
  // ============================================

  async loadLayers(): Promise<Partial<Layer>[]> {
    if (!this.config.ready) return [];

    try {
      const data = await grist.docApi.fetchTable('Maquette_Layers');
      const ids = data.id || [];

      const layers: Partial<Layer>[] = [];

      for (let idx = 0; idx < ids.length; idx++) {
        const gristId = ids[idx];
        const styleJSON = data.StyleJSON?.[idx];

        let styles = [];
        let activeStyleId = 'default';

        if (styleJSON) {
          try {
            const parsed = JSON.parse(styleJSON);
            if (parsed.styles) {
              styles = parsed.styles;
              activeStyleId = parsed.activeStyleId || 'default';
            }
          } catch (e) {
            console.warn('Erreur parsing StyleJSON:', e);
          }
        }

        const layer: Partial<Layer> = {
          id: `layer-${gristId}`,
          name: data.Name?.[idx] || 'Sans nom',
          color: data.Color?.[idx] || '#3b82f6',
          visible: data.Visible?.[idx] !== false,
          geometryType: data.GeomType?.[idx] || 'Point',
          source: data.Source?.[idx] || 'import',
          gristId,
          styles,
          activeStyleId
        };

        // Charger les features
        layer.geojson = await this.loadFeatures(gristId);
        layers.push(layer);
      }

      console.log(`📂 ${layers.length} couches chargées depuis Grist`);
      return layers;
    } catch (error) {
      console.error('Erreur chargement couches:', error);
      return [];
    }
  }

  async saveLayer(layer: Layer): Promise<void> {
    if (!this.config.ready) {
      throw new Error('Grist non connecté');
    }

    try {
      // Préparer le style JSON
      const styleData = {
        activeStyleId: layer.activeStyleId,
        styles: layer.styles
      };

      const activeStyle = layer.styles.find(s => s.id === layer.activeStyleId);

      const layerData = {
        Name: layer.name,
        Color: layer.color,
        Visible: layer.visible !== false,
        GeomType: layer.geometryType || 'Point',
        Source: layer.source || 'import',
        StyleMode: activeStyle?.config?.mode || 'mapbox',
        StyleJSON: JSON.stringify(styleData),
        ModelId: activeStyle?.config?.library?.modelId || null,
        CustomUrl: activeStyle?.config?.custom?.url || null,
        Scale: Number(activeStyle?.config?.common?.scale) || 1,
        RotationX: Number(activeStyle?.config?.common?.rotationX) || 0,
        RotationY: Number(activeStyle?.config?.common?.rotationY) || 0,
        RotationZ: Number(activeStyle?.config?.common?.rotationZ) || 0,
        OffsetX: Number(activeStyle?.config?.common?.offsetX) || 0,
        OffsetY: Number(activeStyle?.config?.common?.offsetY) || 0,
        OffsetZ: Number(activeStyle?.config?.common?.offsetZ) || 0,
        FeatureCount: layer.geojson?.features?.length || 0
      };

      let gristId = layer.gristId;

      if (gristId) {
        // Mise à jour
        await grist.docApi.applyUserActions([
          ['UpdateRecord', 'Maquette_Layers', gristId, layerData]
        ]);
      } else {
        // Création
        const result = await grist.docApi.applyUserActions([
          ['AddRecord', 'Maquette_Layers', null, layerData]
        ]);
        gristId = result.retValues[0];
        layer.gristId = gristId;
      }

      // Sauvegarder les features
      await this.saveFeatures(layer, gristId);

      console.log(`✅ Couche "${layer.name}" sauvegardée (ID: ${gristId})`);
    } catch (error) {
      console.error('Erreur sauvegarde couche:', error);
      throw error;
    }
  }

  async deleteLayer(gristId: number): Promise<void> {
    if (!this.config.ready) return;

    try {
      // Supprimer les features
      const features = await grist.docApi.fetchTable('Maquette_Features');
      const toDelete: number[] = [];

      for (let i = 0; i < (features.id?.length || 0); i++) {
        if (features.LayerId?.[i] === gristId) {
          toDelete.push(features.id[i]);
        }
      }

      if (toDelete.length > 0) {
        await grist.docApi.applyUserActions([
          ['BulkRemoveRecord', 'Maquette_Features', toDelete]
        ]);
      }

      // Supprimer la couche
      await grist.docApi.applyUserActions([
        ['RemoveRecord', 'Maquette_Layers', gristId]
      ]);

      console.log(`✅ Couche supprimée de Grist (ID: ${gristId})`);
    } catch (error) {
      console.error('Erreur suppression couche:', error);
    }
  }

  // ============================================
  // FEATURES
  // ============================================

  private async loadFeatures(layerId: number): Promise<GeoJSON.FeatureCollection> {
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: []
    };

    try {
      const data = await grist.docApi.fetchTable('Maquette_Features');
      const ids = data.id || [];

      for (let idx = 0; idx < ids.length; idx++) {
        if (data.LayerId?.[idx] !== layerId) continue;

        let geometry: GeoJSON.Geometry;
        const geomStr = data.Geometry?.[idx];

        if (geomStr) {
          geometry = JSON.parse(geomStr);
        } else {
          geometry = {
            type: 'Point',
            coordinates: [
              Number(data.Longitude?.[idx]) || 0,
              Number(data.Latitude?.[idx]) || 0
            ]
          };
        }

        let tags = {};
        if (data.Tags?.[idx]) {
          try {
            tags = JSON.parse(data.Tags[idx]);
          } catch (e) { }
        }

        const feature: GeoJSON.Feature = {
          type: 'Feature',
          geometry,
          properties: {
            ...tags,
            _gristId: ids[idx],
            _osmId: data.OsmId?.[idx],
            _label: data.Label?.[idx],
            _modelId: data.ModelId?.[idx],
            _scale: data.Scale?.[idx],
            _rotationX: data.RotationX?.[idx],
            _rotationY: data.RotationY?.[idx],
            _rotationZ: data.RotationZ?.[idx],
            _offsetX: data.OffsetX?.[idx],
            _offsetY: data.OffsetY?.[idx],
            _offsetZ: data.OffsetZ?.[idx]
          }
        };

        featureCollection.features.push(feature);
      }
    } catch (error) {
      console.error('Erreur chargement features:', error);
    }

    return featureCollection;
  }

  private async saveFeatures(layer: Layer, layerId: number): Promise<void> {
    if (!layer.geojson?.features?.length) return;

    const BATCH_SIZE = 500;
    const features = layer.geojson.features;

    // Supprimer les anciens features
    const existing = await grist.docApi.fetchTable('Maquette_Features');
    const toDelete: number[] = [];

    for (let i = 0; i < (existing.id?.length || 0); i++) {
      if (existing.LayerId?.[i] === layerId) {
        toDelete.push(existing.id[i]);
      }
    }

    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE);
        await grist.docApi.applyUserActions([
          ['BulkRemoveRecord', 'Maquette_Features', batch]
        ]);
      }
    }

    // Préparer les nouveaux records
    const records = features.map(f => {
      const coords = f.geometry?.type === 'Point'
        ? (f.geometry as GeoJSON.Point).coordinates
        : null;
      const props = f.properties || {};

      return {
        LayerId: layerId,
        Longitude: coords?.[0] || null,
        Latitude: coords?.[1] || null,
        Geometry: f.geometry?.type !== 'Point' ? JSON.stringify(f.geometry) : null,
        OsmId: props._osmId || null,
        Tags: JSON.stringify(
          Object.fromEntries(
            Object.entries(props).filter(([k]) => !k.startsWith('_'))
          )
        ),
        Label: props._label || props.name || null,
        ModelId: props._modelId || null,
        Scale: props._scale ?? null,
        RotationX: props._rotationX ?? null,
        RotationY: props._rotationY ?? null,
        RotationZ: props._rotationZ ?? null,
        OffsetX: props._offsetX ?? null,
        OffsetY: props._offsetY ?? null,
        OffsetZ: props._offsetZ ?? null
      };
    });

    // Insérer par batch
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, records.length);
      const batch = records.slice(start, end);

      const fields = Object.keys(batch[0]);
      const data: Record<string, any[]> = {};
      fields.forEach(f => data[f] = batch.map(r => (r as any)[f]));

      await grist.docApi.applyUserActions([
        ['BulkAddRecord', 'Maquette_Features', new Array(batch.length).fill(null), data]
      ]);

      // Petite pause entre les batches
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // ============================================
  // CALLBACKS
  // ============================================

  onReady(callback: () => void): void {
    if (this.config.ready) {
      callback();
    } else {
      this.initCallbacks.push(callback);
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  isReady(): boolean {
    return this.config.ready;
  }
}

export default GristIntegration;
