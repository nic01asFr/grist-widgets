/**
 * SmartMapController - Contrôleur principal du système intelligent
 *
 * Orchestre tous les services (FieldAnalyzer, BookmarkManager, ControlManager)
 * et gère le projet SmartMap avec persistance Grist.
 */

import type { Map as MapboxMap } from 'mapbox-gl';
import { FieldAnalyzer, AnalysisResult } from './FieldAnalyzer';
import { BookmarkManager } from './BookmarkManager';
import { ControlManager, PropertyChangeCallback } from './ControlManager';
import type {
  SmartMapProject,
  SmartBookmark,
  SmartControl,
  SmartBinding,
  FieldMeta,
  BookmarkGeneratorConfig,
  ControlType,
  BindableProperty,
  DisplayMode,
  CanvasTemplate,
  CANVAS_TEMPLATES
} from '../core/smart-types';
import type { AppState, MapSettings } from '../core/types';
import type { AmbianceState } from '../sync/SyncManager';

export interface SmartMapControllerConfig {
  projectId?: string;
  autoAnalyze?: boolean;
  autoSave?: boolean;
  storageKey?: string;
}

/**
 * Callbacks pour l'intégration avec l'application principale
 */
export interface SmartMapCallbacks {
  onAmbianceChange: (ambiance: AmbianceState) => void;
  onLayerVisibilityChange: (layerId: string, visible: boolean) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onFilterChange: (fieldName: string, value: any) => void;
  onStyleChange: (property: string, value: any) => void;
  onCameraChange: (camera: { zoom?: number; pitch?: number; bearing?: number }) => void;
}

/**
 * Contrôleur principal SmartMap
 */
export class SmartMapController {
  private fieldAnalyzer: FieldAnalyzer;
  private bookmarkManager: BookmarkManager;
  private controlManager: ControlManager;

  private project: SmartMapProject | null = null;
  private map: MapboxMap | null = null;
  private appState: AppState | null = null;
  private config: Required<SmartMapControllerConfig>;
  private callbacks: SmartMapCallbacks | null = null;

  // Cache d'analyse
  private lastAnalysis: AnalysisResult | null = null;

  constructor(config?: SmartMapControllerConfig) {
    this.config = {
      projectId: '',
      autoAnalyze: true,
      autoSave: true,
      storageKey: 'smart-map-project',
      ...config
    };

    this.fieldAnalyzer = new FieldAnalyzer();
    this.bookmarkManager = new BookmarkManager({ autoSave: this.config.autoSave });
    this.controlManager = new ControlManager();

    // Configurer le callback de changement de propriété
    this.controlManager.setOnPropertyChange((property, value, controlId) => {
      this.handlePropertyChange(property, value, controlId);
    });
  }

  /**
   * Initialise le contrôleur avec la carte et l'état
   */
  init(
    map: MapboxMap,
    appState: AppState,
    callbacks: SmartMapCallbacks
  ): void {
    this.map = map;
    this.appState = appState;
    this.callbacks = callbacks;

    this.bookmarkManager.init(map);

    // Charger le projet existant
    this.loadProject();
  }

  /**
   * Met à jour l'état de l'application
   */
  updateAppState(appState: AppState): void {
    this.appState = appState;
  }

  // ============================================
  // ANALYSE DES DONNÉES
  // ============================================

  /**
   * Analyse les données et génère les suggestions
   */
  analyzeData(
    records: Record<string, any>[],
    columnTypes?: Record<string, string>
  ): AnalysisResult {
    this.lastAnalysis = this.fieldAnalyzer.analyzeData(records, columnTypes);

    if (this.project) {
      this.project.fieldMetas = this.lastAnalysis.fields;
      this.saveProject();
    }

    return this.lastAnalysis;
  }

  /**
   * Obtient les suggestions pour un champ
   */
  getFieldSuggestions(fieldName: string): FieldMeta | undefined {
    return this.lastAnalysis?.fields.find(f => f.name === fieldName);
  }

  /**
   * Obtient toutes les recommandations
   */
  getRecommendations() {
    return this.lastAnalysis?.recommendations || [];
  }

  // ============================================
  // GESTION DES CONTRÔLES
  // ============================================

  /**
   * Crée un contrôle à partir d'un champ analysé
   */
  createControl(
    fieldName: string,
    controlType?: ControlType
  ): SmartControl | null {
    const fieldMeta = this.getFieldSuggestions(fieldName);
    if (!fieldMeta) return null;

    const control = this.controlManager.createControlFromField(fieldMeta, controlType);

    if (this.project) {
      this.project.controls.push(control);
      this.saveProject();
    }

    return control;
  }

  /**
   * Crée tous les contrôles recommandés
   */
  createRecommendedControls(): SmartControl[] {
    const controls: SmartControl[] = [];
    const recommendations = this.getRecommendations()
      .filter(r => r.type === 'control')
      .slice(0, 5); // Limite à 5 contrôles

    for (const rec of recommendations) {
      const fieldMeta = this.getFieldSuggestions(rec.fieldName);
      if (!fieldMeta) continue;

      const control = this.controlManager.createControlFromField(fieldMeta);
      controls.push(control);
    }

    if (this.project) {
      this.project.controls = controls;
      this.saveProject();
    }

    return controls;
  }

  /**
   * Met à jour la valeur d'un contrôle
   */
  setControlValue(controlId: string, value: any): void {
    this.controlManager.setValue(controlId, value);
  }

  /**
   * Obtient tous les contrôles
   */
  getControls(): SmartControl[] {
    return this.controlManager.getControls();
  }

  /**
   * Supprime un contrôle
   */
  deleteControl(controlId: string): void {
    this.controlManager.deleteControl(controlId);

    if (this.project) {
      this.project.controls = this.project.controls.filter(c => c.id !== controlId);
      this.saveProject();
    }
  }

  // ============================================
  // GESTION DES BINDINGS
  // ============================================

  /**
   * Ajoute un binding à un contrôle
   */
  addBinding(controlId: string, property: BindableProperty): SmartBinding {
    return this.controlManager.addBinding(controlId, property);
  }

  /**
   * Supprime un binding
   */
  removeBinding(bindingId: string): void {
    this.controlManager.removeBinding(bindingId);
  }

  /**
   * Gère le changement de propriété déclenché par un contrôle
   */
  private handlePropertyChange(
    property: BindableProperty,
    value: any,
    controlId: string
  ): void {
    if (!this.callbacks) return;

    const [category, prop] = property.split('.') as [string, string];

    switch (category) {
      case 'ambiance':
        if (prop === 'timeOfDay') {
          this.callbacks.onAmbianceChange({
            timeOfDay: value,
            date: this.appState?.settings.date || new Date().toISOString().split('T')[0]
          });
        } else if (prop === 'date') {
          this.callbacks.onAmbianceChange({
            timeOfDay: this.appState?.settings.timeOfDay || 720,
            date: value
          });
        }
        break;

      case 'layer':
        // Nécessite l'ID de la couche du binding
        const control = this.controlManager.getControl(controlId);
        if (control) {
          if (prop === 'visibility') {
            // Appliquer à toutes les couches ou une couche spécifique
            this.callbacks.onLayerVisibilityChange(control.fieldName, value);
          } else if (prop === 'opacity') {
            this.callbacks.onLayerOpacityChange(control.fieldName, value);
          }
        }
        break;

      case 'style':
        this.callbacks.onStyleChange(prop, value);
        break;

      case 'filter':
        const filterControl = this.controlManager.getControl(controlId);
        if (filterControl) {
          this.callbacks.onFilterChange(filterControl.fieldName, value);
        }
        break;

      case 'camera':
        const cameraUpdate: { zoom?: number; pitch?: number; bearing?: number } = {};
        if (prop === 'zoom') cameraUpdate.zoom = value;
        if (prop === 'pitch') cameraUpdate.pitch = value;
        if (prop === 'bearing') cameraUpdate.bearing = value;
        this.callbacks.onCameraChange(cameraUpdate);
        break;
    }
  }

  // ============================================
  // GESTION DES BOOKMARKS
  // ============================================

  /**
   * Capture un nouveau bookmark
   */
  captureBookmark(name: string, options?: Partial<SmartBookmark>): SmartBookmark {
    if (!this.appState) {
      throw new Error('AppState not initialized');
    }

    // Inclure les valeurs actuelles des contrôles
    const controlValues = this.controlManager.getAllValues();

    const bookmark = this.bookmarkManager.captureBookmark(
      name,
      this.appState,
      { ...options, controlValues }
    );

    if (this.project) {
      this.project.bookmarks.push(bookmark);
      this.saveProject();
    }

    return bookmark;
  }

  /**
   * Va à un bookmark
   */
  async goToBookmark(bookmarkId: string): Promise<void> {
    await this.bookmarkManager.goToBookmark(bookmarkId, {
      onAmbianceChange: (ambiance) => {
        this.callbacks?.onAmbianceChange(ambiance);
      },
      onLayerChange: (layerId, visible) => {
        this.callbacks?.onLayerVisibilityChange(layerId, visible);
      },
      onControlChange: (controlId, value) => {
        this.controlManager.setValue(controlId, value);
      }
    });
  }

  /**
   * Supprime un bookmark
   */
  deleteBookmark(bookmarkId: string): void {
    this.bookmarkManager.deleteBookmark(bookmarkId);

    if (this.project) {
      this.project.bookmarks = this.project.bookmarks.filter(b => b.id !== bookmarkId);
      this.saveProject();
    }
  }

  /**
   * Obtient tous les bookmarks
   */
  getBookmarks(): SmartBookmark[] {
    return this.bookmarkManager.getBookmarks();
  }

  // ============================================
  // GÉNÉRATION DE BOOKMARKS
  // ============================================

  /**
   * Génère des bookmarks automatiquement
   */
  generateBookmarks(
    config: BookmarkGeneratorConfig,
    records: Record<string, any>[]
  ): SmartBookmark[] {
    const fieldMeta = this.getFieldSuggestions(config.fieldName);
    if (!fieldMeta || !this.appState) return [];

    const result = this.bookmarkManager.generateBookmarks(
      config,
      records,
      fieldMeta,
      this.appState
    );

    if (this.project) {
      this.project.bookmarks.push(...result.bookmarks);
      this.project.generators.push(config);
      this.saveProject();
    }

    return result.bookmarks;
  }

  /**
   * Génère les bookmarks recommandés
   */
  generateRecommendedBookmarks(records: Record<string, any>[]): SmartBookmark[] {
    const allBookmarks: SmartBookmark[] = [];
    const recommendations = this.getRecommendations()
      .filter(r => r.type === 'bookmark')
      .slice(0, 3); // Limite à 3 générateurs

    for (const rec of recommendations) {
      const fieldMeta = this.getFieldSuggestions(rec.fieldName);
      if (!fieldMeta || fieldMeta.suggestedBookmarks.length === 0) continue;

      const suggestion = fieldMeta.suggestedBookmarks[0];
      if (!suggestion.config) continue;

      const config: BookmarkGeneratorConfig = {
        fieldName: rec.fieldName,
        generationType: suggestion.generationType,
        nameTemplate: suggestion.config.nameTemplate || 'Vue {value}',
        cameraMode: suggestion.config.cameraMode || 'current',
        defaultTransition: suggestion.config.defaultTransition || { type: 'fly', durationMs: 2000 },
        ...suggestion.config
      };

      const bookmarks = this.generateBookmarks(config, records);
      allBookmarks.push(...bookmarks);
    }

    return allBookmarks;
  }

  // ============================================
  // MODE TOUR
  // ============================================

  /**
   * Démarre un tour guidé
   */
  startTour(bookmarkIds?: string[]): void {
    this.bookmarkManager.startTour(bookmarkIds, {
      onAmbianceChange: (ambiance) => {
        this.callbacks?.onAmbianceChange(ambiance);
      },
      onLayerChange: (layerId, visible) => {
        this.callbacks?.onLayerVisibilityChange(layerId, visible);
      },
      onControlChange: (controlId, value) => {
        this.controlManager.setValue(controlId, value);
      }
    });
  }

  /**
   * Arrête le tour
   */
  stopTour(): void {
    this.bookmarkManager.stopTour();
  }

  /**
   * Passe à l'étape suivante
   */
  nextTourStep(): void {
    this.bookmarkManager.nextTourStep({
      onAmbianceChange: (ambiance) => {
        this.callbacks?.onAmbianceChange(ambiance);
      },
      onLayerChange: (layerId, visible) => {
        this.callbacks?.onLayerVisibilityChange(layerId, visible);
      },
      onControlChange: (controlId, value) => {
        this.controlManager.setValue(controlId, value);
      }
    });
  }

  /**
   * Revient à l'étape précédente
   */
  previousTourStep(): void {
    this.bookmarkManager.previousTourStep({
      onAmbianceChange: (ambiance) => {
        this.callbacks?.onAmbianceChange(ambiance);
      },
      onLayerChange: (layerId, visible) => {
        this.callbacks?.onLayerVisibilityChange(layerId, visible);
      },
      onControlChange: (controlId, value) => {
        this.controlManager.setValue(controlId, value);
      }
    });
  }

  /**
   * État du tour
   */
  getTourState() {
    return {
      active: this.bookmarkManager.isTourActive(),
      progress: this.bookmarkManager.getTourProgress()
    };
  }

  // ============================================
  // ANIMATION DES CONTRÔLES
  // ============================================

  /**
   * Toggle l'animation d'un contrôle timeline
   */
  toggleAnimation(controlId: string): void {
    this.controlManager.toggleAnimation(controlId);
  }

  /**
   * Définit la vitesse d'animation
   */
  setAnimationSpeed(controlId: string, speed: number): void {
    this.controlManager.setAnimationSpeed(controlId, speed);
  }

  // ============================================
  // GESTION DU PROJET
  // ============================================

  /**
   * Crée un nouveau projet
   */
  createProject(name: string, displayMode: DisplayMode = 'explorer'): SmartMapProject {
    const now = new Date().toISOString();

    this.project = {
      id: this.generateId(),
      name,
      version: 1,
      createdAt: now,
      updatedAt: now,
      fieldMetas: this.lastAnalysis?.fields || [],
      controls: [],
      controlLayout: {
        position: 'sidebar',
        collapsed: false,
        width: 300,
        controlOrder: []
      },
      bookmarks: [],
      bookmarkGroups: [],
      generators: [],
      displayMode
    };

    this.saveProject();
    return this.project;
  }

  /**
   * Charge le projet depuis le stockage
   */
  loadProject(): SmartMapProject | null {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.project = JSON.parse(stored);

        // Restaurer les contrôles et bookmarks
        if (this.project) {
          for (const control of this.project.controls) {
            // Re-créer dans le manager (sans doublon)
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load project:', e);
    }

    return this.project;
  }

  /**
   * Sauvegarde le projet
   */
  saveProject(): void {
    if (!this.project || !this.config.autoSave) return;

    this.project.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.project));
    } catch (e) {
      console.warn('Failed to save project:', e);
    }
  }

  /**
   * Exporte le projet complet en JSON
   */
  exportProject(): string {
    return JSON.stringify(this.project, null, 2);
  }

  /**
   * Importe un projet depuis JSON
   */
  importProject(json: string): void {
    try {
      this.project = JSON.parse(json);
      this.saveProject();
    } catch (e) {
      console.error('Failed to import project:', e);
      throw new Error('Invalid project JSON');
    }
  }

  /**
   * Obtient le projet actuel
   */
  getProject(): SmartMapProject | null {
    return this.project;
  }

  /**
   * Définit le mode d'affichage
   */
  setDisplayMode(mode: DisplayMode): void {
    if (this.project) {
      this.project.displayMode = mode;
      this.saveProject();
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================

  /**
   * Applique un template de canvas
   */
  applyTemplate(template: CanvasTemplate): void {
    if (!this.project) {
      this.createProject('Projet SmartMap', template.displayMode);
    }

    if (this.project) {
      this.project.displayMode = template.displayMode;
      this.project.controlLayout = { ...template.layout };
      this.saveProject();
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // GETTERS
  // ============================================

  getFieldAnalyzer(): FieldAnalyzer {
    return this.fieldAnalyzer;
  }

  getBookmarkManager(): BookmarkManager {
    return this.bookmarkManager;
  }

  getControlManager(): ControlManager {
    return this.controlManager;
  }
}

export default SmartMapController;
