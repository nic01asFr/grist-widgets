/**
 * SmartGISWidget - Main Component
 *
 * Root component for Smart-GIS v2 widget
 */

import React, { useEffect, useState } from 'react';
import GristAPI from './core/GristAPI';
import StateManager from './core/StateManager';
import { initializeGISTable } from './core/TableSchema';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import MapView from './components/map/MapView';
import ContextualPanel from './components/layout/ContextualPanel';
import './styles/main.css';

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

      // 2. Load system tables if they exist
      const tables = await GristAPI.listTables();

      // 3. Initialize GIS_WorkSpace table (create if needed, ensure columns)
      let hasWorkspace = tables.includes('GIS_WorkSpace');

      if (!hasWorkspace) {
        console.log('📋 Creating GIS_WorkSpace table...');
        try {
          await GristAPI.docApi.applyUserActions([
            ['AddTable', 'GIS_WorkSpace', [
              { id: 'layer_name', type: 'Text' }
            ]]
          ]);
          console.log('✓ GIS_WorkSpace table created');
          hasWorkspace = true;
        } catch (err) {
          console.error('❌ Failed to create GIS_WorkSpace:', err);
          throw new Error('Cannot create GIS_WorkSpace table. Please create it manually.');
        }
      }

      // 4. Ensure all required columns exist (including ST_* formula columns)
      if (hasWorkspace) {
        console.log('🔧 Ensuring GIS_WorkSpace has all required columns...');
        const schemaResult = await initializeGISTable(GristAPI.docApi, 'GIS_WorkSpace');
        if (schemaResult.success) {
          console.log(`✓ ${schemaResult.message}`);
        } else {
          console.warn(`⚠️ Schema initialization warning: ${schemaResult.message}`);
        }
      }

      // 5. Load workspace data
      if (hasWorkspace) {
        const workspaceData = await GristAPI.fetchTable('GIS_WorkSpace');
        StateManager.setState('layers.workspace', workspaceData, 'Load workspace');
        StateManager.setState('data.currentTable', 'GIS_WorkSpace', 'Set current table');
      }

      // 6. Mark as ready
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
