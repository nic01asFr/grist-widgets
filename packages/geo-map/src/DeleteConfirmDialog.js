/**
 * DELETE CONFIRM DIALOG
 *
 * Modal de confirmation avant suppression d'une feature
 */

import React from 'react';

const DeleteConfirmDialog = ({ record, onConfirm, onCancel }) => {
  if (!record) return null;

  const recordName = record.nom || record.layer_name || `ID ${record.id}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🗑️ Confirmer la Suppression</h2>
          <button onClick={onCancel} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.warning}>
            <div style={styles.warningIcon}>⚠️</div>
            <div>
              <p style={styles.warningText}>
                Êtes-vous sûr de vouloir supprimer cette entité ?
              </p>
              <p style={styles.warningSubtext}>
                Cette action est irréversible.
              </p>
            </div>
          </div>

          {/* Record info */}
          <div style={styles.infoBox}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Nom:</span>
              <span style={styles.infoValue}>{recordName}</span>
            </div>
            {record.type && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Type:</span>
                <span style={styles.infoValue}>{record.type}</span>
              </div>
            )}
            {record.layer_name && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Couche:</span>
                <span style={styles.infoValue}>{record.layer_name}</span>
              </div>
            )}
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>ID:</span>
              <span style={styles.infoValue}>{record.id}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              onClick={onCancel}
              style={styles.cancelButton}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              style={styles.deleteButton}
            >
              🗑️ Supprimer
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
    zIndex: 10002,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '450px',
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
    color: '#e74c3c'
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
  warning: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    border: '1px solid #ffc107'
  },
  warningIcon: {
    fontSize: '32px',
    flexShrink: 0
  },
  warningText: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: '600',
    color: '#856404'
  },
  warningSubtext: {
    margin: 0,
    fontSize: '13px',
    color: '#856404'
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '24px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
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
  deleteButton: {
    padding: '10px 20px',
    backgroundColor: '#e74c3c',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.2s'
  }
};

export default DeleteConfirmDialog;
