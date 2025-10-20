/**
 * STYLE EDITOR
 *
 * Modal pour éditer le style d'une feature géographique
 * Supporte Point, LineString, Polygon
 */

import React, { useState, useEffect } from 'react';

const StyleEditor = ({ record, onSave, onClose }) => {
  const [styleConfig, setStyleConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geometryType, setGeometryType] = useState(null);

  useEffect(() => {
    if (record) {
      // Detect geometry type from WKT
      const geom = record.geometry || '';
      if (geom.match(/^POINT/i) || geom.match(/^MULTIPOINT/i)) {
        setGeometryType('Point');
      } else if (geom.match(/^LINESTRING/i) || geom.match(/^MULTILINESTRING/i)) {
        setGeometryType('LineString');
      } else if (geom.match(/^POLYGON/i) || geom.match(/^MULTIPOLYGON/i)) {
        setGeometryType('Polygon');
      }

      // Parse existing style_config
      if (record.style_config) {
        try {
          const parsed = typeof record.style_config === 'string'
            ? JSON.parse(record.style_config)
            : record.style_config;
          setStyleConfig(parsed);
        } catch (err) {
          console.warn('Invalid style_config, using defaults');
          setStyleConfig(getDefaultStyle('Point'));
        }
      } else {
        setStyleConfig(getDefaultStyle(geometryType));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const getDefaultStyle = (geomType) => {
    if (geomType === 'Point') {
      return {
        type: 'circle',
        color: '#3498db',
        radius: 8,
        fillOpacity: 0.7
      };
    } else if (geomType === 'LineString') {
      return {
        color: '#e74c3c',
        weight: 3,
        opacity: 0.8,
        dashArray: null
      };
    } else if (geomType === 'Polygon') {
      return {
        fillColor: '#2ecc71',
        fillOpacity: 0.5,
        color: '#27ae60',
        weight: 2,
        opacity: 1
      };
    }
    return {};
  };

  const handleChange = (key, value) => {
    setStyleConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const updates = {
        style_config: JSON.stringify(styleConfig)
      };

      await onSave(record.id, updates);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  if (!record || !geometryType) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🎨 Éditer le Style</h2>
          <button onClick={onClose} style={styles.closeButton} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Geometry type info */}
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Type de géométrie:</div>
            <div style={styles.infoValue}>{geometryType}</div>
          </div>

          {/* Style controls based on geometry type */}
          {geometryType === 'Point' && (
            <div>
              <h3 style={styles.sectionTitle}>Style du Point</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>Type de marqueur</label>
                <select
                  value={styleConfig.type || 'circle'}
                  onChange={(e) => handleChange('type', e.target.value)}
                  style={styles.select}
                  disabled={loading}
                >
                  <option value="circle">Cercle</option>
                  <option value="marker">Marqueur</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Couleur</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    value={styleConfig.color || '#3498db'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={styles.colorInput}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={styleConfig.color || '#3498db'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={styles.textInput}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rayon: {styleConfig.radius || 8}px</label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={styleConfig.radius || 8}
                  onChange={(e) => handleChange('radius', parseInt(e.target.value))}
                  style={styles.slider}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Opacité: {((styleConfig.fillOpacity || 0.7) * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(styleConfig.fillOpacity || 0.7) * 100}
                  onChange={(e) => handleChange('fillOpacity', parseInt(e.target.value) / 100)}
                  style={styles.slider}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {geometryType === 'LineString' && (
            <div>
              <h3 style={styles.sectionTitle}>Style de la Ligne</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>Couleur</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    value={styleConfig.color || '#e74c3c'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={styles.colorInput}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={styleConfig.color || '#e74c3c'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={styles.textInput}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Épaisseur: {styleConfig.weight || 3}px</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={styleConfig.weight || 3}
                  onChange={(e) => handleChange('weight', parseInt(e.target.value))}
                  style={styles.slider}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Opacité: {((styleConfig.opacity || 0.8) * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(styleConfig.opacity || 0.8) * 100}
                  onChange={(e) => handleChange('opacity', parseInt(e.target.value) / 100)}
                  style={styles.slider}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Style de ligne</label>
                <select
                  value={styleConfig.dashArray || ''}
                  onChange={(e) => handleChange('dashArray', e.target.value || null)}
                  style={styles.select}
                  disabled={loading}
                >
                  <option value="">Solide</option>
                  <option value="5, 5">Pointillés</option>
                  <option value="10, 5">Tirets</option>
                  <option value="10, 5, 2, 5">Tiret-point</option>
                </select>
              </div>
            </div>
          )}

          {geometryType === 'Polygon' && (
            <div>
              <h3 style={styles.sectionTitle}>Style du Polygone</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>Couleur de remplissage</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    value={styleConfig.fillColor || '#2ecc71'}
                    onChange={(e) => handleChange('fillColor', e.target.value)}
                    style={styles.colorInput}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={styleConfig.fillColor || '#2ecc71'}
                    onChange={(e) => handleChange('fillColor', e.target.value)}
                    style={styles.textInput}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Opacité remplissage: {((styleConfig.fillOpacity || 0.5) * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(styleConfig.fillOpacity || 0.5) * 100}
                  onChange={(e) => handleChange('fillOpacity', parseInt(e.target.value) / 100)}
                  style={styles.slider}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Couleur de bordure</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    value={styleConfig.color || '#27ae60'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={styles.colorInput}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={styleConfig.color || '#27ae60'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={styles.textInput}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Épaisseur bordure: {styleConfig.weight || 2}px</label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={styleConfig.weight || 2}
                  onChange={(e) => handleChange('weight', parseInt(e.target.value))}
                  style={styles.slider}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          <div style={styles.preview}>
            <h3 style={styles.sectionTitle}>Aperçu</h3>
            <div style={styles.previewBox}>
              {geometryType === 'Point' && (
                <div style={{
                  width: (styleConfig.radius || 8) * 2,
                  height: (styleConfig.radius || 8) * 2,
                  borderRadius: '50%',
                  backgroundColor: styleConfig.color || '#3498db',
                  opacity: styleConfig.fillOpacity || 0.7,
                  margin: '20px auto'
                }} />
              )}
              {geometryType === 'LineString' && (
                <div style={{
                  width: '100%',
                  height: styleConfig.weight || 3,
                  backgroundColor: styleConfig.color || '#e74c3c',
                  opacity: styleConfig.opacity || 0.8,
                  margin: '20px 0',
                  borderStyle: styleConfig.dashArray ? 'dashed' : 'solid'
                }} />
              )}
              {geometryType === 'Polygon' && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: styleConfig.fillColor || '#2ecc71',
                  opacity: styleConfig.fillOpacity || 0.5,
                  border: `${styleConfig.weight || 2}px solid ${styleConfig.color || '#27ae60'}`,
                  margin: '20px auto'
                }} />
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              style={{
                ...styles.saveButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? 'Sauvegarde...' : '🎨 Appliquer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6c757d',
    padding: '4px',
    lineHeight: 1
  },
  content: {
    padding: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: '20px',
    marginBottom: '16px'
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '8px'
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6c757d',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '13px',
    color: '#2c3e50',
    fontWeight: '600'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  colorRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  colorInput: {
    width: '50px',
    height: '40px',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  textInput: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    outline: 'none'
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer'
  },
  preview: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e9ecef'
  },
  previewBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '20px',
    minHeight: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  error: {
    marginBottom: '16px',
    padding: '12px 16px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '6px',
    fontSize: '14px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e9ecef'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#495057',
    transition: 'all 0.2s'
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.2s'
  }
};

export default StyleEditor;
