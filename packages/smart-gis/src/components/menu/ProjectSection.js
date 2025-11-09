/**
 * ProjectSection Component
 * Smart GIS Widget v3.0
 *
 * Project management (new, save, load, export)
 */

import React, { useState } from 'react';
import { Button, Input, Select, Modal } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const ProjectSection = ({
  projectName = 'Projet Sans Titre',
  onProjectNameChange,
  onNewProject,
  onSaveProject,
  onLoadProject,
  onExport,
  projects = [], // List of available projects
  isDirty = false, // Has unsaved changes
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [newProjectName, setNewProjectName] = useState('Nouveau Projet');
  const [saveProjectName, setSaveProjectName] = useState(projectName);
  const [selectedProject, setSelectedProject] = useState('');
  const [exportFormat, setExportFormat] = useState('geojson');

  // New Project
  const handleNewProject = () => {
    if (isDirty) {
      if (!window.confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
        return;
      }
    }
    setShowNewModal(true);
  };

  const confirmNewProject = () => {
    onNewProject?.(newProjectName.trim() || 'Nouveau Projet');
    setShowNewModal(false);
    setNewProjectName('Nouveau Projet');
  };

  // Save Project
  const handleSaveProject = () => {
    setSaveProjectName(projectName);
    setShowSaveModal(true);
  };

  const confirmSaveProject = () => {
    onSaveProject?.(saveProjectName.trim() || projectName);
    setShowSaveModal(false);
  };

  // Load Project
  const handleLoadProject = () => {
    if (isDirty) {
      if (!window.confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
        return;
      }
    }
    setShowLoadModal(true);
  };

  const confirmLoadProject = () => {
    if (selectedProject) {
      onLoadProject?.(selectedProject);
      setShowLoadModal(false);
      setSelectedProject('');
    }
  };

  // Export Project
  const handleExport = () => {
    setShowExportModal(true);
  };

  const confirmExport = () => {
    onExport?.(exportFormat);
    setShowExportModal(false);
  };

  return (
    <>
      <div style={styles.container}>
        {/* Unsaved Changes Indicator */}
        {isDirty && (
          <div style={styles.dirtyBadge}>
            <span style={styles.dirtyIcon}>●</span>
            <span style={styles.dirtyText}>Modifications non sauvegardées</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actions}>
          <Button
            variant="primary"
            icon="📄"
            onClick={handleNewProject}
            fullWidth
          >
            Nouveau projet
          </Button>

          <Button
            variant="success"
            icon="💾"
            onClick={handleSaveProject}
            fullWidth
            disabled={!isDirty}
          >
            Sauvegarder
          </Button>

          <Button
            variant="secondary"
            icon="📂"
            onClick={handleLoadProject}
            fullWidth
          >
            Charger projet
          </Button>

          <Button
            variant="secondary"
            icon="📥"
            onClick={handleExport}
            fullWidth
          >
            Exporter
          </Button>
        </div>
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nouveau Projet"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={confirmNewProject}>
              Créer
            </Button>
          </>
        }
      >
        <div style={styles.modalContent}>
          <p style={styles.modalText}>
            Créer un nouveau projet vide. Toutes les données non sauvegardées seront perdues.
          </p>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            label="Nom du projet"
            placeholder="Mon nouveau projet"
            fullWidth
            autoFocus
          />
        </div>
      </Modal>

      {/* Save Project Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Sauvegarder le Projet"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSaveModal(false)}>
              Annuler
            </Button>
            <Button variant="success" onClick={confirmSaveProject}>
              💾 Sauvegarder
            </Button>
          </>
        }
      >
        <div style={styles.modalContent}>
          <p style={styles.modalText}>
            Le projet sera sauvegardé en créant une copie de la table <code>GIS_WorkSpace</code>.
          </p>
          <Input
            value={saveProjectName}
            onChange={(e) => setSaveProjectName(e.target.value)}
            label="Nom de la sauvegarde"
            placeholder="Mon projet"
            fullWidth
            autoFocus
          />
          <p style={styles.helpText}>
            La table sera nommée: <code>GIS_Project_{saveProjectName.replace(/\s+/g, '_')}</code>
          </p>
        </div>
      </Modal>

      {/* Load Project Modal */}
      <Modal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        title="Charger un Projet"
        size="medium"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLoadModal(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmLoadProject}
              disabled={!selectedProject}
            >
              📂 Charger
            </Button>
          </>
        }
      >
        <div style={styles.modalContent}>
          <p style={styles.modalText}>
            Sélectionnez un projet sauvegardé à charger. Les données actuelles seront remplacées.
          </p>

          {projects.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📂</p>
              <p style={styles.emptyText}>Aucun projet sauvegardé</p>
            </div>
          ) : (
            <div style={styles.projectsList}>
              {projects.map((project, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.projectItem,
                    ...(selectedProject === project.name ? styles.projectItemSelected : {}),
                  }}
                  onClick={() => setSelectedProject(project.name)}
                >
                  <div style={styles.projectIcon}>📊</div>
                  <div style={styles.projectInfo}>
                    <div style={styles.projectName}>{project.name}</div>
                    <div style={styles.projectMeta}>
                      {project.entityCount || 0} entités • {project.layerCount || 0} couches
                    </div>
                  </div>
                  {selectedProject === project.name && (
                    <div style={styles.projectCheck}>✓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exporter le Projet"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={confirmExport}>
              📥 Exporter
            </Button>
          </>
        }
      >
        <div style={styles.modalContent}>
          <p style={styles.modalText}>
            Exporter toutes les données du projet dans le format sélectionné.
          </p>

          <Select
            value={exportFormat}
            onChange={setExportFormat}
            options={[
              { value: 'geojson', label: '🗺️ GeoJSON (recommandé)' },
              { value: 'kml', label: '📍 KML (Google Earth)' },
              { value: 'csv', label: '📊 CSV (tableur)' },
              { value: 'gpx', label: '🧭 GPX (GPS)' },
            ]}
            label="Format d'export"
            fullWidth
          />

          <div style={styles.exportInfo}>
            {exportFormat === 'geojson' && (
              <p>Format standard pour les données géospatiales. Compatible avec tous les logiciels SIG.</p>
            )}
            {exportFormat === 'kml' && (
              <p>Format pour Google Earth et Google Maps. Les styles sont préservés.</p>
            )}
            {exportFormat === 'csv' && (
              <p>Format tableur. Les géométries sont exportées en WKT.</p>
            )}
            {exportFormat === 'gpx' && (
              <p>Format GPS standard. Uniquement pour les points et lignes.</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: spacing.md,
  },
  dirtyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.warning}`,
  },
  dirtyIcon: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  dirtyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  modalText: {
    margin: 0,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: '1.6',
  },
  helpText: {
    margin: 0,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: spacing.xl,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 8px 0',
    opacity: 0.3,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    margin: 0,
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  projectItemSelected: {
    backgroundColor: colors.primaryVeryLight,
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primaryLight}`,
  },
  projectIcon: {
    fontSize: fontSize.xl,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  projectMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: '2px',
  },
  projectCheck: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  exportInfo: {
    padding: spacing.md,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: '1.6',
  },
};

export default ProjectSection;
