/**
 * useMapSelection Hook
 * Smart GIS Widget v3.0
 *
 * Manages entity selection on the map with contextual behaviors
 * Based on SELECTION_BEHAVIOR_SPEC.md
 */

import { useState, useCallback, useMemo } from 'react';

const useMapSelection = (records = [], activeLayer = null) => {
  // Selection state
  const [selection, setSelection] = useState([]);
  const [selectionMode, setSelectionMode] = useState('pointer'); // pointer | rectangle | lasso | circle

  /**
   * Select a single entity
   * @param {string|number} entityId - Entity ID to select
   * @param {string} modifier - Keyboard modifier: 'none' | 'ctrl' | 'shift'
   */
  const selectEntity = useCallback((entityId, modifier = 'none') => {
    if (!entityId) return;

    if (modifier === 'ctrl') {
      // Toggle in selection (add/remove)
      setSelection(prev =>
        prev.includes(entityId)
          ? prev.filter(id => id !== entityId)
          : [...prev, entityId]
      );
    } else if (modifier === 'shift') {
      // Range selection (by ID order)
      if (selection.length === 0) {
        setSelection([entityId]);
      } else {
        const lastSelected = selection[selection.length - 1];
        const range = getIDRange(lastSelected, entityId, records);
        setSelection(range);
      }
    } else {
      // Replace selection
      setSelection([entityId]);
    }
  }, [selection, records]);

  /**
   * Select entities within bounds
   * @param {Object} bounds - Leaflet LatLngBounds object
   * @param {string} modifier - Keyboard modifier: 'none' | 'ctrl' | 'shift'
   * @returns {number} Number of entities selected
   */
  const selectInBounds = useCallback((bounds, modifier = 'none') => {
    if (!bounds) return 0;

    // Filter entities in bounds
    const entitiesInBounds = records.filter(record => {
      // Filter by active layer if defined
      if (activeLayer && record.layer_name !== activeLayer) {
        return false;
      }

      // Check if geometry is in bounds
      return isGeometryInBounds(record.geometry, bounds);
    });

    const ids = entitiesInBounds.map(r => r.id);

    if (modifier === 'ctrl') {
      // Add to existing selection
      setSelection(prev => [...new Set([...prev, ...ids])]);
    } else if (modifier === 'shift') {
      // Intersection with existing selection
      setSelection(prev => prev.filter(id => ids.includes(id)));
    } else {
      // Replace selection
      setSelection(ids);
    }

    return ids.length;
  }, [records, activeLayer]);

  /**
   * Clear all selection
   */
  const clearSelection = useCallback(() => {
    setSelection([]);
  }, []);

  /**
   * Select all entities (filtered by active layer if set)
   */
  const selectAll = useCallback(() => {
    const ids = activeLayer
      ? records.filter(r => r.layer_name === activeLayer).map(r => r.id)
      : records.map(r => r.id);
    setSelection(ids);
  }, [records, activeLayer]);

  /**
   * Select entities by IDs
   * @param {Array<string|number>} ids - Array of entity IDs
   */
  const selectByIds = useCallback((ids) => {
    setSelection(ids);
  }, []);

  /**
   * Check if entity is selected
   * @param {string|number} entityId - Entity ID
   * @returns {boolean}
   */
  const isSelected = useCallback((entityId) => {
    return selection.includes(entityId);
  }, [selection]);

  /**
   * Toggle entity selection
   * @param {string|number} entityId - Entity ID
   */
  const toggleEntity = useCallback((entityId) => {
    selectEntity(entityId, 'ctrl');
  }, [selectEntity]);

  /**
   * Get selected records (full objects)
   */
  const selectedRecords = useMemo(() => {
    return records.filter(r => selection.includes(r.id));
  }, [records, selection]);

  /**
   * Get selection grouped by layer
   */
  const selectionByLayer = useMemo(() => {
    const grouped = {};
    selectedRecords.forEach(record => {
      const layerName = record.layer_name || 'Default Layer';
      if (!grouped[layerName]) {
        grouped[layerName] = [];
      }
      grouped[layerName].push(record);
    });
    return grouped;
  }, [selectedRecords]);

  /**
   * Get selection info
   */
  const selectionInfo = useMemo(() => {
    const layerCount = Object.keys(selectionByLayer).length;
    const isEmpty = selection.length === 0;
    const isSingle = selection.length === 1;
    const isMultiple = selection.length > 1;

    return {
      count: selection.length,
      isEmpty,
      isSingle,
      isMultiple,
      layerCount,
      layers: Object.keys(selectionByLayer),
    };
  }, [selection, selectionByLayer]);

  return {
    // State
    selection,
    selectedRecords,
    selectionByLayer,
    selectionInfo,
    selectionMode,

    // Actions
    setSelectionMode,
    selectEntity,
    selectInBounds,
    clearSelection,
    selectAll,
    selectByIds,
    toggleEntity,
    isSelected,
  };
};

/**
 * Helper: Get range of IDs between two entities
 */
const getIDRange = (startId, endId, records) => {
  const startIdx = records.findIndex(r => r.id === startId);
  const endIdx = records.findIndex(r => r.id === endId);

  if (startIdx === -1 || endIdx === -1) return [startId, endId];

  const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
  return records.slice(min, max + 1).map(r => r.id);
};

/**
 * Helper: Check if geometry is within bounds
 * @param {string} wktGeometry - WKT geometry string
 * @param {Object} bounds - Leaflet LatLngBounds
 * @returns {boolean}
 */
const isGeometryInBounds = (wktGeometry, bounds) => {
  if (!wktGeometry || !bounds) return false;

  try {
    // Extract coordinates from WKT
    const coords = extractCoordinates(wktGeometry);

    if (coords.length === 0) return false;

    // Check if at least one coordinate is in bounds
    return coords.some(([lng, lat]) => {
      return (
        lng >= bounds.getWest() &&
        lng <= bounds.getEast() &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth()
      );
    });
  } catch (e) {
    console.warn('Error checking geometry bounds:', e);
    return false;
  }
};

/**
 * Helper: Extract coordinates from WKT string
 * @param {string} wkt - WKT geometry
 * @returns {Array<[number, number]>} Array of [lng, lat] coordinates
 */
const extractCoordinates = (wkt) => {
  if (!wkt) return [];

  // Remove geometry type prefix (POINT, LINESTRING, POLYGON, etc.)
  const cleaned = wkt.replace(/^[A-Z]+\s*\(/i, '').replace(/\)$/,'');

  // Regex to match coordinate pairs (handle multiple formats)
  const regex = /([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)/g;
  const matches = [];
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lng) && !isNaN(lat)) {
      matches.push([lng, lat]);
    }
  }

  return matches;
};

export default useMapSelection;
