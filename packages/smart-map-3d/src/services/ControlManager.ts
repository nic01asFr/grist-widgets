/**
 * ControlManager - Gestionnaire de contrôles data-driven
 *
 * Crée et gère les contrôles intelligents liés aux champs de données,
 * avec bindings vers les propriétés visuelles de la carte.
 */

import type {
  SmartControl,
  SmartControlConfig,
  SmartBinding,
  ControlType,
  BindableProperty,
  BindingTransform,
  AnimationConfig,
  FieldMeta,
  ControlOption
} from '../core/smart-types';
import type { AmbianceState } from '../sync/SyncManager';

export interface ControlManagerConfig {
  defaultDebounceMs?: number;
  animationIntervalMs?: number;
}

export type PropertyChangeCallback = (
  property: BindableProperty,
  value: any,
  sourceControlId: string
) => void;

/**
 * Gestionnaire de contrôles intelligent
 */
export class ControlManager {
  private controls: Map<string, SmartControl> = new Map();
  private bindings: Map<string, SmartBinding> = new Map();
  private config: Required<ControlManagerConfig>;

  // Timers pour animations
  private animationTimers: Map<string, number> = new Map();

  // Callbacks
  private onPropertyChange?: PropertyChangeCallback;
  private onControlValueChange?: (controlId: string, value: any) => void;

  constructor(config?: ControlManagerConfig) {
    this.config = {
      defaultDebounceMs: 150,
      animationIntervalMs: 1000,
      ...config
    };
  }

  // ============================================
  // CRÉATION DE CONTRÔLES
  // ============================================

  /**
   * Crée un contrôle à partir d'un champ analysé
   */
  createControlFromField(
    fieldMeta: FieldMeta,
    controlType?: ControlType,
    customConfig?: Partial<SmartControlConfig>
  ): SmartControl {
    // Utiliser le type suggéré si non spécifié
    const type = controlType ||
      fieldMeta.suggestedControls[0]?.controlType ||
      'dropdown';

    const id = this.generateId();

    // Construire la config basée sur le type et les données du champ
    const config = this.buildControlConfig(fieldMeta, type, customConfig);

    // Construire les bindings suggérés
    const bindings = this.buildDefaultBindings(id, fieldMeta);

    const control: SmartControl = {
      id,
      name: fieldMeta.name,
      fieldName: fieldMeta.name,
      controlType: type,
      config,
      bindings,
      currentValue: this.getDefaultValue(fieldMeta, type)
    };

    // Ajouter animation pour les contrôles temporels
    if (type === 'timeline') {
      control.animation = {
        playing: false,
        speed: 1,
        loop: true,
        direction: 'forward',
        intervalMs: this.config.animationIntervalMs
      };
    }

    this.controls.set(id, control);

    // Enregistrer les bindings
    for (const binding of bindings) {
      this.bindings.set(binding.id, binding);
    }

    return control;
  }

  /**
   * Construit la configuration du contrôle
   */
  private buildControlConfig(
    fieldMeta: FieldMeta,
    type: ControlType,
    customConfig?: Partial<SmartControlConfig>
  ): SmartControlConfig {
    const base: SmartControlConfig = {
      label: this.formatFieldName(fieldMeta.name),
      visible: true,
      enabled: true,
      position: 'left',
      ...customConfig
    };

    switch (type) {
      case 'timeline':
      case 'slider':
      case 'range-slider':
        if (fieldMeta.numericRange) {
          base.min = fieldMeta.numericRange[0];
          base.max = fieldMeta.numericRange[1];
          base.step = this.calculateStep(fieldMeta.numericRange);
        } else if (fieldMeta.dateRange) {
          base.min = fieldMeta.dateRange[0].getTime();
          base.max = fieldMeta.dateRange[1].getTime();
          base.step = 60000; // 1 minute par défaut
          base.format = 'DD/MM/YYYY HH:mm';
        }
        break;

      case 'dropdown':
      case 'chips':
      case 'radio':
        if (fieldMeta.choices) {
          base.options = fieldMeta.choices.map(choice => ({
            value: choice,
            label: choice,
            count: fieldMeta.choiceCounts?.get(choice)
          }));
        }
        base.allowEmpty = type !== 'radio';
        base.allowMultiple = type === 'chips';
        break;

      case 'toggle':
        base.options = [
          { value: true, label: 'Oui' },
          { value: false, label: 'Non' }
        ];
        break;

      case 'search':
        base.debounceMs = this.config.defaultDebounceMs;
        base.minLength = 2;
        break;

      case 'date-picker':
        if (fieldMeta.dateRange) {
          base.min = fieldMeta.dateRange[0].getTime();
          base.max = fieldMeta.dateRange[1].getTime();
        }
        base.format = 'DD/MM/YYYY';
        break;

      case 'time-picker':
        base.min = 0;
        base.max = 1440; // Minutes dans une journée
        base.step = 15;
        base.format = 'HH:mm';
        break;
    }

    return base;
  }

  /**
   * Construit les bindings par défaut pour un contrôle
   */
  private buildDefaultBindings(
    controlId: string,
    fieldMeta: FieldMeta
  ): SmartBinding[] {
    const bindings: SmartBinding[] = [];

    // Prendre les 2 meilleurs bindings suggérés
    const topSuggestions = fieldMeta.suggestedBindings.slice(0, 2);

    for (const suggestion of topSuggestions) {
      if (suggestion.confidence < 0.6) continue;

      const binding: SmartBinding = {
        id: this.generateId(),
        controlId,
        property: suggestion.property,
        transform: this.buildDefaultTransform(fieldMeta, suggestion.property)
      };

      bindings.push(binding);
    }

    return bindings;
  }

  /**
   * Construit la transformation par défaut
   */
  private buildDefaultTransform(
    fieldMeta: FieldMeta,
    property: BindableProperty
  ): BindingTransform {
    // Transformations par défaut selon le type de propriété
    switch (property) {
      case 'ambiance.timeOfDay':
        if (fieldMeta.type === 'datetime' || fieldMeta.type === 'time') {
          return {
            type: 'custom',
            customFn: 'value instanceof Date ? value.getHours() * 60 + value.getMinutes() : value'
          };
        }
        return { type: 'direct' };

      case 'ambiance.date':
        return {
          type: 'custom',
          customFn: 'value instanceof Date ? value.toISOString().split("T")[0] : value'
        };

      case 'style.extrusion':
        if (fieldMeta.numericRange) {
          return {
            type: 'linear',
            inputRange: fieldMeta.numericRange,
            outputRange: [0, 100] // Hauteur en mètres
          };
        }
        return { type: 'direct' };

      case 'style.radius':
        if (fieldMeta.numericRange) {
          return {
            type: 'linear',
            inputRange: fieldMeta.numericRange,
            outputRange: [5, 30] // Rayon en pixels
          };
        }
        return { type: 'direct' };

      case 'layer.opacity':
        if (fieldMeta.numericRange) {
          return {
            type: 'linear',
            inputRange: fieldMeta.numericRange,
            outputRange: [0.2, 1]
          };
        }
        return { type: 'direct' };

      case 'style.color':
        if (fieldMeta.type === 'choice' && fieldMeta.choices) {
          const colorPalette = [
            '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
            '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
          ];
          const categoryMap: Record<string, string> = {};
          fieldMeta.choices.forEach((choice, i) => {
            categoryMap[choice] = colorPalette[i % colorPalette.length];
          });
          return { type: 'categorical', categoryMap };
        }
        return { type: 'direct' };

      case 'filter.include':
      case 'filter.exclude':
        return { type: 'direct' };

      default:
        return { type: 'direct' };
    }
  }

  // ============================================
  // GESTION DES VALEURS
  // ============================================

  /**
   * Met à jour la valeur d'un contrôle
   */
  setValue(controlId: string, value: any): void {
    const control = this.controls.get(controlId);
    if (!control) return;

    control.currentValue = value;

    // Notifier le changement de valeur
    this.onControlValueChange?.(controlId, value);

    // Appliquer les bindings
    this.applyBindings(control);
  }

  /**
   * Applique tous les bindings d'un contrôle
   */
  private applyBindings(control: SmartControl): void {
    for (const binding of control.bindings) {
      const transformedValue = this.applyTransform(control.currentValue, binding.transform);

      // Vérifier la condition si présente
      if (binding.condition && !this.checkCondition(control.currentValue, binding.condition)) {
        continue;
      }

      this.onPropertyChange?.(binding.property, transformedValue, control.id);
    }
  }

  /**
   * Applique une transformation de valeur
   */
  private applyTransform(value: any, transform: BindingTransform): any {
    switch (transform.type) {
      case 'direct':
        return value;

      case 'linear':
        if (transform.inputRange && transform.outputRange) {
          const [inMin, inMax] = transform.inputRange;
          const [outMin, outMax] = transform.outputRange;
          const normalized = (Number(value) - inMin) / (inMax - inMin);
          return outMin + normalized * (outMax - outMin);
        }
        return value;

      case 'logarithmic':
        if (transform.inputRange && transform.outputRange) {
          const [inMin, inMax] = transform.inputRange;
          const [outMin, outMax] = transform.outputRange;
          const logMin = Math.log(inMin || 1);
          const logMax = Math.log(inMax);
          const normalized = (Math.log(Number(value) || 1) - logMin) / (logMax - logMin);
          return outMin + normalized * (outMax - outMin);
        }
        return value;

      case 'categorical':
        if (transform.categoryMap) {
          return transform.categoryMap[String(value)] ?? value;
        }
        return value;

      case 'custom':
        if (transform.customFn) {
          try {
            // Exécuter l'expression custom (attention: sécurité!)
            const fn = new Function('value', `return ${transform.customFn}`);
            return fn(value);
          } catch (e) {
            console.warn('Custom transform error:', e);
            return value;
          }
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Vérifie une condition de binding
   */
  private checkCondition(value: any, condition: SmartBinding['condition']): boolean {
    if (!condition) return true;

    switch (condition.type) {
      case 'equals':
        return value === condition.value;

      case 'contains':
        return String(value).includes(String(condition.value));

      case 'range':
        const num = Number(value);
        return (condition.min === undefined || num >= condition.min) &&
               (condition.max === undefined || num <= condition.max);

      case 'regex':
        if (condition.pattern) {
          return new RegExp(condition.pattern).test(String(value));
        }
        return true;

      case 'custom':
        if (condition.customFn) {
          try {
            const fn = new Function('value', `return ${condition.customFn}`);
            return Boolean(fn(value));
          } catch {
            return true;
          }
        }
        return true;

      default:
        return true;
    }
  }

  // ============================================
  // ANIMATION
  // ============================================

  /**
   * Démarre l'animation d'un contrôle timeline
   */
  startAnimation(controlId: string): void {
    const control = this.controls.get(controlId);
    if (!control || !control.animation || control.controlType !== 'timeline') return;

    control.animation.playing = true;

    const animate = () => {
      if (!control.animation?.playing) return;

      let nextValue = control.currentValue;
      const step = control.config.step || 1;
      const min = control.config.min ?? 0;
      const max = control.config.max ?? 100;

      if (control.animation.direction === 'forward') {
        nextValue += step * control.animation.speed;
        if (nextValue > max) {
          if (control.animation.loop) {
            if (control.animation.direction === 'bounce') {
              control.animation.direction = 'backward';
              nextValue = max;
            } else {
              nextValue = min;
            }
          } else {
            nextValue = max;
            control.animation.playing = false;
          }
        }
      } else {
        nextValue -= step * control.animation.speed;
        if (nextValue < min) {
          if (control.animation.loop) {
            if (control.animation.direction === 'bounce') {
              control.animation.direction = 'forward';
              nextValue = min;
            } else {
              nextValue = max;
            }
          } else {
            nextValue = min;
            control.animation.playing = false;
          }
        }
      }

      this.setValue(controlId, nextValue);

      if (control.animation.playing) {
        const timerId = window.setTimeout(animate, control.animation.intervalMs / control.animation.speed);
        this.animationTimers.set(controlId, timerId);
      }
    };

    animate();
  }

  /**
   * Arrête l'animation d'un contrôle
   */
  stopAnimation(controlId: string): void {
    const control = this.controls.get(controlId);
    if (!control || !control.animation) return;

    control.animation.playing = false;

    const timerId = this.animationTimers.get(controlId);
    if (timerId) {
      clearTimeout(timerId);
      this.animationTimers.delete(controlId);
    }
  }

  /**
   * Toggle l'animation
   */
  toggleAnimation(controlId: string): void {
    const control = this.controls.get(controlId);
    if (!control || !control.animation) return;

    if (control.animation.playing) {
      this.stopAnimation(controlId);
    } else {
      this.startAnimation(controlId);
    }
  }

  /**
   * Change la vitesse d'animation
   */
  setAnimationSpeed(controlId: string, speed: number): void {
    const control = this.controls.get(controlId);
    if (!control || !control.animation) return;

    control.animation.speed = Math.max(0.1, Math.min(10, speed));
  }

  // ============================================
  // GESTION DES BINDINGS
  // ============================================

  /**
   * Ajoute un binding à un contrôle
   */
  addBinding(controlId: string, property: BindableProperty, transform?: BindingTransform): SmartBinding {
    const control = this.controls.get(controlId);
    if (!control) throw new Error(`Control ${controlId} not found`);

    const binding: SmartBinding = {
      id: this.generateId(),
      controlId,
      property,
      transform: transform || { type: 'direct' }
    };

    control.bindings.push(binding);
    this.bindings.set(binding.id, binding);

    // Appliquer immédiatement
    this.applyBindings(control);

    return binding;
  }

  /**
   * Supprime un binding
   */
  removeBinding(bindingId: string): void {
    const binding = this.bindings.get(bindingId);
    if (!binding) return;

    const control = this.controls.get(binding.controlId);
    if (control) {
      const index = control.bindings.findIndex(b => b.id === bindingId);
      if (index !== -1) {
        control.bindings.splice(index, 1);
      }
    }

    this.bindings.delete(bindingId);
  }

  /**
   * Met à jour un binding
   */
  updateBinding(bindingId: string, updates: Partial<SmartBinding>): void {
    const binding = this.bindings.get(bindingId);
    if (!binding) return;

    Object.assign(binding, updates);

    // Réappliquer le binding
    const control = this.controls.get(binding.controlId);
    if (control) {
      this.applyBindings(control);
    }
  }

  // ============================================
  // CRUD CONTRÔLES
  // ============================================

  /**
   * Met à jour un contrôle
   */
  updateControl(controlId: string, updates: Partial<SmartControl>): void {
    const control = this.controls.get(controlId);
    if (!control) return;

    Object.assign(control, updates);
  }

  /**
   * Supprime un contrôle
   */
  deleteControl(controlId: string): void {
    this.stopAnimation(controlId);

    const control = this.controls.get(controlId);
    if (control) {
      // Supprimer les bindings associés
      for (const binding of control.bindings) {
        this.bindings.delete(binding.id);
      }
    }

    this.controls.delete(controlId);
  }

  /**
   * Réordonne les contrôles
   */
  reorderControls(controlIds: string[]): void {
    // Cette méthode est pour l'ordre d'affichage, géré par l'UI
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(): string {
    return `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatFieldName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private calculateStep(range: [number, number]): number {
    const [min, max] = range;
    const span = max - min;

    if (span <= 1) return 0.01;
    if (span <= 10) return 0.1;
    if (span <= 100) return 1;
    if (span <= 1000) return 10;
    return Math.pow(10, Math.floor(Math.log10(span)) - 2);
  }

  private getDefaultValue(fieldMeta: FieldMeta, type: ControlType): any {
    switch (type) {
      case 'slider':
      case 'timeline':
      case 'range-slider':
        if (fieldMeta.numericRange) {
          return fieldMeta.numericRange[0];
        }
        if (fieldMeta.dateRange) {
          return fieldMeta.dateRange[0].getTime();
        }
        return 0;

      case 'dropdown':
      case 'radio':
        return fieldMeta.choices?.[0] || null;

      case 'chips':
        return [];

      case 'toggle':
        return false;

      case 'search':
        return '';

      case 'date-picker':
        return fieldMeta.dateRange?.[0] || new Date();

      case 'time-picker':
        return 720; // Midi

      default:
        return null;
    }
  }

  // ============================================
  // EXPORT/IMPORT
  // ============================================

  /**
   * Exporte les contrôles en JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      controls: Array.from(this.controls.values()),
      bindings: Array.from(this.bindings.values())
    }, null, 2);
  }

  /**
   * Importe des contrôles depuis JSON
   */
  importFromJSON(json: string): void {
    try {
      const data = JSON.parse(json);

      if (data.controls) {
        for (const control of data.controls) {
          this.controls.set(control.id, control);
        }
      }

      if (data.bindings) {
        for (const binding of data.bindings) {
          this.bindings.set(binding.id, binding);
        }
      }
    } catch (e) {
      console.error('Failed to import controls:', e);
      throw new Error('Invalid controls JSON');
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  getControls(): SmartControl[] {
    return Array.from(this.controls.values());
  }

  getControl(id: string): SmartControl | undefined {
    return this.controls.get(id);
  }

  getControlByField(fieldName: string): SmartControl | undefined {
    return Array.from(this.controls.values()).find(c => c.fieldName === fieldName);
  }

  getBindings(): SmartBinding[] {
    return Array.from(this.bindings.values());
  }

  getBinding(id: string): SmartBinding | undefined {
    return this.bindings.get(id);
  }

  getBindingsForControl(controlId: string): SmartBinding[] {
    return Array.from(this.bindings.values()).filter(b => b.controlId === controlId);
  }

  getBindingsForProperty(property: BindableProperty): SmartBinding[] {
    return Array.from(this.bindings.values()).filter(b => b.property === property);
  }

  getAllValues(): Record<string, any> {
    const values: Record<string, any> = {};
    for (const control of this.controls.values()) {
      values[control.id] = control.currentValue;
    }
    return values;
  }

  // ============================================
  // SETTERS
  // ============================================

  setOnPropertyChange(callback: PropertyChangeCallback): void {
    this.onPropertyChange = callback;
  }

  setOnControlValueChange(callback: (controlId: string, value: any) => void): void {
    this.onControlValueChange = callback;
  }
}

export default ControlManager;
