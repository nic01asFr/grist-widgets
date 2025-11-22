/**
 * TreatmentRegistry - Catalog of Spatial Treatments
 *
 * Consolidates all spatial operations with NLP metadata:
 * - 30+ tools from toolDefinitions.js
 * - Spatial predicates from searchConfig.js
 * - Natural language aliases for agent queries
 *
 * Used by QueryExecutor to apply treatments based on parsed queries
 */

import { SPATIAL_TOOL_CATEGORIES } from '../config/toolDefinitions';
import { SEARCH_MODES } from '../config/searchConfig';

class TreatmentRegistry {
  constructor() {
    this.treatments = this.loadTreatments();
    this.aliases = this.buildAliases();
  }

  /**
   * Load all treatments from existing configurations
   */
  loadTreatments() {
    const treatments = {};

    // ============================================
    // Load from toolDefinitions.js
    // ============================================
    Object.entries(SPATIAL_TOOL_CATEGORIES).forEach(([categoryId, category]) => {
      category.tools.forEach(tool => {
        treatments[tool.id] = {
          id: tool.id,
          name: tool.label,
          category: categoryId,
          categoryLabel: category.label,
          categoryIcon: category.icon,
          categoryColor: category.color,

          // Input requirements
          geometries: tool.geometries || [],
          multiSelect: tool.multiSelect || false,
          params: tool.params || [],

          // Execution
          formula: tool.formula,
          resultType: tool.resultType,

          // NLP metadata
          nlp: {
            aliases: this.generateAliases(tool.id, tool.label),
            description: this.generateDescription(tool.id),
            examples: this.generateExamples(tool.id)
          }
        };
      });
    });

    // ============================================
    // Load spatial predicates from searchConfig.js
    // ============================================
    const spatialMode = SEARCH_MODES.spatial;
    if (spatialMode && spatialMode.predicates) {
      Object.entries(spatialMode.predicates).forEach(([predId, predicate]) => {
        treatments[predId] = {
          id: predId,
          name: predicate.label,
          category: 'spatial_query',
          categoryLabel: 'Requêtes spatiales',
          categoryIcon: '🔗',
          categoryColor: '#f59e0b',

          params: predicate.params || [],
          formula: predicate.formula,
          resultType: 'boolean',

          nlp: {
            aliases: this.generatePredicateAliases(predId, predicate.label),
            description: predicate.description,
            examples: this.generatePredicateExamples(predId)
          }
        };
      });
    }

    return treatments;
  }

  /**
   * Generate NLP aliases for tools
   */
  generateAliases(toolId, toolLabel) {
    const aliases = {
      'area': ['aire', 'surface', 'superfice', 'area', 'calculer aire', 'mesurer surface'],
      'length': ['longueur', 'length', 'distance', 'calculer longueur', 'mesurer longueur'],
      'perimeter': ['périmètre', 'perimeter', 'pourtour', 'calculer périmètre'],
      'distance_between': ['distance entre', 'distance', 'éloignement', 'distance de X à Y'],

      'buffer': ['tampon', 'buffer', 'zone tampon', 'à moins de', 'dans un rayon de', 'périmètre de'],
      'centroid': ['centroïde', 'centre', 'centroid', 'point central', 'milieu'],
      'simplify': ['simplifier', 'simplify', 'réduire points', 'généraliser'],
      'envelope': ['enveloppe', 'bbox', 'rectangle englobant', 'boîte englobante'],
      'convex_hull': ['enveloppe convexe', 'convex hull', 'coque convexe'],

      'union': ['union', 'fusionner', 'combiner', 'regrouper', 'merger'],
      'intersection': ['intersection', 'partie commune', 'zone commune', 'croisement'],
      'difference': ['différence', 'soustraction', 'retirer', 'enlever'],
      'sym_difference': ['différence symétrique', 'parties non communes', 'exclusion mutuelle'],

      'within': ['dans', 'contenu dans', 'à l\'intérieur de', 'within'],
      'contains': ['contient', 'englobe', 'contains'],
      'intersects': ['intersecte', 'croise', 'touche', 'intersects'],
      'distance_query': ['à distance de', 'proche de', 'autour de', 'dans un rayon'],
      'touches': ['touche', 'adjacent', 'contigu', 'touches', 'en contact avec'],
      'crosses': ['traverse', 'croise', 'crosses'],

      'transform_crs': ['transformer', 'convertir', 'changer projection', 'reprojeter'],
      'to_geojson': ['vers geojson', 'exporter geojson', 'en geojson'],
      'to_wkt': ['vers wkt', 'exporter wkt', 'en wkt'],

      'is_valid': ['valide', 'vérifier', 'est valide', 'check validity'],
      'make_valid': ['réparer', 'corriger', 'fix', 'make valid'],
      'geometry_type': ['type', 'quel type', 'geometry type']
    };

    return aliases[toolId] || [toolLabel.toLowerCase()];
  }

  /**
   * Generate predicate aliases
   */
  generatePredicateAliases(predId, label) {
    const aliases = {
      'within': ['dans', 'contenu dans', 'à l\'intérieur de', 'within'],
      'contains': ['contient', 'englobe', 'contains'],
      'intersects': ['intersecte', 'croise', 'touche', 'recoupe'],
      'distance': ['à distance de', 'proche de', 'autour de', 'dans un rayon de', 'à moins de X de'],
      'bbox': ['rectangle', 'bbox', 'boîte englobante', 'zone rectangulaire'],
      'touches': ['touche', 'adjacent à', 'contigu', 'en contact avec']
    };

    return aliases[predId] || [label.toLowerCase()];
  }

  /**
   * Generate description for tools
   */
  generateDescription(toolId) {
    const descriptions = {
      'area': 'Calcule la surface d\'une géométrie',
      'length': 'Calcule la longueur d\'une ligne',
      'perimeter': 'Calcule le périmètre d\'un polygone',
      'distance_between': 'Calcule la distance entre deux géométries',

      'buffer': 'Crée une zone tampon autour d\'une géométrie',
      'centroid': 'Calcule le centre géométrique',
      'simplify': 'Simplifie une géométrie (réduit le nombre de points)',
      'envelope': 'Crée le rectangle englobant',
      'convex_hull': 'Crée l\'enveloppe convexe',

      'union': 'Fusionne plusieurs géométries',
      'intersection': 'Trouve la partie commune entre géométries',
      'difference': 'Soustrait une géométrie d\'une autre',
      'sym_difference': 'Trouve les parties non communes',

      'within': 'Vérifie si une géométrie est contenue dans une autre',
      'contains': 'Vérifie si une géométrie en contient une autre',
      'intersects': 'Vérifie si deux géométries s\'intersectent',
      'distance_query': 'Trouve les géométries dans un rayon donné',
      'touches': 'Vérifie si deux géométries se touchent',
      'crosses': 'Vérifie si deux lignes se croisent'
    };

    return descriptions[toolId] || '';
  }

  /**
   * Generate usage examples
   */
  generateExamples(toolId) {
    const examples = {
      'buffer': [
        'créer une zone tampon de 500m autour des écoles',
        'buffer de 1km autour de la commune',
        'à moins de 100m des routes'
      ],
      'within': [
        'tous les bâtiments dans Paris',
        'les écoles contenues dans le département',
        'points à l\'intérieur de la zone'
      ],
      'intersects': [
        'routes qui croisent la commune',
        'bâtiments qui intersectent la zone inondable',
        'parcelles touchées par le projet'
      ],
      'distance_query': [
        'écoles à moins de 500m',
        'pharmacies dans un rayon de 1km',
        'commerces proches de la gare'
      ]
    };

    return examples[toolId] || [];
  }

  /**
   * Generate predicate examples
   */
  generatePredicateExamples(predId) {
    return this.generateExamples(predId);
  }

  /**
   * Build reverse index: alias -> treatment
   */
  buildAliases() {
    const aliases = new Map();

    Object.values(this.treatments).forEach(treatment => {
      // Add each alias
      treatment.nlp.aliases.forEach(alias => {
        const key = alias.toLowerCase().trim();
        if (!aliases.has(key)) {
          aliases.set(key, []);
        }
        aliases.get(key).push(treatment.id);
      });

      // Add tool ID itself
      aliases.set(treatment.id, [treatment.id]);
    });

    return aliases;
  }

  /**
   * Find treatment by natural language phrase
   *
   * @param {string} phrase - NL phrase (e.g., "zone tampon", "à moins de")
   * @returns {Object|null} - Treatment or null
   */
  findByNLP(phrase) {
    const normalized = phrase.toLowerCase().trim();

    // Direct match
    if (this.aliases.has(normalized)) {
      const matches = this.aliases.get(normalized);
      return matches.length > 0 ? this.treatments[matches[0]] : null;
    }

    // Fuzzy match (contains)
    for (const [alias, treatmentIds] of this.aliases.entries()) {
      if (alias.includes(normalized) || normalized.includes(alias)) {
        return this.treatments[treatmentIds[0]];
      }
    }

    // Pattern matching for distance expressions
    const distancePattern = /(?:à\s+moins\s+de|dans\s+un\s+rayon\s+de|autour\s+de|proche\s+de)\s+(\d+)\s*(m|km|metre|kilometre)/i;
    const match = phrase.match(distancePattern);
    if (match) {
      return {
        ...this.treatments['buffer'],
        suggestedParams: {
          distance: parseInt(match[1]),
          unit: match[2].startsWith('k') ? 'km' : 'm'
        }
      };
    }

    return null;
  }

  /**
   * Get treatment by ID
   */
  get(treatmentId) {
    return this.treatments[treatmentId];
  }

  /**
   * Get all treatments in a category
   */
  getByCategory(categoryId) {
    return Object.values(this.treatments).filter(t => t.category === categoryId);
  }

  /**
   * Get all categories
   */
  getCategories() {
    const categories = new Set();
    Object.values(this.treatments).forEach(t => {
      categories.add(t.category);
    });
    return Array.from(categories);
  }

  /**
   * Get all treatments
   */
  getAll() {
    return Object.values(this.treatments);
  }

  /**
   * Search treatments
   */
  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    Object.values(this.treatments).forEach(treatment => {
      const score = this.calculateMatchScore(treatment, lowerQuery);
      if (score > 0) {
        results.push({ treatment, score });
      }
    });

    return results.sort((a, b) => b.score - a.score).map(r => r.treatment);
  }

  /**
   * Calculate match score for search
   */
  calculateMatchScore(treatment, query) {
    let score = 0;

    // Name match
    if (treatment.name.toLowerCase().includes(query)) score += 10;

    // Alias match
    if (treatment.nlp.aliases.some(a => a.toLowerCase().includes(query))) score += 5;

    // Description match
    if (treatment.nlp.description.toLowerCase().includes(query)) score += 3;

    // Example match
    if (treatment.nlp.examples.some(e => e.toLowerCase().includes(query))) score += 2;

    return score;
  }

  /**
   * Get suggested treatments for a query context
   *
   * @param {Object} context - { geometryTypes, operation }
   * @returns {Array} - Suggested treatments
   */
  getSuggestions(context) {
    const suggestions = [];

    Object.values(this.treatments).forEach(treatment => {
      // Check geometry compatibility
      if (context.geometryTypes && treatment.geometries.length > 0) {
        const compatible = context.geometryTypes.some(type =>
          treatment.geometries.includes(type)
        );
        if (!compatible) return;
      }

      // Check operation type
      if (context.operation) {
        if (treatment.category === context.operation) {
          suggestions.push(treatment);
        }
      } else {
        suggestions.push(treatment);
      }
    });

    return suggestions;
  }
}

// Singleton instance
const treatmentRegistry = new TreatmentRegistry();

export default treatmentRegistry;
export { TreatmentRegistry };
