/**
 * Smart Map 3D - Widget cartographique synchronisable pour Grist
 *
 * Ce module exporte tous les composants principaux du widget :
 * - MapCore : Gestion de la carte Mapbox
 * - LayerManager : Gestion des couches et styles
 * - SyncManager : Synchronisation multi-vues
 * - GristIntegration : Interface avec Grist
 */

// Core
export { MapCore } from './core/MapCore';
export * from './core/types';

// Layers
export { LayerManager } from './layers/LayerManager';

// Sync
export { SyncManager, SyncPresets } from './sync/SyncManager';
export type {
  SyncMessage,
  SyncConfig,
  CameraState,
  SelectionState,
  AmbianceState
} from './sync/SyncManager';

// Grist
export { GristIntegration } from './grist/GristIntegration';

/**
 * Créer une instance complète du widget
 */
export function createSmartMap3D(options: {
  container: HTMLElement | string;
  mapboxToken: string;
  syncGroupId?: string;
  syncEnabled?: boolean;
}): {
  mapCore: import('./core/MapCore').MapCore;
  layerManager: import('./layers/LayerManager').LayerManager;
  syncManager: import('./sync/SyncManager').SyncManager;
  grist: import('./grist/GristIntegration').GristIntegration;
} {
  const { MapCore } = require('./core/MapCore');
  const { LayerManager } = require('./layers/LayerManager');
  const { SyncManager } = require('./sync/SyncManager');
  const { GristIntegration } = require('./grist/GristIntegration');
  const { DEFAULT_CONFIG, DEFAULT_SETTINGS } = require('./core/types');

  // Configuration
  const config = {
    ...DEFAULT_CONFIG,
    mapbox: {
      ...DEFAULT_CONFIG.mapbox,
      token: options.mapboxToken
    }
  };

  // Sync Manager
  const syncManager = new SyncManager(
    options.syncGroupId || 'smart-map-3d',
    { syncCamera: true, syncSelection: true, syncLayers: true, syncAmbiance: true, role: 'peer' }
  );

  if (options.syncEnabled !== false) {
    syncManager.start();
  }

  // Map Core
  const mapCore = new MapCore({
    container: options.container,
    config,
    settings: DEFAULT_SETTINGS,
    syncManager
  });

  // Grist
  const grist = new GristIntegration();

  // Layer Manager (sera initialisé quand la carte est prête)
  let layerManager: import('./layers/LayerManager').LayerManager;

  mapCore.onReady(() => {
    const map = mapCore.getMap();
    if (map) {
      layerManager = new LayerManager({ map });
    }
  });

  return {
    mapCore,
    layerManager: layerManager!,
    syncManager,
    grist
  };
}
