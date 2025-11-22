/**
 * DataPanel - Import Tab (Tab 3)
 *
 * Fonctionnalités:
 * - Sélection de la méthode d'import
 * - Lanceur de l'ImportWizard
 * - Historique des imports récents
 */

import React, { useState, useEffect } from 'react';
import { getAllImportMethods } from '../../config/importMethods';
import ImportWizard from '../import/ImportWizard';
import StateManager from '../../core/StateManager';
import './DataPanel.css';

const DataPanel = () => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [recentImports, setRecentImports] = useState([]);
  const [showWizard, setShowWizard] = useState(false);

  const importMethods = getAllImportMethods();

  useEffect(() => {
    // Subscribe to import history
    const unsubscribe = StateManager.subscribe('data.importHistory', (history) => {
      setRecentImports(history || []);
    });

    const initialHistory = StateManager.getState('data.importHistory') || [];
    setRecentImports(initialHistory);

    return unsubscribe;
  }, []);

  const handleMethodClick = (method) => {
    if (method.id === 'shapefile') {
      // Open instructions in new tab or modal
      alert(method.steps[0].content);
      return;
    }

    setSelectedMethod(method);
    setShowWizard(true);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setSelectedMethod(null);
  };

  const handleImportComplete = (importData) => {
    // Add to history
    const newHistory = [
      {
        id: Date.now(),
        method: selectedMethod.id,
        methodLabel: selectedMethod.label,
        timestamp: new Date().toISOString(),
        featureCount: importData.features.length,
        layerName: importData.config.layer_name
      },
      ...recentImports.slice(0, 9) // Keep last 10
    ];

    StateManager.setState('data.importHistory', newHistory, 'Import completed');

    setShowWizard(false);
    setSelectedMethod(null);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="data-panel">
      <div className="data-header">
        <h3>Importer des données</h3>
        <p className="subtitle">Choisissez une méthode d'import</p>
      </div>

      <div className="import-methods">
        {importMethods.map(method => (
          <div
            key={method.id}
            className={`import-method-card ${method.id === 'shapefile' ? 'info-only' : ''}`}
            onClick={() => handleMethodClick(method)}
            style={{ borderLeftColor: method.color }}
          >
            <div className="method-icon" style={{ color: method.color }}>
              {method.icon}
            </div>
            <div className="method-content">
              <div className="method-label">{method.label}</div>
              <div className="method-description">{method.description}</div>
            </div>
            <div className="method-arrow">→</div>
          </div>
        ))}
      </div>

      {recentImports.length > 0 && (
        <div className="recent-imports">
          <h4>Imports récents</h4>
          <div className="recent-list">
            {recentImports.map(item => (
              <div key={item.id} className="recent-item">
                <div className="recent-icon" style={{ color: getMethodColor(item.method) }}>
                  {getMethodIcon(item.method)}
                </div>
                <div className="recent-info">
                  <div className="recent-name">{item.layerName}</div>
                  <div className="recent-meta">
                    {item.methodLabel} • {item.featureCount} features • {formatDate(item.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWizard && selectedMethod && (
        <ImportWizard
          method={selectedMethod}
          onClose={handleWizardClose}
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

// Helper functions
function getMethodIcon(methodId) {
  const method = getAllImportMethods().find(m => m.id === methodId);
  return method ? method.icon : '📦';
}

function getMethodColor(methodId) {
  const method = getAllImportMethods().find(m => m.id === methodId);
  return method ? method.color : '#6b7280';
}

export default DataPanel;
