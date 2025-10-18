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
    
    const trimmed = wkt.trim();
    
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
    
    if (trimmed.match(/^POLYGON/i)) {
      const match = trimmed.match(/POLYGON\s*\(\((.+)\)\)/i);
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
}

// Helper to normalize record format from Grist
function normalizeRecord(record) {
  // Grist can send records in different formats
  if (record.fields) {
    // Format: {id: 1, fields: {A: "value", B: "value"}}
    return { id: record.id, ...record.fields };
  }
  // Format: {id: 1, A: "value", B: "value"}
  return record;
}

// Map Controller
function MapController({ records, geometryColumn }) {
  const map = useMap();
  
  useEffect(() => {
    if (!records || records.length === 0) return;
    
    const bounds = L.latLngBounds([]);
    let hasValidBounds = false;
    
    records.forEach(record => {
      const normalized = normalizeRecord(record);
      const geomValue = normalized[geometryColumn];
      
      console.log('Processing record:', normalized, 'geometry:', geomValue);
      
      if (!geomValue) return;
      
      const feature = WKTConverter.parse(geomValue);
      console.log('Parsed feature:', feature);
      
      if (feature) {
        const geojson = L.geoJSON(feature);
        const featureBounds = geojson.getBounds();
        if (featureBounds.isValid()) {
          bounds.extend(featureBounds);
          hasValidBounds = true;
        }
      }
    });
    
    if (hasValidBounds) {
      console.log('Fitting bounds:', bounds);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      console.warn('No valid bounds found');
    }
  }, [records, geometryColumn, map]);
  
  return null;
}

// Main Widget
function GeoSemanticMapWidget() {
  const [records, setRecords] = useState([]);
  const [mappedColumns, setMappedColumns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let mounted = true;
    
    // Check if Grist API is available
    if (!window.grist || typeof window.grist.ready !== 'function') {
      console.log('Grist API not found or not ready, using mock data');
      // Use mock data for standalone testing
      setRecords([
        { id: 1, name: 'Paris', geometry: 'POINT(2.3522 48.8566)', description: 'Capitale' },
        { id: 2, name: 'Lyon', geometry: 'POINT(4.8357 45.7640)', description: '2ème ville' }
      ]);
      setMappedColumns({ name: 'name', geometry: 'geometry', description: 'description' });
      setLoading(false);
      return;
    }
    
    const grist = window.grist;
    
    // Helper function to setup Grist listeners
    const setupGristListeners = () => {
      console.log('Setting up Grist listeners');
      
      // Listen for record changes
      grist.onRecord((record, mappings) => {
        if (!mounted) return;
        console.log('Received single record:', record);
        console.log('Column mappings:', mappings);
        
        // For single record mode, wrap in array
        setRecords(record ? [record] : []);
        setMappedColumns(mappings || {});
        setLoading(false);
      });
      
      // Also listen for table data (when in table widget mode)
      grist.onRecords((records, mappings) => {
        if (!mounted) return;
        console.log('Received records:', records);
        console.log('Column mappings:', mappings);
        console.log('First record sample:', records && records[0]);
        
        setRecords(records || []);
        setMappedColumns(mappings || {});
        setLoading(false);
      });
    };
    
    // Declare widget requirements to Grist
    const readyOptions = {
      columns: [
        { 
          name: 'geometry', 
          title: 'Géométrie',
          description: 'Colonne contenant les géométries WKT (POINT, LINESTRING, POLYGON)',
          optional: false
          // Ne pas spécifier de type pour accepter Text ET Geometry
        },
        { 
          name: 'name', 
          title: 'Nom',
          description: 'Colonne contenant les noms des entités',
          optional: true
        },
        { 
          name: 'description', 
          title: 'Description',
          description: 'Colonne contenant les descriptions',
          optional: true
        }
      ],
      requiredAccess: 'read table'
    };
    
    try {
      const readyResult = grist.ready(readyOptions);
      
      // Check if ready() returns a Promise
      if (readyResult && typeof readyResult.then === 'function') {
        // Promise-based API
        readyResult
          .then(() => {
            console.log('Grist widget ready (Promise API)');
            setupGristListeners();
          })
          .catch(err => {
            console.error('Error initializing Grist (Promise API):', err);
            if (mounted) {
              setError(err.message || 'Failed to initialize widget');
              setLoading(false);
            }
          });
      } else {
        // Synchronous API or no return value
        console.log('Grist widget ready (Synchronous API)');
        setupGristListeners();
      }
    } catch (err) {
      console.error('Error calling grist.ready():', err);
      if (mounted) {
        setError(err.message || 'Failed to call grist.ready()');
        setLoading(false);
      }
    }
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const getStyle = useCallback(() => ({
    color: '#3388ff',
    fillColor: '#3388ff',
    fillOpacity: 0.3,
    weight: 2
  }), []);
  
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ color: '#e74c3c', textAlign: 'center' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>🗺️</div>
        <div>Chargement de la carte...</div>
      </div>
    );
  }
  
  if (!mappedColumns || !mappedColumns.geometry) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>🗺️</div>
        <div style={{ maxWidth: '400px' }}>
          <strong>Configuration requise</strong>
          <p>Veuillez mapper la colonne <strong>Géométrie</strong> dans les paramètres du widget.</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            Cette colonne doit contenir des géométries au format WKT (POINT, LINESTRING, POLYGON).
            <br />
            Types acceptés : Text ou Geometry
          </p>
        </div>
      </div>
    );
  }
  
  const geometryCol = mappedColumns.geometry;
  const nameCol = mappedColumns.name || 'name';
  const descCol = mappedColumns.description || 'description';
  
  // Normalize records and validate geometries
  const validRecords = records.map(normalizeRecord).filter(record => {
    const geom = record[geometryCol];
    const isValid = geom && WKTConverter.parse(geom);
    if (!isValid && geom) {
      console.warn('Invalid geometry for record:', record.id, geom);
    }
    return isValid;
  });
  
  console.log('Valid records:', validRecords.length, 'out of', records.length);
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <strong>🗺️ Carte Géospatiale</strong>
        <span style={{ fontSize: '14px' }}>
          {validRecords.length} géométrie{validRecords.length > 1 ? 's' : ''}
        </span>
      </div>
      
      {validRecords.length === 0 ? (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          color: '#666',
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px' }}>📍</div>
          <div>Aucune géométrie valide trouvée</div>
          <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '400px' }}>
            Vérifiez que la colonne contient des géométries WKT valides
            {records.length > 0 && (
              <><br/>{records.length} enregistrement(s) trouvé(s) mais aucune géométrie valide</>
            )}
          </div>
        </div>
      ) : (
        <MapContainer
          center={[46.603354, 1.888334]}
          zoom={6}
          style={{ flex: 1 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          
          <MapController records={validRecords} geometryColumn={geometryCol} />
          
          {validRecords.map((record, idx) => {
            const feature = WKTConverter.parse(record[geometryCol]);
            if (!feature) return null;
            
            const name = record[nameCol] || `Point ${idx + 1}`;
            const description = record[descCol] || '';
            
            console.log('Rendering marker for:', name, feature);
            
            return (
              <GeoJSON
                key={record.id || idx}
                data={feature}
                style={getStyle()}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div style="min-width: 150px;">
                      <strong>${name}</strong>
                      ${description ? `<br/><span style="color: #666;">${description}</span>` : ''}
                    </div>
                  `);
                  
                  if (window.grist && record.id) {
                    layer.on('click', () => {
                      window.grist.setCursorPos({ rowId: record.id });
                    });
                  }
                }}
              />
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}

export default GeoSemanticMapWidget;
