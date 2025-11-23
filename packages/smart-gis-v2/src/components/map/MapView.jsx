/**
 * MapView - Leaflet map container with performance optimizations
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import StateManager from '../../core/StateManager';
import LayerRenderer from './LayerRenderer';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
  const [center, setCenter] = useState([48.8566, 2.3522]);
  const [zoom, setZoom] = useState(6);
  const [layers, setLayers] = useState([]);
  const mapRef = useRef(null);
  const moveTimeoutRef = useRef(null);

  useEffect(() => {
    // Subscribe to layers changes
    const unsubscribe = StateManager.subscribe('layers.workspace', (workspaceLayers) => {
      setLayers(workspaceLayers);
    });

    // Load initial state
    setLayers(StateManager.getState('layers.workspace'));

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Subscribe to map view changes
    const unsubscribeCenter = StateManager.subscribe('map.center', setCenter);
    const unsubscribeZoom = StateManager.subscribe('map.zoom', setZoom);

    return () => {
      unsubscribeCenter();
      unsubscribeZoom();
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

      // OPTIMIZATION: Batch all map updates into ONE state change
      StateManager.batchUpdate({
        'map.center': [newCenter.lat, newCenter.lng],
        'map.zoom': map.getZoom(),
        'map.bounds': map.getBounds()
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

  // OPTIMIZATION: Memoize layer filtering (prevents recalculation on every render)
  const { pointLayers, otherLayers } = useMemo(() => {
    const points = [];
    const others = [];

    layers.forEach(layer => {
      // Skip invisible layers
      if (layer.is_visible === false) return;

      // Check if point (case-insensitive)
      const isPoint = layer.geometry_type?.toUpperCase() === 'POINT';
      (isPoint ? points : others).push(layer);
    });

    return { pointLayers: points, otherLayers: others };
  }, [layers]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      whenCreated={map => mapRef.current = map}
      onMoveEnd={handleMapMove}
      onZoomEnd={handleMapMove}
    >
      {/* Base map tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
