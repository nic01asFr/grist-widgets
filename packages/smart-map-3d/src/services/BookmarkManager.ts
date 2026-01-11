/**
 * BookmarkManager - Gestionnaire de bookmarks/vues
 *
 * Gère la capture, le stockage, la navigation et la génération
 * automatique de bookmarks.
 */

import type { Map as MapboxMap } from 'mapbox-gl';
import type { CameraState, AmbianceState } from '../sync/SyncManager';
import type {
  SmartBookmark,
  BookmarkGroup,
  BookmarkTransition,
  LayerState,
  BookmarkGeneratorConfig,
  GeneratedBookmarks,
  FieldMeta
} from '../core/smart-types';
import type { AppState, Layer, MapSettings } from '../core/types';

export interface BookmarkManagerConfig {
  maxBookmarks?: number;
  defaultTransition?: BookmarkTransition;
  autoSave?: boolean;
  storageKey?: string;
}

/**
 * Gestionnaire de bookmarks intelligent
 */
export class BookmarkManager {
  private bookmarks: Map<string, SmartBookmark> = new Map();
  private groups: Map<string, BookmarkGroup> = new Map();
  private config: Required<BookmarkManagerConfig>;
  private map: MapboxMap | null = null;
  private currentBookmarkId: string | null = null;
  private tourMode: boolean = false;
  private tourIndex: number = 0;
  private tourBookmarkIds: string[] = [];
  private tourTimer: number | null = null;

  // Callbacks
  private onBookmarkChange?: (bookmark: SmartBookmark | null) => void;
  private onTourStep?: (bookmark: SmartBookmark, index: number, total: number) => void;

  constructor(config?: BookmarkManagerConfig) {
    this.config = {
      maxBookmarks: 100,
      defaultTransition: { type: 'fly', durationMs: 2000, easing: 'ease-in-out' },
      autoSave: true,
      storageKey: 'smart-map-3d-bookmarks',
      ...config
    };
  }

  /**
   * Initialise avec la carte Mapbox
   */
  init(map: MapboxMap): void {
    this.map = map;

    // Charger les bookmarks sauvegardés
    if (this.config.autoSave) {
      this.loadFromStorage();
    }
  }

  // ============================================
  // CAPTURE DE BOOKMARK
  // ============================================

  /**
   * Capture l'état actuel comme nouveau bookmark
   */
  captureBookmark(
    name: string,
    appState: AppState,
    options?: Partial<SmartBookmark>
  ): SmartBookmark {
    if (!this.map) {
      throw new Error('BookmarkManager not initialized');
    }

    const id = this.generateId();
    const center = this.map.getCenter();

    const bookmark: SmartBookmark = {
      id,
      name,
      description: options?.description,
      icon: options?.icon || '📍',
      color: options?.color,

      camera: {
        center: [center.lng, center.lat],
        zoom: this.map.getZoom(),
        pitch: this.map.getPitch(),
        bearing: this.map.getBearing()
      },

      ambiance: {
        timeOfDay: appState.settings.timeOfDay,
        date: appState.settings.date,
        shadowsEnabled: appState.settings.shadowsEnabled,
        useRealisticSun: appState.settings.useRealisticSun
      },

      layerStates: appState.layers.map(layer => ({
        layerId: layer.id,
        visible: layer.visible,
        opacity: layer.style?.common?.opacity
      })),

      controlValues: {}, // Sera rempli par le contrôleur

      transition: options?.transition || this.config.defaultTransition,

      generatedFrom: options?.generatedFrom,
      narration: options?.narration,
      duration: options?.duration,
      autoAdvance: options?.autoAdvance
    };

    this.addBookmark(bookmark);
    return bookmark;
  }

  /**
   * Ajoute un bookmark
   */
  addBookmark(bookmark: SmartBookmark): void {
    if (this.bookmarks.size >= this.config.maxBookmarks) {
      console.warn(`Maximum bookmarks (${this.config.maxBookmarks}) reached`);
      return;
    }

    this.bookmarks.set(bookmark.id, bookmark);
    this.saveToStorage();
  }

  /**
   * Met à jour un bookmark
   */
  updateBookmark(id: string, updates: Partial<SmartBookmark>): void {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return;

    const updated = { ...bookmark, ...updates };
    this.bookmarks.set(id, updated);
    this.saveToStorage();
  }

  /**
   * Supprime un bookmark
   */
  deleteBookmark(id: string): void {
    this.bookmarks.delete(id);

    // Retirer des groupes
    for (const group of this.groups.values()) {
      const index = group.bookmarkIds.indexOf(id);
      if (index !== -1) {
        group.bookmarkIds.splice(index, 1);
      }
    }

    this.saveToStorage();
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Aller à un bookmark
   */
  goToBookmark(
    id: string,
    callbacks?: {
      onAmbianceChange?: (ambiance: AmbianceState) => void;
      onLayerChange?: (layerId: string, visible: boolean) => void;
      onControlChange?: (controlId: string, value: any) => void;
    }
  ): Promise<void> {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark || !this.map) {
      return Promise.reject(new Error(`Bookmark ${id} not found`));
    }

    return new Promise((resolve) => {
      // Appliquer la transition caméra
      const transitionOptions = this.getTransitionOptions(bookmark.transition);

      this.map!.once('moveend', () => {
        this.currentBookmarkId = id;
        this.onBookmarkChange?.(bookmark);
        resolve();
      });

      this.map![bookmark.transition.type === 'instant' ? 'jumpTo' : 'flyTo']({
        center: bookmark.camera.center,
        zoom: bookmark.camera.zoom,
        pitch: bookmark.camera.pitch,
        bearing: bookmark.camera.bearing,
        ...transitionOptions
      });

      // Appliquer l'ambiance
      if (callbacks?.onAmbianceChange) {
        callbacks.onAmbianceChange(bookmark.ambiance);
      }

      // Appliquer les états des couches
      if (callbacks?.onLayerChange) {
        for (const layerState of bookmark.layerStates) {
          callbacks.onLayerChange(layerState.layerId, layerState.visible);
        }
      }

      // Appliquer les valeurs des contrôles
      if (callbacks?.onControlChange) {
        for (const [controlId, value] of Object.entries(bookmark.controlValues)) {
          callbacks.onControlChange(controlId, value);
        }
      }
    });
  }

  /**
   * Convertit la transition en options Mapbox
   */
  private getTransitionOptions(transition: BookmarkTransition): any {
    const options: any = {
      duration: transition.durationMs
    };

    if (transition.easing) {
      // Mapbox utilise des fonctions d'easing personnalisées
      switch (transition.easing) {
        case 'ease-in':
          options.easing = (t: number) => t * t;
          break;
        case 'ease-out':
          options.easing = (t: number) => 1 - (1 - t) * (1 - t);
          break;
        case 'ease-in-out':
          options.easing = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          break;
        default:
          options.easing = (t: number) => t;
      }
    }

    return options;
  }

  // ============================================
  // MODE TOUR
  // ============================================

  /**
   * Démarre un tour guidé
   */
  startTour(
    bookmarkIds?: string[],
    callbacks?: {
      onAmbianceChange?: (ambiance: AmbianceState) => void;
      onLayerChange?: (layerId: string, visible: boolean) => void;
      onControlChange?: (controlId: string, value: any) => void;
    }
  ): void {
    this.tourBookmarkIds = bookmarkIds || [...this.bookmarks.keys()];
    if (this.tourBookmarkIds.length === 0) return;

    this.tourMode = true;
    this.tourIndex = 0;

    this.playTourStep(callbacks);
  }

  /**
   * Joue une étape du tour
   */
  private async playTourStep(callbacks?: any): Promise<void> {
    if (!this.tourMode || this.tourIndex >= this.tourBookmarkIds.length) {
      this.stopTour();
      return;
    }

    const bookmarkId = this.tourBookmarkIds[this.tourIndex];
    const bookmark = this.bookmarks.get(bookmarkId);

    if (!bookmark) {
      this.tourIndex++;
      this.playTourStep(callbacks);
      return;
    }

    // Notifier l'étape
    this.onTourStep?.(bookmark, this.tourIndex, this.tourBookmarkIds.length);

    // Aller au bookmark
    await this.goToBookmark(bookmarkId, callbacks);

    // Auto-avancer si configuré
    if (bookmark.autoAdvance && bookmark.duration) {
      this.tourTimer = window.setTimeout(() => {
        this.nextTourStep(callbacks);
      }, bookmark.duration);
    }
  }

  /**
   * Passe à l'étape suivante
   */
  nextTourStep(callbacks?: any): void {
    if (this.tourTimer) {
      clearTimeout(this.tourTimer);
      this.tourTimer = null;
    }

    this.tourIndex++;
    this.playTourStep(callbacks);
  }

  /**
   * Revient à l'étape précédente
   */
  previousTourStep(callbacks?: any): void {
    if (this.tourTimer) {
      clearTimeout(this.tourTimer);
      this.tourTimer = null;
    }

    this.tourIndex = Math.max(0, this.tourIndex - 1);
    this.playTourStep(callbacks);
  }

  /**
   * Arrête le tour
   */
  stopTour(): void {
    if (this.tourTimer) {
      clearTimeout(this.tourTimer);
      this.tourTimer = null;
    }

    this.tourMode = false;
    this.tourIndex = 0;
    this.tourBookmarkIds = [];
  }

  /**
   * Pause/reprend le tour
   */
  toggleTourPause(callbacks?: any): void {
    if (this.tourTimer) {
      clearTimeout(this.tourTimer);
      this.tourTimer = null;
    } else if (this.tourMode) {
      const bookmark = this.bookmarks.get(this.tourBookmarkIds[this.tourIndex]);
      if (bookmark?.autoAdvance && bookmark?.duration) {
        this.tourTimer = window.setTimeout(() => {
          this.nextTourStep(callbacks);
        }, bookmark.duration);
      }
    }
  }

  // ============================================
  // GROUPES
  // ============================================

  /**
   * Crée un nouveau groupe
   */
  createGroup(name: string, options?: Partial<BookmarkGroup>): BookmarkGroup {
    const id = this.generateId();
    const group: BookmarkGroup = {
      id,
      name,
      icon: options?.icon || '📁',
      color: options?.color,
      bookmarkIds: options?.bookmarkIds || [],
      collapsed: options?.collapsed ?? false
    };

    this.groups.set(id, group);
    this.saveToStorage();
    return group;
  }

  /**
   * Ajoute un bookmark à un groupe
   */
  addToGroup(groupId: string, bookmarkId: string): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    if (!group.bookmarkIds.includes(bookmarkId)) {
      group.bookmarkIds.push(bookmarkId);
      this.saveToStorage();
    }
  }

  /**
   * Retire un bookmark d'un groupe
   */
  removeFromGroup(groupId: string, bookmarkId: string): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    const index = group.bookmarkIds.indexOf(bookmarkId);
    if (index !== -1) {
      group.bookmarkIds.splice(index, 1);
      this.saveToStorage();
    }
  }

  // ============================================
  // GÉNÉRATION AUTOMATIQUE
  // ============================================

  /**
   * Génère des bookmarks automatiquement selon la configuration
   */
  generateBookmarks(
    config: BookmarkGeneratorConfig,
    records: Record<string, any>[],
    fieldMeta: FieldMeta,
    currentState: AppState,
    getFeatureBounds?: (record: Record<string, any>) => [[number, number], [number, number]] | null
  ): GeneratedBookmarks {
    const bookmarks: SmartBookmark[] = [];

    switch (config.generationType) {
      case 'per-category':
        return this.generatePerCategory(config, records, fieldMeta, currentState);

      case 'per-range':
        return this.generatePerRange(config, records, fieldMeta, currentState);

      case 'per-time':
        return this.generatePerTime(config, records, fieldMeta, currentState);

      case 'per-item':
        return this.generatePerItem(config, records, fieldMeta, currentState, getFeatureBounds);

      default:
        return { bookmarks: [], summary: { totalGenerated: 0, fieldName: config.fieldName, generationType: config.generationType } };
    }
  }

  /**
   * Génère un bookmark par catégorie
   */
  private generatePerCategory(
    config: BookmarkGeneratorConfig,
    records: Record<string, any>[],
    fieldMeta: FieldMeta,
    currentState: AppState
  ): GeneratedBookmarks {
    const bookmarks: SmartBookmark[] = [];
    const choices = fieldMeta.choices || [];

    for (const category of choices) {
      const name = config.nameTemplate.replace('{value}', category);
      const description = config.descriptionTemplate?.replace('{value}', category);

      const bookmark = this.createGeneratedBookmark(
        name,
        currentState,
        {
          description,
          icon: this.getCategoryIcon(category),
          transition: config.defaultTransition,
          generatedFrom: {
            type: 'per-category',
            fieldName: config.fieldName,
            value: category
          }
        }
      );

      // Définir le filtre pour ce bookmark
      bookmark.controlValues[config.fieldName] = category;

      bookmarks.push(bookmark);
      this.addBookmark(bookmark);
    }

    return {
      bookmarks,
      summary: {
        totalGenerated: bookmarks.length,
        fieldName: config.fieldName,
        generationType: 'per-category',
        uniqueValues: choices.length
      }
    };
  }

  /**
   * Génère des bookmarks par tranches numériques
   */
  private generatePerRange(
    config: BookmarkGeneratorConfig,
    records: Record<string, any>[],
    fieldMeta: FieldMeta,
    currentState: AppState
  ): GeneratedBookmarks {
    const bookmarks: SmartBookmark[] = [];
    const range = fieldMeta.numericRange;

    if (!range) {
      return { bookmarks: [], summary: { totalGenerated: 0, fieldName: config.fieldName, generationType: 'per-range' } };
    }

    const [min, max] = range;
    const rangeCount = config.rangeCount || 5;
    const ranges: [number, number][] = [];

    if (config.rangeMethod === 'quantile' && fieldMeta.stats) {
      // Calculer les quantiles
      const values = records
        .map(r => r[config.fieldName])
        .filter(v => v !== null && v !== undefined)
        .map(Number)
        .sort((a, b) => a - b);

      for (let i = 0; i < rangeCount; i++) {
        const startIdx = Math.floor((i / rangeCount) * values.length);
        const endIdx = Math.floor(((i + 1) / rangeCount) * values.length) - 1;
        ranges.push([values[startIdx], values[endIdx]]);
      }
    } else {
      // Répartition égale
      const step = (max - min) / rangeCount;
      for (let i = 0; i < rangeCount; i++) {
        ranges.push([min + i * step, min + (i + 1) * step]);
      }
    }

    for (let i = 0; i < ranges.length; i++) {
      const [start, end] = ranges[i];
      const name = config.nameTemplate
        .replace('{start}', this.formatNumber(start))
        .replace('{end}', this.formatNumber(end))
        .replace('{index}', String(i + 1));

      const bookmark = this.createGeneratedBookmark(
        name,
        currentState,
        {
          icon: this.getRangeIcon(i, ranges.length),
          transition: config.defaultTransition,
          generatedFrom: {
            type: 'per-range',
            fieldName: config.fieldName,
            value: [start, end]
          }
        }
      );

      bookmark.controlValues[`${config.fieldName}_min`] = start;
      bookmark.controlValues[`${config.fieldName}_max`] = end;

      bookmarks.push(bookmark);
      this.addBookmark(bookmark);
    }

    return {
      bookmarks,
      summary: {
        totalGenerated: bookmarks.length,
        fieldName: config.fieldName,
        generationType: 'per-range',
        ranges
      }
    };
  }

  /**
   * Génère des bookmarks par période temporelle
   */
  private generatePerTime(
    config: BookmarkGeneratorConfig,
    records: Record<string, any>[],
    fieldMeta: FieldMeta,
    currentState: AppState
  ): GeneratedBookmarks {
    const bookmarks: SmartBookmark[] = [];
    const dateRange = fieldMeta.dateRange;

    if (!dateRange) {
      return { bookmarks: [], summary: { totalGenerated: 0, fieldName: config.fieldName, generationType: 'per-time' } };
    }

    const [startDate, endDate] = dateRange;
    const granularity = config.timeGranularity || 'day';

    // Générer les périodes
    const periods = this.generateTimePeriods(startDate, endDate, granularity);

    for (const period of periods) {
      const name = config.nameTemplate.replace('{value}', this.formatDate(period.start, granularity));

      const bookmark = this.createGeneratedBookmark(
        name,
        currentState,
        {
          icon: this.getTimeIcon(period.start),
          transition: config.defaultTransition,
          generatedFrom: {
            type: 'per-time',
            fieldName: config.fieldName,
            value: { start: period.start.toISOString(), end: period.end.toISOString() }
          }
        }
      );

      // Ajuster l'ambiance selon la période
      bookmark.ambiance.date = period.start.toISOString().split('T')[0];

      // Heure basée sur l'heure moyenne de la période
      if (granularity === 'hour') {
        bookmark.ambiance.timeOfDay = period.start.getHours() * 60 + period.start.getMinutes();
      }

      bookmark.controlValues[config.fieldName] = { start: period.start, end: period.end };

      bookmarks.push(bookmark);
      this.addBookmark(bookmark);
    }

    return {
      bookmarks,
      summary: {
        totalGenerated: bookmarks.length,
        fieldName: config.fieldName,
        generationType: 'per-time'
      }
    };
  }

  /**
   * Génère un bookmark par item
   */
  private generatePerItem(
    config: BookmarkGeneratorConfig,
    records: Record<string, any>[],
    fieldMeta: FieldMeta,
    currentState: AppState,
    getFeatureBounds?: (record: Record<string, any>) => [[number, number], [number, number]] | null
  ): GeneratedBookmarks {
    const bookmarks: SmartBookmark[] = [];

    // Trier et limiter
    let sortedRecords = [...records];
    if (config.sortField) {
      sortedRecords.sort((a, b) => {
        const va = a[config.sortField!];
        const vb = b[config.sortField!];
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return config.sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    if (config.maxItems) {
      sortedRecords = sortedRecords.slice(0, config.maxItems);
    }

    for (const record of sortedRecords) {
      const labelField = config.fieldName;
      const label = record[labelField] || `Item ${record.id}`;
      const name = config.nameTemplate.replace('{value}', String(label));

      const bookmark = this.createGeneratedBookmark(
        name,
        currentState,
        {
          icon: '📌',
          transition: config.defaultTransition,
          generatedFrom: {
            type: 'per-item',
            fieldName: config.fieldName,
            value: record.id
          }
        }
      );

      // Centrer sur la feature si possible
      if (config.flyToFeature && getFeatureBounds) {
        const bounds = getFeatureBounds(record);
        if (bounds) {
          const [sw, ne] = bounds;
          bookmark.camera.center = [(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2];
        }
      }

      bookmark.controlValues['selectedId'] = record.id;

      bookmarks.push(bookmark);
      this.addBookmark(bookmark);
    }

    return {
      bookmarks,
      summary: {
        totalGenerated: bookmarks.length,
        fieldName: config.fieldName,
        generationType: 'per-item'
      }
    };
  }

  /**
   * Génère les périodes temporelles
   */
  private generateTimePeriods(
    start: Date,
    end: Date,
    granularity: 'hour' | 'day' | 'week' | 'month' | 'year'
  ): { start: Date; end: Date }[] {
    const periods: { start: Date; end: Date }[] = [];
    const current = new Date(start);

    while (current < end) {
      const periodStart = new Date(current);
      let periodEnd: Date;

      switch (granularity) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'year':
          current.setFullYear(current.getFullYear() + 1);
          break;
      }

      periodEnd = new Date(Math.min(current.getTime(), end.getTime()));
      periods.push({ start: periodStart, end: periodEnd });

      // Limite de sécurité
      if (periods.length >= 100) break;
    }

    return periods;
  }

  /**
   * Crée un bookmark généré
   */
  private createGeneratedBookmark(
    name: string,
    currentState: AppState,
    options: Partial<SmartBookmark>
  ): SmartBookmark {
    return {
      id: this.generateId(),
      name,
      camera: { center: [currentState.location.lng, currentState.location.lat], zoom: 16, pitch: 60, bearing: 0 },
      ambiance: {
        timeOfDay: currentState.settings.timeOfDay,
        date: currentState.settings.date,
        shadowsEnabled: currentState.settings.shadowsEnabled,
        useRealisticSun: currentState.settings.useRealisticSun
      },
      layerStates: currentState.layers.map(l => ({ layerId: l.id, visible: l.visible })),
      controlValues: {},
      transition: options.transition || this.config.defaultTransition,
      ...options
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(): string {
    return `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCategoryIcon(category: string): string {
    // Retourner une icône basée sur le nom de la catégorie
    const icons: Record<string, string> = {
      'transport': '🚌',
      'education': '🎓',
      'santé': '🏥',
      'commerce': '🛒',
      'culture': '🎭',
      'sport': '⚽',
      'nature': '🌳',
      'industrie': '🏭'
    };

    for (const [key, icon] of Object.entries(icons)) {
      if (category.toLowerCase().includes(key)) {
        return icon;
      }
    }

    return '📍';
  }

  private getRangeIcon(index: number, total: number): string {
    const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return icons[index] || '📊';
  }

  private getTimeIcon(date: Date): string {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 18) return '☀️';
    if (hour >= 18 && hour < 21) return '🌆';
    return '🌙';
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toFixed(1);
  }

  private formatDate(date: Date, granularity: string): string {
    const options: Intl.DateTimeFormatOptions = {};

    switch (granularity) {
      case 'hour':
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.day = 'numeric';
        options.month = 'short';
        break;
      case 'day':
        options.day = 'numeric';
        options.month = 'short';
        options.year = 'numeric';
        break;
      case 'week':
        options.day = 'numeric';
        options.month = 'short';
        break;
      case 'month':
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'year':
        options.year = 'numeric';
        break;
    }

    return date.toLocaleDateString('fr-FR', options);
  }

  // ============================================
  // PERSISTANCE
  // ============================================

  private saveToStorage(): void {
    if (!this.config.autoSave) return;

    try {
      const data = {
        bookmarks: Array.from(this.bookmarks.entries()),
        groups: Array.from(this.groups.entries())
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save bookmarks:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);

      if (data.bookmarks) {
        this.bookmarks = new Map(data.bookmarks);
      }
      if (data.groups) {
        this.groups = new Map(data.groups);
      }
    } catch (e) {
      console.warn('Failed to load bookmarks:', e);
    }
  }

  /**
   * Exporte les bookmarks en JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      bookmarks: Array.from(this.bookmarks.values()),
      groups: Array.from(this.groups.values())
    }, null, 2);
  }

  /**
   * Importe des bookmarks depuis JSON
   */
  importFromJSON(json: string): void {
    try {
      const data = JSON.parse(json);

      if (data.bookmarks) {
        for (const bookmark of data.bookmarks) {
          this.bookmarks.set(bookmark.id, bookmark);
        }
      }

      if (data.groups) {
        for (const group of data.groups) {
          this.groups.set(group.id, group);
        }
      }

      this.saveToStorage();
    } catch (e) {
      console.error('Failed to import bookmarks:', e);
      throw new Error('Invalid bookmark JSON');
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  getBookmarks(): SmartBookmark[] {
    return Array.from(this.bookmarks.values());
  }

  getBookmark(id: string): SmartBookmark | undefined {
    return this.bookmarks.get(id);
  }

  getGroups(): BookmarkGroup[] {
    return Array.from(this.groups.values());
  }

  getGroup(id: string): BookmarkGroup | undefined {
    return this.groups.get(id);
  }

  getCurrentBookmarkId(): string | null {
    return this.currentBookmarkId;
  }

  isTourActive(): boolean {
    return this.tourMode;
  }

  getTourProgress(): { current: number; total: number } {
    return { current: this.tourIndex, total: this.tourBookmarkIds.length };
  }

  // ============================================
  // SETTERS
  // ============================================

  setOnBookmarkChange(callback: (bookmark: SmartBookmark | null) => void): void {
    this.onBookmarkChange = callback;
  }

  setOnTourStep(callback: (bookmark: SmartBookmark, index: number, total: number) => void): void {
    this.onTourStep = callback;
  }
}

export default BookmarkManager;
