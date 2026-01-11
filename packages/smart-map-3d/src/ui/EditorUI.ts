/**
 * EditorUI - Interface utilisateur pour l'éditeur intelligent
 *
 * Gère le rendu des panneaux d'édition pour les contrôles,
 * bookmarks, et la configuration du projet SmartMap.
 */

import type {
  SmartControl,
  SmartBookmark,
  SmartBinding,
  FieldMeta,
  ControlType,
  BindableProperty,
  DisplayMode,
  CanvasTemplate,
  CANVAS_TEMPLATES,
  BookmarkGeneratorConfig
} from '../core/smart-types';
import type { SmartMapController } from '../services/SmartMapController';
import type { AnalysisRecommendation } from '../services/FieldAnalyzer';

export interface EditorUIConfig {
  container: HTMLElement;
  controller: SmartMapController;
  onControlValueChange?: (controlId: string, value: any) => void;
  onBookmarkSelect?: (bookmarkId: string) => void;
}

/**
 * Classe principale de l'interface éditeur
 */
export class EditorUI {
  private container: HTMLElement;
  private controller: SmartMapController;
  private config: EditorUIConfig;

  // Éléments DOM
  private editorPanel: HTMLElement | null = null;
  private controlsPanel: HTMLElement | null = null;
  private bookmarksPanel: HTMLElement | null = null;
  private recommendationsPanel: HTMLElement | null = null;

  // État
  private activeTab: 'controls' | 'bookmarks' | 'generator' | 'settings' = 'controls';
  private isVisible: boolean = false;

  constructor(config: EditorUIConfig) {
    this.config = config;
    this.container = config.container;
    this.controller = config.controller;
  }

  /**
   * Initialise l'interface éditeur
   */
  init(): void {
    this.createEditorPanel();
    this.render();
  }

  /**
   * Crée le panneau éditeur principal
   */
  private createEditorPanel(): void {
    this.editorPanel = document.createElement('div');
    this.editorPanel.className = 'smart-editor-panel';
    this.editorPanel.innerHTML = `
      <div class="editor-header">
        <h3>📊 Éditeur SmartMap</h3>
        <button class="editor-close-btn" title="Fermer">×</button>
      </div>
      <div class="editor-tabs">
        <button class="editor-tab active" data-tab="controls">🎛️ Contrôles</button>
        <button class="editor-tab" data-tab="bookmarks">📍 Signets</button>
        <button class="editor-tab" data-tab="generator">⚡ Générateur</button>
        <button class="editor-tab" data-tab="settings">⚙️ Config</button>
      </div>
      <div class="editor-content">
        <div class="editor-tab-content" id="tab-controls"></div>
        <div class="editor-tab-content" id="tab-bookmarks" style="display:none"></div>
        <div class="editor-tab-content" id="tab-generator" style="display:none"></div>
        <div class="editor-tab-content" id="tab-settings" style="display:none"></div>
      </div>
    `;

    this.container.appendChild(this.editorPanel);

    // Event listeners
    this.editorPanel.querySelector('.editor-close-btn')?.addEventListener('click', () => {
      this.hide();
    });

    this.editorPanel.querySelectorAll('.editor-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.dataset.tab as typeof this.activeTab;
        this.switchTab(tabName);
      });
    });

    this.addStyles();
  }

  /**
   * Change d'onglet
   */
  private switchTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;

    // Mettre à jour les boutons
    this.editorPanel?.querySelectorAll('.editor-tab').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
    });

    // Mettre à jour le contenu
    this.editorPanel?.querySelectorAll('.editor-tab-content').forEach(content => {
      const id = content.id.replace('tab-', '');
      (content as HTMLElement).style.display = id === tab ? 'block' : 'none';
    });

    this.renderActiveTab();
  }

  /**
   * Affiche l'éditeur
   */
  show(): void {
    this.isVisible = true;
    this.editorPanel?.classList.add('visible');
    this.render();
  }

  /**
   * Cache l'éditeur
   */
  hide(): void {
    this.isVisible = false;
    this.editorPanel?.classList.remove('visible');
  }

  /**
   * Toggle la visibilité
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Rendu principal
   */
  render(): void {
    if (!this.isVisible) return;
    this.renderActiveTab();
  }

  /**
   * Rendu de l'onglet actif
   */
  private renderActiveTab(): void {
    switch (this.activeTab) {
      case 'controls':
        this.renderControlsTab();
        break;
      case 'bookmarks':
        this.renderBookmarksTab();
        break;
      case 'generator':
        this.renderGeneratorTab();
        break;
      case 'settings':
        this.renderSettingsTab();
        break;
    }
  }

  // ============================================
  // ONGLET CONTRÔLES
  // ============================================

  private renderControlsTab(): void {
    const container = this.editorPanel?.querySelector('#tab-controls');
    if (!container) return;

    const controls = this.controller.getControls();
    const recommendations = this.controller.getRecommendations()
      .filter(r => r.type === 'control');

    container.innerHTML = `
      <div class="editor-section">
        <h4>Contrôles actifs</h4>
        <div class="controls-list">
          ${controls.length === 0
            ? '<p class="empty-message">Aucun contrôle configuré</p>'
            : controls.map(c => this.renderControlItem(c)).join('')}
        </div>
        <button class="add-control-btn">+ Ajouter un contrôle</button>
      </div>

      ${recommendations.length > 0 ? `
        <div class="editor-section">
          <h4>💡 Suggestions</h4>
          <div class="recommendations-list">
            ${recommendations.slice(0, 5).map(r => this.renderRecommendation(r)).join('')}
          </div>
          <button class="apply-all-btn">Appliquer toutes les suggestions</button>
        </div>
      ` : ''}
    `;

    // Event listeners
    container.querySelector('.add-control-btn')?.addEventListener('click', () => {
      this.showAddControlDialog();
    });

    container.querySelector('.apply-all-btn')?.addEventListener('click', () => {
      this.controller.createRecommendedControls();
      this.render();
    });

    // Controls items events
    container.querySelectorAll('.control-item').forEach(item => {
      const controlId = (item as HTMLElement).dataset.id;
      if (!controlId) return;

      item.querySelector('.delete-control')?.addEventListener('click', () => {
        this.controller.deleteControl(controlId);
        this.render();
      });
    });

    // Recommendations events
    container.querySelectorAll('.recommendation-item').forEach(item => {
      const fieldName = (item as HTMLElement).dataset.field;
      if (!fieldName) return;

      item.querySelector('.apply-recommendation')?.addEventListener('click', () => {
        this.controller.createControl(fieldName);
        this.render();
      });
    });
  }

  private renderControlItem(control: SmartControl): string {
    const icon = this.getControlTypeIcon(control.controlType);
    const bindingsCount = control.bindings.length;

    return `
      <div class="control-item" data-id="${control.id}">
        <div class="control-header">
          <span class="control-icon">${icon}</span>
          <span class="control-name">${control.config.label || control.name}</span>
          <span class="control-type">${control.controlType}</span>
        </div>
        <div class="control-meta">
          <span class="bindings-count">${bindingsCount} binding${bindingsCount > 1 ? 's' : ''}</span>
          <span class="field-name">📋 ${control.fieldName}</span>
        </div>
        <div class="control-actions">
          <button class="edit-control" title="Modifier">✏️</button>
          <button class="delete-control" title="Supprimer">🗑️</button>
        </div>
      </div>
    `;
  }

  private renderRecommendation(rec: AnalysisRecommendation): string {
    return `
      <div class="recommendation-item" data-field="${rec.fieldName}">
        <div class="recommendation-content">
          <span class="recommendation-icon">💡</span>
          <span class="recommendation-text">${rec.description}</span>
        </div>
        <div class="recommendation-actions">
          <span class="confidence">${Math.round(rec.priority * 100)}%</span>
          <button class="apply-recommendation">Appliquer</button>
        </div>
      </div>
    `;
  }

  // ============================================
  // ONGLET BOOKMARKS
  // ============================================

  private renderBookmarksTab(): void {
    const container = this.editorPanel?.querySelector('#tab-bookmarks');
    if (!container) return;

    const bookmarks = this.controller.getBookmarks();
    const tourState = this.controller.getTourState();

    container.innerHTML = `
      <div class="editor-section">
        <div class="bookmarks-header">
          <h4>Signets (${bookmarks.length})</h4>
          <button class="capture-bookmark-btn">📸 Capturer la vue</button>
        </div>
        <div class="bookmarks-list">
          ${bookmarks.length === 0
            ? '<p class="empty-message">Aucun signet. Capturez la vue actuelle ou générez-en automatiquement.</p>'
            : bookmarks.map(b => this.renderBookmarkItem(b)).join('')}
        </div>
      </div>

      ${bookmarks.length > 1 ? `
        <div class="editor-section">
          <h4>🎯 Visite guidée</h4>
          <div class="tour-controls">
            ${tourState.active ? `
              <div class="tour-progress">
                Étape ${tourState.progress.current + 1} / ${tourState.progress.total}
              </div>
              <div class="tour-buttons">
                <button class="tour-prev">⬅️ Précédent</button>
                <button class="tour-stop">⏹️ Arrêter</button>
                <button class="tour-next">Suivant ➡️</button>
              </div>
            ` : `
              <button class="tour-start">▶️ Démarrer le tour</button>
            `}
          </div>
        </div>
      ` : ''}

      <div class="editor-section">
        <h4>📤 Export / Import</h4>
        <div class="export-buttons">
          <button class="export-bookmarks-btn">Exporter JSON</button>
          <button class="import-bookmarks-btn">Importer JSON</button>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('.capture-bookmark-btn')?.addEventListener('click', () => {
      this.showCaptureBookmarkDialog();
    });

    container.querySelector('.tour-start')?.addEventListener('click', () => {
      this.controller.startTour();
      this.render();
    });

    container.querySelector('.tour-stop')?.addEventListener('click', () => {
      this.controller.stopTour();
      this.render();
    });

    container.querySelector('.tour-prev')?.addEventListener('click', () => {
      this.controller.previousTourStep();
    });

    container.querySelector('.tour-next')?.addEventListener('click', () => {
      this.controller.nextTourStep();
    });

    container.querySelector('.export-bookmarks-btn')?.addEventListener('click', () => {
      this.exportBookmarks();
    });

    container.querySelector('.import-bookmarks-btn')?.addEventListener('click', () => {
      this.importBookmarks();
    });

    // Bookmark items events
    container.querySelectorAll('.bookmark-item').forEach(item => {
      const bookmarkId = (item as HTMLElement).dataset.id;
      if (!bookmarkId) return;

      item.querySelector('.goto-bookmark')?.addEventListener('click', () => {
        this.controller.goToBookmark(bookmarkId);
        this.config.onBookmarkSelect?.(bookmarkId);
      });

      item.querySelector('.delete-bookmark')?.addEventListener('click', () => {
        this.controller.deleteBookmark(bookmarkId);
        this.render();
      });
    });
  }

  private renderBookmarkItem(bookmark: SmartBookmark): string {
    const isGenerated = !!bookmark.generatedFrom;

    return `
      <div class="bookmark-item" data-id="${bookmark.id}">
        <div class="bookmark-header">
          <span class="bookmark-icon">${bookmark.icon || '📍'}</span>
          <span class="bookmark-name">${bookmark.name}</span>
          ${isGenerated ? '<span class="generated-badge">Auto</span>' : ''}
        </div>
        ${bookmark.description ? `
          <div class="bookmark-description">${bookmark.description}</div>
        ` : ''}
        <div class="bookmark-meta">
          <span class="transition-type">${this.getTransitionIcon(bookmark.transition.type)} ${bookmark.transition.durationMs}ms</span>
          ${bookmark.generatedFrom ? `
            <span class="generated-from">Via: ${bookmark.generatedFrom.fieldName}</span>
          ` : ''}
        </div>
        <div class="bookmark-actions">
          <button class="goto-bookmark" title="Aller au signet">🎯</button>
          <button class="edit-bookmark" title="Modifier">✏️</button>
          <button class="delete-bookmark" title="Supprimer">🗑️</button>
        </div>
      </div>
    `;
  }

  // ============================================
  // ONGLET GÉNÉRATEUR
  // ============================================

  private renderGeneratorTab(): void {
    const container = this.editorPanel?.querySelector('#tab-generator');
    if (!container) return;

    const recommendations = this.controller.getRecommendations()
      .filter(r => r.type === 'bookmark');
    const analysis = this.controller.getFieldAnalyzer();

    container.innerHTML = `
      <div class="editor-section">
        <h4>⚡ Génération automatique de signets</h4>
        <p class="section-description">
          Générez automatiquement des signets basés sur vos données.
        </p>

        ${recommendations.length > 0 ? `
          <div class="generator-suggestions">
            <h5>💡 Suggestions basées sur l'analyse</h5>
            ${recommendations.map(r => `
              <div class="generator-suggestion" data-field="${r.fieldName}">
                <div class="suggestion-info">
                  <span class="suggestion-icon">📊</span>
                  <span class="suggestion-text">${r.description}</span>
                </div>
                <button class="generate-btn">Générer</button>
              </div>
            `).join('')}
            <button class="generate-all-btn">🚀 Générer tous les signets suggérés</button>
          </div>
        ` : `
          <p class="empty-message">
            Analysez d'abord vos données pour obtenir des suggestions de génération.
          </p>
        `}
      </div>

      <div class="editor-section">
        <h4>🔧 Génération personnalisée</h4>
        <div class="custom-generator-form">
          <div class="form-group">
            <label>Champ source</label>
            <select id="generator-field">
              <option value="">Sélectionner un champ...</option>
              ${this.getFieldOptions()}
            </select>
          </div>
          <div class="form-group">
            <label>Type de génération</label>
            <select id="generator-type">
              <option value="per-category">Par catégorie</option>
              <option value="per-range">Par tranches numériques</option>
              <option value="per-time">Par période temporelle</option>
              <option value="per-item">Par élément</option>
            </select>
          </div>
          <div class="form-group">
            <label>Modèle de nom</label>
            <input type="text" id="generator-template" value="Vue: {value}" />
          </div>
          <button class="custom-generate-btn">Générer les signets</button>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelectorAll('.generator-suggestion .generate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.generator-suggestion') as HTMLElement;
        const fieldName = item?.dataset.field;
        if (fieldName) {
          // TODO: Récupérer les records depuis le contrôleur
          console.log('Generate for field:', fieldName);
        }
      });
    });

    container.querySelector('.generate-all-btn')?.addEventListener('click', () => {
      // TODO: Récupérer les records depuis le contrôleur
      console.log('Generate all');
    });

    container.querySelector('.custom-generate-btn')?.addEventListener('click', () => {
      this.handleCustomGenerate();
    });
  }

  private getFieldOptions(): string {
    const project = this.controller.getProject();
    if (!project) return '';

    return project.fieldMetas
      .map(f => `<option value="${f.name}">${f.name} (${f.type})</option>`)
      .join('');
  }

  private handleCustomGenerate(): void {
    const field = (document.getElementById('generator-field') as HTMLSelectElement)?.value;
    const type = (document.getElementById('generator-type') as HTMLSelectElement)?.value;
    const template = (document.getElementById('generator-template') as HTMLInputElement)?.value;

    if (!field) {
      alert('Veuillez sélectionner un champ');
      return;
    }

    const config: BookmarkGeneratorConfig = {
      fieldName: field,
      generationType: type as any,
      nameTemplate: template || 'Vue {value}',
      cameraMode: 'current',
      defaultTransition: { type: 'fly', durationMs: 2000 }
    };

    // TODO: Appeler la génération avec les records
    console.log('Custom generate config:', config);
  }

  // ============================================
  // ONGLET SETTINGS
  // ============================================

  private renderSettingsTab(): void {
    const container = this.editorPanel?.querySelector('#tab-settings');
    if (!container) return;

    const project = this.controller.getProject();

    container.innerHTML = `
      <div class="editor-section">
        <h4>📋 Projet</h4>
        <div class="form-group">
          <label>Nom du projet</label>
          <input type="text" id="project-name" value="${project?.name || 'Nouveau projet'}" />
        </div>
        <div class="form-group">
          <label>Mode d'affichage</label>
          <select id="display-mode">
            <option value="explorer" ${project?.displayMode === 'explorer' ? 'selected' : ''}>🔍 Explorateur</option>
            <option value="timeline" ${project?.displayMode === 'timeline' ? 'selected' : ''}>⏱️ Timeline</option>
            <option value="comparator" ${project?.displayMode === 'comparator' ? 'selected' : ''}>⚖️ Comparateur</option>
            <option value="tour" ${project?.displayMode === 'tour' ? 'selected' : ''}>🎯 Visite guidée</option>
            <option value="immersive" ${project?.displayMode === 'immersive' ? 'selected' : ''}>🖼️ Immersif</option>
          </select>
        </div>
      </div>

      <div class="editor-section">
        <h4>🎨 Templates Canvas</h4>
        <p class="section-description">
          Appliquez un template prédéfini pour configurer rapidement votre canvas.
        </p>
        <div class="templates-grid">
          ${this.renderTemplatesGrid()}
        </div>
      </div>

      <div class="editor-section">
        <h4>💾 Sauvegarde</h4>
        <div class="save-buttons">
          <button class="export-project-btn">📤 Exporter le projet</button>
          <button class="import-project-btn">📥 Importer un projet</button>
          <button class="reset-project-btn">🗑️ Réinitialiser</button>
        </div>
      </div>

      <div class="editor-section">
        <h4>ℹ️ Informations</h4>
        <div class="project-info">
          <p><strong>Version:</strong> ${project?.version || 1}</p>
          <p><strong>Créé:</strong> ${project?.createdAt ? new Date(project.createdAt).toLocaleString('fr-FR') : 'N/A'}</p>
          <p><strong>Modifié:</strong> ${project?.updatedAt ? new Date(project.updatedAt).toLocaleString('fr-FR') : 'N/A'}</p>
          <p><strong>Contrôles:</strong> ${project?.controls.length || 0}</p>
          <p><strong>Signets:</strong> ${project?.bookmarks.length || 0}</p>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('#display-mode')?.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as DisplayMode;
      this.controller.setDisplayMode(mode);
    });

    container.querySelector('.export-project-btn')?.addEventListener('click', () => {
      this.exportProject();
    });

    container.querySelector('.import-project-btn')?.addEventListener('click', () => {
      this.importProject();
    });

    container.querySelector('.reset-project-btn')?.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir réinitialiser le projet ?')) {
        localStorage.removeItem('smart-map-project');
        localStorage.removeItem('smart-map-3d-bookmarks');
        location.reload();
      }
    });
  }

  private renderTemplatesGrid(): string {
    const templates = [
      { id: 'explorer', name: 'Explorateur', icon: '🔍', desc: 'Navigation libre avec filtres' },
      { id: 'timeline', name: 'Timeline', icon: '⏱️', desc: 'Évolution temporelle' },
      { id: 'comparator', name: 'Comparateur', icon: '⚖️', desc: 'Multi-vues côte à côte' },
      { id: 'tour', name: 'Visite guidée', icon: '🎯', desc: 'Parcours narratif' },
      { id: 'immersive', name: 'Immersif', icon: '🖼️', desc: 'Plein écran minimal' }
    ];

    return templates.map(t => `
      <div class="template-card" data-template="${t.id}">
        <span class="template-icon">${t.icon}</span>
        <span class="template-name">${t.name}</span>
        <span class="template-desc">${t.desc}</span>
      </div>
    `).join('');
  }

  // ============================================
  // DIALOGUES
  // ============================================

  private showAddControlDialog(): void {
    const project = this.controller.getProject();
    if (!project || project.fieldMetas.length === 0) {
      alert('Analysez d\'abord vos données pour créer des contrôles.');
      return;
    }

    const fieldName = prompt('Nom du champ pour le contrôle:');
    if (fieldName) {
      const control = this.controller.createControl(fieldName);
      if (control) {
        this.render();
      } else {
        alert(`Champ "${fieldName}" non trouvé dans l'analyse.`);
      }
    }
  }

  private showCaptureBookmarkDialog(): void {
    const name = prompt('Nom du signet:', 'Nouvelle vue');
    if (name) {
      this.controller.captureBookmark(name);
      this.render();
    }
  }

  // ============================================
  // EXPORT / IMPORT
  // ============================================

  private exportBookmarks(): void {
    const json = this.controller.getBookmarkManager().exportToJSON();
    this.downloadJSON(json, 'smart-map-bookmarks.json');
  }

  private importBookmarks(): void {
    this.uploadJSON((json) => {
      try {
        this.controller.getBookmarkManager().importFromJSON(json);
        this.render();
        alert('Signets importés avec succès !');
      } catch (e) {
        alert('Erreur lors de l\'import: ' + (e as Error).message);
      }
    });
  }

  private exportProject(): void {
    const json = this.controller.exportProject();
    this.downloadJSON(json, 'smart-map-project.json');
  }

  private importProject(): void {
    this.uploadJSON((json) => {
      try {
        this.controller.importProject(json);
        this.render();
        alert('Projet importé avec succès !');
      } catch (e) {
        alert('Erreur lors de l\'import: ' + (e as Error).message);
      }
    });
  }

  private downloadJSON(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private uploadJSON(callback: (json: string) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          callback(reader.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  // ============================================
  // HELPERS
  // ============================================

  private getControlTypeIcon(type: ControlType): string {
    const icons: Record<ControlType, string> = {
      'timeline': '⏱️',
      'slider': '🎚️',
      'range-slider': '↔️',
      'dropdown': '📋',
      'toggle': '🔘',
      'radio': '⭕',
      'chips': '🏷️',
      'search': '🔍',
      'color-picker': '🎨',
      'date-picker': '📅',
      'time-picker': '🕐'
    };
    return icons[type] || '🎛️';
  }

  private getTransitionIcon(type: string): string {
    const icons: Record<string, string> = {
      'instant': '⚡',
      'fly': '✈️',
      'ease': '🌊',
      'linear': '📏'
    };
    return icons[type] || '➡️';
  }

  // ============================================
  // STYLES
  // ============================================

  private addStyles(): void {
    const styleId = 'smart-editor-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .smart-editor-panel {
        position: fixed;
        top: 60px;
        right: -400px;
        width: 380px;
        height: calc(100vh - 70px);
        background: rgba(30, 30, 40, 0.98);
        border-left: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px 0 0 8px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        transition: right 0.3s ease;
        font-family: system-ui, -apple-system, sans-serif;
        color: #fff;
      }

      .smart-editor-panel.visible {
        right: 0;
      }

      .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .editor-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .editor-close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .editor-close-btn:hover {
        color: #fff;
      }

      .editor-tabs {
        display: flex;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 0 8px;
      }

      .editor-tab {
        flex: 1;
        padding: 10px 8px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: #888;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .editor-tab:hover {
        color: #fff;
        background: rgba(255,255,255,0.05);
      }

      .editor-tab.active {
        color: #4a9eff;
        border-bottom-color: #4a9eff;
      }

      .editor-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .editor-section {
        margin-bottom: 24px;
      }

      .editor-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
      }

      .editor-section h5 {
        margin: 12px 0 8px 0;
        font-size: 13px;
        font-weight: 500;
        color: #aaa;
      }

      .section-description {
        font-size: 12px;
        color: #888;
        margin-bottom: 12px;
      }

      .empty-message {
        font-size: 12px;
        color: #666;
        font-style: italic;
        padding: 12px;
        text-align: center;
        background: rgba(255,255,255,0.02);
        border-radius: 6px;
      }

      /* Control Items */
      .control-item, .bookmark-item {
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid transparent;
        transition: all 0.2s;
      }

      .control-item:hover, .bookmark-item:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.1);
      }

      .control-header, .bookmark-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .control-icon, .bookmark-icon {
        font-size: 18px;
      }

      .control-name, .bookmark-name {
        font-weight: 500;
        flex: 1;
      }

      .control-type {
        font-size: 11px;
        color: #888;
        padding: 2px 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
      }

      .control-meta, .bookmark-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #666;
        margin-bottom: 8px;
      }

      .control-actions, .bookmark-actions {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
      }

      .control-actions button, .bookmark-actions button {
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }

      .control-actions button:hover, .bookmark-actions button:hover {
        background: rgba(255,255,255,0.2);
      }

      .generated-badge {
        font-size: 10px;
        padding: 2px 6px;
        background: #4a9eff33;
        color: #4a9eff;
        border-radius: 4px;
      }

      /* Recommendations */
      .recommendation-item, .generator-suggestion {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: rgba(74, 158, 255, 0.1);
        border-radius: 6px;
        margin-bottom: 6px;
        border-left: 3px solid #4a9eff;
      }

      .recommendation-content, .suggestion-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .recommendation-text, .suggestion-text {
        font-size: 12px;
        color: #ddd;
      }

      .recommendation-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .confidence {
        font-size: 11px;
        color: #4a9eff;
        font-weight: 500;
      }

      .apply-recommendation, .generate-btn {
        background: #4a9eff;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .apply-recommendation:hover, .generate-btn:hover {
        background: #6ab0ff;
      }

      /* Buttons */
      .add-control-btn, .capture-bookmark-btn, .apply-all-btn,
      .generate-all-btn, .custom-generate-btn, .tour-start,
      .export-project-btn, .import-project-btn {
        width: 100%;
        padding: 10px;
        background: rgba(74, 158, 255, 0.2);
        color: #4a9eff;
        border: 1px solid rgba(74, 158, 255, 0.3);
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 8px;
      }

      .add-control-btn:hover, .capture-bookmark-btn:hover,
      .apply-all-btn:hover, .generate-all-btn:hover,
      .custom-generate-btn:hover, .tour-start:hover,
      .export-project-btn:hover, .import-project-btn:hover {
        background: rgba(74, 158, 255, 0.3);
        border-color: rgba(74, 158, 255, 0.5);
      }

      .reset-project-btn {
        width: 100%;
        padding: 10px;
        background: rgba(255, 74, 74, 0.2);
        color: #ff6b6b;
        border: 1px solid rgba(255, 74, 74, 0.3);
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 8px;
      }

      .reset-project-btn:hover {
        background: rgba(255, 74, 74, 0.3);
      }

      /* Tour Controls */
      .tour-controls {
        text-align: center;
      }

      .tour-progress {
        font-size: 14px;
        color: #4a9eff;
        margin-bottom: 12px;
      }

      .tour-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .tour-buttons button {
        padding: 8px 16px;
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
      }

      .tour-buttons button:hover {
        background: rgba(255,255,255,0.2);
      }

      .tour-stop {
        background: rgba(255, 74, 74, 0.3) !important;
      }

      /* Form Elements */
      .form-group {
        margin-bottom: 12px;
      }

      .form-group label {
        display: block;
        font-size: 12px;
        color: #888;
        margin-bottom: 4px;
      }

      .form-group input, .form-group select {
        width: 100%;
        padding: 8px 10px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
      }

      .form-group input:focus, .form-group select:focus {
        outline: none;
        border-color: #4a9eff;
      }

      /* Templates Grid */
      .templates-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .template-card {
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }

      .template-card:hover {
        background: rgba(255,255,255,0.1);
        border-color: #4a9eff;
      }

      .template-icon {
        display: block;
        font-size: 24px;
        margin-bottom: 6px;
      }

      .template-name {
        display: block;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 2px;
      }

      .template-desc {
        display: block;
        font-size: 10px;
        color: #666;
      }

      /* Save buttons */
      .save-buttons, .export-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Project Info */
      .project-info {
        font-size: 12px;
        color: #888;
      }

      .project-info p {
        margin: 4px 0;
      }

      .project-info strong {
        color: #aaa;
      }

      /* Bookmarks header */
      .bookmarks-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .bookmarks-header h4 {
        margin: 0;
      }

      .bookmarks-header button {
        padding: 6px 12px;
        font-size: 12px;
      }

      /* Scrollbar */
      .editor-content::-webkit-scrollbar {
        width: 6px;
      }

      .editor-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .editor-content::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 3px;
      }

      .editor-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.3);
      }
    `;

    document.head.appendChild(style);
  }
}

export default EditorUI;
