// PHASE 9: PERFORMANCE OPTIMIZATIONS

/**
 * WKT CACHE - Avoid re-parsing geometries on every render
 */
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook to cache parsed WKT geometries
 * Returns: { getCached, clearCache, cacheSize }
 */
export function useWKTCache() {
  const cacheRef = useRef(new Map()); // Map<recordId, ParsedGeoJSON>

  const getCached = useCallback((recordId, wktString, parserFn) => {
    // Check cache first
    if (cacheRef.current.has(recordId)) {
      const cached = cacheRef.current.get(recordId);
      // Verify WKT hasn't changed
      if (cached.wkt === wktString) {
        return cached.feature;
      }
    }

    // Parse and cache
    const feature = parserFn(wktString);
    if (feature) {
      cacheRef.current.set(recordId, {
        wkt: wktString,
        feature: feature
      });
    }

    return feature;
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    console.log('🗑️ WKT cache cleared');
  }, []);

  const invalidateRecord = useCallback((recordId) => {
    cacheRef.current.delete(recordId);
  }, []);

  const cacheSize = cacheRef.current.size;

  return { getCached, clearCache, invalidateRecord, cacheSize };
}

/**
 * VIEWPORT FILTERING - Only render features visible in current map bounds
 */

/**
 * Filter records to only those within viewport bounds
 * @param {Array} records - All records
 * @param {Object} bounds - Leaflet bounds {_southWest: {lat, lng}, _northEast: {lat, lng}}
 * @param {Function} getFeatureFn - Function to get GeoJSON feature from record
 * @returns {Array} - Filtered records within bounds
 */
export function filterByViewport(records, bounds, getFeatureFn) {
  if (!bounds || !bounds._southWest || !bounds._northEast) {
    return records; // No filtering if bounds invalid
  }

  const south = bounds._southWest.lat;
  const west = bounds._southWest.lng;
  const north = bounds._northEast.lat;
  const east = bounds._northEast.lng;

  return records.filter(record => {
    const feature = getFeatureFn(record);
    if (!feature || !feature.geometry) return false;

    return isFeatureInBounds(feature.geometry, {south, west, north, east});
  });
}

/**
 * Check if a geometry intersects with bounds
 */
function isFeatureInBounds(geometry, bounds) {
  const { type, coordinates } = geometry;

  if (type === 'Point') {
    const [lng, lat] = coordinates;
    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west && lng <= bounds.east;
  }

  if (type === 'MultiPoint') {
    return coordinates.some(([lng, lat]) =>
      lat >= bounds.south && lat <= bounds.north &&
      lng >= bounds.west && lng <= bounds.east
    );
  }

  if (type === 'LineString') {
    return coordinates.some(([lng, lat]) =>
      lat >= bounds.south && lat <= bounds.north &&
      lng >= bounds.west && lng <= bounds.east
    );
  }

  if (type === 'MultiLineString') {
    return coordinates.some(line =>
      line.some(([lng, lat]) =>
        lat >= bounds.south && lat <= bounds.north &&
        lng >= bounds.west && lng <= bounds.east
      )
    );
  }

  if (type === 'Polygon') {
    return coordinates[0].some(([lng, lat]) =>
      lat >= bounds.south && lat <= bounds.north &&
      lng >= bounds.west && lng <= bounds.east
    );
  }

  if (type === 'MultiPolygon') {
    return coordinates.some(polygon =>
      polygon[0].some(([lng, lat]) =>
        lat >= bounds.south && lat <= bounds.north &&
        lng >= bounds.west && lng <= bounds.east
      )
    );
  }

  return true; // Unknown type - include by default
}

/**
 * LAZY LOADING - Load features in batches
 */

/**
 * Hook to manage lazy loading of large datasets
 * @param {Array} allRecords - All records to load
 * @param {Number} batchSize - Records per batch (default 500)
 * @param {Number} threshold - Threshold to trigger lazy loading (default 1000)
 * @returns {Object} - {visibleRecords, isLoading, loadMore, hasMore, reset}
 */
export function useLazyLoading(allRecords, batchSize = 500, threshold = 1000) {
  const [currentBatch, setCurrentBatch] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Reset when records change
  useEffect(() => {
    setCurrentBatch(1);
  }, [allRecords]);

  const totalRecords = allRecords?.length || 0;
  const needsLazyLoading = totalRecords > threshold;

  const loadMore = useCallback(() => {
    if (needsLazyLoading && currentBatch * batchSize < totalRecords) {
      setIsLoading(true);

      // Simulate async loading (yield to browser)
      requestAnimationFrame(() => {
        setCurrentBatch(prev => prev + 1);
        setIsLoading(false);
      });
    }
  }, [needsLazyLoading, currentBatch, batchSize, totalRecords]);

  const reset = useCallback(() => {
    setCurrentBatch(1);
  }, []);

  const visibleRecords = needsLazyLoading
    ? allRecords.slice(0, currentBatch * batchSize)
    : allRecords;

  const hasMore = needsLazyLoading && currentBatch * batchSize < totalRecords;

  return {
    visibleRecords,
    isLoading,
    loadMore,
    hasMore,
    reset,
    stats: {
      total: totalRecords,
      loaded: visibleRecords.length,
      needsLazyLoading
    }
  };
}
