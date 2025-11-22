/**
 * LayerRenderer - Renders individual geometries
 */

import React, { useMemo } from 'react';
import { Marker, Polyline, Polygon, Popup } from 'react-leaflet';
import { parseWKT } from '../../utils/geometry/wktParser';
import StateManager from '../../core/StateManager';

const LayerRenderer = ({ layer }) => {
  // Cache WKT parsing (expensive operation)
  const geometry = useMemo(() => {
    return parseWKT(layer.geometry_wgs84 || layer.geometry);
  }, [layer.geometry_wgs84, layer.geometry, layer.id]);

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
          <h4>{layer.layer_name}</h4>
          <dl>
            {Object.entries(properties).map(([key, value]) => (
              <React.Fragment key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </React.Fragment>
            ))}
          </dl>
          {layer.area_ha && (
            <div className="metrics">
              <strong>Surface:</strong> {layer.area_ha.toFixed(2)} ha
            </div>
          )}
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
