/**
 * MapView - Leaflet map container
 */

import React, { useEffect, useState, useRef } from 'react';
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

  const handleMapMove = (e) => {
    const map = e.target;
    const newCenter = map.getCenter();
    const newZoom = map.getZoom();

    StateManager.setState('map.center', [newCenter.lat, newCenter.lng], 'Map moved');
    StateManager.setState('map.zoom', newZoom, 'Map zoomed');
    StateManager.setState('map.bounds', map.getBounds(), 'Map bounds changed');
  };

  // Separate point layers for clustering
  const pointLayers = layers.filter(l =>
    l.is_visible !== false && (l.geometry_type === 'Point' || l.geometry_type === 'POINT')
  );

  const otherLayers = layers.filter(l =>
    l.is_visible !== false && l.geometry_type !== 'Point' && l.geometry_type !== 'POINT'
  );

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
