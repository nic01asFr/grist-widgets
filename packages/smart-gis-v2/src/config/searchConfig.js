/**
 * Search Configuration
 *
 * Defines search modes, spatial predicates, and search parameters
 * for the hybrid search system (semantic + spatial)
 */

export const SEARCH_MODES = {
  semantic: {
    id: 'semantic',
    label: 'Recherche sémantique',
    icon: '🔍',
    description: 'Recherche par mots-clés dans les propriétés (VECTOR_SEARCH)',
    color: '#3b82f6',
    requiresVectorColumn: true,

    params: [
      {
        name: 'query',
        label: 'Requête',
        type: 'text',
        placeholder: 'Ex: bâtiments commerciaux à Paris',
        required: true
      },
      {
        name: 'vectorColumn',
        label: 'Colonne de vecteur',
        type: 'column_select',
        filterType: 'text', // Only text columns that might contain embeddings
        defaultValue: 'element_vector',
        required: true
      },
      {
        name: 'maxResults',
        label: 'Nombre max de résultats',
        type: 'number',
        min: 1,
        max: 100,
        defaultValue: 10
      },
      {
        name: 'similarityThreshold',
        label: 'Seuil de similarité',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.7,
        help: 'Score minimum de similarité (0-1)'
      }
    ],

    buildFormula: (params, tableName) => {
      return `VECTOR_SEARCH(${tableName}, "${params.query}", embedding_column="${params.vectorColumn}", max_results=${params.maxResults})`;
    }
  },

  spatial: {
    id: 'spatial',
    label: 'Recherche spatiale',
    icon: '📍',
    description: 'Recherche par critères géographiques (ST_* predicates)',
    color: '#10b981',

    predicates: {
      within: {
        id: 'within',
        label: 'Contenu dans',
        icon: '⊂',
        description: 'Trouve les géométries contenues dans une zone',
        params: [
          {
            name: 'zone',
            label: 'Zone de recherche',
            type: 'geometry_picker',
            help: 'Sélectionnez une géométrie existante ou dessinez une zone',
            required: true
          }
        ],
        formula: (geometry, params) => `ST_WITHIN($geometry, "${params.zone}")`
      },

      contains: {
        id: 'contains',
        label: 'Contient',
        icon: '⊃',
        description: 'Trouve les géométries qui contiennent un point/zone',
        params: [
          {
            name: 'target',
            label: 'Géométrie cible',
            type: 'geometry_picker',
            required: true
          }
        ],
        formula: (geometry, params) => `ST_CONTAINS($geometry, "${params.target}")`
      },

      intersects: {
        id: 'intersects',
        label: 'Intersecte',
        icon: '∩',
        description: 'Trouve les géométries qui intersectent une zone',
        params: [
          {
            name: 'zone',
            label: 'Zone de recherche',
            type: 'geometry_picker',
            required: true
          }
        ],
        formula: (geometry, params) => `ST_INTERSECTS($geometry, "${params.zone}")`
      },

      distance: {
        id: 'distance',
        label: 'Distance',
        icon: '📏',
        description: 'Trouve les géométries dans un rayon donné',
        params: [
          {
            name: 'center',
            label: 'Point central',
            type: 'geometry_picker',
            geometryType: 'Point',
            help: 'Point de référence ou cliquez sur la carte',
            required: true
          },
          {
            name: 'radius',
            label: 'Rayon',
            type: 'number',
            min: 0,
            defaultValue: 1000,
            required: true
          },
          {
            name: 'unit',
            label: 'Unité',
            type: 'choice',
            options: [
              { value: 'm', label: 'Mètres (m)' },
              { value: 'km', label: 'Kilomètres (km)' }
            ],
            defaultValue: 'km'
          }
        ],
        formula: (geometry, params) => {
          return `ST_DISTANCE($geometry, "${params.center}", "${params.unit}") <= ${params.radius}`;
        }
      },

      bbox: {
        id: 'bbox',
        label: 'Bbox (Rectangle)',
        icon: '⬜',
        description: 'Trouve les géométries dans un rectangle englobant',
        params: [
          {
            name: 'minLat',
            label: 'Latitude min',
            type: 'number',
            step: 0.0001,
            required: true
          },
          {
            name: 'maxLat',
            label: 'Latitude max',
            type: 'number',
            step: 0.0001,
            required: true
          },
          {
            name: 'minLng',
            label: 'Longitude min',
            type: 'number',
            step: 0.0001,
            required: true
          },
          {
            name: 'maxLng',
            label: 'Longitude max',
            type: 'number',
            step: 0.0001,
            required: true
          }
        ],
        formula: (geometry, params) => {
          const bbox = `POLYGON((${params.minLng} ${params.minLat}, ${params.maxLng} ${params.minLat}, ${params.maxLng} ${params.maxLat}, ${params.minLng} ${params.maxLat}, ${params.minLng} ${params.minLat}))`;
          return `ST_INTERSECTS($geometry, "${bbox}")`;
        }
      },

      touches: {
        id: 'touches',
        label: 'Touche',
        icon: '🤝',
        description: 'Trouve les géométries qui touchent (frontière commune)',
        params: [
          {
            name: 'zone',
            label: 'Géométrie de référence',
            type: 'geometry_picker',
            required: true
          }
        ],
        formula: (geometry, params) => `ST_TOUCHES($geometry, "${params.zone}")`
      }
    }
  },

  hybrid: {
    id: 'hybrid',
    label: 'Recherche hybride',
    icon: '🔀',
    description: 'Combine recherche sémantique et critères spatiaux',
    color: '#8b5cf6',

    params: [
      {
        name: 'semanticQuery',
        label: 'Requête sémantique',
        type: 'text',
        placeholder: 'Ex: écoles primaires',
        required: true
      },
      {
        name: 'vectorColumn',
        label: 'Colonne de vecteur',
        type: 'column_select',
        defaultValue: 'element_vector',
        required: true
      },
      {
        name: 'spatialPredicate',
        label: 'Prédicat spatial',
        type: 'choice',
        options: [
          { value: 'within', label: 'Contenu dans' },
          { value: 'intersects', label: 'Intersecte' },
          { value: 'distance', label: 'À distance de' }
        ],
        defaultValue: 'within',
        required: true
      },
      {
        name: 'zone',
        label: 'Zone de recherche',
        type: 'geometry_picker',
        required: true
      },
      {
        name: 'maxResults',
        label: 'Nombre max de résultats',
        type: 'number',
        min: 1,
        max: 100,
        defaultValue: 20
      }
    ],

    buildFormula: (params, tableName) => {
      // First, semantic search
      const semanticResults = `VECTOR_SEARCH(${tableName}, "${params.semanticQuery}", embedding_column="${params.vectorColumn}", max_results=100)`;

      // Then, apply spatial filter on results
      const spatialFilter = params.spatialPredicate === 'within'
        ? `ST_WITHIN($geometry, "${params.zone}")`
        : params.spatialPredicate === 'distance'
        ? `ST_DISTANCE($geometry, "${params.zone}", "km") <= ${params.radius || 10}`
        : `ST_INTERSECTS($geometry, "${params.zone}")`;

      return `FILTER(${semanticResults}, ${spatialFilter})`;
    }
  }
};

/**
 * Search history item structure
 */
export const createSearchHistoryItem = (mode, params, resultCount) => {
  return {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    mode: mode,
    params: params,
    resultCount: resultCount,
    query: params.query || params.semanticQuery || 'Recherche spatiale'
  };
};

/**
 * Get search mode by ID
 */
export function getSearchMode(modeId) {
  return SEARCH_MODES[modeId];
}

/**
 * Get all search modes
 */
export function getAllSearchModes() {
  return Object.values(SEARCH_MODES);
}

/**
 * Get spatial predicate by ID
 */
export function getSpatialPredicate(predicateId) {
  return SEARCH_MODES.spatial.predicates[predicateId];
}

/**
 * Get all spatial predicates
 */
export function getAllSpatialPredicates() {
  return Object.values(SEARCH_MODES.spatial.predicates);
}
