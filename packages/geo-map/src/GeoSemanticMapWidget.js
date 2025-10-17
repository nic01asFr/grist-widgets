import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// WKT Parser
class WKTConverter {
  static parse(wkt) {
    if (!wkt || typeof wkt !== 'string') return null;
    
    if (wkt.startsWith('POINT')) {
      const match = wkt.match(/POINT\s*\(([^)]+)\)/i);
      if (!match) return null;
      const [lng, lat] = match[1].trim().split(/\s+/).map(Number);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {}
      };
    }
    
    if (wkt.startsWith('LINESTRING')) {
      const match = wkt.match(/LINESTRING\s*\(([^)]+)\)/i);
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
    
    if (wkt.startsWith('POLYGON')) {
      const match = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
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
  }
  
  static toWKT(layer) {
    const geojson = layer.toGeoJSON();
    const geom = geojson.geometry;
    
    if (geom.type === 'Point') {
      return `POINT(${geom.coordinates[0]} ${geom.coordinates[1]})`;
    }
    if (geom.type === 'LineString') {
      return `LINESTRING(${geom.coordinates.map(c => `${c[0]} ${c[1]}`).join(', ')})`;
    }
    if (geom.type === 'Polygon') {
      return `POLYGON((${geom.coordinates[0].map(c => `${c[0]} ${c[1]}`).join(', ')}))`;
    }
    return null;
  }
}

// Grist API (mock for development, real API in production)
const grist = window.grist || {
  ready: () => Promise.resolve(),
  onRecords: (callback) => {
    const mockData = [
      { id: 1, name: 'Paris', location: 'POINT(2.3522 48.8566)', description: 'Capitale' },
      { id: 2, name: 'Lyon', location: 'POINT(4.8357 45.7640)', description: '2ème ville' }
    ];
    callback(mockData);
  },
  onOptions: (callback) => callback({ geometry_column: 'location', name_column: 'name' }),
  setCursorPos: (pos) => console.log('Select:', pos.rowId),
  updateRecord: (rowId, fields) => {
    console.log('Update:', rowId, fields);
    return Promise.resolve();
  }
};

// Map Controller
function MapController({ records, geometryColumn }) {
  const map = useMap();
  
  useEffect(() => {
    if (records.length === 0) return;
    
    const bounds = L.latLngBounds([]);
    records.forEach(record => {
      const feature = WKTConverter.parse(record[geometryColumn]);
      if (feature) {
        const geojson = L.geoJSON(feature);
        const featureBounds = geojson.getBounds();
        if (featureBounds.isValid()) {
          bounds.extend(featureBounds);
        }
      }
    });
    
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [records, geometryColumn, map]);
  
  return null;
}

// Main Widget
function GeoSemanticMapWidget() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({});
  
  const geometryColumn = options.geometry_column || 'location';
  const nameColumn = options.name_column || 'name';
  
  useEffect(() => {
    grist.ready().then(() => {
      grist.onRecords(data => {
        setRecords(data);
        setLoading(false);
      });
      
      grist.onOptions(opts => {
        setOptions(opts);
      });
    });
  }, []);
  
  const getStyle = useCallback(() => ({
    color: '#3388ff',
    fillColor: '#3388ff',
    fillOpacity: 0.3,
    weight: 2
  }), []);
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <strong>🗺️ Carte Géospatiale</strong>
        <span>{records.length} géométrie(s)</span>
      </div>
      
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={6}
        style={{ flex: 1 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        
        <MapController records={records} geometryColumn={geometryColumn} />
        
        {records.map(record => {
          const feature = WKTConverter.parse(record[geometryColumn]);
          if (!feature) return null;
          
          return (
            <GeoJSON
              key={record.id}
              data={feature}
              style={getStyle()}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(`
                  <strong>${record[nameColumn]}</strong><br/>
                  ${record.description || ''}
                `);
                layer.on('click', () => {
                  grist.setCursorPos({ rowId: record.id });
                });
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

export default GeoSemanticMapWidget;
