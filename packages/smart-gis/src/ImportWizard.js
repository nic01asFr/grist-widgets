/**
 * IMPORT WIZARD COMPONENT
 *
 * Assistant d'import de données géographiques depuis catalogues externes
 * Workflow:
 * 1. Rechercher dans catalogues (IGN, OSM) - Textuel ou Sémantique (VECTOR_SEARCH)
 * 2. Sélectionner dataset
 * 3. Configurer requête (bbox, filtres, limite)
 * 4. Preview résultats
 * 5. Importer dans table projet
 */

import React, { useState, useMemo, useCallback } from 'react';
import * as IGNService from './services/IGNService';
import * as OSMService from './services/OSMService';
import { searchCatalogsSemantic, searchCatalogsTextual } from './systemInfrastructure';

const ImportWizard = ({ catalogs, onImport, onClose, gristApi }) => {
  const [step, setStep] = useState(1); // 1: Search, 2: Configure, 3: Preview
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [queryConfig, setQueryConfig] = useState({
    bbox: null, // [minLon, minLat, maxLon, maxLat]
    filters: {},
    limit: 100
  });
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Phase 8: Semantic search state
  const [searchMode, setSearchMode] = useState('textual'); // 'textual' | 'semantic'
  const [semanticResults, setSemanticResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Handle semantic search
  const handleSemanticSearch = useCallback(async () => {
    if (!searchQuery || !gristApi || !gristApi.docApi) {
      setError('Recherche sémantique non disponible');
      return;
    }

    setSearchLoading(true);
    setError(null);

    try {
      const result = await searchCatalogsSemantic(gristApi.docApi, searchQuery);

      if (result.success) {
        setSemanticResults(result.catalogs);
        setSearchMode('semantic');
        console.log(`✅ Semantic search returned ${result.count} catalogs`);
      } else {
        throw new Error(result.error || 'Semantic search failed');
      }
    } catch (err) {
      console.error('Semantic search error:', err);
      setError('Recherche sémantique échouée. Utilisation de la recherche textuelle.');
      setSearchMode('textual');
      setSemanticResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, gristApi]);

  // Filter catalogs by search query
  const filteredCatalogs = useMemo(() => {
    // If semantic results available, use them
    if (searchMode === 'semantic' && semanticResults) {
      return semanticResults;
    }

    // Otherwise, use textual search
    if (!catalogs || !searchQuery) return catalogs || [];
    return searchCatalogsTextual(catalogs, searchQuery);
  }, [catalogs, searchQuery, searchMode, semanticResults]);

  const handleCatalogSelect = (catalog) => {
    setSelectedCatalog(catalog);
    setStep(2);
    setError(null);
  };

  const handleConfigChange = (key, value) => {
    setQueryConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePreview = async () => {
    if (!selectedCatalog) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching preview for:', selectedCatalog.title, queryConfig);

      // Si c'est un raster, pas de preview - import direct
      if (selectedCatalog.layer_type === 'raster') {
        const mockPreview = {
          type: 'FeatureCollection',
          features: [],
          count: 1,
          isRaster: true
        };
        setPreviewData(mockPreview);
        setStep(3);
        setLoading(false);
        return;
      }

      let result;

      // Déterminer quel service utiliser pour vecteur
      if (selectedCatalog.source_type === 'IGN') {
        result = await callIGNService(selectedCatalog, queryConfig);
      } else if (selectedCatalog.source_type === 'OSM') {
        result = await callOSMService(selectedCatalog, queryConfig);
      } else {
        throw new Error(`Type de source non supporté: ${selectedCatalog.source_type}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des données');
      }

      setPreviewData(result.data);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Erreur lors de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || !selectedCatalog) return;

    setLoading(true);
    setError(null);

    try {
      if (onImport) {
        await onImport({
          catalog: selectedCatalog,
          data: previewData,
          config: queryConfig
        });
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Appeler le service IGN approprié
   */
  const callIGNService = async (catalog, config) => {
    const options = {
      bbox: config.bbox || IGNService.BBOX_PARIS, // Bbox par défaut: Paris
      limit: config.limit || 100
    };

    // Utiliser dataset_id pour déterminer la fonction à appeler
    const datasetId = catalog.dataset_id;

    if (datasetId.includes('batiment')) {
      return await IGNService.queryBatiments(options);
    } else if (datasetId.includes('route')) {
      return await IGNService.queryRoutes(options);
    } else if (datasetId.includes('commune')) {
      return await IGNService.queryCommunes(options);
    } else if (datasetId.includes('hydro') || datasetId.includes('eau')) {
      return await IGNService.queryHydrographie(options);
    } else {
      // Fallback: query générique
      return await IGNService.queryDataset(datasetId, options);
    }
  };

  /**
   * Appeler le service OSM approprié
   */
  const callOSMService = async (catalog, config) => {
    const options = {
      bbox: config.bbox || OSMService.BBOX_DEFAULT, // Bbox par défaut: petit secteur Paris
      limit: config.limit || 100
    };

    // Utiliser dataset_id pour déterminer la fonction à appeler
    const datasetId = catalog.dataset_id;

    if (datasetId.includes('building')) {
      return await OSMService.queryBuildings(options);
    } else if (datasetId.includes('road')) {
      return await OSMService.queryRoads(options);
    } else if (datasetId.includes('poi')) {
      return await OSMService.queryPOIs(options);
    } else {
      throw new Error(`Dataset OSM non supporté: ${datasetId}`);
    }
  };

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📥 Import de Données</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Progress Steps */}
        <div style={styles.steps}>
          <div style={{ ...styles.stepItem, ...(step >= 1 ? styles.stepActive : {}) }}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepLabel}>Catalogue</div>
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 2 ? styles.stepActive : {}) }}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepLabel}>Configuration</div>
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 3 ? styles.stepActive : {}) }}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepLabel}>Prévisualisation</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* Content */}
        <div style={styles.content}>
          {step === 1 && (
            <CatalogSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              catalogs={filteredCatalogs}
              onSelect={handleCatalogSelect}
              searchMode={searchMode}
              searchLoading={searchLoading}
              onSemanticSearch={handleSemanticSearch}
            />
          )}

          {step === 2 && selectedCatalog && (
            <QueryConfiguration
              catalog={selectedCatalog}
              config={queryConfig}
              onChange={handleConfigChange}
              onBack={() => setStep(1)}
              onNext={handlePreview}
              loading={loading}
            />
          )}

          {step === 3 && previewData && (
            <PreviewPane
              data={previewData}
              catalog={selectedCatalog}
              onBack={() => setStep(2)}
              onImport={handleImport}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Step 1: Catalog Search
const CatalogSearch = ({ query, onQueryChange, catalogs, onSelect, searchMode, searchLoading, onSemanticSearch }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher un catalogue (ex: bâtiments, routes, POI...)"
          style={styles.searchInput}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
          <button
            onClick={onSemanticSearch}
            disabled={!query || searchLoading}
            style={{
              ...styles.button,
              backgroundColor: searchMode === 'semantic' ? '#4CAF50' : '#2196F3',
              opacity: (!query || searchLoading) ? 0.5 : 1,
              cursor: (!query || searchLoading) ? 'not-allowed' : 'pointer'
            }}
          >
            {searchLoading ? '⏳ Recherche...' : '🤖 Recherche Sémantique (IA)'}
          </button>
          {searchMode === 'semantic' && (
            <span style={{ fontSize: '12px', color: '#4CAF50', fontWeight: '600' }}>
              ✨ Résultats par pertinence (VECTOR_SEARCH)
            </span>
          )}
          {searchMode === 'textual' && query && (
            <span style={{ fontSize: '12px', color: '#999' }}>
              📝 Recherche textuelle
            </span>
          )}
        </div>
      </div>

      <div style={styles.catalogList}>
        {catalogs.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div>Aucun catalogue trouvé</div>
          </div>
        ) : (
          catalogs.map((catalog, idx) => (
            <div
              key={catalog.id || idx}
              style={styles.catalogItem}
              onClick={() => onSelect(catalog)}
            >
              <div style={styles.catalogIcon}>
                {catalog.source_type === 'IGN' ? '🇫🇷' : '🌐'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.catalogTitle}>{catalog.title}</div>
                <div style={styles.catalogMeta}>
                  <span style={styles.badge}>{catalog.source_type}</span>
                  <span style={styles.badge}>{catalog.geometry_type}</span>
                </div>
                {catalog.description && (
                  <div style={styles.catalogDesc}>{catalog.description}</div>
                )}
              </div>
              <div style={styles.arrowIcon}>→</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Step 2: Query Configuration
const QueryConfiguration = ({ catalog, config, onChange, onBack, onNext, loading }) => {
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack} style={styles.backButton}>← Retour</button>

      <div style={{ marginTop: '20px' }}>
        <h3 style={styles.sectionTitle}>
          {catalog.source_type === 'IGN' ? '🇫🇷' : '🌐'} {catalog.title}
        </h3>

        {/* Limit */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Nombre maximum d'entités</label>
          <input
            type="number"
            value={config.limit}
            onChange={(e) => onChange('limit', parseInt(e.target.value) || 100)}
            min="1"
            max="1000"
            style={styles.input}
          />
          <div style={styles.hint}>Entre 1 et 1000 entités</div>
        </div>

        {/* Bbox (TODO: Map selector) */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Zone géographique (BBox)</label>
          <div style={styles.hint}>
            Pour l'instant, utilise la zone par défaut. Sélection sur carte à venir.
          </div>
        </div>

        {/* Preview Button */}
        <div style={{ marginTop: '32px' }}>
          <button
            onClick={onNext}
            disabled={loading}
            style={{
              ...styles.primaryButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Chargement...' : 'Prévisualiser'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Step 3: Preview Pane
const PreviewPane = ({ data, catalog, onBack, onImport, loading }) => {
  // Si c'est un raster, affichage simplifié
  if (data.isRaster) {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={onBack} style={styles.backButton}>← Modifier</button>

        <div style={{ marginTop: '20px' }}>
          <h3 style={styles.sectionTitle}>
            🖼️ Couche Raster - {catalog.title}
          </h3>

          <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginTop: '16px' }}>
            <div style={{ fontSize: '14px', color: '#495057', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                Cette couche raster sera ajoutée comme fond de carte.
              </p>
              <p style={{ margin: '0 0 12px 0', fontWeight: '500' }}>
                Type: Tile Layer (XYZ/WMTS)
              </p>
              <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                Source: {catalog.source_type}
              </p>
            </div>
          </div>

          {/* Import Button */}
          <div style={{ marginTop: '32px' }}>
            <button
              onClick={onImport}
              disabled={loading}
              style={{
                ...styles.importButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Ajout en cours...' : 'Ajouter la couche raster'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Affichage normal pour vecteur
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack} style={styles.backButton}>← Modifier</button>

      <div style={{ marginTop: '20px' }}>
        <h3 style={styles.sectionTitle}>
          Prévisualisation - {data.count} entité{data.count > 1 ? 's' : ''}
        </h3>

        <div style={styles.previewList}>
          {data.features.slice(0, 10).map((feature, idx) => (
            <div key={idx} style={styles.previewItem}>
              <div style={styles.previewIcon}>
                {feature.geometry.type === 'Point' ? '📍' :
                 feature.geometry.type === 'LineString' ? '📏' : '🔷'}
              </div>
              <div>
                <div style={styles.previewName}>
                  {feature.properties.nom || `Entité ${idx + 1}`}
                </div>
                <div style={styles.previewMeta}>
                  {feature.geometry.type}
                  {feature.properties.type && ` - ${feature.properties.type}`}
                </div>
              </div>
            </div>
          ))}

          {data.count > 10 && (
            <div style={styles.moreItems}>
              ... et {data.count - 10} autres entités
            </div>
          )}
        </div>

        {/* Import Button */}
        <div style={{ marginTop: '32px' }}>
          <button
            onClick={onImport}
            disabled={loading}
            style={{
              ...styles.importButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Import en cours...' : `Importer ${data.count} entité${data.count > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
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
    zIndex: 10000,
    padding: '20px',
    animation: 'fadeIn 0.2s ease-out'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s ease-out'
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
    fontSize: '20px',
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
  steps: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#f8f9fa'
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: 0.4
  },
  stepActive: {
    opacity: 1
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px'
  },
  stepLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057'
  },
  stepLine: {
    flex: 1,
    height: '2px',
    backgroundColor: '#dee2e6',
    margin: '0 12px'
  },
  error: {
    margin: '16px 24px',
    padding: '12px 16px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '6px',
    fontSize: '14px'
  },
  content: {
    flex: 1,
    overflowY: 'auto'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #dee2e6',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  catalogList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  catalogItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  catalogIcon: {
    fontSize: '32px'
  },
  catalogTitle: {
    fontWeight: '600',
    fontSize: '15px',
    color: '#2c3e50',
    marginBottom: '6px'
  },
  catalogMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px'
  },
  badge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#e9ecef',
    color: '#495057',
    borderRadius: '4px',
    fontWeight: '500'
  },
  catalogDesc: {
    fontSize: '13px',
    color: '#6c757d',
    marginTop: '6px'
  },
  arrowIcon: {
    fontSize: '20px',
    color: '#adb5bd'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#6c757d'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '24px'
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
    border: '1px solid #ced4da',
    borderRadius: '6px',
    outline: 'none'
  },
  hint: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#6c757d'
  },
  primaryButton: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  importButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#16B378',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  previewList: {
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f3f5'
  },
  previewIcon: {
    fontSize: '24px'
  },
  previewName: {
    fontWeight: '500',
    fontSize: '14px',
    color: '#2c3e50'
  },
  previewMeta: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px'
  },
  moreItems: {
    padding: '16px',
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '13px',
    fontStyle: 'italic'
  }
};

export default ImportWizard;
