/**
 * Entry Point for Smart-GIS v2
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import SmartGISWidget from './SmartGISWidget';
import 'leaflet/dist/leaflet.css';
// Leaflet-geoman CSS will be added when geoman tools are implemented
// import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SmartGISWidget />
  </React.StrictMode>
);
