/**
 * Viewport Manager - Manages visible features based on map bounds
 *
 * Optimizes rendering by filtering features to only those visible in viewport.
 * Critical for large datasets (> 1000 features).
 *
 * Performance impact:
 * - 1000 features, zoom on city: 950 culled, 50 rendered (95% reduction)
 * - 10000 features: Renders only ~100-500 instead of all 10000
 */

/**
 * Calculate bounds from GeoJSON geometry
 * @param {string} geojsonString - GeoJSON from ST_ASGEOJSON
 * @returns {Object|null} { north, south, east, west }
 */
export function calculateGeometryBounds(geojsonString) {
  if (!geojsonString) return null;

  try {
    const geojson = JSON.parse(geojsonString);
    if (!geojson || !geojson.coordinates) return null;

    const coords = extractAllCoordinates(geojson.coordinates);
    if (coords.length === 0) return null;

    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  } catch (error) {
    console.warn('[ViewportManager] Failed to calculate bounds:', error);
    return null;
  }
}

/**
 * Extract all coordinates from nested GeoJSON structure
 * @param {Array} coords - GeoJSON coordinates (nested arrays)
 * @param {number} depth - Current recursion depth
 * @returns {Array} Flat array of [lng, lat] pairs
 */
function extractAllCoordinates(coords, depth = 0) {
  if (depth > 10) return []; // Safety limit

  const result = [];

  for (const item of coords) {
    if (Array.isArray(item)) {
      if (typeof item[0] === 'number' && typeof item[1] === 'number') {
        // It's a coordinate pair [lng, lat]
        result.push(item);
      } else {
        // Still nested, recurse
        result.push(...extractAllCoordinates(item, depth + 1));
      }
    }
  }

  return result;
}

/**
 * Check if geometry bounds intersect with map bounds
 * @param {Object} geometryBounds - { north, south, east, west }
 * @param {Object} mapBounds - Leaflet LatLngBounds object
 * @returns {boolean} True if visible
 */
export function isGeometryVisible(geometryBounds, mapBounds) {
  if (!geometryBounds || !mapBounds) return true; // Show if can't determine

  const mb = mapBounds;

  // Check if bounds intersect
  // Geometry is visible if it overlaps with map bounds
  return !(
    geometryBounds.south > mb.getNorth() ||
    geometryBounds.north < mb.getSouth() ||
    geometryBounds.west > mb.getEast() ||
    geometryBounds.east < mb.getWest()
  );
}

/**
 * Filter layers by viewport visibility
 * @param {Array} layers - All layers
 * @param {Object} mapBounds - Leaflet LatLngBounds
 * @returns {Array} Visible layers only
 */
export function filterVisibleLayers(layers, mapBounds) {
  if (!mapBounds || layers.length === 0) return layers;

  const visible = [];
  const culled = [];

  layers.forEach(layer => {
    // Calculate bounds from geojson column
    const bounds = calculateGeometryBounds(layer.geojson);

    if (bounds && isGeometryVisible(bounds, mapBounds)) {
      visible.push(layer);
    } else if (!bounds) {
      // If can't calculate bounds, include it to be safe
      visible.push(layer);
    } else {
      culled.push(layer.id);
    }
  });

  // Log culling stats for monitoring
  if (culled.length > 0) {
    console.log(
      `[ViewportCulling] Rendered: ${visible.length} | Culled: ${culled.length} | ` +
      `Reduction: ${((culled.length / layers.length) * 100).toFixed(1)}%`
    );
  }

  return visible;
}

/**
 * Progressive layer loader - Load layers in batches
 * Prevents UI freeze when loading thousands of features
 */
export class ProgressiveLoader {
  constructor(batchSize = 100, batchDelay = 50) {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
    this.cancelToken = null;
  }

  /**
   * Load layers progressively in batches
   * @param {Array} allLayers - All layers to load
   * @param {Function} onBatchLoaded - Callback(loadedSoFar, total)
   * @returns {Promise} Resolves when all loaded
   */
  async load(allLayers, onBatchLoaded) {
    // Cancel any previous loading
    this.cancel();

    const total = allLayers.length;
    let loaded = [];

    // Create cancellation token
    this.cancelToken = { cancelled: false };
    const token = this.cancelToken;

    // Load first batch immediately for instant feedback
    const firstBatch = allLayers.slice(0, this.batchSize);
    loaded = firstBatch;
    onBatchLoaded(loaded, total);

    // Load remaining batches
    for (let i = this.batchSize; i < total; i += this.batchSize) {
      // Check if cancelled
      if (token.cancelled) {
        console.log('[ProgressiveLoader] Loading cancelled');
        break;
      }

      // Wait before next batch (prevents UI freeze)
      await new Promise(resolve => setTimeout(resolve, this.batchDelay));

      // Load next batch
      const batch = allLayers.slice(i, i + this.batchSize);
      loaded = [...loaded, ...batch];
      onBatchLoaded(loaded, total);

      console.log(
        `[ProgressiveLoader] Loaded ${loaded.length}/${total} (${((loaded.length / total) * 100).toFixed(1)}%)`
      );
    }

    return loaded;
  }

  /**
   * Cancel current loading
   */
  cancel() {
    if (this.cancelToken) {
      this.cancelToken.cancelled = true;
      this.cancelToken = null;
    }
  }
}
