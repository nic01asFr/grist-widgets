/**
 * MapView - Leaflet map container with performance optimizations
 *
 * Phase 1: Debouncing, memoization
 * Phase 2: Geometry cache, batch updates
 * Phase 3: Viewport culling, progressive loading
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import StateManager from '../../core/StateManager';
import BasemapProvider from '../../services/BasemapProvider';
import LayerRenderer from './LayerRenderer';
import { filterVisibleLayers, ProgressiveLoader } from '../../utils/viewportManager';
import 'leaflet/dist/leaflet.css';

// OPTIMIZATION: Progressive loader instance (shared)
const progressiveLoader = new ProgressiveLoader(100, 50);

const MapView = () => {
  const [center, setCenter] = useState([48.8566, 2.3522]);
  const [zoom, setZoom] = useState(6);
  const [allLayers, setAllLayers] = useState([]);
  const [displayedLayers, setDisplayedLayers] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [basemap, setBasemap] = useState('osm');
  const mapRef = useRef(null);
  const moveTimeoutRef = useRef(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Subscribe to layers changes
    const unsubscribe = StateManager.subscribe('layers.workspace', (workspaceLayers) => {
      setAllLayers(workspaceLayers);

      // OPTIMIZATION: Progressive loading for large datasets
      if (workspaceLayers.length > 100) {
        isLoadingRef.current = true;
        console.log(`[MapView] Progressive loading ${workspaceLayers.length} features...`);

        progressiveLoader.load(workspaceLayers, (loadedSoFar, total) => {
          setDisplayedLayers(loadedSoFar);

          if (loadedSoFar.length === total) {
            isLoadingRef.current = false;
            console.log(`[MapView] ✅ All ${total} features loaded`);
          }
        });
      } else {
        // Small dataset: load immediately
        setDisplayedLayers(workspaceLayers);
      }
    });

    // Load initial state
    const initialLayers = StateManager.getState('layers.workspace');
    setAllLayers(initialLayers);
    setDisplayedLayers(initialLayers);

    return () => {
      unsubscribe();
      progressiveLoader.cancel();
    };
  }, []);

  useEffect(() => {
    // Subscribe to map view changes
    const unsubscribeCenter = StateManager.subscribe('map.center', setCenter);
    const unsubscribeZoom = StateManager.subscribe('map.zoom', setZoom);
    const unsubscribeBasemap = StateManager.subscribe('map.basemap', (newBasemap) => {
      setBasemap(newBasemap || 'osm');
    });

    // Load initial basemap
    const initialBasemap = StateManager.getState('map.basemap');
    if (initialBasemap) {
      setBasemap(initialBasemap);
    }

    return () => {
      unsubscribeCenter();
      unsubscribeZoom();
      unsubscribeBasemap();
    };
  }, []);

  // OPTIMIZATION: Debounced + batched map move handler
  // Prevents 300+ setState during pan/zoom (3 setState per event)
  // Now: 1 batchUpdate per 200ms instead of 300+ individual setState
  const handleMapMove = useCallback((e) => {
    // Clear previous timeout
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    // Debounce: wait 200ms after last move event
    moveTimeoutRef.current = setTimeout(() => {
      const map = e.target;
      const newCenter = map.getCenter();
      const newBounds = map.getBounds();

      // Update local bounds for viewport culling
      setMapBounds(newBounds);

      // OPTIMIZATION: Batch all map updates into ONE state change
      StateManager.batchUpdate({
        'map.center': [newCenter.lat, newCenter.lng],
        'map.zoom': map.getZoom(),
        'map.bounds': newBounds
      }, 'Map interaction');
    }, 200);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  // OPTIMIZATION: Memoize layer filtering + viewport culling
  // Phase 1: Filter by visibility
  // Phase 3: Filter by viewport (only render what's visible on map)
  const { pointLayers, otherLayers } = useMemo(() => {
    let visibleLayers = displayedLayers;

    // OPTIMIZATION: Viewport culling for large datasets
    // Only render features within current map bounds
    if (displayedLayers.length > 100 && mapBounds) {
      visibleLayers = filterVisibleLayers(displayedLayers, mapBounds);
    }

    // Separate points from other geometries
    const points = [];
    const others = [];

    visibleLayers.forEach(layer => {
      // Skip invisible layers
      if (layer.is_visible === false) return;

      // Check if point (case-insensitive)
      const isPoint = layer.geometry_type?.toUpperCase() === 'POINT';
      (isPoint ? points : others).push(layer);
    });

    return { pointLayers: points, otherLayers: others };
  }, [displayedLayers, mapBounds]);

  // Get basemap tile layer props
  const basemapProps = useMemo(() => {
    return BasemapProvider.getTileLayerProps(basemap);
  }, [basemap]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      whenCreated={map => mapRef.current = map}
      onMoveEnd={handleMapMove}
      onZoomEnd={handleMapMove}
    >
      {/* Dynamic base map tile layer */}
      <TileLayer
        key={basemap}
        url={basemapProps.url}
        attribution={basemapProps.attribution}
        maxZoom={basemapProps.maxZoom}
        subdomains={basemapProps.subdomains}
      />

      {/* Non-point layers (no clustering) */}
      {otherLayers.map(layer => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}

      {/* Point layers with clustering */}
      {pointLayers.length > 0 && (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          showCoverageOnHover={false}
        >
          {pointLayers.map(layer => (
            <LayerRenderer key={layer.id} layer={layer} />
          ))}
        </MarkerClusterGroup>
      )}
    </MapContainer>
  );
};

export default MapView;
