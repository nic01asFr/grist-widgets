/**
 * SearchSection Component
 * Smart GIS Widget v3.0
 *
 * Unified multi-type search with scoring and result grouping
 * Redesigned: Single search bar, auto-detect type, group results, show scores
 */

import React, { useState, useMemo } from 'react';
import { Input } from '../ui';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, transitions } from '../../constants/styles';

const SearchSection = ({
  records = [],
  onEntitySelect,
  onZoomTo,
  onSemanticSearch, // Callback for VECTOR_SEARCH in Grist
}) => {
  const [query, setQuery] = useState('');

  // Unified search: Entities, Layers, and Semantic - all at once with scoring
  const searchResults = useMemo(() => {
    if (!query.trim()) return { entities: [], layers: [], semantic: [] };

    const q = query.toLowerCase();

    // 1. Entity search with scoring
    const entityMatches = records
      .map(record => {
        let score = 0;
        const name = (record.name || '').toLowerCase();
        const layer = (record.layer_name || '').toLowerCase();

        // Exact match = high score
        if (name === q) score += 100;
        else if (name.startsWith(q)) score += 50;
        else if (name.includes(q)) score += 25;

        if (layer === q) score += 50;
        else if (layer.includes(q)) score += 10;

        return score > 0 ? { ...record, score, type: 'entity' } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 2. Layer search (unique layers matching query)
    const uniqueLayers = [...new Set(records.map(r => r.layer_name).filter(Boolean))];
    const layerMatches = uniqueLayers
      .map(layerName => {
        const lower = layerName.toLowerCase();
        let score = 0;

        if (lower === q) score = 100;
        else if (lower.startsWith(q)) score = 50;
        else if (lower.includes(q)) score = 25;

        if (score === 0) return null;

        const layerRecords = records.filter(r => r.layer_name === layerName);
        return {
          layerName,
          count: layerRecords.length,
          score,
          type: 'layer',
          ids: layerRecords.map(r => r.id),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 3. Semantic search (mock - real version calls onSemanticSearch)
    // Real: onSemanticSearch(query) → Grist VECTOR_SEARCH
    const semanticMatches = records
      .slice(0, Math.min(5, records.length))
      .map(record => ({
        ...record,
        score: Math.floor(Math.random() * 50 + 50), // 50-100
        type: 'semantic',
      }))
      .sort((a, b) => b.score - a.score);

    return {
      entities: entityMatches,
      layers: layerMatches,
      semantic: semanticMatches,
    };
  }, [query, records]);

  const totalResults = searchResults.entities.length + searchResults.layers.length + searchResults.semantic.length;

  const getGeometryIcon = (geometry) => {
    if (!geometry) return '❓';
    if (geometry.startsWith('POINT')) return '📍';
    if (geometry.startsWith('LINE')) return '〰️';
    if (geometry.startsWith('POLYGON')) return '▭';
    return '🗺️';
  };

  return (
    <div style={styles.container}>
      {/* Unified Search Input */}
      <div style={styles.searchBar}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher entités, couches, sémantique..."
          icon="🔎"
          fullWidth
        />
      </div>

      {/* Results Summary */}
      {query.trim() && (
        <div style={styles.summary}>
          <span style={styles.summaryText}>
            {totalResults} résultat{totalResults > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Grouped Results (Scrollable) */}
      {query.trim() && (
        <div style={styles.resultsContainer}>
          {totalResults === 0 ? (
            <div style={styles.noResults}>
              <span style={styles.noResultsIcon}>🔍</span>
              <span style={styles.noResultsText}>Aucun résultat</span>
            </div>
          ) : (
            <>
              {/* Entity Results */}
              {searchResults.entities.length > 0 && (
                <div style={styles.group}>
                  <div style={styles.groupHeader}>
                    <span style={styles.groupTitle}>📍 Entités ({searchResults.entities.length})</span>
                  </div>
                  {searchResults.entities.map((result) => (
                    <div
                      key={`entity-${result.id}`}
                      style={styles.resultItem}
                      onClick={() => onEntitySelect?.(result.id)}
                    >
                      <span style={styles.resultIcon}>{getGeometryIcon(result.geometry)}</span>
                      <div style={styles.resultInfo}>
                        <div style={styles.resultName}>{result.name || `Entité #${result.id}`}</div>
                        <div style={styles.resultMeta}>
                          {result.layer_name}
                        </div>
                      </div>
                      <span style={styles.score}>{result.score}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Layer Results */}
              {searchResults.layers.length > 0 && (
                <div style={styles.group}>
                  <div style={styles.groupHeader}>
                    <span style={styles.groupTitle}>📂 Couches ({searchResults.layers.length})</span>
                  </div>
                  {searchResults.layers.map((result, index) => (
                    <div
                      key={`layer-${index}`}
                      style={styles.resultItem}
                      onClick={() => onZoomTo?.(result.ids)}
                    >
                      <span style={styles.resultIcon}>📂</span>
                      <div style={styles.resultInfo}>
                        <div style={styles.resultName}>{result.layerName}</div>
                        <div style={styles.resultMeta}>
                          {result.count} entité{result.count > 1 ? 's' : ''}
                        </div>
                      </div>
                      <span style={styles.score}>{result.score}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Semantic Results */}
              {searchResults.semantic.length > 0 && (
                <div style={styles.group}>
                  <div style={styles.groupHeader}>
                    <span style={styles.groupTitle}>🧠 Sémantique ({searchResults.semantic.length})</span>
                  </div>
                  {searchResults.semantic.map((result) => (
                    <div
                      key={`semantic-${result.id}`}
                      style={styles.resultItem}
                      onClick={() => onEntitySelect?.(result.id)}
                    >
                      <span style={styles.resultIcon}>{getGeometryIcon(result.geometry)}</span>
                      <div style={styles.resultInfo}>
                        <div style={styles.resultName}>{result.name || `Entité #${result.id}`}</div>
                        <div style={styles.resultMeta}>
                          {result.layer_name}
                        </div>
                      </div>
                      <span style={styles.score}>{result.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
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
  searchBar: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    flexShrink: 0,
  },
  summary: {
    padding: `0 ${spacing.md} ${spacing.sm} ${spacing.md}`,
    flexShrink: 0,
  },
  summaryText: {
    fontSize: '11px',
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  resultsContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: `0 ${spacing.md}`,
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
  group: {
    marginBottom: spacing.md,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.sm} 0`,
    borderBottom: `2px solid ${colors.border}`,
    marginBottom: spacing.xs,
  },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    marginBottom: spacing.xs,
    transition: `all ${transitions.fast}`,
  },
  resultIcon: {
    fontSize: fontSize.md,
    flexShrink: 0,
    width: '20px',
    textAlign: 'center',
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
    fontSize: '11px',
    color: colors.textSecondary,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  score: {
    fontSize: '11px',
    fontWeight: fontWeight.bold,
    color: colors.primary,
    backgroundColor: colors.primaryVeryLight,
    padding: `2px ${spacing.xs}`,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
};

export default SearchSection;
