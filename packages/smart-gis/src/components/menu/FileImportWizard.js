/**
 * FileImportWizard Component
 * Smart GIS Widget v3.0
 *
 * Multi-step file import wizard with projection support
 */

import React, { useState, useCallback } from 'react';
import { Button, Select, Checkbox, Input } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const FileImportWizard = ({
  onImport,
  onCancel,
  defaultLayerName = '',
}) => {
  const [step, setStep] = useState(1); // 1: File, 2: Config, 3: Preview, 4: Confirm
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [layerName, setLayerName] = useState(defaultLayerName || 'Imported Layer');
  const [projection, setProjection] = useState('EPSG:4326');
  const [autoDetectProjection, setAutoDetectProjection] = useState(true);
  const [encoding, setEncoding] = useState('UTF-8');
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // File selection
  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Detect file type
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const typeMap = {
      'geojson': 'geojson',
      'json': 'geojson',
      'kml': 'kml',
      'gpx': 'gpx',
      'shp': 'shapefile',
      'csv': 'csv',
      'xlsx': 'excel',
      'xls': 'excel',
    };
    setFileType(typeMap[ext] || 'unknown');

    // Auto-fill layer name from filename
    if (!defaultLayerName) {
      const name = selectedFile.name.replace(/\.[^/.]+$/, '');
      setLayerName(name);
    }
  }, [defaultLayerName]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  }, [handleFileSelect]);

  // Process file (mock implementation)
  const handleProcessFile = async () => {
    setIsProcessing(true);

    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock preview data
    setPreview({
      featureCount: Math.floor(Math.random() * 100) + 10,
      geometryTypes: ['POINT', 'LINESTRING'],
      bounds: {
        minLat: 48.8,
        maxLat: 48.9,
        minLon: 2.3,
        maxLon: 2.4,
      },
      detectedProjection: 'EPSG:4326',
      sampleFeatures: [
        { id: 1, name: 'Feature 1', type: 'POINT' },
        { id: 2, name: 'Feature 2', type: 'LINESTRING' },
        { id: 3, name: 'Feature 3', type: 'POINT' },
      ],
    });

    setIsProcessing(false);
    setStep(3);
  };

  // Import confirmation
  const handleConfirm = () => {
    onImport?.({
      file,
      fileType,
      layerName,
      projection,
      encoding,
      preview,
    });
  };

  // Navigation
  const handleNext = () => {
    if (step === 1 && file) {
      setStep(2);
    } else if (step === 2) {
      handleProcessFile();
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const fileTypeIcons = {
    'geojson': '🗺️',
    'kml': '📍',
    'gpx': '🧭',
    'shapefile': '🗂️',
    'csv': '📊',
    'excel': '📈',
    'unknown': '❓',
  };

  return (
    <div style={styles.container}>
      {/* Progress Steps */}
      <div style={styles.progress}>
        {[
          { num: 1, label: 'Fichier' },
          { num: 2, label: 'Configuration' },
          { num: 3, label: 'Aperçu' },
          { num: 4, label: 'Confirmation' },
        ].map((s) => (
          <div
            key={s.num}
            style={{
              ...styles.progressStep,
              ...(step === s.num ? styles.progressStepActive : {}),
              ...(step > s.num ? styles.progressStepCompleted : {}),
            }}
          >
            <div style={styles.progressNumber}>
              {step > s.num ? '✓' : s.num}
            </div>
            <div style={styles.progressLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={styles.content}>
        {/* Step 1: File Selection */}
        {step === 1 && (
          <div style={styles.step}>
            <h3 style={styles.stepTitle}>Sélectionner un fichier</h3>

            <div
              style={styles.dropZone}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div style={styles.dropZoneContent}>
                <div style={styles.dropZoneIcon}>📁</div>
                <p style={styles.dropZoneText}>
                  Glissez-déposez un fichier ici
                </p>
                <p style={styles.dropZoneOr}>ou</p>
                <label style={styles.fileButton}>
                  <input
                    type="file"
                    accept=".geojson,.json,.kml,.gpx,.shp,.csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <Button variant="primary">
                    Parcourir les fichiers
                  </Button>
                </label>
              </div>
            </div>

            {file && (
              <div style={styles.fileInfo}>
                <div style={styles.fileIcon}>
                  {fileTypeIcons[fileType]}
                </div>
                <div style={styles.fileDetails}>
                  <div style={styles.fileName}>{file.name}</div>
                  <div style={styles.fileMeta}>
                    {(file.size / 1024).toFixed(2)} KB • {fileType}
                  </div>
                </div>
              </div>
            )}

            <div style={styles.supportedFormats}>
              <p style={styles.supportedTitle}>Formats supportés:</p>
              <div style={styles.formatsList}>
                <span style={styles.formatBadge}>🗺️ GeoJSON</span>
                <span style={styles.formatBadge}>📍 KML</span>
                <span style={styles.formatBadge}>🧭 GPX</span>
                <span style={styles.formatBadge}>🗂️ Shapefile</span>
                <span style={styles.formatBadge}>📊 CSV</span>
                <span style={styles.formatBadge}>📈 Excel</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div style={styles.step}>
            <h3 style={styles.stepTitle}>Configuration de l'import</h3>

            <div style={styles.form}>
              <Input
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                label="Nom de la couche"
                placeholder="Ma nouvelle couche"
                fullWidth
              />

              <div style={styles.formGroup}>
                <Checkbox
                  checked={autoDetectProjection}
                  onChange={setAutoDetectProjection}
                  label="Détecter automatiquement la projection"
                />
              </div>

              {!autoDetectProjection && (
                <Select
                  value={projection}
                  onChange={setProjection}
                  options={[
                    { value: 'EPSG:4326', label: 'EPSG:4326 (WGS84 - GPS)' },
                    { value: 'EPSG:3857', label: 'EPSG:3857 (Web Mercator)' },
                    { value: 'EPSG:2154', label: 'EPSG:2154 (Lambert 93 - France)' },
                    { value: 'EPSG:3945', label: 'EPSG:3945 (Lambert CC45)' },
                  ]}
                  label="Projection"
                  fullWidth
                />
              )}

              {(fileType === 'csv' || fileType === 'shapefile') && (
                <Select
                  value={encoding}
                  onChange={setEncoding}
                  options={[
                    { value: 'UTF-8', label: 'UTF-8' },
                    { value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin1)' },
                    { value: 'Windows-1252', label: 'Windows-1252' },
                  ]}
                  label="Encodage"
                  fullWidth
                />
              )}
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && preview && (
          <div style={styles.step}>
            <h3 style={styles.stepTitle}>Aperçu des données</h3>

            <div style={styles.previewStats}>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{preview.featureCount}</div>
                <div style={styles.statLabel}>Entités</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{preview.geometryTypes.length}</div>
                <div style={styles.statLabel}>Types</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{preview.detectedProjection}</div>
                <div style={styles.statLabel}>Projection</div>
              </div>
            </div>

            <div style={styles.previewSection}>
              <h4 style={styles.previewTitle}>Emprise géographique</h4>
              <div style={styles.boundsBox}>
                <div style={styles.boundsRow}>
                  <span>Latitude:</span>
                  <span>{preview.bounds.minLat.toFixed(6)} → {preview.bounds.maxLat.toFixed(6)}</span>
                </div>
                <div style={styles.boundsRow}>
                  <span>Longitude:</span>
                  <span>{preview.bounds.minLon.toFixed(6)} → {preview.bounds.maxLon.toFixed(6)}</span>
                </div>
              </div>
            </div>

            <div style={styles.previewSection}>
              <h4 style={styles.previewTitle}>Échantillon (3 premières entités)</h4>
              <div style={styles.sampleList}>
                {preview.sampleFeatures.map(feature => (
                  <div key={feature.id} style={styles.sampleItem}>
                    <span style={styles.sampleId}>#{feature.id}</span>
                    <span style={styles.sampleName}>{feature.name}</span>
                    <span style={styles.sampleType}>{feature.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div style={styles.step}>
            <h3 style={styles.stepTitle}>Confirmer l'import</h3>

            <div style={styles.confirmBox}>
              <div style={styles.confirmIcon}>✓</div>
              <p style={styles.confirmText}>
                Prêt à importer <strong>{preview?.featureCount} entités</strong> dans la couche "<strong>{layerName}</strong>".
              </p>
            </div>

            <div style={styles.summaryList}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Fichier:</span>
                <span style={styles.summaryValue}>{file?.name}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Type:</span>
                <span style={styles.summaryValue}>{fileType}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Couche:</span>
                <span style={styles.summaryValue}>{layerName}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Projection:</span>
                <span style={styles.summaryValue}>{autoDetectProjection ? preview?.detectedProjection : projection}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {step > 1 && (
          <Button variant="secondary" onClick={handleBack} disabled={isProcessing}>
            ← Retour
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <div style={{ flex: 1 }} />
        {step < 4 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!file || isProcessing}
            loading={isProcessing}
          >
            {step === 3 ? 'Continuer →' : 'Suivant →'}
          </Button>
        ) : (
          <Button variant="success" onClick={handleConfirm}>
            📥 Importer
          </Button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  progress: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
  },
  progressStep: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressStepActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  progressStepCompleted: {
    color: colors.success,
  },
  progressNumber: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: colors.white,
    border: `2px solid ${colors.border}`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: spacing.lg,
  },
  step: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  stepTitle: {
    margin: `0 0 ${spacing.lg} 0`,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  dropZone: {
    border: `2px dashed ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    textAlign: 'center',
    backgroundColor: colors.grayVeryLight,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dropZoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
  dropZoneIcon: {
    fontSize: '64px',
    opacity: 0.3,
  },
  dropZoneText: {
    margin: 0,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  dropZoneOr: {
    margin: 0,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  fileButton: {
    cursor: 'pointer',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryVeryLight,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  fileIcon: {
    fontSize: '48px',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  fileMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: '4px',
  },
  supportedFormats: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
  },
  supportedTitle: {
    margin: `0 0 ${spacing.sm} 0`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  formatsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  formatBadge: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  previewStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    padding: spacing.md,
    backgroundColor: colors.primaryVeryLight,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewSection: {
    marginBottom: spacing.lg,
  },
  previewTitle: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  boundsBox: {
    padding: spacing.md,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  boundsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.xs} 0`,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
  },
  sampleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  sampleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  sampleId: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    minWidth: '40px',
  },
  sampleName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  sampleType: {
    fontSize: fontSize.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.border}`,
  },
  confirmBox: {
    padding: spacing.xl,
    backgroundColor: colors.successLight,
    border: `2px solid ${colors.success}`,
    borderRadius: borderRadius.lg,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmIcon: {
    fontSize: '64px',
    color: colors.success,
    marginBottom: spacing.md,
  },
  confirmText: {
    margin: 0,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: '1.6',
  },
  summaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    padding: spacing.md,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.grayVeryLight,
  },
};

export default FileImportWizard;
