/**
 * ATTRIBUTE EDITOR
 *
 * Modal pour éditer les attributs d'une feature géographique
 */

import React, { useState, useEffect } from 'react';

const AttributeEditor = ({ record, onSave, onClose }) => {
  const [nom, setNom] = useState('');
  const [type, setType] = useState('');
  const [properties, setProperties] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propertiesError, setPropertiesError] = useState(null);

  useEffect(() => {
    if (record) {
      setNom(record.nom || '');
      setType(record.type || '');

      // Parse properties JSON
      if (record.properties) {
        try {
          const parsed = typeof record.properties === 'string'
            ? JSON.parse(record.properties)
            : record.properties;
          setProperties(JSON.stringify(parsed, null, 2));
        } catch (err) {
          setProperties(record.properties);
        }
      } else {
        setProperties('{}');
      }
    }
  }, [record]);

  const validateJSON = (jsonString) => {
    try {
      JSON.parse(jsonString);
      setPropertiesError(null);
      return true;
    } catch (err) {
      setPropertiesError(`JSON invalide: ${err.message}`);
      return false;
    }
  };

  const handlePropertiesChange = (value) => {
    setProperties(value);
    if (value.trim()) {
      validateJSON(value);
    } else {
      setPropertiesError(null);
    }
  };

  const handleSave = async () => {
    // Validate JSON
    if (properties.trim() && !validateJSON(properties)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updates = {
        nom: nom.trim(),
        type: type.trim(),
        properties: properties.trim() || '{}'
      };

      await onSave(record.id, updates);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📝 Modifier les Attributs</h2>
          <button onClick={onClose} style={styles.closeButton} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Nom */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom de l'entité"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* Type */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Type de l'entité"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* Properties JSON */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Propriétés (JSON)
              {propertiesError && (
                <span style={styles.errorLabel}> - {propertiesError}</span>
              )}
            </label>
            <textarea
              value={properties}
              onChange={(e) => handlePropertiesChange(e.target.value)}
              placeholder='{"key": "value"}'
              style={{
                ...styles.textarea,
                borderColor: propertiesError ? '#e74c3c' : '#dee2e6'
              }}
              rows={8}
              disabled={loading}
            />
            <div style={styles.hint}>
              Format: JSON valide. Ex: {`{"hauteur": 15, "materiau": "béton"}`}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {/* Info */}
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>ID:</div>
            <div style={styles.infoValue}>{record.id}</div>
            {record.layer_name && (
              <>
                <div style={styles.infoLabel}>Couche:</div>
                <div style={styles.infoValue}>{record.layer_name}</div>
              </>
            )}
          </div>

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
                opacity: loading || propertiesError ? 0.6 : 1,
                cursor: loading || propertiesError ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || !!propertiesError}
            >
              {loading ? 'Sauvegarde...' : '💾 Enregistrer'}
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
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
  errorLabel: {
    color: '#e74c3c',
    fontSize: '12px',
    fontWeight: '400'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'Monaco, Consolas, monospace',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  hint: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '6px'
  },
  error: {
    marginBottom: '16px',
    padding: '12px 16px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '6px',
    fontSize: '14px'
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '8px 16px'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '12px',
    color: '#2c3e50'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
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

export default AttributeEditor;
