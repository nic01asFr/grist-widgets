/**
 * Types principaux pour Smart Map 3D
 */

// ============================================
// ÉTAT GLOBAL
// ============================================

export interface AppState {
  location: LocationState;
  layers: Layer[];
  selection: SelectionState;
  settings: MapSettings;
  currentModule: ModuleName | null;
  selectedLayer: string | null;
  sync: SyncState;
}

export interface LocationState {
  name: string;
  lat: number;
  lng: number;
  radius: number; // Zone de travail en mètres
}

export interface SyncState {
  enabled: boolean;
  groupId: string;
  role: 'master' | 'slave' | 'peer';
  peerCount: number;
  // Options granulaires
  syncCamera: boolean;
  syncAmbiance: boolean;
  syncSelection: boolean;
  syncLayers: boolean;
}

export type ModuleName = 'lieu' | 'donnees' | 'fond' | 'ambiance' | 'vue' | 'sync';

// ============================================
// COUCHES
// ============================================

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  geometryType: GeometryType;
  source: 'import' | 'osm' | 'grist';
  geojson: GeoJSON.FeatureCollection;
  gristId?: number;

  // Multi-styles
  styles: LayerStyle[];
  activeStyleId: string;

  // Référence rapide au style actif (synchronisé avec styles[])
  style?: LayerStyleConfig;

  // Symbolisation avancée
  symbolization?: SymbolizationConfig;
}

export type GeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon';

// ============================================
// STYLES
// ============================================

export interface LayerStyle {
  id: string;
  name: string;
  icon: string;
  config: LayerStyleConfig;
}

export interface LayerStyleConfig {
  mode: 'mapbox' | 'library' | 'custom';

  // Style Mapbox natif
  mapbox?: MapboxStyleConfig;

  // Modèle de la bibliothèque
  library?: LibraryStyleConfig;

  // Modèle personnalisé
  custom?: CustomStyleConfig;

  // Paramètres communs (scale, rotation, offset)
  common?: CommonStyleParams;
}

export interface MapboxStyleConfig {
  type: 'circle' | 'icon' | 'symbol';
  color: string;
  radius: number;
  strokeWidth: number;
  strokeColor: string;
  opacity: number;
  emissiveEnabled: boolean;
  emissiveStrength: number;
}

export interface LibraryStyleConfig {
  category: string;
  modelId: number | null;
}

export interface CustomStyleConfig {
  url: string;
  previewUrl?: string;
}

export interface CommonStyleParams {
  scale: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  color?: string;
  opacity?: number;
  autoAlignRoad?: boolean;
}

// ============================================
// SYMBOLISATION
// ============================================

export interface SymbolizationConfig {
  color?: SymbolizationField;
  scale?: SymbolizationField;
  altitude?: SymbolizationField;
  model?: SymbolizationField;
}

export interface SymbolizationField {
  mode: 'single' | 'categorized' | 'graduated';
  field?: string;
  method?: 'linear' | 'quantile' | 'jenks';

  // Pour categorized
  categories?: Map<string, any>;
  palette?: string;

  // Pour graduated
  inputRange?: [number, number];
  outputRange?: [number, number];

  // Valeur par défaut
  defaultValue?: any;
}

// ============================================
// PARAMÈTRES CARTE
// ============================================

export interface MapSettings {
  mapStyle: MapStyle;
  terrain3D: boolean;
  terrainExaggeration: number;
  show3dBuildings: boolean;
  show3dLandmarks: boolean;
  show3dTrees: boolean;
  show3dFacades: boolean;
  showPOI: boolean;
  showTransit: boolean;
  showPlaceLabels: boolean;
  showRoadLabels: boolean;
  showPedestrianRoads: boolean;
  showAdminBoundaries: boolean;
  timeOfDay: number; // Minutes depuis minuit
  date: string; // ISO date
  shadowsEnabled: boolean;
  useRealisticSun: boolean;
  fogEnabled: boolean;
}

export type MapStyle = 'standard' | 'streets' | 'satellite' | 'satellite-streets';

// ============================================
// SÉLECTION
// ============================================

export interface SelectionState {
  mode: boolean;
  layerId: string | null;
  features: number[]; // Indices des features sélectionnés
  highlighted: Set<number>;
}

// ============================================
// MODÈLES 3D
// ============================================

export interface Model3D {
  id: number;
  name: string;
  category: string;
  url: string;
  previewUrl?: string;
  scale: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  tags?: string[];
}

export interface ModelCategory {
  id: string;
  name: string;
  icon: string;
}

export const MODEL_CATEGORIES: ModelCategory[] = [
  { id: 'eclairage', name: 'Éclairage', icon: '💡' },
  { id: 'signaletique', name: 'Signalétique', icon: '🚧' },
  { id: 'vegetation', name: 'Végétation', icon: '🌳' },
  { id: 'mobilier', name: 'Mobilier urbain', icon: '🪑' },
  { id: 'transport', name: 'Transport', icon: '🚌' },
  { id: 'batiments', name: 'Bâtiments', icon: '🏠' },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🌉' },
  { id: 'decoration', name: 'Décoration', icon: '🎨' },
  { id: 'autre', name: 'Autre', icon: '📦' }
];

// ============================================
// PALETTES DE COULEURS
// ============================================

export interface ColorPalette {
  id: string;
  name: string;
  type: 'qualitative' | 'sequential' | 'divergent';
  colors: string[];
}

export const COLOR_PALETTES: ColorPalette[] = [
  // Qualitatives (catégories)
  {
    id: 'tableau10',
    name: 'Tableau 10',
    type: 'qualitative',
    colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab']
  },
  {
    id: 'set1',
    name: 'Set 1',
    type: 'qualitative',
    colors: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999']
  },
  {
    id: 'pastel',
    name: 'Pastel',
    type: 'qualitative',
    colors: ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc']
  },
  // Séquentielles (valeurs numériques)
  {
    id: 'viridis',
    name: 'Viridis',
    type: 'sequential',
    colors: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725']
  },
  {
    id: 'blues',
    name: 'Blues',
    type: 'sequential',
    colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
  },
  {
    id: 'greens',
    name: 'Greens',
    type: 'sequential',
    colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b']
  },
  {
    id: 'oranges',
    name: 'Oranges',
    type: 'sequential',
    colors: ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704']
  },
  {
    id: 'reds',
    name: 'Reds',
    type: 'sequential',
    colors: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d']
  },
  // Divergentes (écarts positifs/négatifs)
  {
    id: 'rdbu',
    name: 'Rouge-Bleu',
    type: 'divergent',
    colors: ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061']
  },
  {
    id: 'piyg',
    name: 'Rose-Vert',
    type: 'divergent',
    colors: ['#8e0152', '#c51b7d', '#de77ae', '#f1b6da', '#fde0ef', '#f7f7f7', '#e6f5d0', '#b8e186', '#7fbc41', '#4d9221', '#276419']
  }
];

// ============================================
// SCHÉMAS GRIST
// ============================================

export const GRIST_TABLE_SCHEMAS = {
  Models_3D: {
    Name: 'Text',
    Category: 'Choice',
    URL: 'Text',
    PreviewURL: 'Text',
    Scale: 'Numeric',
    RotationX: 'Numeric',
    RotationY: 'Numeric',
    RotationZ: 'Numeric',
    OffsetX: 'Numeric',
    OffsetY: 'Numeric',
    OffsetZ: 'Numeric',
    Tags: 'Text'
  },
  Maquette_Layers: {
    Name: 'Text',
    Color: 'Text',
    Visible: 'Bool',
    GeomType: 'Choice',
    Source: 'Choice',
    StyleMode: 'Choice',
    StyleJSON: 'Text',
    ModelId: 'Ref:Models_3D',
    CustomUrl: 'Text',
    Scale: 'Numeric',
    RotationX: 'Numeric',
    RotationY: 'Numeric',
    RotationZ: 'Numeric',
    OffsetX: 'Numeric',
    OffsetY: 'Numeric',
    OffsetZ: 'Numeric',
    FeatureCount: 'Int'
  },
  Maquette_Features: {
    LayerId: 'Ref:Maquette_Layers',
    Longitude: 'Numeric',
    Latitude: 'Numeric',
    Geometry: 'Text',
    OsmId: 'Text',
    Tags: 'Text',
    Label: 'Text',
    ModelId: 'Ref:Models_3D',
    Scale: 'Numeric',
    RotationX: 'Numeric',
    RotationY: 'Numeric',
    RotationZ: 'Numeric',
    OffsetX: 'Numeric',
    OffsetY: 'Numeric',
    OffsetZ: 'Numeric'
  }
};

// ============================================
// CONFIGURATION
// ============================================

export interface AppConfig {
  mapbox: {
    token: string;
    defaultCenter: [number, number];
    defaultZoom: number;
    defaultPitch: number;
    defaultBearing: number;
  };
  grist: {
    ready: boolean;
    documentId?: string;
  };
  sync: {
    defaultGroupId: string;
    enabled: boolean;
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  mapbox: {
    token: '', // À remplir
    defaultCenter: [2.3522, 48.8566], // Paris
    defaultZoom: 17,
    defaultPitch: 60,
    defaultBearing: 0
  },
  grist: {
    ready: false
  },
  sync: {
    defaultGroupId: 'maquette-3d',
    enabled: true
  }
};

export const DEFAULT_SETTINGS: MapSettings = {
  mapStyle: 'standard',
  terrain3D: true,
  terrainExaggeration: 1.5,
  show3dBuildings: true,
  show3dLandmarks: true,
  show3dTrees: true,
  show3dFacades: true,
  showPOI: true,
  showTransit: true,
  showPlaceLabels: true,
  showRoadLabels: true,
  showPedestrianRoads: true,
  showAdminBoundaries: true,
  timeOfDay: 720, // Midi
  date: new Date().toISOString().split('T')[0],
  shadowsEnabled: true,
  useRealisticSun: true,
  fogEnabled: true
};

export const DEFAULT_STATE: AppState = {
  location: {
    name: '',
    lat: 48.8566,
    lng: 2.3522,
    radius: 500
  },
  layers: [],
  selection: {
    mode: false,
    layerId: null,
    features: [],
    highlighted: new Set()
  },
  settings: DEFAULT_SETTINGS,
  currentModule: null,
  selectedLayer: null,
  sync: {
    enabled: false,
    groupId: 'maquette-3d',
    role: 'peer',
    peerCount: 0,
    syncCamera: true,
    syncAmbiance: true,
    syncSelection: true,
    syncLayers: true
  }
};
