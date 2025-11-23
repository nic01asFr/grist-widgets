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

  // OPTIMIZATION: Debounced map move handler (prevents 300+ setState during pan/zoom)
  const handleMapMove = useCallback((e) => {
    // Clear previous timeout
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    // Debounce: wait 200ms after last move event
    moveTimeoutRef.current = setTimeout(() => {
      const map = e.target;
      const newCenter = map.getCenter();
      const newZoom = map.getZoom();

      // Batch updates to reduce re-renders
      StateManager.setState('map.center', [newCenter.lat, newCenter.lng], 'Map moved');
      StateManager.setState('map.zoom', newZoom, 'Map zoomed');
      StateManager.setState('map.bounds', map.getBounds(), 'Map bounds changed');
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
