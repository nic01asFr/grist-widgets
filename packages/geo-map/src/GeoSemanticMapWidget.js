import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
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

    if (type === 'MultiPoint') {
      const coords = coordinates.map(c => `(${c[0]} ${c[1]})`).join(', ');
      return `MULTIPOINT(${coords})`;
    }

    if (type === 'MultiLineString') {
      const lines = coordinates.map(line =>
        `(${line.map(c => `${c[0]} ${c[1]}`).join(', ')})`
      ).join(', ');
      return `MULTILINESTRING(${lines})`;
    }

    if (type === 'MultiPolygon') {
      const polys = coordinates.map(poly =>
        `((${poly[0].map(c => `${c[0]} ${c[1]}`).join(', ')}))`
      ).join(', ');
      return `MULTIPOLYGON(${polys})`;
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

// Calculate geometry area in m²
function calculateArea(feature) {
  try {
    const geojson = L.geoJSON(feature);
    const latLngs = [];

    geojson.eachLayer(layer => {
      if (layer.getLatLngs) {
        const latlngs = layer.getLatLngs();
        if (Array.isArray(latlngs[0])) {
          latLngs.push(...latlngs[0]);
        } else {
          latLngs.push(...latlngs);
        }
      }
    });

    if (latLngs.length < 3) return 0;

    const polygon = L.polygon(latLngs);
    const bounds = polygon.getBounds();
    const area = (bounds.getNorth() - bounds.getSouth()) *
                 (bounds.getEast() - bounds.getWest()) *
                 111320 * 111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180);

    return Math.abs(area);
  } catch (e) {
    return 0;
  }
}

// Calculate line length in km
function calculateLength(feature) {
  try {
    const geojson = L.geoJSON(feature);
    let totalLength = 0;

    geojson.eachLayer(layer => {
      if (layer instanceof L.Polyline) {
        const latLngs = layer.getLatLngs();
        for (let i = 1; i < latLngs.length; i++) {
          totalLength += latLngs[i-1].distanceTo(latLngs[i]);
        }
      }
    });

    return totalLength / 1000; // Convert to km
  } catch (e) {
    return 0;
  }
}

// Map Controller with auto-zoom (only on initial load)
function MapController({ records, geometryColumn }) {
  const map = useMap();
  const hasZoomedRef = useRef(false);

  useEffect(() => {
    if (!records || records.length === 0 || hasZoomedRef.current) return;

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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      hasZoomedRef.current = true; // Mark as zoomed, never auto-zoom again
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
  searchResults,
  onRecordClick,
  selectedIds,
  onFilterChange,
  activeFilters
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterText, setFilterText] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!filterText) return records;
    const lower = filterText.toLowerCase();
    return records.filter(r =>
      JSON.stringify(r).toLowerCase().includes(lower)
    );
  }, [records, filterText]);

  if (!show) return null;

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '320px',
      backgroundColor: 'white',
      boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
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
        <strong style={{ fontSize: '16px' }}>🔍 Exploration</strong>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '0 8px',
          lineHeight: '1'
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Quick Filter */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '8px', color: '#555', fontWeight: '600' }}>
            🔎 Filtrage Rapide
          </h3>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrer par texte..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
          {filterText && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#666' }}>
              {filteredRecords.length} / {records.length} entités affichées
            </div>
          )}
        </div>

        {/* Semantic Search */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '8px', color: '#555', fontWeight: '600' }}>
            🤖 Recherche Sémantique (Albert)
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="ex: restaurants proches..."
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
              fontSize: '13px',
              fontWeight: '500'
            }}>
              Go
            </button>
          </div>

          {searchResults && searchResults.length > 0 && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#16B378', fontWeight: '500' }}>
              ✓ {searchResults.length} résultat(s) trouvé(s)
            </div>
          )}
        </div>

        {/* Statistics */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '10px', color: '#555', fontWeight: '600' }}>
            📊 Statistiques
          </h3>
          <div style={{
            fontSize: '13px',
            lineHeight: '2',
            color: '#333',
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📍 Points</span>
              <strong>{stats.points}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📏 Lignes</span>
              <strong>{stats.lines}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🔷 Polygones</span>
              <strong>{stats.polygons}</strong>
            </div>
            <div style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '2px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <strong>Total</strong>
              <strong style={{ color: '#16B378' }}>{stats.total}</strong>
            </div>
            {stats.totalArea > 0 && (
              <div style={{ marginTop: '6px', color: '#666', fontSize: '12px' }}>
                Aire totale: <strong>{(stats.totalArea / 1000000).toFixed(2)} km²</strong>
              </div>
            )}
            {stats.totalLength > 0 && (
              <div style={{ marginTop: '4px', color: '#666', fontSize: '12px' }}>
                Longueur totale: <strong>{stats.totalLength.toFixed(2)} km</strong>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '10px', color: '#555', fontWeight: '600' }}>
            🎨 Légende
          </h3>
          <div style={{ fontSize: '13px', lineHeight: '2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3388ff', fontSize: '18px' }}>●</span>
              <span>Points / Multi-Points</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#16B378', fontSize: '18px', fontWeight: 'bold' }}>━</span>
              <span>Lignes / Multi-Lignes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#9b59b6', fontSize: '18px' }}>▬</span>
              <span>Polygones / Multi-Polygones</span>
            </div>
          </div>
        </div>

        {/* Records List */}
        {filteredRecords.length > 0 && (
          <div>
            <h3 style={{ fontSize: '13px', marginBottom: '10px', color: '#555', fontWeight: '600' }}>
              📋 Entités ({filteredRecords.length})
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {filteredRecords.slice(0, 50).map((record, idx) => {
                const isSelected = selectedIds && selectedIds.includes(record.id);
                return (
                  <div
                    key={record.id || idx}
                    onClick={() => onRecordClick && onRecordClick(record.id)}
                    style={{
                      padding: '10px',
                      marginBottom: '6px',
                      backgroundColor: isSelected ? '#e3f2fd' : '#f8f9fa',
                      border: isSelected ? '2px solid #2196f3' : '1px solid #e0e0e0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                        e.currentTarget.style.borderColor = '#bbb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#333' }}>
                      {record.name || record.description || `Entité #${idx + 1}`}
                    </div>
                    {record.description && record.name && (
                      <div style={{ color: '#666', fontSize: '11px' }}>
                        {record.description.substring(0, 60)}{record.description.length > 60 ? '...' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredRecords.length > 50 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#999', fontSize: '11px' }}>
                  ... et {filteredRecords.length - 50} autres
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Widget
function GeoSemanticMapWidget() {
  const [allRecords, setAllRecords] = useState([]);
  const [mappedColumns, setMappedColumns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);
  const gristApiRef = useRef(null);
  const allRecordsRef = useRef([]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!allRecords || !mappedColumns?.geometry) {
      return { points: 0, lines: 0, polygons: 0, total: 0, totalArea: 0, totalLength: 0 };
    }

    const geometryCol = mappedColumns.geometry;
    let points = 0, lines = 0, polygons = 0, totalArea = 0, totalLength = 0;

    allRecords.forEach(record => {
      const normalized = normalizeRecord(record);
      const geom = normalized[geometryCol];
      if (!geom) return;

      const feature = WKTConverter.parse(geom);
      if (!feature) return;

      const type = feature.geometry.type;
      if (type.includes('Point')) points++;
      if (type.includes('Line')) {
        lines++;
        totalLength += calculateLength(feature);
      }
      if (type.includes('Polygon')) {
        polygons++;
        totalArea += calculateArea(feature);
      }
    });

    return { points, lines, polygons, total: points + lines + polygons, totalArea, totalLength };
  }, [allRecords, mappedColumns]);

  useEffect(() => {
    let mounted = true;

    if (!window.grist || typeof window.grist.ready !== 'function') {
      console.log('Grist API not available, using mock data');
      setAllRecords([
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
      // CRITICAL FIX: Only use onRecords to get ALL records, ignore onRecord
      grist.onRecords((recs, mappings) => {
        if (!mounted) return;
        const records = recs || [];
        setAllRecords(records);
        allRecordsRef.current = records;
        setMappedColumns(mappings || {});
        setLoading(false);
        console.log('Received records:', records.length);
      });

      // Track selected row for highlighting, but don't filter the map
      grist.onRecord((record) => {
        if (!mounted || !record) return;
        setSelectedIds([record.id]);
        console.log('Selected record:', record.id);
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
    if (!gristApiRef.current || !gristApiRef.current.docApi) {
      console.error('Grist API not available');
      return;
    }

    try {
      const tableId = await gristApiRef.current.getTableId();
      await gristApiRef.current.docApi.applyUserActions([
        ['AddRecord', tableId, null, {
          [mappedColumns.geometry]: wkt,
          [mappedColumns.name || 'name']: 'Nouvelle géométrie',
          [mappedColumns.description || 'description']: `Créée le ${new Date().toLocaleString()}`
        }]
      ]);
      console.log('Geometry created successfully');
    } catch (err) {
      console.error('Error creating geometry:', err);
    }
  }, [mappedColumns]);

  const handleSearch = useCallback(async (query) => {
    console.log('Searching for:', query);
    // TODO: Implement Albert API semantic search
    // This would call your Albert API endpoint with the query and embeddings
    setSearchResults([]);
  }, []);

  const handleRecordClick = useCallback((recordId) => {
    if (gristApiRef.current && gristApiRef.current.setCursorPos) {
      gristApiRef.current.setCursorPos({ rowId: recordId });
      setSelectedIds([recordId]);
    }
  }, []);

  const getStyle = useCallback((feature, recordId) => {
    const type = feature.geometry.type;
    const isSelected = selectedIds.includes(recordId);
    const isHovered = hoveredId === recordId;

    const baseStyles = {
      'Point': { color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.6, weight: 2, radius: 8 },
      'MultiPoint': { color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.6, weight: 2, radius: 8 },
      'LineString': { color: '#16B378', weight: 3, opacity: 0.8 },
      'MultiLineString': { color: '#16B378', weight: 3, opacity: 0.8 },
      'Polygon': { color: '#9b59b6', fillColor: '#9b59b6', fillOpacity: 0.3, weight: 2 },
      'MultiPolygon': { color: '#9b59b6', fillColor: '#9b59b6', fillOpacity: 0.3, weight: 2 }
    };

    let style = baseStyles[type] || { color: '#3388ff', fillOpacity: 0.3, weight: 2 };

    if (isSelected) {
      style = { ...style, weight: style.weight * 2, fillOpacity: (style.fillOpacity || 0.3) * 1.5 };
    } else if (isHovered) {
      style = { ...style, weight: style.weight * 1.5, fillOpacity: (style.fillOpacity || 0.3) * 1.2 };
    }

    return style;
  }, [selectedIds, hoveredId]);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ color: '#e74c3c', textAlign: 'center' }}>
          <strong>Erreur:</strong> {error}
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

  const validRecords = allRecords.map(normalizeRecord).filter(record => {
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
        zIndex: 1001,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <strong style={{ fontSize: '16px' }}>🗺️ Carte Géo-Sémantique</strong>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '6px 14px',
              backgroundColor: sidebarOpen ? '#16B378' : '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {sidebarOpen ? '◀ Fermer' : '▶ Explorer'}
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              padding: '6px 14px',
              backgroundColor: editMode ? '#e74c3c' : '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {editMode ? '✓ Édition Active' : '✏️ Éditer'}
          </button>
        </div>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
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
        onRecordClick={handleRecordClick}
        selectedIds={selectedIds}
      />

      {/* Map */}
      {validRecords.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#666', padding: '20px' }}>
          <div style={{ fontSize: '64px' }}>📍</div>
          <div style={{ fontSize: '18px', fontWeight: '500' }}>Aucune géométrie valide trouvée</div>
          <div style={{ fontSize: '14px', color: '#999' }}>
            Ajoutez des données avec une colonne géométrie au format WKT
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
          <GeomanController enabled={editMode} onGeometryCreated={handleGeometryCreated} />

          <MarkerClusterGroup>
            {validRecords.map((record, idx) => {
              const feature = WKTConverter.parse(record[geometryCol]);
              if (!feature) return null;

              const name = record[nameCol] || `Entité ${idx + 1}`;
              const description = record[descCol] || '';
              const geomType = feature.geometry.type;

              return (
                <GeoJSON
                  key={`${record.id || idx}-${geomType}`}
                  data={feature}
                  style={() => getStyle(feature, record.id)}
                  onEachFeature={(feature, layer) => {
                    const area = calculateArea(feature);
                    const length = calculateLength(feature);

                    let popupContent = `
                      <div style="min-width: 200px; font-family: sans-serif;">
                        <div style="font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #2c3e50;">
                          ${name}
                        </div>
                        ${description ? `<div style="color: #555; margin-bottom: 8px; font-size: 13px;">${description}</div>` : ''}
                        <div style="font-size: 12px; color: #999; padding-top: 8px; border-top: 1px solid #eee;">
                          <div style="margin-bottom: 4px;"><strong>Type:</strong> ${geomType}</div>
                          ${area > 0 ? `<div style="margin-bottom: 4px;"><strong>Aire:</strong> ${(area / 1000000).toFixed(3)} km²</div>` : ''}
                          ${length > 0 ? `<div><strong>Longueur:</strong> ${length.toFixed(2)} km</div>` : ''}
                        </div>
                      </div>
                    `;

                    layer.bindPopup(popupContent);

                    layer.on('click', () => {
                      if (gristApiRef.current && record.id) {
                        gristApiRef.current.setCursorPos({ rowId: record.id });
                        setSelectedIds([record.id]);
                      }
                    });

                    layer.on('mouseover', () => {
                      setHoveredId(record.id);
                    });

                    layer.on('mouseout', () => {
                      setHoveredId(null);
                    });
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
