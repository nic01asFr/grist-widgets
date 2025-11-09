/**
 * DemoPage Component
 * Test page for Phase 1, 2 & 3 components
 */

import React, { useState } from 'react';
import { Button, Input, ColorPicker, Slider, Checkbox, Select, Modal } from './ui';
import { Navbar, MainMenu, MenuSection, MenuDivider, AdjacentPanel } from './layout';
import { SelectionTools, SelectionActionsBar } from './map';
import useMapSelection from '../hooks/useMapSelection';
import { colors } from '../constants/colors';

// Mock data for testing selection
const mockRecords = [
  { id: 1, name: 'Point A', layer_name: 'Couche 1', geometry: 'POINT(2.3522 48.8566)' },
  { id: 2, name: 'Point B', layer_name: 'Couche 1', geometry: 'POINT(2.3540 48.8580)' },
  { id: 3, name: 'Zone C', layer_name: 'Couche 2', geometry: 'POLYGON((2.35 48.85, 2.36 48.85, 2.36 48.86, 2.35 48.86, 2.35 48.85))' },
  { id: 4, name: 'Route D', layer_name: 'Couche 2', geometry: 'LINESTRING(2.35 48.85, 2.36 48.86)' },
  { id: 5, name: 'Point E', layer_name: 'Couche 3', geometry: 'POINT(2.3500 48.8550)' },
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
              </div>
            </MenuSection>
          </MainMenu>
        )}

        {/* Adjacent Panel */}
        {!fullscreen && (
          <AdjacentPanel
            isOpen={adjacentPanelOpen}
            onClose={() => setAdjacentPanelOpen(false)}
            title="🎨 Éditeur de Style"
          >
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
