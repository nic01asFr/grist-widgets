/**
 * SmartGISWidget - Main Component v3.0
 * Complete UX refactoring with tabbed menu
 */

import React, { useState, useEffect } from 'react';
import { Navbar, TabbedMenu } from './components/layout';
import { SelectionTools, SelectionActionsBar, EditionToolbar, MapView, ZoomControls } from './components/map';
import { LayersSection, ProjectSection, SearchSection } from './components/menu';
import { EntityPanel } from './components/panels';
import MenuContent from './components/layout/MenuContent';
import useMapSelection from './hooks/useMapSelection';
import { colors } from './constants/colors';

// Import Grist API
import { setupSystemInfrastructure } from './systemInfrastructure';
import { fetchWorkspaceData, updateInWorkspace, deleteFromWorkspace } from './workspaceManager';

const SmartGISWidget = () => {
  // Grist state
  const [docApi, setDocApi] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Data state
  const [workspaceData, setWorkspaceData] = useState([]);
  const [projectName, setProjectName] = useState('Smart GIS Project');
  const [isDirty, setIsDirty] = useState(false);

  // UI state
  const [menuOpen, setMenuOpen] = useState(true);
  const [menuWidth, setMenuWidth] = useState(320);
  const [fullscreen, setFullscreen] = useState(false);
  const [entityPanelOpen, setEntityPanelOpen] = useState(false);

  // Layer state
  const [activeLayer, setActiveLayer] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState(new Set());

  // Selection state
  const {
    selection,
    selectionInfo,
    selectionMode,
    setSelectionMode,
    selectEntity,
    selectByIds,
    clearSelection,
  } = useMapSelection(workspaceData, activeLayer);

  // Edition state
  const [editionMode, setEditionMode] = useState(null);
  const [drawMode, setDrawMode] = useState('marker');
  const [isEditing, setIsEditing] = useState(false);

  // Initialize Grist connection
  useEffect(() => {
    const initGrist = async () => {
      try {
        console.log('🔌 Connecting to Grist...');

        // @ts-ignore - Grist global
        await window.grist.ready({
          requiredAccess: 'full',
          allowSelectBy: true,
        });

        // @ts-ignore
        const grist = window.grist;
        const doc = grist.docApi;

        setDocApi(doc);

        // Setup system tables
        console.log('🏗️ Setting up system infrastructure...');
        const setupResult = await setupSystemInfrastructure(grist);

        if (setupResult.success) {
          console.log('✅ System ready');

          // Load workspace data
          await loadWorkspace(doc);

          setIsReady(true);
        } else {
          console.error('❌ Setup failed:', setupResult.error);
        }
      } catch (error) {
        console.error('❌ Grist initialization failed:', error);
      }
    };

    initGrist();
  }, []);

  // Load workspace data
  const loadWorkspace = async (doc) => {
    try {
      const result = await fetchWorkspaceData(doc);
      if (result.success) {
        setWorkspaceData(result.records);

        // Extract unique layers and set visibility
        const layers = new Set(result.records.map(r => r.layer_name).filter(Boolean));
        setVisibleLayers(layers);

        console.log(`📊 Loaded ${result.records.length} entities from ${layers.size} layers`);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  // Refresh workspace data
  const refreshWorkspace = async () => {
    if (docApi) {
      await loadWorkspace(docApi);
    }
  };

  // Layer management handlers
  const handleLayerVisibilityToggle = (layerName) => {
    setVisibleLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerName)) {
        newSet.delete(layerName);
      } else {
        newSet.add(layerName);
      }
      return newSet;
    });
  };

  const handleLayerDelete = async (layerName) => {
    if (!docApi) return;

    const entitiesToDelete = workspaceData.filter(r => r.layer_name === layerName);
    if (window.confirm(`Supprimer la couche "${layerName}" (${entitiesToDelete.length} entités) ?`)) {
      for (const entity of entitiesToDelete) {
        await deleteFromWorkspace(docApi, entity.id);
      }
      await refreshWorkspace();
      setIsDirty(true);
    }
  };

  const handleLayerRename = async (oldName, newName) => {
    if (!docApi) return;

    const entitiesToRename = workspaceData.filter(r => r.layer_name === oldName);
    for (const entity of entitiesToRename) {
      await updateInWorkspace(docApi, entity.id, { layer_name: newName });
    }
    await refreshWorkspace();
    setIsDirty(true);
  };

  // Project management
  const handleNewProject = async (name) => {
    if (!docApi) return;

    // Clear workspace
    for (const record of workspaceData) {
      await deleteFromWorkspace(docApi, record.id);
    }

    setProjectName(name);
    await refreshWorkspace();
    setIsDirty(false);
  };

  const handleSaveProject = async (name) => {
    // TODO: Create table copy GIS_Project_{name}
    setProjectName(name);
    setIsDirty(false);
  };

  const handleLoadProject = async (name) => {
    // TODO: Load from GIS_Project_{name}
    setProjectName(name);
    setIsDirty(false);
  };

  const handleProjectExport = async (format) => {
    // TODO: Export to format
    console.log('Export to', format);
  };

  // Edition handlers
  const handleEditionModeChange = (mode) => {
    setEditionMode(mode);
    setIsEditing(!!mode);
  };

  const handleEditionSave = async () => {
    // TODO: Save geometry changes
    setEditionMode(null);
    setIsEditing(false);
    setIsDirty(true);
  };

  const handleEditionCancel = () => {
    setEditionMode(null);
    setIsEditing(false);
  };

  // Loading state
  if (!isReady) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingIcon}>🗺️</div>
        <div style={styles.loadingText}>Chargement du Smart GIS Widget...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <Navbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(!menuOpen)}
        onToggleFullscreen={() => setFullscreen(!fullscreen)}
      />

      {/* Main content */}
      <div style={styles.content}>
        {/* Tabbed Menu */}
        {!fullscreen && menuOpen && (
          <TabbedMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            initialWidth={menuWidth}
            onWidthChange={setMenuWidth}
          >
            <MenuContent
              layersContent={
                <LayersSection
                  records={workspaceData}
                  activeLayer={activeLayer}
                  onActiveLayerChange={setActiveLayer}
                  onLayerVisibilityToggle={handleLayerVisibilityToggle}
                  onLayerDelete={handleLayerDelete}
                  onLayerRename={handleLayerRename}
                  onEntityListOpen={(layerName) => {
                    const layerEntities = workspaceData.filter(r => r.layer_name === layerName);
                    selectByIds(layerEntities.map(r => r.id));
                    setEntityPanelOpen(true);
                  }}
                  visibleLayers={visibleLayers}
                />
              }
              projectContent={
                <ProjectSection
                  onNewProject={handleNewProject}
                  onSaveProject={handleSaveProject}
                  onLoadProject={handleLoadProject}
                  onExport={handleProjectExport}
                  projects={[]}
                  isDirty={isDirty}
                />
              }
              searchContent={
                <SearchSection
                  records={workspaceData}
                  onEntitySelect={(id) => {
                    selectEntity(id);
                    setEntityPanelOpen(true);
                  }}
                  onZoomTo={(ids) => console.log('Zoom to:', ids)}
                  onSemanticSearch={(query) => console.log('Semantic search:', query)}
                />
              }
            />
          </TabbedMenu>
        )}

        {/* Map area */}
        <div style={styles.mapArea}>
          {/* Zoom Controls */}
          <ZoomControls
            menuWidth={(menuOpen && !fullscreen) ? menuWidth : 0}
            onZoomIn={() => console.log('Zoom in')}
            onZoomOut={() => console.log('Zoom out')}
            onResetZoom={() => console.log('Reset zoom')}
          />

          {/* Edition Toolbar */}
          <EditionToolbar
            editionMode={editionMode}
            drawMode={drawMode}
            activeLayer={activeLayer}
            onModeChange={handleEditionModeChange}
            onDrawModeChange={setDrawMode}
            onSave={handleEditionSave}
            onCancel={handleEditionCancel}
            isEditing={isEditing}
          />

          {/* Selection Tools */}
          <SelectionTools
            selectionMode={selectionMode}
            onModeChange={setSelectionMode}
            activeLayer={activeLayer}
            selectionCount={selection.length}
            onClear={clearSelection}
          />

          {/* Entity Panel */}
          {entityPanelOpen && selection.length > 0 && (
            <EntityPanel
              entities={workspaceData}
              selectedEntityIds={selection}
              onClose={() => setEntityPanelOpen(false)}
              onEdit={(id) => console.log('Edit entity:', id)}
            />
          )}

          {/* Leaflet Map */}
          <MapView
            records={workspaceData}
            visibleLayers={visibleLayers}
            selectedIds={selection}
            onEntityClick={(id) => {
              selectEntity(id);
              setEntityPanelOpen(true);
            }}
          />

          {/* Selection Actions Bar */}
          <SelectionActionsBar
            selectionCount={selection.length}
            selectionInfo={selectionInfo}
            onCopy={() => console.log('Copy:', selection)}
            onDelete={async () => {
              if (!docApi) return;
              if (window.confirm(`Supprimer ${selection.length} entité(s) ?`)) {
                for (const id of selection) {
                  await deleteFromWorkspace(docApi, id);
                }
                await refreshWorkspace();
                clearSelection();
                setIsDirty(true);
              }
            }}
            onExport={() => console.log('Export:', selection)}
            onEditStyle={() => console.log('Edit style')}
            onZoomTo={() => console.log('Zoom to:', selection)}
            onEditGeometry={() => console.log('Edit geometry:', selection[0])}
            onClear={clearSelection}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: colors.grayVeryLight,
  },
  loadingIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.textPrimary,
  },
};

export default SmartGISWidget;
