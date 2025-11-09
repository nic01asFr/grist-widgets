/**
 * SmartGISWidget - Main Component v3.0
 * Complete rewrite with new UX architecture
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar, MainMenu, MenuDivider, AdjacentPanel } from './components/layout';
import { SelectionTools, SelectionActionsBar, EditionToolbar } from './components/map';
import { LayersSection, ProjectSection, FileImportWizard, SearchSection } from './components/menu';
import { EntityList, StatsPanel, StyleEditor } from './components/panels';
import useMapSelection from './hooks/useMapSelection';
import { colors } from './constants/colors';

// Import Grist API
import { setupSystemInfrastructure } from './systemInfrastructure';
import { fetchWorkspaceData, bulkAddToWorkspace, updateInWorkspace, deleteFromWorkspace } from './workspaceManager';

const SmartGISWidget = () => {
  // Grist state
  const [gristApi, setGristApi] = useState(null);
  const [docApi, setDocApi] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Data state
  const [workspaceData, setWorkspaceData] = useState([]);
  const [projectName, setProjectName] = useState('Smart GIS Project');
  const [isDirty, setIsDirty] = useState(false);

  // UI state
  const [menuOpen, setMenuOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [adjacentPanelOpen, setAdjacentPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState(null); // 'entities' | 'stats' | 'style'
  const [panelLayerName, setPanelLayerName] = useState(null);

  // Layer state
  const [activeLayer, setActiveLayer] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState(new Set());

  // Selection state
  const {
    selection,
    selectedRecords,
    selectionInfo,
    selectionMode,
    setSelectionMode,
    selectEntity,
    selectByIds,
    clearSelection,
    selectAll,
  } = useMapSelection(workspaceData, activeLayer);

  // Edition state
  const [editionMode, setEditionMode] = useState(null);
  const [drawMode, setDrawMode] = useState('marker');
  const [isEditing, setIsEditing] = useState(false);

  // Import state
  const [showImportWizard, setShowImportWizard] = useState(false);

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
        const api = window.grist;
        // @ts-ignore
        const doc = window.grist.docApi;

        setGristApi(api);
        setDocApi(doc);

        // Setup system tables
        console.log('🏗️ Setting up system infrastructure...');
        const setupResult = await setupSystemInfrastructure(doc);

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

  const handleLayerEdit = (layerName) => {
    setPanelType('style');
    setPanelLayerName(layerName);
    setAdjacentPanelOpen(true);
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

  const handleEntityListOpen = (layerName) => {
    setPanelType('entities');
    setPanelLayerName(layerName);
    setAdjacentPanelOpen(true);
  };

  const handleStatsOpen = (layerName) => {
    setPanelType('stats');
    setPanelLayerName(layerName);
    setAdjacentPanelOpen(true);
  };

  // Style editor
  const handleStyleApply = async (style) => {
    console.log('Apply style:', style, 'to', panelLayerName);
    // TODO: Save style to GIS_Styles table
    setAdjacentPanelOpen(false);
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

  // File import
  const handleFileImport = async (importData) => {
    if (!docApi) return;

    // TODO: Parse file and import entities
    console.log('Import:', importData);
    setShowImportWizard(false);
    setIsDirty(true);
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

  // Get entities for panel
  const panelEntities = useMemo(() => {
    if (!panelLayerName) return [];
    return workspaceData.filter(r => r.layer_name === panelLayerName);
  }, [panelLayerName, workspaceData]);

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
        {/* Main Menu */}
        {!fullscreen && (
          <MainMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)}>
            {/* Project Section */}
            <ProjectSection
              projectName={projectName}
              onProjectNameChange={setProjectName}
              onNewProject={handleNewProject}
              onSaveProject={handleSaveProject}
              onLoadProject={handleLoadProject}
              onExport={handleProjectExport}
              projects={[]} // TODO: Load from Grist
              isDirty={isDirty}
            />

            <MenuDivider />

            {/* Search Section */}
            <SearchSection
              records={workspaceData}
              onEntitySelect={selectEntity}
              onZoomTo={(ids) => {
                // TODO: Zoom map to bounds
                console.log('Zoom to:', ids);
              }}
              onSemanticSearch={(query) => {
                // TODO: Call VECTOR_SEARCH
                console.log('Semantic search:', query);
              }}
            />

            <MenuDivider />

            {/* Layers Section */}
            <LayersSection
              records={workspaceData}
              activeLayer={activeLayer}
              onActiveLayerChange={setActiveLayer}
              onLayerVisibilityToggle={handleLayerVisibilityToggle}
              onLayerEdit={handleLayerEdit}
              onLayerDelete={handleLayerDelete}
              onLayerRename={handleLayerRename}
              onEntityListOpen={handleEntityListOpen}
              onStatsOpen={handleStatsOpen}
              visibleLayers={visibleLayers}
            />
          </MainMenu>
        )}

        {/* Adjacent Panel */}
        {!fullscreen && (
          <AdjacentPanel
            isOpen={adjacentPanelOpen}
            onClose={() => {
              setAdjacentPanelOpen(false);
              setPanelType(null);
              setPanelLayerName(null);
            }}
            title={
              panelType === 'entities' ? `📋 Entités - ${panelLayerName}` :
              panelType === 'stats' ? `📊 Statistiques - ${panelLayerName}` :
              `🎨 Style - ${panelLayerName}`
            }
          >
            {panelType === 'entities' ? (
              <EntityList
                entities={panelEntities}
                layerName={panelLayerName}
                selection={selection}
                onEntityClick={selectEntity}
                onEntitySelect={selectEntity}
                onZoomTo={(ids) => console.log('Zoom to:', ids)}
                onEdit={(ids) => console.log('Edit:', ids)}
                onDelete={async (ids) => {
                  if (!docApi) return;
                  const idList = Array.isArray(ids) ? ids : [ids];
                  if (window.confirm(`Supprimer ${idList.length} entité(s) ?`)) {
                    for (const id of idList) {
                      await deleteFromWorkspace(docApi, id);
                    }
                    await refreshWorkspace();
                    setIsDirty(true);
                  }
                }}
                onSelectAll={selectByIds}
                onClearSelection={clearSelection}
              />
            ) : panelType === 'stats' ? (
              <StatsPanel layerName={panelLayerName} entities={panelEntities} />
            ) : (
              <StyleEditor
                targetName={panelLayerName}
                targetType="layer"
                onApply={handleStyleApply}
                onCancel={() => setAdjacentPanelOpen(false)}
              />
            )}
          </AdjacentPanel>
        )}

        {/* Map area */}
        <div style={styles.mapArea}>
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

          {/* Map Placeholder - TODO: Replace with real Leaflet map */}
          <div style={styles.mapPlaceholder}>
            <h1>🗺️</h1>
            <h2>Smart GIS Widget v3.0</h2>
            <p>Carte Leaflet à intégrer ici</p>
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: colors.white, borderRadius: '8px' }}>
              <p><strong>Entités:</strong> {workspaceData.length}</p>
              <p><strong>Couches:</strong> {visibleLayers.size}</p>
              <p><strong>Couche active:</strong> {activeLayer || 'Aucune'}</p>
              <p><strong>Sélection:</strong> {selection.length}</p>
            </div>
          </div>

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
            onEditStyle={() => {
              setPanelType('style');
              setAdjacentPanelOpen(true);
            }}
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
    position: 'relative',
    overflow: 'hidden',
  },
  mapArea: {
    flex: 1,
    backgroundColor: colors.grayVeryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mapPlaceholder: {
    textAlign: 'center',
    color: colors.textSecondary,
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
