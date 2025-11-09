/**
 * DemoPage Component
 * Test page for Phase 1, 2, 3, 4 & 5 components
 */

import React, { useState, useMemo } from 'react';
import { Button, Input, ColorPicker, Slider, Checkbox, Select, Modal } from './ui';
import { Navbar, MainMenu, MenuSection, MenuDivider, AdjacentPanel } from './layout';
import { SelectionTools, SelectionActionsBar } from './map';
import { LayersSection, ProjectSection, FileImportWizard } from './menu';
import { EntityList, StatsPanel, StyleEditor } from './panels';
import useMapSelection from '../hooks/useMapSelection';
import { colors } from '../constants/colors';

// Mock data for testing (expanded with more entities)
const mockRecords = [
  { id: 1, name: 'Point A', layer_name: 'Couche 1', geometry: 'POINT(2.3522 48.8566)' },
  { id: 2, name: 'Point B', layer_name: 'Couche 1', geometry: 'POINT(2.3540 48.8580)' },
  { id: 3, name: 'Point C', layer_name: 'Couche 1', geometry: 'POINT(2.3510 48.8570)' },
  { id: 4, name: 'Zone Alpha', layer_name: 'Couche 2', geometry: 'POLYGON((2.35 48.85, 2.36 48.85, 2.36 48.86, 2.35 48.86, 2.35 48.85))' },
  { id: 5, name: 'Zone Beta', layer_name: 'Couche 2', geometry: 'POLYGON((2.36 48.86, 2.37 48.86, 2.37 48.87, 2.36 48.87, 2.36 48.86))' },
  { id: 6, name: 'Route Nord', layer_name: 'Couche 2', geometry: 'LINESTRING(2.35 48.85, 2.36 48.86)' },
  { id: 7, name: 'Point Central', layer_name: 'Couche 3', geometry: 'POINT(2.3500 48.8550)' },
  { id: 8, name: 'Route Sud', layer_name: 'Couche 3', geometry: 'LINESTRING(2.34 48.84, 2.35 48.85)' },
  { id: 9, name: 'MultiPoint Test', layer_name: 'Couche 3', geometry: 'MULTIPOINT((2.35 48.85), (2.36 48.86))' },
];

const DemoPage = () => {
  // Layout state
  const [projectName, setProjectName] = useState('Mon Projet GIS 2024');
  const [menuOpen, setMenuOpen] = useState(true);
  const [adjacentPanelOpen, setAdjacentPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // UI components state
  const [inputValue, setInputValue] = useState('');
  const [colorValue, setColorValue] = useState('#3498db');
  const [sliderValue, setSliderValue] = useState(70);
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [selectValue, setSelectValue] = useState('option1');
  const [modalOpen, setModalOpen] = useState(false);

  // Selection state (Phase 3)
  const [activeLayer, setActiveLayer] = useState(null);
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
    isSelected,
  } = useMapSelection(mockRecords, activeLayer);

  // Layer management state (Phase 4)
  const [visibleLayers, setVisibleLayers] = useState(new Set(['Couche 1', 'Couche 2', 'Couche 3']));
  const [panelType, setPanelType] = useState(null); // null | 'entities' | 'stats' | 'style'
  const [panelLayerName, setPanelLayerName] = useState(null);

  // Get entities for active panel layer
  const panelEntities = useMemo(() => {
    if (!panelLayerName) return [];
    return mockRecords.filter(r => r.layer_name === panelLayerName);
  }, [panelLayerName]);

  // Selection actions
  const handleCopy = () => {
    console.log('Copy:', selectedRecords);
    alert(`Copier ${selectedRecords.length} entité(s)`);
  };

  const handleDelete = () => {
    console.log('Delete:', selectedRecords);
    if (window.confirm(`Supprimer ${selectedRecords.length} entité(s) ?`)) {
      clearSelection();
      alert('Entités supprimées (démo)');
    }
  };

  const handleExport = () => {
    console.log('Export:', selectedRecords);
    alert(`Exporter ${selectedRecords.length} entité(s) en GeoJSON`);
  };

  const handleEditStyle = () => {
    console.log('Edit style:', selectedRecords);
    setAdjacentPanelOpen(true);
  };

  const handleZoomTo = () => {
    console.log('Zoom to:', selectedRecords);
    alert(`Recentrer sur ${selectedRecords.length} entité(s)`);
  };

  const handleEditGeometry = () => {
    console.log('Edit geometry:', selectedRecords[0]);
    alert(`Éditer la géométrie de "${selectedRecords[0]?.name}"`);
  };

  // Layer management handlers (Phase 4)
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
    console.log('Edit layer style:', layerName);
    setPanelType('style');
    setPanelLayerName(layerName);
    setAdjacentPanelOpen(true);
  };

  const handleLayerDelete = (layerName) => {
    console.log('Delete layer:', layerName);
    alert(`Supprimer la couche "${layerName}" (démo)`);
  };

  const handleLayerRename = (oldName, newName) => {
    console.log('Rename layer:', oldName, '->', newName);
    alert(`Renommer "${oldName}" en "${newName}" (démo)`);
  };

  const handleEntityListOpen = (layerName) => {
    console.log('Open entity list:', layerName);
    setPanelType('entities');
    setPanelLayerName(layerName);
    setAdjacentPanelOpen(true);
  };

  const handleStatsOpen = (layerName) => {
    console.log('Open stats:', layerName);
    setPanelType('stats');
    setPanelLayerName(layerName);
    setAdjacentPanelOpen(true);
  };

  // Style editor handler (Phase 5)
  const handleStyleApply = (style) => {
    console.log('Apply style:', style, 'to', panelLayerName);
    alert(`Style appliqué à "${panelLayerName}":\n${JSON.stringify(style, null, 2)}`);
    setAdjacentPanelOpen(false);
  };

  // Project management state & handlers (Phase 7)
  const [isDirty, setIsDirty] = useState(false);
  const mockProjects = [
    { name: 'Paris Centre', entityCount: 156, layerCount: 5 },
    { name: 'Île-de-France', entityCount: 423, layerCount: 8 },
    { name: 'Test Import', entityCount: 45, layerCount: 2 },
  ];

  const handleNewProject = (name) => {
    console.log('New project:', name);
    setProjectName(name);
    setIsDirty(false);
    alert(`Nouveau projet créé: "${name}"`);
  };

  const handleSaveProject = (name) => {
    console.log('Save project:', name);
    setProjectName(name);
    setIsDirty(false);
    alert(`Projet sauvegardé: "${name}"\nTable créée: GIS_Project_${name.replace(/\s+/g, '_')}`);
  };

  const handleLoadProject = (name) => {
    console.log('Load project:', name);
    setProjectName(name);
    setIsDirty(false);
    alert(`Projet chargé: "${name}"`);
  };

  const handleProjectExport = (format) => {
    console.log('Export project:', format);
    alert(`Export du projet en ${format.toUpperCase()}\nFichier: ${projectName}.${format}`);
  };

  // File import wizard state & handler (Phase 8)
  const [showImportWizard, setShowImportWizard] = useState(false);

  const handleFileImport = (importData) => {
    console.log('File import:', importData);
    setShowImportWizard(false);
    setIsDirty(true);
    alert(`Import réussi!\n\nCouche: "${importData.layerName}"\nEntités: ${importData.preview?.featureCount}\nProjection: ${importData.projection}`);
  };

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
          <MainMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
          >
            {/* Project Section (Phase 7) */}
            <ProjectSection
              projectName={projectName}
              onProjectNameChange={setProjectName}
              onNewProject={handleNewProject}
              onSaveProject={handleSaveProject}
              onLoadProject={handleLoadProject}
              onExport={handleProjectExport}
              projects={mockProjects}
              isDirty={isDirty}
            />

            <MenuDivider />

            {/* Search Section */}
            <MenuSection title="🔍 Recherche" icon="🔍" defaultExpanded={true}>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Rechercher dans le projet..."
                icon="🔎"
                fullWidth
              />
            </MenuSection>

            <MenuDivider />

            {/* UI Components Demo */}
            <MenuSection title="🎨 Composants UI" icon="🎨" defaultExpanded={true}>
              <div style={styles.demoSection}>
                <h4 style={styles.demoTitle}>Buttons</h4>
                <div style={styles.buttonGrid}>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="primary" size="small">Small</Button>
                  <Button variant="primary" size="large">Large</Button>
                  <Button variant="primary" icon="📥">With Icon</Button>
                  <Button variant="primary" loading>Loading</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </div>

                <h4 style={styles.demoTitle}>Color Picker</h4>
                <ColorPicker
                  value={colorValue}
                  onChange={setColorValue}
                  label="Couleur principale"
                />

                <h4 style={styles.demoTitle}>Slider</h4>
                <Slider
                  value={sliderValue}
                  onChange={setSliderValue}
                  label="Opacité"
                  unit="%"
                />

                <h4 style={styles.demoTitle}>Checkbox</h4>
                <Checkbox
                  checked={checkboxValue}
                  onChange={setCheckboxValue}
                  label="Afficher les bordures"
                />

                <h4 style={styles.demoTitle}>Select</h4>
                <Select
                  value={selectValue}
                  onChange={setSelectValue}
                  options={[
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                  ]}
                  label="Choisir une option"
                  fullWidth
                />

                <h4 style={styles.demoTitle}>Modal</h4>
                <Button onClick={() => setModalOpen(true)} fullWidth>
                  Ouvrir Modal
                </Button>
              </div>
            </MenuSection>

            <MenuDivider />

            {/* Layers Section (Phase 4) */}
            <LayersSection
              records={mockRecords}
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

            <MenuDivider />

            {/* Selection Demo Section (Phase 3) */}
            <MenuSection title="🎯 Sélection (Phase 3)" icon="🎯" defaultExpanded={true}>
              <div style={styles.demoSection}>
                <h4 style={styles.demoTitle}>Couche Active</h4>
                <Select
                  value={activeLayer || ''}
                  onChange={(val) => setActiveLayer(val === '' ? null : val)}
                  options={[
                    { value: '', label: 'Toutes les couches' },
                    { value: 'Couche 1', label: 'Couche 1' },
                    { value: 'Couche 2', label: 'Couche 2' },
                    { value: 'Couche 3', label: 'Couche 3' },
                  ]}
                  label="Filtrer par couche"
                  fullWidth
                />

                <h4 style={styles.demoTitle}>Sélection rapide</h4>
                <div style={styles.buttonGrid}>
                  <Button onClick={() => selectEntity(1)} size="small">
                    Point A
                  </Button>
                  <Button onClick={() => selectEntity(2)} size="small">
                    Point B
                  </Button>
                  <Button onClick={() => selectEntity(3)} size="small">
                    Zone C
                  </Button>
                  <Button onClick={() => selectEntity(4)} size="small">
                    Route D
                  </Button>
                  <Button onClick={() => selectEntity(5)} size="small">
                    Point E
                  </Button>
                  <Button onClick={() => selectByIds([1, 2, 3])} size="small" variant="secondary">
                    Multi 1-3
                  </Button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button onClick={selectAll} variant="success" fullWidth>
                    Tout sélectionner
                  </Button>
                  <Button onClick={clearSelection} variant="danger" fullWidth>
                    Effacer
                  </Button>
                </div>

                <h4 style={styles.demoTitle}>Mode de sélection</h4>
                <div style={styles.buttonGrid}>
                  <Button
                    onClick={() => setSelectionMode('pointer')}
                    variant={selectionMode === 'pointer' ? 'primary' : 'ghost'}
                    size="small"
                  >
                    👆 Pointeur
                  </Button>
                  <Button
                    onClick={() => setSelectionMode('rectangle')}
                    variant={selectionMode === 'rectangle' ? 'primary' : 'ghost'}
                    size="small"
                  >
                    ▢ Rectangle
                  </Button>
                  <Button
                    onClick={() => setSelectionMode('circle')}
                    variant={selectionMode === 'circle' ? 'primary' : 'ghost'}
                    size="small"
                  >
                    ⭕ Cercle
                  </Button>
                  <Button
                    onClick={() => setSelectionMode('lasso')}
                    variant={selectionMode === 'lasso' ? 'primary' : 'ghost'}
                    size="small"
                  >
                    ✏️ Lasso
                  </Button>
                </div>

                {selection.length > 0 && (
                  <>
                    <h4 style={styles.demoTitle}>Sélection actuelle</h4>
                    <div style={styles.selectionInfo}>
                      <p><strong>Nombre:</strong> {selectionInfo.count}</p>
                      <p><strong>Couches:</strong> {selectionInfo.layerCount}</p>
                      <p><strong>Entités:</strong></p>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '12px' }}>
                        {selectedRecords.map(r => (
                          <li key={r.id}>{r.name} ({r.layer_name})</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </MenuSection>

            <MenuDivider />

            {/* Test Section */}
            <MenuSection title="🧪 Tests" icon="🧪" defaultExpanded={false}>
              <div style={styles.demoSection}>
                <Button
                  onClick={() => setAdjacentPanelOpen(!adjacentPanelOpen)}
                  fullWidth
                >
                  {adjacentPanelOpen ? 'Fermer' : 'Ouvrir'} Adjacent Panel
                </Button>
                <Button
                  onClick={() => setShowImportWizard(true)}
                  variant="primary"
                  icon="📥"
                  fullWidth
                >
                  Importer un fichier
                </Button>
                <Button
                  onClick={() => setIsDirty(!isDirty)}
                  variant={isDirty ? 'success' : 'ghost'}
                  fullWidth
                >
                  {isDirty ? '✓ Projet modifié' : 'Marquer comme modifié'}
                </Button>
              </div>
            </MenuSection>
          </MainMenu>
        )}

        {/* Adjacent Panel (Phase 4) */}
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
              panelType === 'style' ? `🎨 Style - ${panelLayerName}` :
              '🎨 Éditeur de Style'
            }
          >
            {panelType === 'entities' ? (
              <EntityList
                entities={panelEntities}
                layerName={panelLayerName}
                selection={selection}
                onEntityClick={(id) => {
                  selectEntity(id);
                  alert(`Clic sur entité #${id}`);
                }}
                onEntitySelect={selectEntity}
                onZoomTo={(ids) => alert(`Recentrer sur: ${Array.isArray(ids) ? ids.join(', ') : ids}`)}
                onEdit={(ids) => alert(`Éditer: ${Array.isArray(ids) ? ids.join(', ') : ids}`)}
                onDelete={(ids) => {
                  if (window.confirm(`Supprimer ${Array.isArray(ids) ? ids.length : 1} entité(s) ?`)) {
                    alert('Entités supprimées (démo)');
                  }
                }}
                onSelectAll={(ids) => selectByIds(ids)}
                onClearSelection={clearSelection}
              />
            ) : panelType === 'stats' ? (
              <StatsPanel
                layerName={panelLayerName}
                entities={panelEntities}
              />
            ) : panelType === 'style' ? (
              <StyleEditor
                targetName={panelLayerName}
                targetType="layer"
                initialStyle={{
                  fillColor: colorValue,
                  fillOpacity: sliderValue,
                }}
                onApply={handleStyleApply}
                onCancel={() => setAdjacentPanelOpen(false)}
              />
            ) : (
              <div style={{ padding: '16px' }}>
                <h4>Exemple de contenu</h4>
                <p>Ce panneau apparaît à droite du menu principal.</p>

                <ColorPicker
                  value={colorValue}
                  onChange={setColorValue}
                  label="Couleur"
                />

                <div style={{ marginTop: '16px' }}>
                  <Slider
                    value={sliderValue}
                    onChange={setSliderValue}
                    label="Transparence"
                    unit="%"
                  />
                </div>

                <div style={{ marginTop: '16px' }}>
                  <Checkbox
                    checked={checkboxValue}
                    onChange={setCheckboxValue}
                    label="Activer remplissage"
                  />
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" onClick={() => setAdjacentPanelOpen(false)} fullWidth>
                    Annuler
                  </Button>
                  <Button variant="primary" fullWidth>
                    Appliquer
                  </Button>
                </div>
              </div>
            )}
          </AdjacentPanel>
        )}

        {/* Map area */}
        <div style={styles.mapArea}>
          {/* Selection Tools (Phase 3) */}
          <SelectionTools
            selectionMode={selectionMode}
            onModeChange={setSelectionMode}
            activeLayer={activeLayer}
            selectionCount={selection.length}
            onClear={clearSelection}
          />

          {/* Map Placeholder */}
          <div style={styles.mapPlaceholder}>
            <h1>🗺️</h1>
            <h2>Zone Carte (Phase 3 Demo)</h2>
            <p>Project: {projectName}</p>
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <p><strong>Mode de sélection:</strong> {selectionMode}</p>
              <p><strong>Couche active:</strong> {activeLayer || 'Toutes'}</p>
              <p><strong>Entités sélectionnées:</strong> {selection.length}</p>
              {selection.length > 0 && (
                <p style={{ fontSize: '12px', marginTop: '8px', color: colors.textSecondary }}>
                  IDs: [{selection.join(', ')}]
                </p>
              )}
            </div>
            <p style={{ marginTop: '20px', fontSize: '12px', color: colors.textSecondary }}>
              Mode: {fullscreen ? 'Plein écran' : 'Normal'}
            </p>
          </div>

          {/* Selection Actions Bar (Phase 3) */}
          <SelectionActionsBar
            selectionCount={selection.length}
            selectionInfo={selectionInfo}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onExport={handleExport}
            onEditStyle={handleEditStyle}
            onZoomTo={handleZoomTo}
            onEditGeometry={handleEditGeometry}
            onClear={clearSelection}
          />
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Exemple Modal"
        size="medium"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirmer
            </Button>
          </>
        }
      >
        <p>Ceci est un exemple de modal avec header et footer.</p>
        <p>Les modals peuvent contenir n'importe quel contenu React.</p>

        <div style={{ marginTop: '20px' }}>
          <Input
            placeholder="Entrez du texte..."
            fullWidth
          />
        </div>
      </Modal>

      {/* File Import Wizard Modal (Phase 8) */}
      <Modal
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        title="Assistant d'import de fichier"
        size="large"
      >
        <FileImportWizard
          onImport={handleFileImport}
          onCancel={() => setShowImportWizard(false)}
        />
      </Modal>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
    position: 'relative', // For absolute positioned selection components
  },
  mapPlaceholder: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  demoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  demoTitle: {
    margin: '16px 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  selectionInfo: {
    padding: '12px',
    backgroundColor: colors.grayVeryLight,
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
    fontSize: '13px',
    color: colors.textPrimary,
  },
};

export default DemoPage;
