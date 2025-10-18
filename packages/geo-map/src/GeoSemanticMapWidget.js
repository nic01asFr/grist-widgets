import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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

// Enhanced WKT Parser with Multi-geometry support
class WKTConverter {
  static parse(wkt) {
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

    // MULTIPOINT
    if (trimmed.match(/^MULTIPOINT/i)) {
      const match = trimmed.match(/MULTIPOINT\s*\((.+)\)/i);
      if (!match) return null;
      const coords = match[1].split(/\)\s*,\s*\(/).map(pair => {
        const cleaned = pair.replace(/[()]/g, '').trim();
        const [lng, lat] = cleaned.split(/\s+/).map(Number);
        return [lng, lat];
      });
      return {
        type: 'Feature',
        geometry: { type: 'MultiPoint', coordinates: coords },
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

    // MULTILINESTRING
    if (trimmed.match(/^MULTILINESTRING/i)) {
      const match = trimmed.match(/MULTILINESTRING\s*\((.+)\)/i);
      if (!match) return null;
      const lines = match[1].split(/\)\s*,\s*\(/).map(line => {
        const cleaned = line.replace(/[()]/g, '').trim();
        return cleaned.split(',').map(pair => {
          const [lng, lat] = pair.trim().split(/\s+/).map(Number);
          return [lng, lat];
        });
      });
      return {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: lines },
        properties: {}
      };
    }

    // POLYGON
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

    // MULTIPOLYGON
    if (trimmed.match(/^MULTIPOLYGON/i)) {
      const match = trimmed.match(/MULTIPOLYGON\s*\((.+)\)/i);
      if (!match) return null;
      const polygons = [];
      let depth = 0;
      let current = '';

      for (let char of match[1]) {
        if (char === '(') depth++;
        if (char === ')') depth--;
        current += char;

        if (depth === 1 && char === ')') {
          const polyCoords = current.replace(/^\(\(|\)\)$/g, '').split(',').map(pair => {
            const [lng, lat] = pair.trim().split(/\s+/).map(Number);
            return [lng, lat];
          });
          polygons.push([polyCoords]);
          current = '';
        }
      }

      return {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: polygons },
        properties: {}
      };
    }

    return null;
  }

  static toWKT(geometry) {
    const { type, coordinates } = geometry;

    if (type === 'Point') {
      return `POINT(${coordinates[0]} ${coordinates[1]})`;
    }

    if (type === 'LineString') {
      const coords = coordinates.map(c => `${c[0]} ${c[1]}`).join(', ');
      return `LINESTRING(${coords})`;
    }

    if (type === 'Polygon') {
      const coords = coordinates[0].map(c => `${c[0]} ${c[1]}`).join(', ');
      return `POLYGON((${coords}))`;
    }

    return null;
  }
}

// Helper to normalize record format
function normalizeRecord(record) {
  if (record.fields) {
    return { id: record.id, ...record.fields };
  }
  return record;
}

// Map Controller with auto-zoom
function MapController({ records, geometryColumn }) {
  const map = useMap();

  useEffect(() => {
    if (!records || records.length === 0) return;

    const bounds = L.latLngBounds([]);
    let hasValidBounds = false;

    records.forEach(record => {
      const normalized = normalizeRecord(record);
      const geomValue = normalized[geometryColumn];

      if (!geomValue) return;

      const feature = WKTConverter.parse(geomValue);

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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [records, geometryColumn, map]);

  return null;
}

// Geoman Edit Controller
function GeomanController({ enabled, onGeometryCreated }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) {
      map.pm.removeControls();
      map.pm.disableDraw();
      return;
    }

    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawRectangle: true,
      drawPolyline: true,
      drawPolygon: true,
      drawMarker: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    const handleCreate = (e) => {
      const layer = e.layer;
      const geometry = layer.toGeoJSON().geometry;
      const wkt = WKTConverter.toWKT(geometry);

      if (wkt && onGeometryCreated) {
        onGeometryCreated(wkt);
      }

      // Remove the drawn layer as it will be re-rendered from Grist data
      map.removeLayer(layer);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
      map.pm.removeControls();
    };
  }, [enabled, map, onGeometryCreated]);

  return null;
}

// Sidebar Component
function Sidebar({
  show,
  onClose,
  records,
  onSearch,
  stats,
  searchResults
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '300px',
      backgroundColor: 'white',
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2c3e50',
        color: 'white'
      }}>
        <strong>🔍 Exploration</strong>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0 8px'
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Semantic Search */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#555' }}>
            🔍 Recherche Sémantique
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="ex: restaurants près de..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
            <button onClick={handleSearch} style={{
              padding: '8px 16px',
              backgroundColor: '#16B378',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
              Go
            </button>
          </div>

          {searchResults && searchResults.length > 0 && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
              {searchResults.length} résultat(s) trouvé(s)
            </div>
          )}
        </div>

        {/* Statistics */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#555' }}>
            📊 Statistiques
          </h3>
          <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#333' }}>
            <div>📍 Points: <strong>{stats.points}</strong></div>
            <div>📏 Lignes: <strong>{stats.lines}</strong></div>
            <div>🔷 Polygones: <strong>{stats.polygons}</strong></div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
              <strong>Total: {stats.total} entités</strong>
            </div>
            {stats.totalArea > 0 && (
              <div style={{ marginTop: '4px', color: '#666' }}>
                Aire totale: {(stats.totalArea / 1000000).toFixed(2)} km²
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#555' }}>
            🎨 Légende
          </h3>
          <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
            <div><span style={{ color: '#3388ff' }}>●</span> Points</div>
            <div><span style={{ color: '#16B378' }}>━</span> Lignes</div>
            <div><span style={{ color: '#9b59b6' }}>▬</span> Polygones</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Widget
function GeoSemanticMapWidget() {
  const [records, setRecords] = useState([]);
  const [mappedColumns, setMappedColumns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const gristApiRef = useRef(null);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!records || !mappedColumns?.geometry) return { points: 0, lines: 0, polygons: 0, total: 0, totalArea: 0 };

    const geometryCol = mappedColumns.geometry;
    let points = 0, lines = 0, polygons = 0, totalArea = 0;

    records.forEach(record => {
      const normalized = normalizeRecord(record);
      const geom = normalized[geometryCol];
      if (!geom) return;

      const feature = WKTConverter.parse(geom);
      if (!feature) return;

      const type = feature.geometry.type;
      if (type.includes('Point')) points++;
      if (type.includes('Line')) lines++;
      if (type.includes('Polygon')) polygons++;

      // Calculate area for polygons (approximate)
      if (type.includes('Polygon') && normalized.area_m2) {
        totalArea += parseFloat(normalized.area_m2) || 0;
      }
    });

    return { points, lines, polygons, total: points + lines + polygons, totalArea };
  }, [records, mappedColumns]);

  useEffect(() => {
    let mounted = true;

    if (!window.grist || typeof window.grist.ready !== 'function') {
      console.log('Grist API not available, using mock data');
      setRecords([
        { id: 1, name: 'Paris', geometry: 'POINT(2.3522 48.8566)', description: 'Capitale' },
        { id: 2, name: 'Lyon', geometry: 'POINT(4.8357 45.7640)', description: '2ème ville' }
      ]);
      setMappedColumns({ name: 'name', geometry: 'geometry', description: 'description' });
      setLoading(false);
      return;
    }

    const grist = window.grist;
    gristApiRef.current = grist;

    const setupGristListeners = () => {
      grist.onRecord((record, mappings) => {
        if (!mounted) return;
        setRecords(record ? [record] : []);
        setMappedColumns(mappings || {});
        setLoading(false);
      });

      grist.onRecords((recs, mappings) => {
        if (!mounted) return;
        setRecords(recs || []);
        setMappedColumns(mappings || {});
        setLoading(false);
      });
    };

    const readyOptions = {
      columns: [
        { name: 'geometry', title: 'Géométrie', description: 'WKT geometry', optional: false },
        { name: 'name', title: 'Nom', optional: true },
        { name: 'description', title: 'Description', optional: true },
        { name: 'embedding', title: 'Embedding', optional: true },
        { name: 'area_m2', title: 'Aire (m²)', optional: true },
        { name: 'length_km', title: 'Longueur (km)', optional: true }
      ],
      requiredAccess: 'full'
    };

    try {
      const readyResult = grist.ready(readyOptions);

      if (readyResult && typeof readyResult.then === 'function') {
        readyResult.then(() => {
          console.log('Grist widget ready');
          setupGristListeners();
        }).catch(err => {
          console.error('Error initializing:', err);
          if (mounted) {
            setError(err.message || 'Failed to initialize');
            setLoading(false);
          }
        });
      } else {
        setupGristListeners();
      }
    } catch (err) {
      console.error('Error calling ready():', err);
      if (mounted) {
        setError(err.message || 'Failed to call ready()');
        setLoading(false);
      }
    }

    return () => { mounted = false; };
  }, []);

  const handleGeometryCreated = useCallback(async (wkt) => {
    if (!gristApiRef.current || !gristApiRef.current.docApi) return;

    try {
      const tableId = 'Table1'; // TODO: Get from Grist context
      await gristApiRef.current.docApi.applyUserActions([
        ['AddRecord', tableId, null, {
          [mappedColumns.geometry]: wkt,
          [mappedColumns.name]: 'New geometry',
          [mappedColumns.description]: 'Created from map'
        }]
      ]);

      console.log('Geometry created successfully');
    } catch (err) {
      console.error('Error creating geometry:', err);
    }
  }, [mappedColumns]);

  const handleSearch = useCallback((query) => {
    console.log('Searching for:', query);
    // TODO: Implement Albert API semantic search
    setSearchResults([]);
  }, []);

  const getStyle = useCallback((feature) => {
    const type = feature.geometry.type;

    if (type.includes('Point')) {
      return { color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.6, weight: 2, radius: 8 };
    }
    if (type.includes('Line')) {
      return { color: '#16B378', weight: 3, opacity: 0.8 };
    }
    if (type.includes('Polygon')) {
      return { color: '#9b59b6', fillColor: '#9b59b6', fillOpacity: 0.3, weight: 2 };
    }

    return { color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.3, weight: 2 };
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ color: '#e74c3c', textAlign: 'center' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '48px' }}>🗺️</div>
        <div>Chargement de la carte...</div>
      </div>
    );
  }

  if (!mappedColumns || !mappedColumns.geometry) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>🗺️</div>
        <div style={{ maxWidth: '400px' }}>
          <strong>Configuration requise</strong>
          <p>Veuillez mapper la colonne <strong>Géométrie</strong> dans les paramètres du widget.</p>
        </div>
      </div>
    );
  }

  const geometryCol = mappedColumns.geometry;
  const nameCol = mappedColumns.name || 'name';
  const descCol = mappedColumns.description || 'description';

  const validRecords = records.map(normalizeRecord).filter(record => {
    const geom = record[geometryCol];
    return geom && WKTConverter.parse(geom);
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <strong>🗺️ Carte Géo-Sémantique</strong>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '4px 12px',
              backgroundColor: sidebarOpen ? '#16B378' : '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {sidebarOpen ? '◀ Fermer' : '▶ Explorer'}
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              padding: '4px 12px',
              backgroundColor: editMode ? '#e74c3c' : '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {editMode ? '✓ Mode Édition' : '✏️ Éditer'}
          </button>
        </div>
        <span style={{ fontSize: '14px' }}>
          {validRecords.length} entité{validRecords.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Sidebar */}
      <Sidebar
        show={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        records={validRecords}
        onSearch={handleSearch}
        stats={stats}
        searchResults={searchResults}
      />

      {/* Map */}
      {validRecords.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#666', padding: '20px' }}>
          <div style={{ fontSize: '48px' }}>📍</div>
          <div>Aucune géométrie valide trouvée</div>
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
          <GeomanController enabled={editMode} onGeometryCreated={handleGeometryCreated} />

          <MarkerClusterGroup>
            {validRecords.map((record, idx) => {
              const feature = WKTConverter.parse(record[geometryCol]);
              if (!feature) return null;

              const name = record[nameCol] || `Entité ${idx + 1}`;
              const description = record[descCol] || '';

              return (
                <GeoJSON
                  key={record.id || idx}
                  data={feature}
                  style={getStyle(feature)}
                  onEachFeature={(feature, layer) => {
                    layer.bindPopup(`
                      <div style="min-width: 150px;">
                        <strong>${name}</strong>
                        ${description ? `<br/><span style="color: #666;">${description}</span>` : ''}
                        <br/><small style="color: #999;">${feature.geometry.type}</small>
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
          </MarkerClusterGroup>
        </MapContainer>
      )}
    </div>
  );
}

export default GeoSemanticMapWidget;
