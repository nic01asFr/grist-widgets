/**
 * SmartGISWidget - Main Component
 *
 * Root component for Smart-GIS v2 widget
 */

import React, { useEffect, useState } from 'react';
import GristAPI from './core/GristAPI';
import StateManager from './core/StateManager';
import SelectionManager from './services/SelectionManager';
import { initializeSystemTables } from './core/TableSchemas';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import MapView from './components/map/MapView';
import ContextualPanel from './components/layout/ContextualPanel';
import './styles/main.css';
import './styles/popups.css';

const SmartGISWidget = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeWidget();
  }, []);

  const initializeWidget = async () => {
    try {
      console.log('🚀 Initializing Smart-GIS v2...');

      // 1. Initialize Grist API
      await GristAPI.initialize();

      // 2. Initialize all system tables (GIS_WorkSpace, Agent_Queries)
      //    - Creates tables if they don't exist
      //    - Adds missing columns (including ST_* formula columns)
      console.log('📋 Initializing system tables...');
      const initResult = await initializeSystemTables(GristAPI.docApi);

      if (!initResult.success) {
        console.warn('⚠️ Some system tables had initialization issues:', initResult.results);
      } else {
        console.log('✅ All system tables initialized successfully');
      }

      // 3. Initialize SelectionManager for bidirectional sync with Grist
      console.log('🔗 Initializing SelectionManager...');
      SelectionManager.initialize('GIS_WorkSpace');
      console.log('✓ SelectionManager initialized');

      // 4. Load workspace data if available
      try {
        const workspaceData = await GristAPI.fetchTable('GIS_WorkSpace');

        // DEBUG: Log first record to see structure
        if (workspaceData.length > 0) {
          console.log('📊 Sample workspace record:', workspaceData[0]);
          console.log('📊 Record keys:', Object.keys(workspaceData[0]));
          console.log('📊 Has geojson column?', 'geojson' in workspaceData[0]);
          console.log('📊 geojson value type:', typeof workspaceData[0].geojson);
        }

        // Separate features from metadata rows
        const features = [];
        const styleRules = {};

        workspaceData.forEach(record => {
          // Metadata rows: geometry_wgs84 is NULL and has style_rule
          if ((!record.geometry_wgs84 || record.geometry_wgs84 === '') && record.style_rule) {
            try {
              const rule = JSON.parse(record.style_rule);
              styleRules[record.layer_name] = rule;
              console.log(`📐 Loaded style rule for layer "${record.layer_name}"`);
            } catch (error) {
              console.warn(`Failed to parse style rule for layer ${record.layer_name}:`, error);
            }
          }
          // Regular features: has geometry_wgs84
          else if (record.geometry_wgs84) {
            features.push(record);
          }
        });

        StateManager.setState('layers.workspace', features, 'Load workspace');
        StateManager.setState('data.currentTable', 'GIS_WorkSpace', 'Set current table');
        console.log(`✓ Loaded ${features.length} features from GIS_WorkSpace`);

        if (Object.keys(styleRules).length > 0) {
          StateManager.setState('layers.styleRules', styleRules, 'Load style rules');
          console.log(`✓ Loaded ${Object.keys(styleRules).length} style rule(s)`);
        }
      } catch (err) {
        console.warn('⚠️ Could not load workspace data (table may be empty):', err.message);
        StateManager.setState('layers.workspace', [], 'Empty workspace');
      }

      // 5. Mark as ready
      setIsReady(true);
      console.log('✅ Smart-GIS v2 ready');

    } catch (err) {
      console.error('❌ Widget initialization failed:', err);
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="error-state">
        <h2>❌ Initialization Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Reload Widget
        </button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading Smart-GIS v2...</p>
      </div>
    );
  }

  return (
    <div className="smart-gis-container">
      <Navbar />

      <div className="smart-gis-body">
        <Sidebar />

        <div className="map-container">
          <MapView />
          <ContextualPanel />
        </div>
      </div>
    </div>
  );
};

export default SmartGISWidget;
