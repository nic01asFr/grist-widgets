/**
 * QueryExecutor - Agent Query Execution Engine
 *
 * Orchestrates execution of agent-driven spatial queries:
 * 1. Receives parsed query from webhook/n8n
 * 2. Fetches data from catalog sources
 * 3. Applies spatial treatments
 * 4. Composes final visualization
 * 5. Updates state and displays results
 *
 * Used by WebhookHandler to execute queries from natural language
 */

import dataCatalog from './DataCatalog';
import treatmentRegistry from './TreatmentRegistry';
import StateManager from './StateManager';
import GristAPI from './GristAPI';

class QueryExecutor {
  constructor() {
    this.dataCatalog = dataCatalog;
    this.treatmentRegistry = treatmentRegistry;
    this.stateManager = StateManager;
    this.gristAPI = GristAPI;
  }

  /**
   * Execute a parsed agent query
   *
   * @param {Object} parsedQuery - Structured query from n8n LLM
   * @returns {Object} - Execution result with steps and final view
   *
   * Example parsedQuery structure:
   * {
   *   target: { source: 'osm', type: 'amenity', value: 'school' },
   *   reference: { source: 'osm', type: 'amenity', value: 'hospital' },
   *   zone: { source: 'ign', layer: 'communes', filter: { nom: 'Paris' } },
   *   treatments: [
   *     { id: 'buffer', params: { distance: 500, unit: 'm' }, apply_to: 'reference' }
   *   ],
   *   visualization: {
   *     layers: ['target', 'reference', 'zone'],
   *     styles: { ... },
   *     basemap: 'osm-standard'
   *   }
   * }
   */
  async execute(parsedQuery) {
    const executionId = Date.now();
    const steps = [];

    try {
      // Update state: execution started
      StateManager.setState('data.currentQuery', parsedQuery, 'Query execution started');
      StateManager.setState('data.executionSteps', [], 'Reset execution steps');

      // Step 1: Fetch zone (if specified)
      let zone = null;
      if (parsedQuery.zone) {
        zone = await this.fetchData('zone', parsedQuery.zone);
        this.addStep(steps, 'zone', 'Zone fetched', { count: zone.features.length });
      }

      // Step 2: Fetch reference data (if specified)
      let reference = null;
      if (parsedQuery.reference) {
        const options = zone ? { bbox: zone.bbox } : {};
        reference = await this.fetchData('reference', parsedQuery.reference, options);
        this.addStep(steps, 'reference', 'Reference data fetched', { count: reference.features.length });
      }

      // Step 3: Apply treatments to reference (if any)
      let processedReference = reference;
      if (reference && parsedQuery.treatments) {
        const refTreatments = parsedQuery.treatments.filter(t => t.apply_to === 'reference');
        for (const treatment of refTreatments) {
          processedReference = await this.applyTreatment(treatment, processedReference);
          this.addStep(steps, 'treatment', `Applied ${treatment.id}`, {
            treatment: treatment.id,
            params: treatment.params
          });
        }
      }

      // Step 4: Fetch target data
      let target = null;
      if (parsedQuery.target) {
        const options = zone ? { bbox: zone.bbox } : {};
        target = await this.fetchData('target', parsedQuery.target, options);
        this.addStep(steps, 'target', 'Target data fetched', { count: target.features.length });
      }

      // Step 5: Filter target by spatial relationship with processed reference
      let filteredTarget = target;
      if (target && processedReference && parsedQuery.spatialFilter) {
        filteredTarget = await this.applySpatialFilter(
          target,
          processedReference,
          parsedQuery.spatialFilter
        );
        this.addStep(steps, 'filter', 'Spatial filter applied', {
          before: target.features.length,
          after: filteredTarget.features.length
        });
      }

      // Step 6: Compose visualization
      const view = await this.composeView(parsedQuery.visualization || {}, {
        zone,
        reference: processedReference,
        target: filteredTarget
      });

      this.addStep(steps, 'compose', 'View composed', {
        layers: view.layers.length
      });

      // Save to history
      const result = {
        executionId,
        query: parsedQuery,
        steps,
        result: view,
        timestamp: new Date().toISOString(),
        success: true
      };

      this.saveToHistory(result);

      return result;

    } catch (error) {
      const result = {
        executionId,
        query: parsedQuery,
        steps,
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      };

      this.saveToHistory(result);
      throw error;
    }
  }

  /**
   * Fetch data from catalog
   */
  async fetchData(layerId, dataSpec, options = {}) {
    const { source, layer, tag, value, filter } = dataSpec;

    if (source === 'ign') {
      return await this.fetchIGN(layer, filter, options);
    } else if (source === 'osm') {
      return await this.fetchOSM(tag, value, options);
    } else if (source === 'project') {
      return await this.fetchGrist(layer, filter, options);
    }

    throw new Error(`Unknown source: ${source}`);
  }

  /**
   * Fetch from IGN WFS
   */
  async fetchIGN(layerKey, filter, options) {
    const ignSource = this.dataCatalog.getSource('ign');
    const layerDef = ignSource.layers[layerKey];

    if (!layerDef) {
      throw new Error(`Unknown IGN layer: ${layerKey}`);
    }

    const url = ignSource.buildRequest(layerDef.id, {
      bbox: options.bbox,
      filter: filter ? this.buildCQLFilter(filter) : null,
      maxFeatures: options.maxFeatures || 1000
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`IGN WFS error: ${response.statusText}`);
    }

    const geojson = await response.json();

    return {
      source: 'ign',
      layer: layerKey,
      features: geojson.features || [],
      bbox: this.calculateBBox(geojson.features)
    };
  }

  /**
   * Fetch from OSM Overpass
   */
  async fetchOSM(tag, value, options) {
    const osmSource = this.dataCatalog.getSource('osm');

    const query = osmSource.buildQuery(tag, value, {
      bbox: options.bbox,
      around: options.around
    });

    const response = await fetch(osmSource.endpoint, {
      method: 'POST',
      body: query
    });

    if (!response.ok) {
      throw new Error(`OSM Overpass error: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert OSM to GeoJSON-like structure
    const features = this.convertOSMToFeatures(data.elements);

    return {
      source: 'osm',
      tag,
      value,
      features,
      bbox: this.calculateBBox(features)
    };
  }

  /**
   * Fetch from Grist table
   */
  async fetchGrist(tableId, filter, options) {
    const currentTable = tableId || StateManager.getState('data.currentTable') || 'GIS_WorkSpace';

    const allRecords = await this.gristAPI.fetchTable(currentTable);

    // Apply filter
    let filtered = allRecords;
    if (filter) {
      filtered = allRecords.filter(record => {
        return Object.entries(filter).every(([key, value]) => {
          return record[key] === value;
        });
      });
    }

    return {
      source: 'project',
      table: currentTable,
      features: filtered,
      bbox: this.calculateBBoxFromRecords(filtered)
    };
  }

  /**
   * Apply spatial treatment
   */
  async applyTreatment(treatmentSpec, data) {
    const treatment = this.treatmentRegistry.get(treatmentSpec.id);

    if (!treatment) {
      throw new Error(`Unknown treatment: ${treatmentSpec.id}`);
    }

    // For now, simulate treatment application
    // In production, this would call Grist formulas or use turf.js

    if (treatmentSpec.id === 'buffer') {
      // Buffer treatment - would use ST_BUFFER in Grist
      return {
        ...data,
        features: data.features.map(f => ({
          ...f,
          _buffered: true,
          _bufferDistance: treatmentSpec.params.distance,
          _bufferUnit: treatmentSpec.params.unit
        })),
        treatment: 'buffer',
        treatmentParams: treatmentSpec.params
      };
    }

    // Pass through for other treatments
    return data;
  }

  /**
   * Apply spatial filter
   */
  async applySpatialFilter(targetData, referenceData, filterSpec) {
    // For now, return all target data
    // In production, would use ST_* predicates

    return targetData;
  }

  /**
   * Compose final visualization
   */
  async composeView(vizSpec, dataLayers) {
    const layers = [];
    const { zone, reference, target } = dataLayers;

    // Add zone layer
    if (zone && vizSpec.layers?.includes('zone')) {
      layers.push({
        id: 'zone',
        name: 'Zone',
        type: 'zone',
        data: zone.features,
        style: vizSpec.styles?.zone || {
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          strokeColor: '#1e40af',
          strokeWidth: 2
        },
        visible: true,
        zIndex: 1
      });
    }

    // Add reference layer
    if (reference && vizSpec.layers?.includes('reference')) {
      layers.push({
        id: 'reference',
        name: 'Référence',
        type: 'reference',
        data: reference.features,
        style: vizSpec.styles?.reference || {
          fillColor: '#10b981',
          fillOpacity: 0.3,
          strokeColor: '#059669',
          strokeWidth: 1
        },
        visible: true,
        zIndex: 2
      });
    }

    // Add target layer
    if (target && vizSpec.layers?.includes('target')) {
      layers.push({
        id: 'target',
        name: 'Résultats',
        type: 'target',
        data: target.features,
        style: vizSpec.styles?.target || {
          color: '#ef4444',
          fillColor: '#fca5a5',
          fillOpacity: 0.6,
          strokeWidth: 2,
          radius: 8
        },
        visible: true,
        zIndex: 3,
        highlight: true
      });
    }

    // Calculate view bounds
    const allFeatures = [
      ...(zone?.features || []),
      ...(reference?.features || []),
      ...(target?.features || [])
    ];

    const bounds = this.calculateBBox(allFeatures);
    const center = this.calculateCenter(bounds);

    // Update state with new layers
    StateManager.setState('layers.system', layers, 'Agent query result');
    StateManager.setState('map.center', center, 'Center on results');
    StateManager.setState('map.zoom', this.calculateZoom(bounds), 'Zoom to results');

    return {
      layers,
      bounds,
      center,
      basemap: vizSpec.basemap || 'osm-standard'
    };
  }

  /**
   * Helper: Add execution step
   */
  addStep(steps, type, message, data = {}) {
    const step = {
      type,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    steps.push(step);

    // Update state in real-time
    StateManager.setState('data.executionSteps', [...steps], 'Execution step added');
  }

  /**
   * Helper: Save to query history
   */
  saveToHistory(result) {
    const history = StateManager.getState('data.queryHistory') || [];
    const newHistory = [result, ...history.slice(0, 9)]; // Keep last 10

    StateManager.setState('data.queryHistory', newHistory, 'Query saved to history');
    StateManager.setState('data.currentQuery', null, 'Query execution complete');
  }

  /**
   * Helper: Build CQL filter for WFS
   */
  buildCQLFilter(filter) {
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key} = '${value}'`;
      }
      return `${key} = ${value}`;
    });

    return conditions.join(' AND ');
  }

  /**
   * Helper: Convert OSM elements to GeoJSON-like features
   */
  convertOSMToFeatures(elements) {
    return elements.map(el => ({
      type: 'Feature',
      geometry: this.osmGeometry(el),
      properties: el.tags || {}
    }));
  }

  /**
   * Helper: OSM geometry conversion
   */
  osmGeometry(element) {
    if (element.type === 'node') {
      return {
        type: 'Point',
        coordinates: [element.lon, element.lat]
      };
    } else if (element.type === 'way' && element.geometry) {
      const coords = element.geometry.map(g => [g.lon, g.lat]);
      const isPolygon = coords[0][0] === coords[coords.length - 1][0] &&
                        coords[0][1] === coords[coords.length - 1][1];

      return isPolygon
        ? { type: 'Polygon', coordinates: [coords] }
        : { type: 'LineString', coordinates: coords };
    }

    return null;
  }

  /**
   * Helper: Calculate bounding box
   */
  calculateBBox(features) {
    if (!features || features.length === 0) return null;

    let minLon = Infinity, minLat = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity;

    features.forEach(f => {
      if (!f.geometry) return;

      const coords = this.extractCoords(f.geometry);
      coords.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    });

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Helper: Calculate bbox from Grist records
   */
  calculateBBoxFromRecords(records) {
    // Would parse WKT geometries
    // For now, return null
    return null;
  }

  /**
   * Helper: Extract coordinates from geometry
   */
  extractCoords(geometry) {
    if (geometry.type === 'Point') {
      return [geometry.coordinates];
    } else if (geometry.type === 'LineString') {
      return geometry.coordinates;
    } else if (geometry.type === 'Polygon') {
      return geometry.coordinates[0];
    } else if (geometry.type.startsWith('Multi')) {
      return geometry.coordinates.flat(2);
    }
    return [];
  }

  /**
   * Helper: Calculate center from bbox
   */
  calculateCenter(bbox) {
    if (!bbox) return [48.8566, 2.3522]; // Paris default

    const [minLon, minLat, maxLon, maxLat] = bbox;
    return [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
  }

  /**
   * Helper: Calculate zoom from bbox
   */
  calculateZoom(bbox) {
    if (!bbox) return 6;

    const [minLon, minLat, maxLon, maxLat] = bbox;
    const latDiff = maxLat - minLat;
    const lonDiff = maxLon - minLon;
    const maxDiff = Math.max(latDiff, lonDiff);

    if (maxDiff > 5) return 6;
    if (maxDiff > 1) return 9;
    if (maxDiff > 0.5) return 11;
    if (maxDiff > 0.1) return 13;
    return 15;
  }
}

// Singleton instance
const queryExecutor = new QueryExecutor();

export default queryExecutor;
export { QueryExecutor };
