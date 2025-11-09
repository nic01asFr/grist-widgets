/**
 * DemoPage Component
 * Test page for Phase 1 & 2 components
 */

import React, { useState } from 'react';
import { Button, Input, ColorPicker, Slider, Checkbox, Select, Modal } from './ui';
import { Navbar, MainMenu, MenuSection, MenuDivider, AdjacentPanel } from './layout';
import { colors } from '../constants/colors';

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
          <div style={styles.mapPlaceholder}>
            <h1>🗺️</h1>
            <h2>Zone Carte</h2>
            <p>Project: {projectName}</p>
            <p>Color: {colorValue}</p>
            <p>Slider: {sliderValue}%</p>
            <p>Checkbox: {checkboxValue ? 'Coché' : 'Décoché'}</p>
            <p>Select: {selectValue}</p>
            <p style={{ marginTop: '20px', fontSize: '12px', color: colors.textSecondary }}>
              Mode: {fullscreen ? 'Plein écran' : 'Normal'}
            </p>
          </div>
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
};

export default DemoPage;
