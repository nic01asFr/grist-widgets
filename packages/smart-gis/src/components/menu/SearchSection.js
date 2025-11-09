/**
 * SearchSection Component
 * Smart GIS Widget v3.0
 *
 * Unified text + semantic search with suggestions
 */

import React, { useState, useMemo, useCallback } from 'react';
import { MenuSection } from '../layout';
import { Input, Checkbox, Select } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const SearchSection = ({
  records = [],
  onEntitySelect,
  onZoomTo,
  onSemanticSearch, // Callback for VECTOR_SEARCH in Grist
}) => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('text'); // 'text' | 'semantic' | 'both'
  const [searchFields, setSearchFields] = useState({
    name: true,
    layer: true,
    geometry: false,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Text search results
  const textResults = useMemo(() => {
    if (!query.trim() || searchMode === 'semantic') return [];

    const q = query.toLowerCase();
    return records.filter(record => {
      if (searchFields.name && record.name?.toLowerCase().includes(q)) return true;
      if (searchFields.layer && record.layer_name?.toLowerCase().includes(q)) return true;
      if (searchFields.geometry && record.geometry?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [query, records, searchFields, searchMode]);

  // Semantic search (mock implementation - real version calls Grist VECTOR_SEARCH)
  const semanticResults = useMemo(() => {
    if (!query.trim() || searchMode === 'text') return [];

    // Mock: Return random subset with similarity scores
    // Real implementation: onSemanticSearch(query) → Grist VECTOR_SEARCH
    return records
      .slice(0, Math.min(5, records.length))
      .map(record => ({
        ...record,
        similarity: Math.random() * 0.5 + 0.5, // 0.5-1.0
      }))
      .sort((a, b) => b.similarity - a.similarity);
  }, [query, records, searchMode]);

  // Combined results for 'both' mode
  const combinedResults = useMemo(() => {
    if (searchMode !== 'both') return [];

    const textIds = new Set(textResults.map(r => r.id));
    const semanticIds = new Set(semanticResults.map(r => r.id));

    return [
      ...textResults.map(r => ({ ...r, matchType: 'text' })),
      ...semanticResults
        .filter(r => !textIds.has(r.id))
        .map(r => ({ ...r, matchType: 'semantic' })),
    ];
  }, [textResults, semanticResults, searchMode]);

  // Active results based on mode
  const activeResults = useMemo(() => {
    if (searchMode === 'text') return textResults;
    if (searchMode === 'semantic') return semanticResults;
    return combinedResults;
  }, [searchMode, textResults, semanticResults, combinedResults]);

  // Contextual suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];

    const uniqueNames = [...new Set(records.map(r => r.name).filter(Boolean))];
    const uniqueLayers = [...new Set(records.map(r => r.layer_name).filter(Boolean))];

    const nameSuggestions = uniqueNames
      .filter(name => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);

    const layerSuggestions = uniqueLayers
      .filter(layer => layer.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 2);

    return [
      ...nameSuggestions.map(s => ({ text: s, type: 'name' })),
      ...layerSuggestions.map(s => ({ text: s, type: 'layer' })),
    ];
  }, [query, records]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
  };

  const handleResultClick = (result) => {
    onEntitySelect?.(result.id);
    setShowSuggestions(false);
  };

  const handleZoomToAll = () => {
    if (activeResults.length > 0) {
      onZoomTo?.(activeResults.map(r => r.id));
    }
  };

  return (
    <MenuSection title="🔍 Recherche" icon="🔍" defaultExpanded={true}>
      <div style={styles.container}>
        {/* Search Input */}
        <div style={styles.searchBox}>
          <Input
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder={searchMode === 'semantic' ? 'Recherche sémantique...' : 'Rechercher...'}
            icon="🔎"
            fullWidth
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestions}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={styles.suggestionItem}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span style={styles.suggestionIcon}>
                    {suggestion.type === 'name' ? '📍' : '📂'}
                  </span>
                  <span style={styles.suggestionText}>{suggestion.text}</span>
                  <span style={styles.suggestionType}>
                    {suggestion.type === 'name' ? 'Nom' : 'Couche'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Mode */}
        <Select
          value={searchMode}
          onChange={setSearchMode}
          options={[
            { value: 'text', label: '📝 Texte' },
            { value: 'semantic', label: '🧠 Sémantique' },
            { value: 'both', label: '🔀 Les deux' },
          ]}
          label="Mode de recherche"
          fullWidth
        />

        {/* Search Fields (for text mode) */}
        {(searchMode === 'text' || searchMode === 'both') && (
          <div style={styles.fieldsGroup}>
            <span style={styles.fieldsLabel}>Rechercher dans:</span>
            <div style={styles.checkboxGroup}>
              <Checkbox
                checked={searchFields.name}
                onChange={(checked) => setSearchFields(prev => ({ ...prev, name: checked }))}
                label="Nom"
              />
              <Checkbox
                checked={searchFields.layer}
                onChange={(checked) => setSearchFields(prev => ({ ...prev, layer: checked }))}
                label="Couche"
              />
              <Checkbox
                checked={searchFields.geometry}
                onChange={(checked) => setSearchFields(prev => ({ ...prev, geometry: checked }))}
                label="Géométrie"
              />
            </div>
          </div>
        )}

        {/* Results */}
        {query.trim() && (
          <div style={styles.results}>
            <div style={styles.resultsHeader}>
              <span style={styles.resultsCount}>
                {activeResults.length} résultat{activeResults.length > 1 ? 's' : ''}
              </span>
              {activeResults.length > 0 && (
                <button style={styles.zoomAllButton} onClick={handleZoomToAll}>
                  🔍 Recentrer tout
                </button>
              )}
            </div>

            {activeResults.length === 0 ? (
              <div style={styles.noResults}>
                <span style={styles.noResultsIcon}>🔍</span>
                <span style={styles.noResultsText}>Aucun résultat</span>
              </div>
            ) : (
              <div style={styles.resultsList}>
                {activeResults.map((result, index) => (
                  <div
                    key={result.id}
                    style={styles.resultItem}
                    onClick={() => handleResultClick(result)}
                  >
                    <div style={styles.resultMain}>
                      <span style={styles.resultIcon}>
                        {result.geometry?.startsWith('POINT') ? '📍' :
                         result.geometry?.startsWith('LINE') ? '〰️' :
                         result.geometry?.startsWith('POLYGON') ? '▭' : '❓'}
                      </span>
                      <div style={styles.resultInfo}>
                        <div style={styles.resultName}>{result.name || `Entité #${result.id}`}</div>
                        <div style={styles.resultMeta}>
                          {result.layer_name}
                          {result.matchType && (
                            <span style={styles.matchTypeBadge}>
                              {result.matchType === 'text' ? '📝' : '🧠'}
                            </span>
                          )}
                          {result.similarity && (
                            <span style={styles.similarityBadge}>
                              {(result.similarity * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MenuSection>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  searchBox: {
    position: 'relative',
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.border}`,
    transition: 'all 0.2s ease',
  },
  suggestionIcon: {
    fontSize: fontSize.md,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  suggestionType: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.sm,
  },
  fieldsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  fieldsLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xs} 0`,
  },
  resultsCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  zoomAllButton: {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    textAlign: 'center',
  },
  noResultsIcon: {
    fontSize: '48px',
    opacity: 0.3,
  },
  noResultsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  resultItem: {
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  resultMain: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultIcon: {
    fontSize: fontSize.lg,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: '2px',
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  matchTypeBadge: {
    padding: `2px ${spacing.xs}`,
    backgroundColor: colors.primaryVeryLight,
    borderRadius: borderRadius.sm,
    fontSize: '10px',
  },
  similarityBadge: {
    padding: `2px ${spacing.xs}`,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.sm,
    fontSize: '10px',
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
};

export default SearchSection;
