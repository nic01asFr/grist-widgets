/**
 * ImportWizard - Multi-step Import Modal
 *
 * Features:
 * - Dynamic step flow based on import method
 * - File upload and validation
 * - Column mapping for CSV
 * - Data preview
 * - Configuration form
 * - Import to Grist
 */

import React, { useState, useEffect } from 'react';
import GristAPI from '../../core/GristAPI';
import StateManager from '../../core/StateManager';
import './ImportWizard.css';

const ImportWizard = ({ method, onClose, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewFeatures, setPreviewFeatures] = useState([]);

  const steps = method.steps || [];
  const currentStep = steps[currentStepIndex];

  // Initialize config with default values
  useEffect(() => {
    const defaultConfig = {};
    steps.forEach(step => {
      if (step.fields) {
        step.fields.forEach(field => {
          if (field.defaultValue !== undefined) {
            defaultConfig[field.name] = field.defaultValue;
          }
        });
      }
    });
    setConfig(defaultConfig);
  }, [method]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      // Validate file
      const validation = method.validate(file);
      if (!validation.valid) {
        setError(validation.error);
        setIsLoading(false);
        return;
      }

      setUploadedFile(file);

      // For CSV, extract columns for mapping step
      if (method.id.startsWith('csv_')) {
        const text = await file.text();
        const delimiter = config.delimiter || ',';
        const firstLine = text.split('\n')[0];
        const cols = firstLine.split(delimiter).map(c => c.trim());
        setColumns(cols);
      }

      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleParseAndPreview = async () => {
    if (!uploadedFile) return;

    setError(null);
    setIsLoading(true);

    try {
      const features = await method.parse(uploadedFile, config);
      setParsedData(features);

      // Preview first 5 features
      setPreviewFeatures(features.slice(0, 5));

      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleConfigChange = (fieldName, value) => {
    setConfig(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleNext = async () => {
    setError(null);

    // Execute step-specific actions
    if (currentStep.id === 'upload' && uploadedFile) {
      // Auto-parse if possible
      if (method.id === 'geojson') {
        await handleParseAndPreview();
      }
    }

    if (currentStep.id === 'mapping') {
      // Validate mapping fields are selected
      const mappingFields = currentStep.fields.filter(f => f.required);
      const missingFields = mappingFields.filter(f => !config[f.name]);

      if (missingFields.length > 0) {
        setError(`Champs requis: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      // Parse data with mapping
      await handleParseAndPreview();
    }

    // For online services (IGN, OSM), fetch data when moving from config to preview
    if (currentStep.id === 'config' && method.fetch && !parsedData) {
      // Validate required config fields
      const requiredFields = currentStep.fields.filter(f => f.required);
      const missingFields = requiredFields.filter(f => !config[f.name]);

      if (missingFields.length > 0) {
        setError(`Champs requis: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      // Fetch data from online service
      setIsLoading(true);
      try {
        const features = await method.fetch(config);
        setParsedData(features);
        setPreviewFeatures(features.slice(0, 5));
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
        return;
      }
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      setError('Aucune donnée à importer');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const targetTable = StateManager.getState('data.currentTable') || 'GIS_WorkSpace';
      const layerName = config.layer_name || 'Import';

      // Prepare records for Grist
      // Use complete schema (columns ensured by TableSchema.initializeGISTable at startup)
      const records = parsedData.map((feature, idx) => ({
        layer_name: layerName,
        geometry_wgs84: feature.geometry,
        properties: JSON.stringify(feature.properties || {}),
        geometry_type: detectGeometryType(feature.geometry),
        is_visible: true,
        z_index: 100,
        feature_name: feature.properties?.name || feature.properties?.nom || `Feature ${idx + 1}`,
        import_session: Date.now() // Unique session ID for this import
      }));

      // Add to Grist
      const result = await GristAPI.addRecords(targetTable, records);

      // Update workspace layers
      const updatedLayers = await GristAPI.fetchTable(targetTable);
      StateManager.setState('layers.workspace', updatedLayers, `Import: ${layerName}`);

      // Complete import
      onComplete({
        features: parsedData,
        config: config,
        recordIds: result
      });

      setIsLoading(false);
    } catch (err) {
      setError(`Erreur lors de l'import: ${err.message}`);
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep.id === 'upload') {
      return uploadedFile !== null;
    }
    if (currentStep.id === 'mapping') {
      const requiredFields = currentStep.fields.filter(f => f.required);
      return requiredFields.every(f => config[f.name]);
    }
    if (currentStep.id === 'preview') {
      return parsedData && parsedData.length > 0;
    }
    if (currentStep.id === 'config') {
      const requiredFields = currentStep.fields.filter(f => f.required);
      return requiredFields.every(f => config[f.name]);
    }
    return true;
  };

  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="import-wizard-overlay" onClick={onClose}>
      <div className="import-wizard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="import-wizard-header">
          <div>
            <h3>
              {method.icon} {method.label}
            </h3>
            <p className="method-description">{method.description}</p>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* Steps Progress */}
        <div className="steps-progress">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`step-indicator ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}`}
            >
              <div className="step-number">{idx + 1}</div>
              <div className="step-label">{step.label}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="import-wizard-body">
          {error && (
            <div className="error-message">
              <strong>Erreur:</strong> {error}
            </div>
          )}

          {/* Step Content */}
          {currentStep.id === 'upload' && (
            <div className="step-content">
              <h4>Sélectionner un fichier</h4>
              <div className="file-upload-area">
                <input
                  type="file"
                  accept={method.accepts}
                  onChange={handleFileUpload}
                  id="file-input"
                />
                <label htmlFor="file-input" className="file-upload-label">
                  <div className="upload-icon">📁</div>
                  {uploadedFile ? (
                    <div>
                      <div className="file-name">{uploadedFile.name}</div>
                      <div className="file-size">{(uploadedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div>Cliquez pour sélectionner un fichier</div>
                      <div className="upload-hint">ou glissez-déposez ici</div>
                      <div className="upload-formats">Formats acceptés: {method.accepts}</div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {currentStep.id === 'mapping' && (
            <div className="step-content">
              <h4>Mapper les colonnes</h4>
              {currentStep.fields.map(field => (
                <div key={field.name} className="param-field">
                  <label>
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>
                  <select
                    value={config[field.name] || ''}
                    onChange={(e) => handleConfigChange(field.name, e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {currentStep.id === 'preview' && (
            <div className="step-content">
              <h4>Aperçu des données</h4>
              {parsedData && (
                <div className="preview-stats">
                  <strong>{parsedData.length}</strong> feature{parsedData.length > 1 ? 's' : ''} trouvée{parsedData.length > 1 ? 's' : ''}
                </div>
              )}
              <div className="preview-list">
                {previewFeatures.map((feature, idx) => (
                  <div key={idx} className="preview-item">
                    <div className="preview-index">#{idx + 1}</div>
                    <div className="preview-details">
                      <div className="preview-geometry">
                        {feature.geometry.substring(0, 80)}...
                      </div>
                      {Object.keys(feature.properties).length > 0 && (
                        <div className="preview-properties">
                          {Object.entries(feature.properties).slice(0, 3).map(([key, val]) => (
                            <span key={key} className="property-badge">
                              {key}: {String(val).substring(0, 20)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {parsedData && parsedData.length > 5 && (
                <div className="preview-note">
                  ... et {parsedData.length - 5} autres features
                </div>
              )}
            </div>
          )}

          {currentStep.id === 'config' && (
            <div className="step-content">
              <h4>Configuration</h4>
              {currentStep.fields.map(field => (
                <div key={field.name} className="param-field">
                  <label>
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={config[field.name] || ''}
                      onChange={(e) => handleConfigChange(field.name, e.target.value)}
                    />
                  )}
                  {field.type === 'choice' && (
                    <select
                      value={config[field.name] || ''}
                      onChange={(e) => handleConfigChange(field.name, e.target.value)}
                    >
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={config[field.name] || ''}
                      onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="import-wizard-footer">
          <button
            className="btn-cancel"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
          >
            ← Précédent
          </button>

          <div className="step-counter">
            Étape {currentStepIndex + 1} / {steps.length}
          </div>

          {!isLastStep ? (
            <button
              className="btn-next"
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? 'Chargement...' : 'Suivant →'}
            </button>
          ) : (
            <button
              className="btn-import"
              onClick={handleImport}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? 'Import en cours...' : '✓ Importer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function
function detectGeometryType(wkt) {
  if (!wkt) return 'Unknown';

  const match = wkt.match(/^(SRID=\d+;)?(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)/i);
  if (match) {
    return match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
  }

  return 'Unknown';
}

export default ImportWizard;
