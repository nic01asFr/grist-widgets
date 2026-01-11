/**
 * FieldAnalyzer - Service d'analyse automatique des champs
 *
 * Analyse les données pour détecter les types, calculer les statistiques,
 * et générer des suggestions de contrôles, bindings et bookmarks.
 */

import {
  FieldMeta,
  FieldType,
  FieldStats,
  ControlSuggestion,
  BindingSuggestion,
  BookmarkSuggestion,
  FIELD_DETECTION_RULES,
  CONTROL_SUGGESTION_RULES,
  BINDING_SUGGESTION_RULES,
  BOOKMARK_GENERATION_RULES
} from '../core/smart-types';

export interface AnalysisResult {
  fields: FieldMeta[];
  recommendations: AnalysisRecommendation[];
}

export interface AnalysisRecommendation {
  type: 'control' | 'binding' | 'bookmark';
  fieldName: string;
  description: string;
  priority: number; // 0-1
}

/**
 * Analyseur de champs intelligent
 */
export class FieldAnalyzer {
  /**
   * Analyse complète d'un jeu de données
   */
  analyzeData(
    records: Record<string, any>[],
    columnTypes?: Record<string, string>
  ): AnalysisResult {
    if (!records || records.length === 0) {
      return { fields: [], recommendations: [] };
    }

    // Récupérer tous les noms de champs
    const fieldNames = this.extractFieldNames(records);

    // Analyser chaque champ
    const fields: FieldMeta[] = fieldNames.map(name => {
      const values = records.map(r => r[name]).filter(v => v !== undefined);
      const gristType = columnTypes?.[name];

      return this.analyzeField(name, values, gristType);
    });

    // Générer les recommandations globales
    const recommendations = this.generateRecommendations(fields);

    return { fields, recommendations };
  }

  /**
   * Analyse un champ individuel
   */
  analyzeField(
    name: string,
    values: any[],
    gristType?: string
  ): FieldMeta {
    // Détecter le type
    const type = this.detectFieldType(name, values, gristType);

    // Calculer les statistiques
    const stats = this.calculateStats(values, type);

    // Extraire les choix si applicable
    const { choices, choiceCounts } = this.extractChoices(values, type);

    // Calculer les plages
    const numericRange = this.calculateNumericRange(values, type);
    const dateRange = this.calculateDateRange(values, type);

    // Générer les suggestions
    const suggestedControls = this.suggestControls(type, stats, choices);
    const suggestedBindings = this.suggestBindings(type, name);
    const suggestedBookmarks = this.suggestBookmarks(type, stats, choices);

    return {
      name,
      type,
      gristType,
      stats,
      choices,
      choiceCounts,
      numericRange,
      dateRange,
      suggestedControls,
      suggestedBindings,
      suggestedBookmarks
    };
  }

  /**
   * Détecte le type d'un champ
   */
  private detectFieldType(
    name: string,
    values: any[],
    gristType?: string
  ): FieldType {
    // Filtrer les valeurs nulles pour l'analyse
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) {
      return 'unknown';
    }

    // Appliquer les règles de détection dans l'ordre
    for (const rule of FIELD_DETECTION_RULES) {
      // Vérifier le type Grist
      if (rule.gristType && gristType === rule.gristType) {
        const result = rule.detect(nonNullValues);
        if (result) return result;
      }

      // Vérifier les patterns de nom
      if (rule.namePatterns) {
        const nameMatches = rule.namePatterns.some(p => p.test(name));
        if (nameMatches) {
          const result = rule.detect(nonNullValues);
          if (result) return result;
        }
      }

      // Vérifier les patterns de valeur
      if (rule.valuePatterns) {
        const sampleValues = nonNullValues.slice(0, 100).map(String);
        const valueMatches = rule.valuePatterns.some(p =>
          sampleValues.some(v => p.test(v))
        );
        if (valueMatches) {
          const result = rule.detect(nonNullValues);
          if (result) return result;
        }
      }
    }

    // Détection par analyse des valeurs si aucune règle ne correspond
    return this.detectTypeFromValues(nonNullValues);
  }

  /**
   * Détection de type basée sur l'analyse des valeurs
   */
  private detectTypeFromValues(values: any[]): FieldType {
    const sample = values.slice(0, 100);

    // Vérifier si tout est booléen
    const boolValues = sample.filter(v =>
      v === true || v === false || v === 'true' || v === 'false' || v === 1 || v === 0
    );
    if (boolValues.length === sample.length) {
      return 'boolean';
    }

    // Vérifier si tout est numérique
    const numericValues = sample.filter(v => !isNaN(Number(v)));
    if (numericValues.length >= sample.length * 0.9) {
      const allIntegers = numericValues.every(v => Number.isInteger(Number(v)));
      return allIntegers ? 'integer' : 'numeric';
    }

    // Vérifier si ce sont des dates
    const dateValues = sample.filter(v => {
      const d = new Date(v);
      return !isNaN(d.getTime());
    });
    if (dateValues.length >= sample.length * 0.8) {
      // Vérifier si ce sont des dates avec heure
      const hasTime = sample.some(v => {
        const str = String(v);
        return str.includes('T') || str.includes(':');
      });
      return hasTime ? 'datetime' : 'date';
    }

    // Vérifier si c'est un champ Choice (peu de valeurs uniques)
    const uniqueValues = new Set(sample.map(String));
    if (uniqueValues.size <= Math.min(20, sample.length * 0.3)) {
      return 'choice';
    }

    return 'text';
  }

  /**
   * Calcule les statistiques d'un champ
   */
  private calculateStats(values: any[], type: FieldType): FieldStats {
    const count = values.length;
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueCount = new Set(nonNullValues.map(String)).size;

    const stats: FieldStats = {
      count,
      nullCount,
      uniqueCount
    };

    // Statistiques numériques
    if (type === 'numeric' || type === 'integer') {
      const numbers = nonNullValues.map(Number).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        stats.min = Math.min(...numbers);
        stats.max = Math.max(...numbers);
        stats.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;

        // Médiane
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        stats.median = sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
      }
    }

    // Statistiques temporelles
    if (type === 'datetime' || type === 'date') {
      const dates = nonNullValues
        .map(v => new Date(v))
        .filter(d => !isNaN(d.getTime()));

      if (dates.length > 0) {
        stats.min = new Date(Math.min(...dates.map(d => d.getTime())));
        stats.max = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    return stats;
  }

  /**
   * Extrait les choix uniques d'un champ
   */
  private extractChoices(
    values: any[],
    type: FieldType
  ): { choices?: string[]; choiceCounts?: Map<string, number> } {
    if (type !== 'choice' && type !== 'reference') {
      return {};
    }

    const counts = new Map<string, number>();
    for (const v of values) {
      if (v === null || v === undefined || v === '') continue;
      const key = String(v);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Trier par fréquence décroissante
    const sortedChoices = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);

    return {
      choices: sortedChoices,
      choiceCounts: counts
    };
  }

  /**
   * Calcule la plage numérique
   */
  private calculateNumericRange(
    values: any[],
    type: FieldType
  ): [number, number] | undefined {
    if (type !== 'numeric' && type !== 'integer') {
      return undefined;
    }

    const numbers = values
      .filter(v => v !== null && v !== undefined)
      .map(Number)
      .filter(n => !isNaN(n));

    if (numbers.length === 0) return undefined;

    return [Math.min(...numbers), Math.max(...numbers)];
  }

  /**
   * Calcule la plage de dates
   */
  private calculateDateRange(
    values: any[],
    type: FieldType
  ): [Date, Date] | undefined {
    if (type !== 'datetime' && type !== 'date') {
      return undefined;
    }

    const dates = values
      .filter(v => v !== null && v !== undefined)
      .map(v => new Date(v))
      .filter(d => !isNaN(d.getTime()));

    if (dates.length === 0) return undefined;

    const timestamps = dates.map(d => d.getTime());
    return [
      new Date(Math.min(...timestamps)),
      new Date(Math.max(...timestamps))
    ];
  }

  /**
   * Suggère des contrôles pour un champ
   */
  private suggestControls(
    type: FieldType,
    stats: FieldStats,
    choices?: string[]
  ): ControlSuggestion[] {
    const baseSuggestions = CONTROL_SUGGESTION_RULES[type] || [];

    // Ajuster les suggestions selon les données
    return baseSuggestions.map(suggestion => {
      let adjustedConfidence = suggestion.confidence;

      // Ajuster pour les champs Choice avec beaucoup d'options
      if (type === 'choice' && choices) {
        if (choices.length > 10) {
          if (suggestion.controlType === 'radio') {
            adjustedConfidence *= 0.3; // Radio moins approprié pour beaucoup d'options
          }
          if (suggestion.controlType === 'dropdown') {
            adjustedConfidence *= 1.1; // Dropdown plus approprié
          }
        }
        if (choices.length <= 5) {
          if (suggestion.controlType === 'chips') {
            adjustedConfidence *= 1.2; // Chips idéal pour peu d'options
          }
        }
      }

      // Ajuster pour les champs numériques avec peu de valeurs uniques
      if ((type === 'numeric' || type === 'integer') && stats.uniqueCount <= 10) {
        if (suggestion.controlType === 'dropdown') {
          adjustedConfidence *= 1.5; // Dropdown peut être approprié
        }
      }

      return {
        ...suggestion,
        confidence: Math.min(1, adjustedConfidence)
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Suggère des bindings pour un champ
   */
  private suggestBindings(
    type: FieldType,
    fieldName: string
  ): BindingSuggestion[] {
    const baseSuggestions = BINDING_SUGGESTION_RULES[type] || [];

    // Ajuster selon le nom du champ
    return baseSuggestions.map(suggestion => {
      let adjustedConfidence = suggestion.confidence;

      // Bonus si le nom du champ correspond au binding
      if (fieldName.toLowerCase().includes('height') && suggestion.property === 'style.extrusion') {
        adjustedConfidence *= 1.3;
      }
      if (fieldName.toLowerCase().includes('color') && suggestion.property === 'style.color') {
        adjustedConfidence *= 1.3;
      }
      if (fieldName.toLowerCase().includes('size') && suggestion.property === 'style.radius') {
        adjustedConfidence *= 1.3;
      }
      if ((fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) &&
          suggestion.property.startsWith('ambiance')) {
        adjustedConfidence *= 1.2;
      }

      return {
        ...suggestion,
        confidence: Math.min(1, adjustedConfidence)
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Suggère des générateurs de bookmarks pour un champ
   */
  private suggestBookmarks(
    type: FieldType,
    stats: FieldStats,
    choices?: string[]
  ): BookmarkSuggestion[] {
    const baseSuggestions = BOOKMARK_GENERATION_RULES[type] || [];

    return baseSuggestions.map(suggestion => {
      let adjustedConfidence = suggestion.confidence;
      let estimatedCount = suggestion.estimatedCount;

      // Calculer le nombre estimé de bookmarks
      if (suggestion.generationType === 'per-category' && choices) {
        estimatedCount = choices.length;
        if (choices.length > 20) {
          adjustedConfidence *= 0.7; // Trop de catégories
        }
      }

      if (suggestion.generationType === 'per-item') {
        estimatedCount = stats.count - stats.nullCount;
        if (estimatedCount > 50) {
          adjustedConfidence *= 0.3; // Trop d'items
        }
      }

      if (suggestion.generationType === 'per-range') {
        estimatedCount = suggestion.config?.rangeCount || 5;
      }

      if (suggestion.generationType === 'per-time') {
        // Estimer selon la plage de dates et la granularité
        if (stats.min instanceof Date && stats.max instanceof Date) {
          const days = (stats.max.getTime() - stats.min.getTime()) / (1000 * 60 * 60 * 24);
          const granularity = suggestion.config?.timeGranularity || 'day';

          switch (granularity) {
            case 'hour': estimatedCount = Math.min(24, days * 24); break;
            case 'day': estimatedCount = Math.min(30, days); break;
            case 'week': estimatedCount = Math.min(12, days / 7); break;
            case 'month': estimatedCount = Math.min(12, days / 30); break;
            case 'year': estimatedCount = Math.min(10, days / 365); break;
          }
        }
      }

      return {
        ...suggestion,
        confidence: Math.min(1, adjustedConfidence),
        estimatedCount: Math.ceil(estimatedCount)
      };
    }).filter(s => s.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extrait les noms de champs uniques
   */
  private extractFieldNames(records: Record<string, any>[]): string[] {
    const fieldSet = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        // Ignorer les champs système
        if (!key.startsWith('_') && key !== 'id') {
          fieldSet.add(key);
        }
      }
    }
    return [...fieldSet].sort();
  }

  /**
   * Génère des recommandations globales basées sur l'analyse
   */
  private generateRecommendations(fields: FieldMeta[]): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    for (const field of fields) {
      // Recommandations de contrôle
      if (field.suggestedControls.length > 0) {
        const best = field.suggestedControls[0];
        if (best.confidence >= 0.8) {
          recommendations.push({
            type: 'control',
            fieldName: field.name,
            description: `Ajouter un ${best.controlType} pour "${field.name}" - ${best.reason}`,
            priority: best.confidence
          });
        }
      }

      // Recommandations de binding
      if (field.suggestedBindings.length > 0) {
        const best = field.suggestedBindings[0];
        if (best.confidence >= 0.7) {
          recommendations.push({
            type: 'binding',
            fieldName: field.name,
            description: `Lier "${field.name}" à ${best.property} - ${best.reason}`,
            priority: best.confidence * 0.9 // Légèrement moins prioritaire que les contrôles
          });
        }
      }

      // Recommandations de bookmark
      if (field.suggestedBookmarks.length > 0) {
        const best = field.suggestedBookmarks[0];
        if (best.confidence >= 0.7 && best.estimatedCount > 0 && best.estimatedCount <= 30) {
          recommendations.push({
            type: 'bookmark',
            fieldName: field.name,
            description: `Générer ~${best.estimatedCount} signets ${best.generationType} pour "${field.name}" - ${best.reason}`,
            priority: best.confidence * 0.8
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }
}

export default FieldAnalyzer;
