/**
 * Smart Map 3D - Intelligent Data-Driven System Types
 *
 * Architecture for automatic field analysis, control generation,
 * and bookmark auto-generation based on data structure.
 */

import type { CameraState, AmbianceState } from '../sync/SyncManager';

// ============================================
// FIELD METADATA & ANALYSIS
// ============================================

/**
 * Types de champs détectés automatiquement
 */
export type FieldType =
  | 'text'
  | 'numeric'
  | 'integer'
  | 'datetime'
  | 'date'
  | 'time'
  | 'boolean'
  | 'choice'
  | 'reference'
  | 'geometry'
  | 'color'
  | 'url'
  | 'unknown';

/**
 * Métadonnées d'un champ analysé
 */
export interface FieldMeta {
  name: string;
  type: FieldType;
  gristType?: string; // Type Grist original

  // Statistiques calculées
  stats?: FieldStats;

  // Pour les champs Choice
  choices?: string[];
  choiceCounts?: Map<string, number>;

  // Pour les champs numériques
  numericRange?: [number, number];

  // Pour les champs datetime
  dateRange?: [Date, Date];

  // Suggestions générées
  suggestedControls: ControlSuggestion[];
  suggestedBindings: BindingSuggestion[];
  suggestedBookmarks: BookmarkSuggestion[];
}

export interface FieldStats {
  count: number;
  nullCount: number;
  uniqueCount: number;
  min?: number | Date;
  max?: number | Date;
  mean?: number;
  median?: number;
}

// ============================================
// CONTROL SUGGESTIONS
// ============================================

/**
 * Types de contrôles possibles
 */
export type ControlType =
  | 'timeline'      // Slider temporel avec animation
  | 'slider'        // Slider numérique
  | 'range-slider'  // Slider avec min/max
  | 'dropdown'      // Liste déroulante
  | 'toggle'        // Bouton on/off
  | 'radio'         // Boutons radio
  | 'chips'         // Tags cliquables
  | 'search'        // Recherche textuelle
  | 'color-picker'  // Sélecteur de couleur
  | 'date-picker'   // Sélecteur de date
  | 'time-picker';  // Sélecteur d'heure

/**
 * Suggestion de contrôle pour un champ
 */
export interface ControlSuggestion {
  controlType: ControlType;
  confidence: number; // 0-1, confiance de la suggestion
  reason: string;     // Explication de la suggestion
  config?: Partial<SmartControlConfig>;
}

// ============================================
// PROPERTY BINDINGS
// ============================================

/**
 * Propriétés visuelles bindables
 */
export type BindableProperty =
  | 'ambiance.timeOfDay'
  | 'ambiance.date'
  | 'ambiance.shadows'
  | 'camera.zoom'
  | 'camera.pitch'
  | 'camera.bearing'
  | 'layer.visibility'
  | 'layer.opacity'
  | 'layer.color'
  | 'style.extrusion'
  | 'style.radius'
  | 'style.color'
  | 'filter.include'
  | 'filter.exclude';

/**
 * Suggestion de binding champ → propriété
 */
export interface BindingSuggestion {
  property: BindableProperty;
  confidence: number;
  reason: string;
  transform?: BindingTransform;
}

/**
 * Transformation pour le binding
 */
export interface BindingTransform {
  type: 'direct' | 'linear' | 'logarithmic' | 'categorical' | 'custom';
  inputRange?: [number, number];
  outputRange?: [number, number];
  categoryMap?: Record<string, any>;
  customFn?: string; // Expression JavaScript
}

// ============================================
// BOOKMARK SUGGESTIONS
// ============================================

/**
 * Types de génération de bookmarks
 */
export type BookmarkGenerationType =
  | 'per-item'       // Un bookmark par enregistrement
  | 'per-category'   // Un bookmark par valeur unique (Choice)
  | 'per-range'      // Bookmarks par tranches (numérique)
  | 'per-time'       // Bookmarks par période (datetime)
  | 'custom';        // Définition personnalisée

/**
 * Suggestion de génération de bookmarks
 */
export interface BookmarkSuggestion {
  generationType: BookmarkGenerationType;
  confidence: number;
  reason: string;
  estimatedCount: number;
  config?: Partial<BookmarkGeneratorConfig>;
}

// ============================================
// SMART CONTROLS
// ============================================

/**
 * Contrôle intelligent lié à un champ
 */
export interface SmartControl {
  id: string;
  name: string;
  fieldName: string;
  controlType: ControlType;
  config: SmartControlConfig;
  bindings: SmartBinding[];

  // État actuel
  currentValue: any;

  // Pour les contrôles temporels
  animation?: AnimationConfig;
}

export interface SmartControlConfig {
  // Général
  label?: string;
  tooltip?: string;
  visible: boolean;
  enabled: boolean;

  // Pour slider/timeline
  min?: number;
  max?: number;
  step?: number;
  format?: string; // Format d'affichage (moment.js pour dates)

  // Pour dropdown/chips
  options?: ControlOption[];
  allowMultiple?: boolean;
  allowEmpty?: boolean;

  // Pour search
  debounceMs?: number;
  minLength?: number;

  // Style
  width?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'floating';
}

export interface ControlOption {
  value: any;
  label: string;
  icon?: string;
  color?: string;
  count?: number; // Nombre d'items avec cette valeur
}

export interface AnimationConfig {
  playing: boolean;
  speed: number;      // Multiplicateur de vitesse
  loop: boolean;
  direction: 'forward' | 'backward' | 'bounce';
  intervalMs: number; // Intervalle entre frames
}

// ============================================
// SMART BINDINGS
// ============================================

/**
 * Liaison entre un contrôle et une propriété visuelle
 */
export interface SmartBinding {
  id: string;
  controlId: string;
  property: BindableProperty;
  transform: BindingTransform;

  // Pour les bindings conditionnels
  condition?: BindingCondition;
}

export interface BindingCondition {
  type: 'equals' | 'contains' | 'range' | 'regex' | 'custom';
  value?: any;
  min?: number;
  max?: number;
  pattern?: string;
  customFn?: string;
}

// ============================================
// SMART BOOKMARKS
// ============================================

/**
 * Bookmark/Vue intelligente
 */
export interface SmartBookmark {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;

  // État capturé
  camera: CameraState;
  ambiance: AmbianceState;
  layerStates: LayerState[];
  controlValues: Record<string, any>; // controlId → value

  // Métadonnées de génération
  generatedFrom?: {
    type: BookmarkGenerationType;
    fieldName: string;
    value: any;
  };

  // Transition
  transition: BookmarkTransition;

  // Pour les tours guidés
  narration?: string;
  duration?: number; // Durée d'affichage en ms
  autoAdvance?: boolean;
}

export interface LayerState {
  layerId: string;
  visible: boolean;
  opacity?: number;
  filter?: any;
}

export interface BookmarkTransition {
  type: 'instant' | 'fly' | 'ease' | 'linear';
  durationMs: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// ============================================
// BOOKMARK GENERATOR
// ============================================

/**
 * Configuration du générateur de bookmarks
 */
export interface BookmarkGeneratorConfig {
  fieldName: string;
  generationType: BookmarkGenerationType;

  // Nommage
  nameTemplate: string;        // "Vue {value}" ou "Période {start} - {end}"
  descriptionTemplate?: string;

  // Pour per-range
  rangeCount?: number;         // Nombre de tranches
  rangeMethod?: 'equal' | 'quantile' | 'jenks';

  // Pour per-time
  timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'year';

  // Pour per-item
  maxItems?: number;           // Limite le nombre de bookmarks
  sortField?: string;
  sortOrder?: 'asc' | 'desc';

  // Filtrage
  filterCondition?: BindingCondition;

  // Caméra
  cameraMode: 'current' | 'fit-bounds' | 'center-on-feature';
  flyToFeature?: boolean;

  // Transition par défaut
  defaultTransition: BookmarkTransition;
}

/**
 * Résultat du générateur
 */
export interface GeneratedBookmarks {
  bookmarks: SmartBookmark[];
  summary: {
    totalGenerated: number;
    fieldName: string;
    generationType: BookmarkGenerationType;
    uniqueValues?: number;
    ranges?: [number, number][];
  };
}

// ============================================
// SMART MAP PROJECT
// ============================================

/**
 * Configuration complète d'un projet Smart Map
 */
export interface SmartMapProject {
  id: string;
  name: string;
  description?: string;
  version: number;
  createdAt: string;
  updatedAt: string;

  // Analyse des données
  fieldMetas: FieldMeta[];

  // Contrôles configurés
  controls: SmartControl[];
  controlLayout: ControlLayout;

  // Bookmarks
  bookmarks: SmartBookmark[];
  bookmarkGroups: BookmarkGroup[];

  // Générateurs actifs
  generators: BookmarkGeneratorConfig[];

  // Vue par défaut
  defaultBookmarkId?: string;

  // Mode d'affichage
  displayMode: DisplayMode;

  // Sync config
  syncConfig?: {
    enabled: boolean;
    groupId: string;
    role: 'master' | 'slave' | 'peer';
  };
}

export interface ControlLayout {
  position: 'sidebar' | 'toolbar' | 'floating' | 'bottom-panel';
  collapsed: boolean;
  width?: number;
  height?: number;
  controlOrder: string[]; // IDs des contrôles dans l'ordre
}

export interface BookmarkGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  bookmarkIds: string[];
  collapsed: boolean;
}

export type DisplayMode =
  | 'explorer'      // Navigation libre avec filtres
  | 'comparator'    // Comparaison côte à côte
  | 'timeline'      // Focus sur évolution temporelle
  | 'tour'          // Visite guidée
  | 'immersive';    // Plein écran minimaliste

// ============================================
// CANVAS TEMPLATES
// ============================================

/**
 * Template prédéfini pour le mode Canvas
 */
export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  displayMode: DisplayMode;

  // Contrôles par défaut
  defaultControls: Partial<SmartControl>[];

  // Layout
  layout: ControlLayout;

  // Suggestions de binding
  suggestedBindings: {
    fieldType: FieldType;
    bindings: BindingSuggestion[];
  }[];
}

/**
 * Templates prédéfinis
 */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'explorer',
    name: 'Explorateur',
    description: 'Navigation libre avec filtres et recherche',
    icon: '🔍',
    displayMode: 'explorer',
    defaultControls: [
      { controlType: 'search', config: { position: 'top', visible: true, enabled: true } }
    ],
    layout: {
      position: 'sidebar',
      collapsed: false,
      width: 300,
      controlOrder: []
    },
    suggestedBindings: [
      {
        fieldType: 'choice',
        bindings: [
          { property: 'filter.include', confidence: 0.9, reason: 'Filtrage par catégorie' }
        ]
      }
    ]
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Évolution temporelle avec animation',
    icon: '⏱️',
    displayMode: 'timeline',
    defaultControls: [
      {
        controlType: 'timeline',
        config: {
          position: 'bottom',
          visible: true,
          enabled: true
        },
        animation: {
          playing: false,
          speed: 1,
          loop: true,
          direction: 'forward',
          intervalMs: 1000
        }
      }
    ],
    layout: {
      position: 'bottom-panel',
      collapsed: false,
      height: 80,
      controlOrder: []
    },
    suggestedBindings: [
      {
        fieldType: 'datetime',
        bindings: [
          { property: 'ambiance.timeOfDay', confidence: 0.95, reason: 'Synchronisation heure solaire' },
          { property: 'ambiance.date', confidence: 0.9, reason: 'Synchronisation date' },
          { property: 'filter.include', confidence: 0.8, reason: 'Filtrage temporel' }
        ]
      }
    ]
  },
  {
    id: 'comparator',
    name: 'Comparateur',
    description: 'Comparaison avant/après ou multi-vues',
    icon: '⚖️',
    displayMode: 'comparator',
    defaultControls: [
      { controlType: 'dropdown', config: { position: 'top', visible: true, enabled: true, label: 'Vue gauche' } },
      { controlType: 'dropdown', config: { position: 'top', visible: true, enabled: true, label: 'Vue droite' } }
    ],
    layout: {
      position: 'toolbar',
      collapsed: false,
      controlOrder: []
    },
    suggestedBindings: []
  },
  {
    id: 'tour',
    name: 'Visite guidée',
    description: 'Parcours narratif avec étapes',
    icon: '🎯',
    displayMode: 'tour',
    defaultControls: [
      { controlType: 'chips', config: { position: 'bottom', visible: true, enabled: true } }
    ],
    layout: {
      position: 'bottom-panel',
      collapsed: false,
      height: 120,
      controlOrder: []
    },
    suggestedBindings: []
  },
  {
    id: 'immersive',
    name: 'Immersif',
    description: 'Vue plein écran minimaliste',
    icon: '🖼️',
    displayMode: 'immersive',
    defaultControls: [],
    layout: {
      position: 'floating',
      collapsed: true,
      controlOrder: []
    },
    suggestedBindings: []
  }
];

// ============================================
// FIELD TYPE DETECTION RULES
// ============================================

/**
 * Règles de détection de type de champ
 */
export interface FieldDetectionRule {
  gristType?: string;
  namePatterns?: RegExp[];
  valuePatterns?: RegExp[];
  detect: (values: any[]) => FieldType | null;
}

export const FIELD_DETECTION_RULES: FieldDetectionRule[] = [
  {
    gristType: 'DateTime',
    detect: () => 'datetime'
  },
  {
    gristType: 'Date',
    detect: () => 'date'
  },
  {
    gristType: 'Bool',
    detect: () => 'boolean'
  },
  {
    gristType: 'Choice',
    detect: () => 'choice'
  },
  {
    gristType: 'ChoiceList',
    detect: () => 'choice'
  },
  {
    gristType: 'Ref',
    detect: () => 'reference'
  },
  {
    gristType: 'RefList',
    detect: () => 'reference'
  },
  {
    namePatterns: [/color/i, /couleur/i, /^col_/i],
    detect: (values) => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      const validColors = values.filter(v => v && hexPattern.test(String(v)));
      return validColors.length > values.length * 0.5 ? 'color' : null;
    }
  },
  {
    namePatterns: [/url/i, /link/i, /lien/i, /href/i],
    detect: (values) => {
      const urlPattern = /^https?:\/\//;
      const validUrls = values.filter(v => v && urlPattern.test(String(v)));
      return validUrls.length > values.length * 0.5 ? 'url' : null;
    }
  },
  {
    namePatterns: [/geom/i, /wkt/i, /geometry/i, /shape/i],
    detect: (values) => {
      const wktPattern = /^(POINT|LINESTRING|POLYGON|MULTI)/i;
      const validGeom = values.filter(v => v && wktPattern.test(String(v)));
      return validGeom.length > values.length * 0.3 ? 'geometry' : null;
    }
  },
  {
    // Détection numérique
    detect: (values) => {
      const numericValues = values.filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
      if (numericValues.length < values.length * 0.8) return null;

      const allIntegers = numericValues.every(v => Number.isInteger(Number(v)));
      return allIntegers ? 'integer' : 'numeric';
    }
  }
];

// ============================================
// CONTROL SUGGESTION RULES
// ============================================

/**
 * Règles de suggestion de contrôle par type de champ
 */
export const CONTROL_SUGGESTION_RULES: Record<FieldType, ControlSuggestion[]> = {
  datetime: [
    { controlType: 'timeline', confidence: 0.95, reason: 'Idéal pour navigation temporelle avec animation' },
    { controlType: 'date-picker', confidence: 0.7, reason: 'Sélection de date précise' },
    { controlType: 'range-slider', confidence: 0.6, reason: 'Filtrage par plage de dates' }
  ],
  date: [
    { controlType: 'date-picker', confidence: 0.9, reason: 'Sélection de date' },
    { controlType: 'timeline', confidence: 0.8, reason: 'Navigation temporelle' },
    { controlType: 'range-slider', confidence: 0.6, reason: 'Filtrage par plage' }
  ],
  time: [
    { controlType: 'time-picker', confidence: 0.9, reason: 'Sélection d\'heure' },
    { controlType: 'slider', confidence: 0.7, reason: 'Slider horaire' }
  ],
  choice: [
    { controlType: 'dropdown', confidence: 0.9, reason: 'Sélection dans une liste' },
    { controlType: 'chips', confidence: 0.85, reason: 'Tags visuels pour filtrage multiple' },
    { controlType: 'radio', confidence: 0.6, reason: 'Sélection unique visible' }
  ],
  boolean: [
    { controlType: 'toggle', confidence: 0.95, reason: 'Bouton on/off' },
    { controlType: 'radio', confidence: 0.5, reason: 'Boutons Oui/Non explicites' }
  ],
  numeric: [
    { controlType: 'slider', confidence: 0.9, reason: 'Navigation dans une plage numérique' },
    { controlType: 'range-slider', confidence: 0.85, reason: 'Filtrage par plage min/max' }
  ],
  integer: [
    { controlType: 'slider', confidence: 0.9, reason: 'Navigation par valeur entière' },
    { controlType: 'range-slider', confidence: 0.8, reason: 'Filtrage par plage' },
    { controlType: 'dropdown', confidence: 0.5, reason: 'Si peu de valeurs uniques' }
  ],
  text: [
    { controlType: 'search', confidence: 0.9, reason: 'Recherche textuelle' },
    { controlType: 'dropdown', confidence: 0.4, reason: 'Si peu de valeurs uniques' }
  ],
  reference: [
    { controlType: 'dropdown', confidence: 0.9, reason: 'Sélection d\'enregistrement lié' }
  ],
  geometry: [],
  color: [
    { controlType: 'color-picker', confidence: 0.9, reason: 'Sélection de couleur' }
  ],
  url: [],
  unknown: [
    { controlType: 'search', confidence: 0.5, reason: 'Recherche générique' }
  ]
};

// ============================================
// BINDING SUGGESTION RULES
// ============================================

/**
 * Règles de suggestion de binding par type de champ
 */
export const BINDING_SUGGESTION_RULES: Record<FieldType, BindingSuggestion[]> = {
  datetime: [
    { property: 'ambiance.timeOfDay', confidence: 0.95, reason: 'Synchronise l\'heure solaire avec la date/heure' },
    { property: 'ambiance.date', confidence: 0.9, reason: 'Synchronise la date pour les ombres' },
    { property: 'filter.include', confidence: 0.7, reason: 'Filtre les éléments par période' }
  ],
  date: [
    { property: 'ambiance.date', confidence: 0.9, reason: 'Synchronise la date' },
    { property: 'filter.include', confidence: 0.7, reason: 'Filtre par date' }
  ],
  time: [
    { property: 'ambiance.timeOfDay', confidence: 0.95, reason: 'Synchronise l\'heure de la journée' }
  ],
  numeric: [
    { property: 'style.extrusion', confidence: 0.7, reason: 'Hauteur d\'extrusion proportionnelle' },
    { property: 'style.radius', confidence: 0.6, reason: 'Taille proportionnelle' },
    { property: 'layer.opacity', confidence: 0.5, reason: 'Opacité proportionnelle' },
    { property: 'camera.zoom', confidence: 0.4, reason: 'Zoom par valeur' }
  ],
  integer: [
    { property: 'style.extrusion', confidence: 0.7, reason: 'Hauteur d\'extrusion' },
    { property: 'style.radius', confidence: 0.6, reason: 'Taille proportionnelle' }
  ],
  choice: [
    { property: 'style.color', confidence: 0.9, reason: 'Couleur par catégorie' },
    { property: 'filter.include', confidence: 0.85, reason: 'Filtrage par catégorie' },
    { property: 'layer.visibility', confidence: 0.7, reason: 'Visibilité par catégorie' }
  ],
  boolean: [
    { property: 'layer.visibility', confidence: 0.9, reason: 'Afficher/masquer selon la valeur' },
    { property: 'filter.include', confidence: 0.8, reason: 'Inclure/exclure' }
  ],
  color: [
    { property: 'style.color', confidence: 0.95, reason: 'Utiliser comme couleur de style' }
  ],
  text: [
    { property: 'filter.include', confidence: 0.6, reason: 'Filtrage par texte' }
  ],
  reference: [
    { property: 'filter.include', confidence: 0.7, reason: 'Filtrage par référence' }
  ],
  geometry: [],
  url: [],
  unknown: []
};

// ============================================
// BOOKMARK GENERATION RULES
// ============================================

/**
 * Règles de génération de bookmarks par type de champ
 */
export const BOOKMARK_GENERATION_RULES: Record<FieldType, BookmarkSuggestion[]> = {
  choice: [
    {
      generationType: 'per-category',
      confidence: 0.95,
      reason: 'Un signet par catégorie pour navigation rapide',
      estimatedCount: 0, // Calculé dynamiquement
      config: {
        nameTemplate: 'Vue: {value}',
        cameraMode: 'fit-bounds',
        defaultTransition: { type: 'fly', durationMs: 2000 }
      }
    }
  ],
  datetime: [
    {
      generationType: 'per-time',
      confidence: 0.9,
      reason: 'Signets par période temporelle',
      estimatedCount: 0,
      config: {
        nameTemplate: '{value}',
        timeGranularity: 'day',
        cameraMode: 'current',
        defaultTransition: { type: 'ease', durationMs: 1000 }
      }
    }
  ],
  date: [
    {
      generationType: 'per-time',
      confidence: 0.85,
      reason: 'Signets par date',
      estimatedCount: 0,
      config: {
        nameTemplate: '{value}',
        timeGranularity: 'day',
        cameraMode: 'current',
        defaultTransition: { type: 'ease', durationMs: 1000 }
      }
    }
  ],
  numeric: [
    {
      generationType: 'per-range',
      confidence: 0.8,
      reason: 'Signets par tranches de valeurs',
      estimatedCount: 5,
      config: {
        nameTemplate: '{start} - {end}',
        rangeCount: 5,
        rangeMethod: 'quantile',
        cameraMode: 'fit-bounds',
        defaultTransition: { type: 'fly', durationMs: 1500 }
      }
    }
  ],
  integer: [
    {
      generationType: 'per-range',
      confidence: 0.75,
      reason: 'Signets par tranches',
      estimatedCount: 5,
      config: {
        rangeCount: 5,
        rangeMethod: 'equal',
        cameraMode: 'fit-bounds',
        defaultTransition: { type: 'fly', durationMs: 1500 }
      }
    }
  ],
  reference: [
    {
      generationType: 'per-category',
      confidence: 0.7,
      reason: 'Signets par enregistrement référencé',
      estimatedCount: 0,
      config: {
        cameraMode: 'fit-bounds',
        defaultTransition: { type: 'fly', durationMs: 2000 }
      }
    }
  ],
  boolean: [],
  text: [
    {
      generationType: 'per-item',
      confidence: 0.5,
      reason: 'Signets individuels (si peu d\'éléments)',
      estimatedCount: 0,
      config: {
        maxItems: 20,
        cameraMode: 'center-on-feature',
        flyToFeature: true,
        defaultTransition: { type: 'fly', durationMs: 1500 }
      }
    }
  ],
  time: [],
  color: [],
  url: [],
  geometry: [
    {
      generationType: 'per-item',
      confidence: 0.8,
      reason: 'Signets pour chaque géométrie',
      estimatedCount: 0,
      config: {
        cameraMode: 'center-on-feature',
        flyToFeature: true,
        defaultTransition: { type: 'fly', durationMs: 2000 }
      }
    }
  ],
  unknown: []
};

export default {
  CANVAS_TEMPLATES,
  FIELD_DETECTION_RULES,
  CONTROL_SUGGESTION_RULES,
  BINDING_SUGGESTION_RULES,
  BOOKMARK_GENERATION_RULES
};
