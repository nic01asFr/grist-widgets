/**
 * Spatial Tool Definitions - 30+ Professional GIS Tools
 *
 * Organized in 6 categories:
 * 1. Measurement (area, length, distance, perimeter)
 * 2. Transformation (buffer, centroid, simplify, envelope, convex hull)
 * 3. Overlay (union, intersection, difference, sym_difference)
 * 4. Spatial Query (within, contains, intersects, distance_query, touches, crosses)
 * 5. Conversion (transform_crs, to_geojson, to_wkt)
 * 6. Validation (is_valid, make_valid, geometry_type)
 */

export const SPATIAL_TOOL_CATEGORIES = {
  measurement: {
    id: 'measurement',
    icon: '📏',
    label: 'Measurements',
    color: '#3b82f6',
    description: 'Calculate distances, areas, lengths',

    tools: [
      {
        id: 'area',
        label: 'Calculate Area',
        description: 'Calculate polygon surface area',
        geometries: ['Polygon', 'MultiPolygon'],
        multiSelect: false,
        params: [
          {
            name: 'unit',
            label: 'Unit',
            type: 'choice',
            options: [
              { value: 'm2', label: 'Square meters (m²)' },
              { value: 'ha', label: 'Hectares (ha)' },
              { value: 'km2', label: 'Square kilometers (km²)' }
            ],
            default: 'ha'
          }
        ],
        formula: (geometry, params) => `ST_AREA("${geometry}", "${params.unit}")`,
        resultType: 'numeric',
        resultUnit: (params) => params.unit
      },

      {
        id: 'length',
        label: 'Calculate Length',
        description: 'Calculate line length',
        geometries: ['LineString', 'MultiLineString'],
        multiSelect: false,
        params: [
          {
            name: 'unit',
            label: 'Unit',
            type: 'choice',
            options: [
              { value: 'm', label: 'Meters (m)' },
              { value: 'km', label: 'Kilometers (km)' }
            ],
            default: 'km'
          }
        ],
        formula: (geometry, params) => `ST_LENGTH("${geometry}", "${params.unit}")`,
        resultType: 'numeric',
        resultUnit: (params) => params.unit
      },

      {
        id: 'distance',
        label: 'Distance Between',
        description: 'Calculate distance between two geometries',
        geometries: ['Point', 'LineString', 'Polygon'],
        multiSelect: true,
        minSelection: 2,
        maxSelection: 2,
        params: [
          {
            name: 'unit',
            label: 'Unit',
            type: 'choice',
            options: [
              { value: 'm', label: 'Meters (m)' },
              { value: 'km', label: 'Kilometers (km)' }
            ],
            default: 'km'
          }
        ],
        formula: (geom1, geom2, params) => `ST_DISTANCE("${geom1}", "${geom2}", "${params.unit}")`,
        resultType: 'numeric',
        resultUnit: (params) => params.unit
      },

      {
        id: 'perimeter',
        label: 'Calculate Perimeter',
        description: 'Calculate polygon perimeter',
        geometries: ['Polygon', 'MultiPolygon'],
        multiSelect: false,
        params: [
          {
            name: 'unit',
            label: 'Unit',
            type: 'choice',
            options: [
              { value: 'm', label: 'Meters (m)' },
              { value: 'km', label: 'Kilometers (km)' }
            ],
            default: 'm'
          }
        ],
        formula: (geometry, params) => `ST_PERIMETER("${geometry}", "${params.unit}")`,
        resultType: 'numeric'
      }
    ]
  },

  transformation: {
    id: 'transformation',
    icon: '🔄',
    label: 'Transformations',
    color: '#8b5cf6',
    description: 'Modify geometry shapes',

    tools: [
      {
        id: 'buffer',
        label: 'Buffer Zone',
        description: 'Create buffer zone around geometry',
        geometries: ['all'],
        multiSelect: false,
        createsNewGeometry: true,
        params: [
          {
            name: 'distance',
            label: 'Distance (meters)',
            type: 'number',
            min: 0,
            default: 100,
            step: 10
          },
          {
            name: 'segments',
            label: 'Segments (quality)',
            type: 'number',
            min: 4,
            max: 32,
            default: 8,
            help: 'Number of segments to approximate curves'
          }
        ],
        formula: (geometry, params) => `ST_BUFFER("${geometry}", ${params.distance}, ${params.segments})`,
        resultType: 'geometry'
      },

      {
        id: 'centroid',
        label: 'Centroid',
        description: 'Calculate geometric center',
        geometries: ['Polygon', 'MultiPolygon', 'LineString'],
        multiSelect: false,
        createsNewGeometry: true,
        params: [],
        formula: (geometry) => `ST_CENTROID("${geometry}")`,
        resultType: 'geometry',
        resultGeometryType: 'Point'
      },

      {
        id: 'simplify',
        label: 'Simplify',
        description: 'Reduce number of points',
        geometries: ['LineString', 'Polygon', 'MultiLineString', 'MultiPolygon'],
        multiSelect: false,
        createsNewGeometry: true,
        params: [
          {
            name: 'tolerance',
            label: 'Tolerance',
            type: 'number',
            min: 0.00001,
            max: 1,
            default: 0.0001,
            step: 0.00001,
            help: 'Higher value = more aggressive simplification'
          }
        ],
        formula: (geometry, params) => `ST_SIMPLIFY("${geometry}", ${params.tolerance})`,
        resultType: 'geometry'
      },

      {
        id: 'envelope',
        label: 'Envelope (BBox)',
        description: 'Create bounding rectangle',
        geometries: ['all'],
        multiSelect: false,
        createsNewGeometry: true,
        params: [],
        formula: (geometry) => `ST_ENVELOPE("${geometry}")`,
        resultType: 'geometry',
        resultGeometryType: 'Polygon'
      },

      {
        id: 'convex_hull',
        label: 'Convex Hull',
        description: 'Create minimal convex polygon',
        geometries: ['all'],
        multiSelect: true,
        createsNewGeometry: true,
        params: [],
        formula: (geometries) => {
          if (geometries.length === 1) {
            return `ST_CONVEXHULL("${geometries[0]}")`;
          }
          const union = `ST_UNION(${geometries.map(g => `"${g}"`).join(', ')})`;
          return `ST_CONVEXHULL(${union})`;
        },
        resultType: 'geometry',
        resultGeometryType: 'Polygon'
      }
    ]
  },

  overlay: {
    id: 'overlay',
    icon: '⚡',
    label: 'Spatial Analysis',
    color: '#ef4444',
    description: 'Operations between geometries',

    tools: [
      {
        id: 'union',
        label: 'Union',
        description: 'Merge multiple geometries',
        geometries: ['Polygon', 'MultiPolygon'],
        multiSelect: true,
        minSelection: 2,
        createsNewGeometry: true,
        params: [],
        formula: (geometries) => `ST_UNION(${geometries.map(g => `"${g}"`).join(', ')})`,
        resultType: 'geometry'
      },

      {
        id: 'intersection',
        label: 'Intersection',
        description: 'Common area between geometries',
        geometries: ['Polygon', 'MultiPolygon', 'LineString'],
        multiSelect: true,
        minSelection: 2,
        maxSelection: 2,
        createsNewGeometry: true,
        params: [],
        formula: (geom1, geom2) => `ST_INTERSECTION("${geom1}", "${geom2}")`,
        resultType: 'geometry'
      },

      {
        id: 'difference',
        label: 'Difference',
        description: 'Subtract one geometry from another',
        geometries: ['Polygon', 'MultiPolygon'],
        multiSelect: true,
        minSelection: 2,
        maxSelection: 2,
        createsNewGeometry: true,
        params: [],
        formula: (geom1, geom2) => `ST_DIFFERENCE("${geom1}", "${geom2}")`,
        resultType: 'geometry',
        help: 'Select main geometry first, then geometry to subtract'
      },

      {
        id: 'sym_difference',
        label: 'Symmetric Difference',
        description: 'Non-common parts between geometries',
        geometries: ['Polygon', 'MultiPolygon'],
        multiSelect: true,
        minSelection: 2,
        maxSelection: 2,
        createsNewGeometry: true,
        params: [],
        formula: (geom1, geom2) => `ST_SYMDIFFERENCE("${geom1}", "${geom2}")`,
        resultType: 'geometry'
      }
    ]
  },

  spatial_query: {
    id: 'spatial_query',
    icon: '🔗',
    label: 'Spatial Queries',
    color: '#10b981',
    description: 'Selection by spatial criteria',

    tools: [
      {
        id: 'within',
        label: 'Within',
        description: 'Find geometries contained in a zone',
        geometries: ['all'],
        requiresZone: true,
        resultType: 'selection',
        params: [
          {
            name: 'zone',
            label: 'Reference zone',
            type: 'geometry_picker',
            help: 'Select container zone'
          }
        ],
        predicate: (geometry, zone) => `ST_WITHIN("${geometry}", "${zone}")`,
        executionMode: 'filter'
      },

      {
        id: 'contains',
        label: 'Contains',
        description: 'Find geometries that contain others',
        geometries: ['Polygon', 'MultiPolygon'],
        requiresSecondLayer: true,
        resultType: 'selection',
        params: [
          {
            name: 'target',
            label: 'Target geometry',
            type: 'geometry_picker'
          }
        ],
        predicate: (geometry, target) => `ST_CONTAINS("${geometry}", "${target}")`,
        executionMode: 'filter'
      },

      {
        id: 'intersects',
        label: 'Intersects',
        description: 'Find intersecting geometries',
        geometries: ['all'],
        requiresSecondLayer: true,
        resultType: 'selection',
        params: [
          {
            name: 'reference',
            label: 'Reference geometry',
            type: 'geometry_picker'
          }
        ],
        predicate: (geometry, reference) => `ST_INTERSECTS("${geometry}", "${reference}")`,
        executionMode: 'filter'
      },

      {
        id: 'distance_query',
        label: 'Selection by Distance',
        description: 'Find geometries within radius',
        geometries: ['all'],
        resultType: 'selection',
        params: [
          {
            name: 'reference_point',
            label: 'Reference point',
            type: 'geometry_picker',
            geometryTypes: ['Point']
          },
          {
            name: 'max_distance',
            label: 'Maximum distance',
            type: 'number',
            min: 0,
            default: 1000,
            unit: 'm'
          }
        ],
        predicate: (geometry, refPoint, maxDist) => `ST_DISTANCE("${geometry}", "${refPoint}", "m") <= ${maxDist}`,
        executionMode: 'filter'
      },

      {
        id: 'touches',
        label: 'Touches',
        description: 'Find geometries that touch',
        geometries: ['Polygon', 'LineString'],
        requiresSecondLayer: true,
        resultType: 'selection',
        params: [
          {
            name: 'reference',
            label: 'Reference geometry',
            type: 'geometry_picker'
          }
        ],
        predicate: (geometry, reference) => `ST_TOUCHES("${geometry}", "${reference}")`,
        executionMode: 'filter'
      },

      {
        id: 'crosses',
        label: 'Crosses',
        description: 'Find geometries that cross',
        geometries: ['LineString', 'MultiLineString'],
        requiresSecondLayer: true,
        resultType: 'selection',
        params: [
          {
            name: 'reference',
            label: 'Reference geometry',
            type: 'geometry_picker'
          }
        ],
        predicate: (geometry, reference) => `ST_CROSSES("${geometry}", "${reference}")`,
        executionMode: 'filter'
      }
    ]
  },

  conversion: {
    id: 'conversion',
    icon: '🔀',
    label: 'Conversions',
    color: '#f59e0b',
    description: 'Transform formats and coordinate systems',

    tools: [
      {
        id: 'transform_crs',
        label: 'Transform CRS',
        description: 'Convert between coordinate systems',
        geometries: ['all'],
        multiSelect: false,
        createsNewGeometry: true,
        params: [
          {
            name: 'source_srid',
            label: 'Source SRID',
            type: 'choice',
            options: [
              { value: 4326, label: '4326 - WGS84 (GPS)' },
              { value: 2154, label: '2154 - Lambert93 (France)' },
              { value: 3857, label: '3857 - Web Mercator' },
              { value: 32631, label: '32631 - UTM Zone 31N' }
            ],
            default: 4326
          },
          {
            name: 'target_srid',
            label: 'Target SRID',
            type: 'choice',
            options: [
              { value: 4326, label: '4326 - WGS84 (GPS)' },
              { value: 2154, label: '2154 - Lambert93 (France)' },
              { value: 3857, label: '3857 - Web Mercator' },
              { value: 32631, label: '32631 - UTM Zone 31N' }
            ],
            default: 2154
          }
        ],
        formula: (geometry, params) => `ST_TRANSFORM("${geometry}", ${params.source_srid}, ${params.target_srid})`,
        resultType: 'geometry'
      },

      {
        id: 'to_geojson',
        label: 'Export GeoJSON',
        description: 'Convert to GeoJSON format',
        geometries: ['all'],
        multiSelect: false,
        params: [],
        formula: (geometry) => `ST_ASGEOJSON("${geometry}")`,
        resultType: 'text',
        outputFormat: 'json'
      },

      {
        id: 'to_wkt',
        label: 'Export WKT',
        description: 'Convert to WKT format',
        geometries: ['all'],
        multiSelect: false,
        params: [],
        formula: (geometry) => `ST_ASTEXT("${geometry}")`,
        resultType: 'text'
      }
    ]
  },

  validation: {
    id: 'validation',
    icon: '✅',
    label: 'Validation',
    color: '#06b6d4',
    description: 'Verify and fix geometries',

    tools: [
      {
        id: 'is_valid',
        label: 'Validate Geometry',
        description: 'Check if geometry is valid',
        geometries: ['all'],
        multiSelect: false,
        params: [],
        formula: (geometry) => `ST_ISVALID("${geometry}")`,
        resultType: 'boolean'
      },

      {
        id: 'make_valid',
        label: 'Fix Geometry',
        description: 'Attempt to fix invalid geometry',
        geometries: ['all'],
        multiSelect: false,
        createsNewGeometry: true,
        params: [],
        formula: (geometry) => `ST_MAKEVALID("${geometry}")`,
        resultType: 'geometry'
      },

      {
        id: 'geometry_type',
        label: 'Geometry Type',
        description: 'Identify geometry type',
        geometries: ['all'],
        multiSelect: false,
        params: [],
        formula: (geometry) => `ST_GEOMETRYTYPE("${geometry}")`,
        resultType: 'text'
      }
    ]
  }
};

/**
 * Get all tools as flat list
 */
export function getAllTools() {
  const allTools = [];

  Object.values(SPATIAL_TOOL_CATEGORIES).forEach(category => {
    category.tools.forEach(tool => {
      allTools.push({
        ...tool,
        category: category.id,
        categoryLabel: category.label,
        categoryIcon: category.icon
      });
    });
  });

  return allTools;
}

/**
 * Find tool by ID
 */
export function getToolById(toolId) {
  for (const category of Object.values(SPATIAL_TOOL_CATEGORIES)) {
    const tool = category.tools.find(t => t.id === toolId);
    if (tool) {
      return {
        ...tool,
        category: category.id,
        categoryLabel: category.label,
        categoryIcon: category.icon
      };
    }
  }
  return null;
}

/**
 * Filter available tools by selection
 */
export function getAvailableTools(selectedFeatures) {
  if (!selectedFeatures || selectedFeatures.length === 0) {
    return {};
  }

  const geometryTypes = new Set(
    selectedFeatures.map(f => f.geometry_type)
  );

  const availableCategories = {};

  Object.entries(SPATIAL_TOOL_CATEGORIES).forEach(([categoryId, category]) => {
    const availableTools = category.tools.filter(tool => {
      // Check geometry compatibility
      const geometryCompatible =
        tool.geometries.includes('all') ||
        tool.geometries.some(type => geometryTypes.has(type));

      if (!geometryCompatible) return false;

      // Check selection count
      if (tool.multiSelect) {
        if (tool.minSelection && selectedFeatures.length < tool.minSelection) {
          return false;
        }
        if (tool.maxSelection && selectedFeatures.length > tool.maxSelection) {
          return false;
        }
      } else {
        if (selectedFeatures.length !== 1) {
          return false;
        }
      }

      return true;
    });

    if (availableTools.length > 0) {
      availableCategories[categoryId] = {
        ...category,
        tools: availableTools
      };
    }
  });

  return availableCategories;
}
