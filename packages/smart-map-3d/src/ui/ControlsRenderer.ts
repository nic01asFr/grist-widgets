/**
 * ControlsRenderer - Rendu des contrôles data-driven sur le canvas
 *
 * Affiche les contrôles intelligents (sliders, dropdowns, etc.)
 * et gère les interactions utilisateur.
 */

import type {
  SmartControl,
  SmartControlConfig,
  ControlType,
  AnimationConfig
} from '../core/smart-types';
import type { ControlManager } from '../services/ControlManager';

export interface ControlsRendererConfig {
  container: HTMLElement;
  controlManager: ControlManager;
  position?: 'left' | 'right' | 'top' | 'bottom';
  collapsed?: boolean;
}

/**
 * Rendu des contrôles sur le canvas
 */
export class ControlsRenderer {
  private container: HTMLElement;
  private controlManager: ControlManager;
  private controlsPanel: HTMLElement | null = null;
  private position: string;
  private collapsed: boolean;

  // Debounce timers
  private debounceTimers: Map<string, number> = new Map();

  constructor(config: ControlsRendererConfig) {
    this.container = config.container;
    this.controlManager = config.controlManager;
    this.position = config.position || 'left';
    this.collapsed = config.collapsed || false;
  }

  /**
   * Initialise le panneau de contrôles
   */
  init(): void {
    this.createControlsPanel();
    this.addStyles();
    this.render();
  }

  /**
   * Crée le panneau de contrôles
   */
  private createControlsPanel(): void {
    this.controlsPanel = document.createElement('div');
    this.controlsPanel.className = `smart-controls-panel position-${this.position}`;
    if (this.collapsed) {
      this.controlsPanel.classList.add('collapsed');
    }

    this.controlsPanel.innerHTML = `
      <div class="controls-header">
        <button class="controls-toggle" title="Réduire/Agrandir">
          <span class="toggle-icon">${this.collapsed ? '▶' : '◀'}</span>
        </button>
        <span class="controls-title">Contrôles</span>
      </div>
      <div class="controls-content"></div>
    `;

    this.container.appendChild(this.controlsPanel);

    // Toggle event
    this.controlsPanel.querySelector('.controls-toggle')?.addEventListener('click', () => {
      this.toggleCollapse();
    });
  }

  /**
   * Toggle le collapse
   */
  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.controlsPanel?.classList.toggle('collapsed', this.collapsed);

    const icon = this.controlsPanel?.querySelector('.toggle-icon');
    if (icon) {
      icon.textContent = this.collapsed ? '▶' : '◀';
    }
  }

  /**
   * Rendu principal
   */
  render(): void {
    const content = this.controlsPanel?.querySelector('.controls-content');
    if (!content) return;

    const controls = this.controlManager.getControls();

    if (controls.length === 0) {
      content.innerHTML = '<p class="no-controls">Aucun contrôle configuré</p>';
      return;
    }

    content.innerHTML = controls.map(control => this.renderControl(control)).join('');

    // Bind events
    this.bindControlEvents();
  }

  /**
   * Rendu d'un contrôle
   */
  private renderControl(control: SmartControl): string {
    const config = control.config;
    const label = config.label || control.name;

    let controlHtml = '';

    switch (control.controlType) {
      case 'timeline':
        controlHtml = this.renderTimelineControl(control);
        break;
      case 'slider':
        controlHtml = this.renderSliderControl(control);
        break;
      case 'range-slider':
        controlHtml = this.renderRangeSliderControl(control);
        break;
      case 'dropdown':
        controlHtml = this.renderDropdownControl(control);
        break;
      case 'toggle':
        controlHtml = this.renderToggleControl(control);
        break;
      case 'chips':
        controlHtml = this.renderChipsControl(control);
        break;
      case 'search':
        controlHtml = this.renderSearchControl(control);
        break;
      case 'date-picker':
        controlHtml = this.renderDatePickerControl(control);
        break;
      case 'time-picker':
        controlHtml = this.renderTimePickerControl(control);
        break;
      default:
        controlHtml = `<p>Type non supporté: ${control.controlType}</p>`;
    }

    return `
      <div class="smart-control" data-control-id="${control.id}" data-control-type="${control.controlType}">
        <label class="control-label">${label}</label>
        ${controlHtml}
      </div>
    `;
  }

  // ============================================
  // CONTRÔLES INDIVIDUELS
  // ============================================

  private renderTimelineControl(control: SmartControl): string {
    const { min = 0, max = 100, step = 1 } = control.config;
    const value = control.currentValue || min;
    const animation = control.animation;

    return `
      <div class="timeline-control">
        <div class="timeline-slider-row">
          <input type="range"
            class="timeline-slider"
            min="${min}"
            max="${max}"
            step="${step}"
            value="${value}"
          />
        </div>
        <div class="timeline-value">${this.formatValue(value, control.config)}</div>
        <div class="timeline-buttons">
          <button class="timeline-btn play-btn" title="${animation?.playing ? 'Pause' : 'Lecture'}">
            ${animation?.playing ? '⏸️' : '▶️'}
          </button>
          <button class="timeline-btn speed-btn" title="Vitesse: x${animation?.speed || 1}">
            🏃 x${animation?.speed || 1}
          </button>
          <button class="timeline-btn loop-btn ${animation?.loop ? 'active' : ''}" title="Boucle">
            🔁
          </button>
        </div>
      </div>
    `;
  }

  private renderSliderControl(control: SmartControl): string {
    const { min = 0, max = 100, step = 1 } = control.config;
    const value = control.currentValue || min;

    return `
      <div class="slider-control">
        <input type="range"
          class="slider-input"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
        />
        <span class="slider-value">${this.formatValue(value, control.config)}</span>
      </div>
    `;
  }

  private renderRangeSliderControl(control: SmartControl): string {
    const { min = 0, max = 100 } = control.config;
    const value = control.currentValue || { min, max };

    return `
      <div class="range-slider-control">
        <div class="range-inputs">
          <input type="number"
            class="range-min-input"
            min="${min}"
            max="${max}"
            value="${value.min || min}"
          />
          <span class="range-separator">à</span>
          <input type="number"
            class="range-max-input"
            min="${min}"
            max="${max}"
            value="${value.max || max}"
          />
        </div>
      </div>
    `;
  }

  private renderDropdownControl(control: SmartControl): string {
    const options = control.config.options || [];
    const value = control.currentValue;
    const allowEmpty = control.config.allowEmpty !== false;

    return `
      <select class="dropdown-control">
        ${allowEmpty ? '<option value="">Tous</option>' : ''}
        ${options.map(opt => `
          <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
            ${opt.label}${opt.count !== undefined ? ` (${opt.count})` : ''}
          </option>
        `).join('')}
      </select>
    `;
  }

  private renderToggleControl(control: SmartControl): string {
    const value = control.currentValue;

    return `
      <div class="toggle-control">
        <label class="toggle-switch">
          <input type="checkbox" ${value ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">${value ? 'Actif' : 'Inactif'}</span>
      </div>
    `;
  }

  private renderChipsControl(control: SmartControl): string {
    const options = control.config.options || [];
    const selected = control.currentValue || [];

    return `
      <div class="chips-control">
        ${options.map(opt => `
          <button class="chip ${selected.includes(opt.value) ? 'selected' : ''}"
            data-value="${opt.value}"
            ${opt.color ? `style="--chip-color: ${opt.color}"` : ''}>
            ${opt.label}
            ${opt.count !== undefined ? `<span class="chip-count">${opt.count}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderSearchControl(control: SmartControl): string {
    const value = control.currentValue || '';

    return `
      <div class="search-control">
        <input type="text"
          class="search-input"
          placeholder="Rechercher..."
          value="${value}"
        />
        <button class="search-clear" ${!value ? 'style="display:none"' : ''}>×</button>
      </div>
    `;
  }

  private renderDatePickerControl(control: SmartControl): string {
    const value = control.currentValue;
    const dateStr = value instanceof Date
      ? value.toISOString().split('T')[0]
      : value || '';

    return `
      <div class="date-picker-control">
        <input type="date" class="date-input" value="${dateStr}" />
      </div>
    `;
  }

  private renderTimePickerControl(control: SmartControl): string {
    const value = control.currentValue || 720; // Midi par défaut
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return `
      <div class="time-picker-control">
        <input type="time" class="time-input" value="${timeStr}" />
      </div>
    `;
  }

  // ============================================
  // EVENT BINDING
  // ============================================

  private bindControlEvents(): void {
    const controls = this.controlsPanel?.querySelectorAll('.smart-control');
    if (!controls) return;

    controls.forEach(el => {
      const controlId = (el as HTMLElement).dataset.controlId;
      const controlType = (el as HTMLElement).dataset.controlType;
      if (!controlId) return;

      switch (controlType) {
        case 'timeline':
          this.bindTimelineEvents(el as HTMLElement, controlId);
          break;
        case 'slider':
          this.bindSliderEvents(el as HTMLElement, controlId);
          break;
        case 'range-slider':
          this.bindRangeSliderEvents(el as HTMLElement, controlId);
          break;
        case 'dropdown':
          this.bindDropdownEvents(el as HTMLElement, controlId);
          break;
        case 'toggle':
          this.bindToggleEvents(el as HTMLElement, controlId);
          break;
        case 'chips':
          this.bindChipsEvents(el as HTMLElement, controlId);
          break;
        case 'search':
          this.bindSearchEvents(el as HTMLElement, controlId);
          break;
        case 'date-picker':
          this.bindDatePickerEvents(el as HTMLElement, controlId);
          break;
        case 'time-picker':
          this.bindTimePickerEvents(el as HTMLElement, controlId);
          break;
      }
    });
  }

  private bindTimelineEvents(el: HTMLElement, controlId: string): void {
    const slider = el.querySelector('.timeline-slider') as HTMLInputElement;
    const valueDisplay = el.querySelector('.timeline-value');
    const playBtn = el.querySelector('.play-btn');
    const speedBtn = el.querySelector('.speed-btn');
    const loopBtn = el.querySelector('.loop-btn');

    slider?.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.controlManager.setValue(controlId, value);

      const control = this.controlManager.getControl(controlId);
      if (valueDisplay && control) {
        valueDisplay.textContent = this.formatValue(value, control.config);
      }
    });

    playBtn?.addEventListener('click', () => {
      this.controlManager.toggleAnimation(controlId);
      this.render(); // Re-render pour mettre à jour le bouton
    });

    speedBtn?.addEventListener('click', () => {
      const control = this.controlManager.getControl(controlId);
      if (control?.animation) {
        const speeds = [0.5, 1, 2, 4];
        const currentIndex = speeds.indexOf(control.animation.speed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
        this.controlManager.setAnimationSpeed(controlId, nextSpeed);
        this.render();
      }
    });

    loopBtn?.addEventListener('click', () => {
      const control = this.controlManager.getControl(controlId);
      if (control?.animation) {
        control.animation.loop = !control.animation.loop;
        this.render();
      }
    });
  }

  private bindSliderEvents(el: HTMLElement, controlId: string): void {
    const slider = el.querySelector('.slider-input') as HTMLInputElement;
    const valueDisplay = el.querySelector('.slider-value');

    slider?.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.controlManager.setValue(controlId, value);

      const control = this.controlManager.getControl(controlId);
      if (valueDisplay && control) {
        valueDisplay.textContent = this.formatValue(value, control.config);
      }
    });
  }

  private bindRangeSliderEvents(el: HTMLElement, controlId: string): void {
    const minInput = el.querySelector('.range-min-input') as HTMLInputElement;
    const maxInput = el.querySelector('.range-max-input') as HTMLInputElement;

    const updateValue = () => {
      this.controlManager.setValue(controlId, {
        min: parseFloat(minInput.value),
        max: parseFloat(maxInput.value)
      });
    };

    minInput?.addEventListener('change', updateValue);
    maxInput?.addEventListener('change', updateValue);
  }

  private bindDropdownEvents(el: HTMLElement, controlId: string): void {
    const select = el.querySelector('.dropdown-control') as HTMLSelectElement;

    select?.addEventListener('change', () => {
      const value = select.value || null;
      this.controlManager.setValue(controlId, value);
    });
  }

  private bindToggleEvents(el: HTMLElement, controlId: string): void {
    const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const label = el.querySelector('.toggle-label');

    checkbox?.addEventListener('change', () => {
      this.controlManager.setValue(controlId, checkbox.checked);
      if (label) {
        label.textContent = checkbox.checked ? 'Actif' : 'Inactif';
      }
    });
  }

  private bindChipsEvents(el: HTMLElement, controlId: string): void {
    const chips = el.querySelectorAll('.chip');

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const value = (chip as HTMLElement).dataset.value;
        const control = this.controlManager.getControl(controlId);
        if (!control) return;

        let currentValues = control.currentValue || [];
        if (!Array.isArray(currentValues)) {
          currentValues = currentValues ? [currentValues] : [];
        }

        if (currentValues.includes(value)) {
          currentValues = currentValues.filter((v: any) => v !== value);
        } else {
          currentValues = [...currentValues, value];
        }

        this.controlManager.setValue(controlId, currentValues);
        chip.classList.toggle('selected');
      });
    });
  }

  private bindSearchEvents(el: HTMLElement, controlId: string): void {
    const input = el.querySelector('.search-input') as HTMLInputElement;
    const clearBtn = el.querySelector('.search-clear') as HTMLButtonElement;
    const control = this.controlManager.getControl(controlId);
    const debounceMs = control?.config.debounceMs || 150;

    input?.addEventListener('input', () => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(controlId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = window.setTimeout(() => {
        this.controlManager.setValue(controlId, input.value);
        this.debounceTimers.delete(controlId);
      }, debounceMs);

      this.debounceTimers.set(controlId, timer);

      // Toggle clear button
      if (clearBtn) {
        clearBtn.style.display = input.value ? 'block' : 'none';
      }
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      this.controlManager.setValue(controlId, '');
      clearBtn.style.display = 'none';
    });
  }

  private bindDatePickerEvents(el: HTMLElement, controlId: string): void {
    const input = el.querySelector('.date-input') as HTMLInputElement;

    input?.addEventListener('change', () => {
      const date = input.value ? new Date(input.value) : null;
      this.controlManager.setValue(controlId, date);
    });
  }

  private bindTimePickerEvents(el: HTMLElement, controlId: string): void {
    const input = el.querySelector('.time-input') as HTMLInputElement;

    input?.addEventListener('change', () => {
      const [hours, minutes] = input.value.split(':').map(Number);
      const value = hours * 60 + minutes;
      this.controlManager.setValue(controlId, value);
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private formatValue(value: any, config: SmartControlConfig): string {
    if (value === null || value === undefined) return '-';

    // Si c'est un timestamp, formatter comme date/heure
    if (config.format && typeof value === 'number' && value > 1000000000) {
      const date = new Date(value);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Si c'est des minutes dans une journée
    if (typeof value === 'number' && (config.min === 0 && config.max === 1440)) {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Nombre avec décimales
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString('fr-FR');
      }
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }

    return String(value);
  }

  /**
   * Met à jour un contrôle spécifique
   */
  updateControl(controlId: string): void {
    const control = this.controlManager.getControl(controlId);
    if (!control) return;

    const el = this.controlsPanel?.querySelector(`[data-control-id="${controlId}"]`);
    if (!el) return;

    // Mettre à jour la valeur affichée
    const valueDisplay = el.querySelector('.slider-value, .timeline-value');
    if (valueDisplay) {
      valueDisplay.textContent = this.formatValue(control.currentValue, control.config);
    }

    // Mettre à jour le slider
    const slider = el.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider && slider.value !== String(control.currentValue)) {
      slider.value = String(control.currentValue);
    }
  }

  // ============================================
  // STYLES
  // ============================================

  private addStyles(): void {
    const styleId = 'smart-controls-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .smart-controls-panel {
        position: absolute;
        background: rgba(20, 20, 30, 0.95);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        font-family: system-ui, -apple-system, sans-serif;
        color: #fff;
        z-index: 100;
        transition: all 0.3s ease;
        overflow: hidden;
      }

      .smart-controls-panel.position-left {
        left: 16px;
        top: 80px;
        width: 260px;
      }

      .smart-controls-panel.position-right {
        right: 16px;
        top: 80px;
        width: 260px;
      }

      .smart-controls-panel.position-top {
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        width: 400px;
      }

      .smart-controls-panel.position-bottom {
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        width: 500px;
      }

      .smart-controls-panel.collapsed {
        width: 48px !important;
      }

      .smart-controls-panel.collapsed .controls-content,
      .smart-controls-panel.collapsed .controls-title {
        display: none;
      }

      .controls-header {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        background: rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .controls-toggle {
        background: none;
        border: none;
        color: #888;
        font-size: 12px;
        cursor: pointer;
        padding: 4px;
        margin-right: 8px;
      }

      .controls-toggle:hover {
        color: #fff;
      }

      .controls-title {
        font-size: 13px;
        font-weight: 600;
        color: #aaa;
      }

      .controls-content {
        padding: 12px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .smart-control {
        margin-bottom: 16px;
      }

      .smart-control:last-child {
        margin-bottom: 0;
      }

      .control-label {
        display: block;
        font-size: 11px;
        font-weight: 500;
        color: #888;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .no-controls {
        font-size: 12px;
        color: #666;
        text-align: center;
        padding: 20px;
      }

      /* Timeline Control */
      .timeline-control {
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 10px;
      }

      .timeline-slider-row {
        margin-bottom: 8px;
      }

      .timeline-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        outline: none;
      }

      .timeline-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #4a9eff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }

      .timeline-value {
        text-align: center;
        font-size: 14px;
        font-weight: 600;
        color: #4a9eff;
        margin-bottom: 8px;
      }

      .timeline-buttons {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .timeline-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .timeline-btn:hover {
        background: rgba(255,255,255,0.2);
      }

      .timeline-btn.active {
        background: rgba(74, 158, 255, 0.3);
        color: #4a9eff;
      }

      /* Slider Control */
      .slider-control {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .slider-input {
        flex: 1;
        height: 6px;
        -webkit-appearance: none;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        outline: none;
      }

      .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: #4a9eff;
        border-radius: 50%;
        cursor: pointer;
      }

      .slider-value {
        font-size: 12px;
        color: #4a9eff;
        min-width: 60px;
        text-align: right;
      }

      /* Range Slider Control */
      .range-slider-control .range-inputs {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .range-min-input, .range-max-input {
        flex: 1;
        padding: 6px 8px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        text-align: center;
      }

      .range-separator {
        color: #666;
        font-size: 12px;
      }

      /* Dropdown Control */
      .dropdown-control {
        width: 100%;
        padding: 8px 10px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        outline: none;
      }

      .dropdown-control:focus {
        border-color: #4a9eff;
      }

      .dropdown-control option {
        background: #1e1e2e;
        color: #fff;
      }

      /* Toggle Control */
      .toggle-control {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
      }

      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.1);
        border-radius: 24px;
        transition: 0.3s;
      }

      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: 0.3s;
      }

      .toggle-switch input:checked + .toggle-slider {
        background: #4a9eff;
      }

      .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(20px);
      }

      .toggle-label {
        font-size: 12px;
        color: #888;
      }

      /* Chips Control */
      .chips-control {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .chip {
        padding: 6px 12px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .chip:hover {
        background: rgba(255,255,255,0.15);
        border-color: rgba(255,255,255,0.2);
      }

      .chip.selected {
        background: rgba(74, 158, 255, 0.3);
        border-color: #4a9eff;
        color: #4a9eff;
      }

      .chip-count {
        margin-left: 4px;
        font-size: 10px;
        opacity: 0.7;
      }

      /* Search Control */
      .search-control {
        position: relative;
      }

      .search-input {
        width: 100%;
        padding: 8px 32px 8px 10px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }

      .search-input:focus {
        border-color: #4a9eff;
      }

      .search-input::placeholder {
        color: #666;
      }

      .search-clear {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #888;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .search-clear:hover {
        color: #fff;
      }

      /* Date/Time Picker Controls */
      .date-input, .time-input {
        width: 100%;
        padding: 8px 10px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }

      .date-input:focus, .time-input:focus {
        border-color: #4a9eff;
      }

      /* Scrollbar */
      .controls-content::-webkit-scrollbar {
        width: 4px;
      }

      .controls-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .controls-content::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
      }
    `;

    document.head.appendChild(style);
  }
}

export default ControlsRenderer;
