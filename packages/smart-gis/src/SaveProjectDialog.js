/**
 * SAVE PROJECT DIALOG
 *
 * Modal pour sauvegarder le projet cartographique
 * Workflow:
 * 1. Demander nom du projet
 * 2. Renommer table courante
 * 3. Créer nouvelle table par défaut
 * 4. Proposer de continuer ou d'ouvrir le projet sauvegardé
 */

import React, { useState } from 'react';

const SaveProjectDialog = ({ onSave, onClose, currentTableName }) => {
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Suggestion intelligente de nom
  const suggestProjectName = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `Carte_${dateStr}`;
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      setError('Veuillez entrer un nom de projet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(projectName.trim());
      // Dialog sera fermé par le parent après succès
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  const handleUseSuggestion = () => {
    setProjectName(suggestProjectName());
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>💾 Sauvegarder le Projet</h2>
          <button onClick={onClose} style={styles.closeButton} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <p style={styles.description}>
            Donnez un nom à votre projet cartographique. La table actuelle sera renommée
            et une nouvelle table vide sera créée pour continuer.
          </p>

          {/* Current table info */}
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Table actuelle:</div>
            <div style={styles.infoValue}>{currentTableName}</div>
          </div>

          {/* Project name input */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom du projet</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Carte_Paris_Urbanisme"
              style={styles.input}
              autoFocus
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
            <button
              onClick={handleUseSuggestion}
              style={styles.suggestionButton}
              disabled={loading}
            >
              💡 Suggestion: {suggestProjectName()}
            </button>
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
                opacity: loading || !projectName.trim() ? 0.6 : 1,
                cursor: loading || !projectName.trim() ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || !projectName.trim()}
            >
              {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
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
  description: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#495057',
    lineHeight: '1.6'
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '4px'
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50'
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
  suggestionButton: {
    marginTop: '8px',
    padding: '6px 12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#495057',
    transition: 'all 0.2s'
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

export default SaveProjectDialog;
