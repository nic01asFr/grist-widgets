/**
 * LayerRenderer - Renders individual geometries
 *
 * Reads Grist ST_AsGeoJSON results from `geojson` column
 * (calculated by: geojson = ST_AsGeoJSON($geometry_wgs84))
 */

import React, { useMemo } from 'react';
import { Marker, Polyline, Polygon, Popup } from 'react-leaflet';
import { parseGeoJSON } from '../../utils/geometry/geoJSONParser';
import StateManager from '../../core/StateManager';

const LayerRenderer = ({ layer }) => {
  // Read GeoJSON from Grist ST_AsGeoJSON formula column
  const geometry = useMemo(() => {
    // Use `geojson` column (ST_AsGeoJSON result) if available
    if (layer.geojson) {
      return parseGeoJSON(layer.geojson);
    }
    // Fallback: empty geometry
    return { type: null, coordinates: [] };
  }, [layer.geojson, layer.id]);

  const style = useMemo(() => {
    try {
      return layer.style ? JSON.parse(layer.style) : getDefaultStyle(geometry.type);
    } catch {
      return getDefaultStyle(geometry.type);
    }
  }, [layer.style, geometry.type]);

  const handleClick = () => {
    const currentSelection = StateManager.getState('selection.ids');

    // Toggle selection
    if (currentSelection.includes(layer.id)) {
      StateManager.setState(
        'selection.ids',
        currentSelection.filter(id => id !== layer.id),
        'Deselect feature'
      );
    } else {
      StateManager.setState(
        'selection.ids',
        [...currentSelection, layer.id],
        'Select feature'
      );
    }
  };

  const renderPopup = () => {
    const properties = layer.properties ? JSON.parse(layer.properties) : {};

    return (
      <Popup>
        <div className="feature-popup">
          <h4>{layer.feature_name || layer.layer_name}</h4>
          <p><em>{layer.layer_name}</em></p>

          {/* Display properties */}
          {Object.keys(properties).length > 0 && (
            <dl>
              {Object.entries(properties).slice(0, 5).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}

          {/* Display ST_* calculated metrics (read from Grist formulas) */}
          <div className="metrics">
            {layer.geometry_type && (
              <div><strong>Type:</strong> {layer.geometry_type}</div>
            )}

            {/* Polygon metrics */}
            {layer.area_km2 && (
              <div><strong>Surface:</strong> {layer.area_km2.toFixed(2)} km²</div>
            )}
            {layer.perimeter_km && (
              <div><strong>Périmètre:</strong> {layer.perimeter_km.toFixed(2)} km</div>
            )}

            {/* LineString metrics */}
            {layer.length_km && (
              <div><strong>Longueur:</strong> {layer.length_km.toFixed(2)} km</div>
            )}

            {/* Center coordinates (all geometry types) */}
            {layer.center_lat && layer.center_lon && (
              <div>
                <strong>Centre:</strong> {layer.center_lat.toFixed(6)}, {layer.center_lon.toFixed(6)}
              </div>
            )}

            {/* Validation */}
            {layer.is_valid_geom !== undefined && !layer.is_valid_geom && (
              <div style={{ color: 'red' }}>⚠️ Géométrie invalide</div>
            )}
          </div>
        </div>
      </Popup>
    );
  };

  if (!geometry.coordinates || geometry.coordinates.length === 0) {
    return null;
  }

  switch (geometry.type) {
    case 'Point':
      return (
        <Marker
          position={geometry.coordinates}
          eventHandlers={{ click: handleClick }}
        >
          {renderPopup()}
        </Marker>
      );

    case 'LineString':
      return (
        <Polyline
          positions={geometry.coordinates}
          pathOptions={style}
          eventHandlers={{ click: handleClick }}
        >
          {renderPopup()}
        </Polyline>
      );

    case 'Polygon':
      return (
        <Polygon
          positions={geometry.coordinates}
          pathOptions={style}
          eventHandlers={{ click: handleClick }}
        >
          {renderPopup()}
        </Polygon>
      );

    // MultiGeometry: render multiple components
    case 'MultiPoint':
      return (
        <>
          {geometry.coordinates.map((coords, idx) => (
            <Marker
              key={`${layer.id}-${idx}`}
              position={coords}
              eventHandlers={{ click: handleClick }}
            >
              {renderPopup()}
            </Marker>
          ))}
        </>
      );

    case 'MultiLineString':
      return (
        <>
          {geometry.coordinates.map((coords, idx) => (
            <Polyline
              key={`${layer.id}-${idx}`}
              positions={coords}
              pathOptions={style}
              eventHandlers={{ click: handleClick }}
            >
              {renderPopup()}
            </Polyline>
          ))}
        </>
      );

    case 'MultiPolygon':
      return (
        <>
          {geometry.coordinates.map((coords, idx) => (
            <Polygon
              key={`${layer.id}-${idx}`}
              positions={coords}
              pathOptions={style}
              eventHandlers={{ click: handleClick }}
            >
              {renderPopup()}
            </Polygon>
          ))}
        </>
      );

    default:
      return null;
  }
};

function getDefaultStyle(geometryType) {
  const defaults = {
    Point: {
      color: '#3388ff',
      fillColor: '#3388ff',
      fillOpacity: 0.6,
      radius: 8,
      weight: 2
    },
    LineString: {
      color: '#ff7800',
      weight: 3,
      opacity: 0.8
    },
    Polygon: {
      color: '#ff7800',
      fillColor: '#ff7800',
      fillOpacity: 0.3,
      weight: 2
    }
  };

  return defaults[geometryType] || defaults.Polygon;
}

export default LayerRenderer;
