/**
 * MapView Component
 * Smart GIS Widget v3.0
 *
 * Main Leaflet map component with WKT geometry rendering
 */

import React, { useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// WKT Parser (basic implementation)
const parseWKT = (wkt) => {
  if (!wkt || typeof wkt !== 'string') return null;

  const trimmed = wkt.trim();

  // POINT
  if (trimmed.match(/^POINT/i)) {
    const match = trimmed.match(/POINT\s*\(([^)]+)\)/i);
    if (!match) return null;
    const [lng, lat] = match[1].trim().split(/\s+/).map(Number);
    if (isNaN(lng) || isNaN(lat)) return null;
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {}
    };
  }

  // LINESTRING
  if (trimmed.match(/^LINESTRING/i)) {
    const match = trimmed.match(/LINESTRING\s*\(([^)]+)\)/i);
    if (!match) return null;
    const coords = match[1].split(',').map(pair => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lng, lat];
    });
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {}
    };
  }

  // POLYGON
  if (trimmed.match(/^POLYGON/i)) {
    const match = trimmed.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
    if (!match) return null;
    const coords = match[1].split(',').map(pair => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lng, lat];
    });
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
      properties: {}
    };
  }

  return null;
};

// Map bounds setter component
const MapBoundsSetter = ({ bounds }) => {
  const map = useMap();

  React.useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, bounds]);

  return null;
};

const MapView = ({
  records = [],
  visibleLayers = new Set(),
  selectedIds = [],
  onEntityClick,
  center = [46.603354, 1.888334], // Center of France
  zoom = 6,
}) => {
  const mapRef = useRef(null);

  // Convert records to GeoJSON features
  const features = records
    .filter(record => {
      if (!record.geometry) return false;
      if (visibleLayers.size > 0 && !visibleLayers.has(record.layer_name)) return false;
      return true;
    })
    .map(record => {
      const feature = parseWKT(record.geometry);
      if (!feature) return null;

      feature.properties = {
        id: record.id,
        name: record.name,
        layer_name: record.layer_name,
        description: record.description,
        isSelected: selectedIds.includes(record.id),
      };

      return feature;
    })
    .filter(Boolean);

  const geojsonData = {
    type: 'FeatureCollection',
    features: features,
  };

  // Calculate bounds from all visible features
  const bounds = features.length > 0
    ? L.geoJSON(geojsonData).getBounds()
    : null;

  // Style function for GeoJSON layers
  const styleFeature = (feature) => {
    const isSelected = feature.properties.isSelected;

    return {
      color: isSelected ? '#FF6B6B' : '#3B82F6',
      weight: isSelected ? 3 : 2,
      opacity: 1,
      fillColor: isSelected ? '#FF6B6B' : '#3B82F6',
      fillOpacity: isSelected ? 0.4 : 0.2,
    };
  };

  // Handle feature click
  const onEachFeature = (feature, layer) => {
    layer.on('click', () => {
      if (onEntityClick && feature.properties.id) {
        onEntityClick(feature.properties.id);
      }
    });

    // Bind popup with entity info
    if (feature.properties.name) {
      layer.bindPopup(`
        <div>
          <strong>${feature.properties.name}</strong><br/>
          <em>${feature.properties.layer_name || 'Sans couche'}</em><br/>
          ${feature.properties.description || ''}
        </div>
      `);
    }
  };

  return (
    <div style={styles.container}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        style={styles.map}
        scrollWheelZoom={true}
        attributionControl={true}
      >
        {/* Base tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* GeoJSON data layer */}
        {features.length > 0 && (
          <GeoJSON
            key={JSON.stringify(selectedIds)} // Force re-render on selection change
            data={geojsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
            pointToLayer={(feature, latlng) => {
              const isSelected = feature.properties.isSelected;
              return L.circleMarker(latlng, {
                radius: isSelected ? 10 : 6,
                fillColor: isSelected ? '#FF6B6B' : '#3B82F6',
                color: isSelected ? '#FF6B6B' : '#3B82F6',
                weight: isSelected ? 3 : 2,
                opacity: 1,
                fillOpacity: isSelected ? 0.8 : 0.6,
              });
            }}
          />
        )}

        {/* Fit bounds to visible features */}
        {bounds && <MapBoundsSetter bounds={bounds} />}
      </MapContainer>

      {/* Empty state */}
      {features.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🗺️</div>
          <div style={styles.emptyText}>Aucune géométrie à afficher</div>
          <div style={styles.emptyHint}>
            Importez des données ou activez des couches
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 400,
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.3,
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#9CA3AF',
  },
};

export default MapView;
