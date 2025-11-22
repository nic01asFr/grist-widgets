/**
 * ToolExecutor - Exécution des outils spatiaux
 *
 * Modal pour configurer les paramètres et exécuter un outil
 * Gère l'appel des fonctions Grist (ST_*) et l'affichage des résultats
 */

import React, { useState } from 'react';
import GristAPI from '../../core/GristAPI';
import StateManager from '../../core/StateManager';
import ParamsForm from './ParamsForm';
import './ToolExecutor.css';

const ToolExecutor = ({ tool, selectedFeatures, onClose }) => {
  const [params, setParams] = useState({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      // Construire formule selon type d'outil
      let formula;

      if (tool.multiSelect) {
        // Outil multi-géométries
        const geometries = selectedFeatures.map(f => f.geometry_wgs84 || f.geometry);

        if (tool.minSelection === 2 && tool.maxSelection === 2) {
          // Exactement 2 géométries (ex: intersection, distance)
          formula = tool.formula(geometries[0], geometries[1], params);
        } else {
          // Multiple géométries (ex: union, convex hull)
          formula = tool.formula(geometries, params);
        }
      } else {
        // Outil mono-géométrie
        const geometry = selectedFeatures[0].geometry_wgs84 || selectedFeatures[0].geometry;
        formula = tool.formula(geometry, params);
      }

      console.log('Tool formula:', formula);

      // Exécuter selon type de résultat
      let resultValue;

      if (tool.resultType === 'geometry') {
        // Créer nouvelle feature avec géométrie résultante
        resultValue = await executeGeometryTool(formula, tool);
      } else if (tool.resultType === 'numeric' || tool.resultType === 'text' || tool.resultType === 'boolean') {
        // Calculer valeur simple
        resultValue = await executeCalculation(formula);
      } else if (tool.executionMode === 'filter') {
        // Requête spatiale = filtrage
        resultValue = await executeFilter(tool, params);
      }

      setResult(resultValue);

    } catch (err) {
      console.error('Tool execution error:', err);
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const executeGeometryTool = async (formula, tool) => {
    // NOTE: Pour la roadmap, on documente l'approche
    // Cette fonction devrait utiliser des colonnes temporaires dans Grist

    const currentTable = StateManager.getState('data.currentTable') || 'GIS_WorkSpace';

    // Pour l'instant, on simule le résultat
    // TODO: Implémenter vraie logique avec colonnes temporaires Grist
    console.log('Would execute geometry formula:', formula);

    // Créer nouveau record simulé
    const newRecord = {
      layer_name: `${tool.label} Result`,
      layer_type: 'vector',
      geometry: 'POINT(2.3522 48.8566)',  // Simulé
      properties: JSON.stringify({
        source_tool: tool.id,
        created_at: new Date().toISOString()
      }),
      style: JSON.stringify({
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.4,
        weight: 2
      }),
      z_index: 100,
      is_visible: true
    };

    // TODO: Décommenter quand l'infrastructure Grist est prête
    // await GristAPI.addRecords(currentTable, [newRecord]);

    return {
      type: 'geometry',
      geometry: newRecord.geometry,
      message: `Nouvelle géométrie créée: ${tool.label}`,
      note: '(Simulation - implémentation complète en Phase 4)'
    };
  };

  const executeCalculation = async (formula) => {
    // Calcul simple (distance, area, etc.)
    console.log('Would calculate:', formula);

    // TODO: Implémenter vraie logique avec colonnes temporaires Grist

    // Simuler résultat
    const simulatedValue = Math.random() * 1000;

    return {
      type: 'value',
      value: simulatedValue,
      unit: tool.resultUnit ? tool.resultUnit(params) : null,
      note: '(Simulation - implémentation complète en Phase 4)'
    };
  };

  const executeFilter = async (tool, params) => {
    // Requête spatiale = sélectionner features qui matchent le prédicat
    console.log('Would filter with predicate:', tool.predicate);

    // TODO: Implémenter vraie logique

    // Simuler résultat
    const matchingCount = Math.floor(Math.random() * 10);

    return {
      type: 'selection',
      count: matchingCount,
      message: `${matchingCount} feature(s) trouvée(s)`,
      note: '(Simulation - implémentation complète en Phase 4)'
    };
  };

  return (
    <div className="tool-executor-overlay" onClick={onClose}>
      <div className="tool-executor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tool-executor-header">
          <div>
            <h3>{tool.label}</h3>
            <p className="tool-description">{tool.description}</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="tool-executor-body">
          {/* Formulaire paramètres */}
          {tool.params && tool.params.length > 0 && (
            <div className="params-section">
              <h4>Paramètres</h4>
              <ParamsForm
                params={tool.params}
                values={params}
                onChange={setParams}
              />
            </div>
          )}

          {/* Info sélection */}
          <div className="selected-features-info">
            <h4>Géométries sélectionnées :</h4>
            <ul>
              {selectedFeatures.map(f => (
                <li key={f.id}>
                  {f.layer_name} ({f.geometry_type})
                </li>
              ))}
            </ul>
          </div>

          {/* Aide */}
          {tool.help && (
            <div className="tool-help">
              <strong>💡 Astuce :</strong> {tool.help}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="error-message">
              <strong>❌ Erreur :</strong> {error}
            </div>
          )}

          {/* Résultat */}
          {result && (
            <div className="result-message">
              {result.type === 'value' && (
                <div className="result-value">
                  <strong>✅ Résultat :</strong> {result.value.toFixed(2)} {result.unit}
                  {result.note && <div className="result-note">{result.note}</div>}
                </div>
              )}
              {result.type === 'geometry' && (
                <div className="success-message">
                  <strong>✅ {result.message}</strong>
                  {result.note && <div className="result-note">{result.note}</div>}
                </div>
              )}
              {result.type === 'selection' && (
                <div className="success-message">
                  <strong>✅ {result.message}</strong>
                  {result.note && <div className="result-note">{result.note}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tool-executor-footer">
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn-execute"
            onClick={handleExecute}
            disabled={executing}
          >
            {executing ? 'Exécution...' : 'Exécuter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolExecutor;
