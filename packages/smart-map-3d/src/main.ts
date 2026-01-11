/**
 * Smart Map 3D - Main Application Entry Point
 *
 * Widget cartographique 3D synchronisable pour Grist avec Mapbox GL JS.
 * Utilise les modules TypeScript pour la carte, synchronisation et Grist.
 */

import './styles.css';
import { SyncManager, SyncPresets, CameraState, AmbianceState } from './sync/SyncManager';
import type { AppState, MapSettings } from './core/types';
import { DEFAULT_SETTINGS, DEFAULT_STATE } from './core/types';
import { SmartMapController } from './services/SmartMapController';
import { DataManager, MapLayer, DataSource } from './services/DataManager';
import { EditorUI } from './ui/EditorUI';
import { ControlsRenderer } from './ui/ControlsRenderer';

// Déclarations pour Mapbox et SunCalc (chargés via CDN)
declare const mapboxgl: any;
declare const SunCalc: any;
declare const grist: any;

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  mapbox: {
    token: '',
    defaultCenter: [2.3522, 48.8566] as [number, number],
    defaultZoom: 17,
    defaultPitch: 60,
    defaultBearing: 0
  }
};

// ============================================
// ÉTAT GLOBAL
// ============================================
let map: any = null;
let syncManager: SyncManager | null = null;
let smartController: SmartMapController | null = null;
let dataManager: DataManager | null = null;
let editorUI: EditorUI | null = null;
let controlsRenderer: ControlsRenderer | null = null;

const STATE: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_SETTINGS }
};

// Helper pour exécuter un zoom sans déclencher de sync
function zoomWithoutSync(zoomFn: () => void): void {
  if (!syncManager || !map) {
    zoomFn();
    return;
  }

  // Pause all camera sync
  syncManager.pauseAllCameraSync();

  // Execute the zoom
  zoomFn();

  // Resume after moveend (animation complete)
  const resumeOnce = () => {
    map.off('moveend', resumeOnce);
    // Small delay to ensure all move events are done
    setTimeout(() => {
      syncManager?.resumeAllCameraSync();
      console.log('🔓 Camera sync resumed after zoom');
    }, 100);
  };

  map.once('moveend', resumeOnce);

  // Fallback timeout in case moveend doesn't fire
  setTimeout(() => {
    if (syncManager?.isCameraSyncPaused()) {
      syncManager.resumeAllCameraSync();
      console.log('🔓 Camera sync resumed (timeout fallback)');
    }
  }, 3000);
}

// ============================================
// INITIALISATION
// ============================================
async function init(): Promise<void> {
  showLoading('Initialisation...');

  // Récupérer le token Mapbox
  await loadMapboxToken();

  if (!CONFIG.mapbox.token) {
    hideLoading();
    showToast('Token Mapbox manquant - configurez-le dans les options du widget', 'error');
    openModule('lieu');
    return;
  }

  // Initialiser la carte
  initMap();

  // Initialiser et démarrer la synchronisation automatiquement
  syncManager = new SyncManager(STATE.sync.groupId, SyncPresets.peer());
  setupSyncCallbacks(); // Brancher les callbacks APRÈS création du syncManager
  syncManager.start();
  updateSyncUI();

  // Setup event listeners
  setupEventListeners();
}

// Configuration des callbacks de synchronisation
function setupSyncCallbacks(): void {
  if (!syncManager || !map) return;

  // Recevoir les updates de caméra
  syncManager.setOnCameraChange((camera: CameraState) => {
    console.log('📍 Sync camera reçue:', camera);
    map.easeTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      duration: 300
    });
  });

  // Recevoir les updates d'ambiance
  syncManager.setOnAmbianceChange((ambiance: AmbianceState) => {
    console.log('☀️ Sync ambiance reçue:', ambiance);
    STATE.settings.timeOfDay = ambiance.timeOfDay;
    if (ambiance.date) STATE.settings.date = ambiance.date;

    const slider = document.getElementById('time-slider') as HTMLInputElement;
    if (slider) slider.value = String(ambiance.timeOfDay);
    updateTimeDisplay(ambiance.timeOfDay);
    updateLighting();
  });
}

async function loadMapboxToken(): Promise<void> {
  // Essayer depuis Grist options (avec timeout)
  if (typeof grist !== 'undefined') {
    try {
      // Attendre que Grist soit prêt avec timeout
      const gristReady = new Promise<void>((resolve) => {
        grist.ready({ requiredAccess: 'read table' });
        grist.onOptions((options: any) => {
          if (options?.mapboxToken) {
            CONFIG.mapbox.token = options.mapboxToken;
          }
          resolve();
        });
      });

      const timeout = new Promise<void>((resolve) => {
        setTimeout(resolve, 2000); // 2 secondes max
      });

      await Promise.race([gristReady, timeout]);

      if (CONFIG.mapbox.token) return;
    } catch (e) {
      console.log('Grist options non disponibles');
    }
  }

  // Fallback localStorage
  const saved = localStorage.getItem('smartmap3d_mapbox_token');
  if (saved) {
    CONFIG.mapbox.token = saved;
  }
}

function initMap(): void {
  if (!CONFIG.mapbox.token) return;

  mapboxgl.accessToken = CONFIG.mapbox.token;

  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/standard',
    center: CONFIG.mapbox.defaultCenter,
    zoom: CONFIG.mapbox.defaultZoom,
    pitch: CONFIG.mapbox.defaultPitch,
    bearing: CONFIG.mapbox.defaultBearing,
    antialias: true
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

  map.on('load', () => {
    console.log('✅ Carte chargée');
    map.once('idle', onMapReady);
  });

  // Coordonnées au survol
  const tooltip = document.getElementById('coord-tooltip');
  map.on('mousemove', (e: any) => {
    if (tooltip) {
      tooltip.textContent = `${e.lngLat.lat.toFixed(5)}°N, ${e.lngLat.lng.toFixed(5)}°E`;
      tooltip.classList.add('visible');
    }
  });

  map.on('mouseout', () => {
    tooltip?.classList.remove('visible');
  });

  // Sync camera - envoi seulement, réception configurée dans setupSyncCallbacks
  map.on('move', () => {
    if (syncManager && !syncManager.shouldIgnoreCamera()) {
      syncManager.sendCamera({
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    }
  });

  // Update lighting on move
  let lightingTimeout: number | null = null;
  map.on('moveend', () => {
    if (STATE.settings.useRealisticSun) {
      if (lightingTimeout) clearTimeout(lightingTimeout);
      lightingTimeout = window.setTimeout(updateLighting, 150);
    }
  });
}

function onMapReady(): void {
  console.log('✅ Carte prête');

  // Setup terrain
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    });
  }

  // Apply settings
  updateMapSettings();
  updateLighting();

  // Initialize DataManager
  initDataManager();

  // Initialize SmartMapController
  initSmartController();

  hideLoading();
  showToast('Carte initialisée', 'success');
}

// ============================================
// DATA MANAGER INITIALIZATION
// ============================================
function initDataManager(): void {
  if (!map) return;

  dataManager = new DataManager();
  dataManager.init(map);

  // Callbacks pour mise à jour de l'UI
  dataManager.setOnLayerChange((layers) => {
    console.log('📂 Layers updated:', layers.length);
    // Mettre à jour le panneau si ouvert
    if (currentModule === 'donnees') {
      openModule('donnees');
    }
  });

  dataManager.setOnFeatureClick((feature, layer) => {
    console.log('🎯 Feature clicked:', feature.properties, 'Layer:', layer.name);
    showFeaturePopup(feature);
  });

  dataManager.setOnFeatureHover((feature, layer) => {
    if (feature) {
      updateCoordTooltip(feature);
    }
  });

  console.log('✅ DataManager initialisé');
}

function showFeaturePopup(feature: any): void {
  if (!feature.properties) return;

  const props = Object.entries(feature.properties)
    .filter(([k, v]) => v !== null && v !== undefined && !k.startsWith('_'))
    .slice(0, 10)
    .map(([k, v]) => `<b>${k}:</b> ${v}`)
    .join('<br>');

  showToast(props || 'Aucune propriété', 'success');
}

function updateCoordTooltip(feature: any): void {
  const tooltip = document.getElementById('coord-tooltip');
  if (tooltip && feature.properties) {
    const name = feature.properties.name || feature.properties.nom || feature.properties.label || '';
    if (name) {
      tooltip.textContent = name;
      tooltip.classList.add('visible');
    }
  }
}

// ============================================
// SMART CONTROLLER INITIALIZATION
// ============================================
function initSmartController(): void {
  if (!map) return;

  // Create the controller
  smartController = new SmartMapController({
    autoAnalyze: true,
    autoSave: true
  });

  // Initialize with callbacks
  smartController.init(map, STATE, {
    onAmbianceChange: (ambiance: AmbianceState) => {
      STATE.settings.timeOfDay = ambiance.timeOfDay;
      if (ambiance.date) STATE.settings.date = ambiance.date;

      const slider = document.getElementById('time-slider') as HTMLInputElement;
      if (slider) slider.value = String(ambiance.timeOfDay);
      updateTimeDisplay(ambiance.timeOfDay);
      updateLighting();
    },
    onLayerVisibilityChange: (layerId: string, visible: boolean) => {
      console.log(`Layer ${layerId} visibility: ${visible}`);
      // TODO: Implement layer visibility change
    },
    onLayerOpacityChange: (layerId: string, opacity: number) => {
      console.log(`Layer ${layerId} opacity: ${opacity}`);
      // TODO: Implement layer opacity change
    },
    onFilterChange: (fieldName: string, value: any) => {
      console.log(`Filter ${fieldName}: ${value}`);
      // TODO: Implement filter change
    },
    onStyleChange: (property: string, value: any) => {
      console.log(`Style ${property}: ${value}`);
      // TODO: Implement style change
    },
    onCameraChange: (camera: { zoom?: number; pitch?: number; bearing?: number }) => {
      if (map) {
        map.easeTo({ ...camera, duration: 300 });
      }
    }
  });

  // Create editor UI
  const container = document.getElementById('map')?.parentElement;
  if (container) {
    editorUI = new EditorUI({
      container,
      controller: smartController,
      onBookmarkSelect: (bookmarkId: string) => {
        console.log('Bookmark selected:', bookmarkId);
      }
    });
    editorUI.init();
  }

  // Create controls renderer
  if (container) {
    controlsRenderer = new ControlsRenderer({
      container,
      controlManager: smartController.getControlManager(),
      position: 'left',
      collapsed: false
    });
    controlsRenderer.init();
  }

  // Setup editor button event
  setupEditorButton();

  console.log('✅ SmartMapController initialisé');
}

function setupEditorButton(): void {
  const btn = document.getElementById('editor-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    editorUI?.toggle();
  });
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners(): void {
  // Toolbar buttons
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const module = (btn as HTMLElement).dataset.module;
      if (module) openModule(module);
    });
  });

  // Panel close
  document.getElementById('panel-close')?.addEventListener('click', closePanel);

  // Time slider
  document.getElementById('time-slider')?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    updateTimeOfDay(parseInt(target.value));
  });

  // Sync manager events
  if (syncManager) {
    syncManager.setOnAmbianceChange((ambiance: AmbianceState) => {
      STATE.settings.timeOfDay = ambiance.timeOfDay;
      const slider = document.getElementById('time-slider') as HTMLInputElement;
      if (slider) slider.value = String(ambiance.timeOfDay);
      updateTimeDisplay(ambiance.timeOfDay);
      updateLighting();
    });
  }
}

// ============================================
// MAP SETTINGS
// ============================================
function updateMapSettings(): void {
  if (!map) return;

  // Terrain
  if (STATE.settings.terrain3D && map.getSource('mapbox-dem')) {
    map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: STATE.settings.terrainExaggeration
    });
  } else {
    map.setTerrain(null);
  }

  // 3D config for Standard style
  if (typeof map.setConfigProperty === 'function') {
    try {
      map.setConfigProperty('basemap', 'show3dBuildings', STATE.settings.show3dBuildings);
      map.setConfigProperty('basemap', 'show3dLandmarks', STATE.settings.show3dLandmarks);
      map.setConfigProperty('basemap', 'show3dTrees', STATE.settings.show3dTrees);
    } catch (e) {}
  }

  // Fog
  if (STATE.settings.fogEnabled) {
    map.setFog({ range: [0.5, 10], color: '#dce6f2', 'horizon-blend': 0.1 });
  } else {
    map.setFog(null);
  }
}

function updateLighting(): void {
  if (!map || !map.isStyleLoaded()) return;

  const minutes = STATE.settings.timeOfDay;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const center = map.getCenter();
  const date = new Date(STATE.settings.date);
  date.setHours(hours, mins, 0, 0);

  let azimuth = 180, altitude = 45;

  if (STATE.settings.useRealisticSun && typeof SunCalc !== 'undefined') {
    try {
      const sunPos = SunCalc.getPosition(date, center.lat, center.lng);
      azimuth = ((sunPos.azimuth * 180 / Math.PI) + 180) % 360;
      altitude = sunPos.altitude * 180 / Math.PI;
    } catch (e) {}
  }

  const polarAngle = Math.max(5, Math.min(85, 90 - altitude));

  // Light preset
  if (typeof map.setConfigProperty === 'function') {
    let preset = 'day';
    if (altitude < -6) preset = 'night';
    else if (altitude < 15) preset = hours < 12 ? 'dawn' : 'dusk';

    try {
      map.setConfigProperty('basemap', 'lightPreset', preset);
    } catch (e) {}
  }

  // Colors
  let sunColor = '#ffffff', sunIntensity = 0.5;
  let ambientColor = '#ffffff', ambientIntensity = 0.35;
  const shadowsEnabled = STATE.settings.shadowsEnabled && altitude > 5;

  if (altitude < -6) {
    sunColor = '#1a1a2e'; sunIntensity = 0.05;
    ambientColor = '#1a1a2e'; ambientIntensity = 0.1;
  } else if (altitude < 0) {
    sunColor = '#ff6b6b'; sunIntensity = 0.2;
    ambientColor = '#4a5568'; ambientIntensity = 0.2;
  } else if (altitude < 10) {
    sunColor = '#ffb347'; sunIntensity = 0.4;
    ambientColor = '#fff5eb'; ambientIntensity = 0.3;
  } else if (altitude < 30) {
    sunColor = '#fff5eb'; sunIntensity = 0.5;
  } else {
    sunIntensity = 0.6; ambientIntensity = 0.4;
  }

  const shadowIntensity = shadowsEnabled ? Math.min(0.9, 0.4 + ((90 - altitude) / 150)) : 0;

  try {
    map.setLights([
      { id: 'ambient', type: 'ambient', properties: { color: ambientColor, intensity: ambientIntensity } },
      { id: 'sun', type: 'directional', properties: {
        direction: [azimuth, polarAngle],
        color: sunColor,
        intensity: sunIntensity,
        'cast-shadows': shadowsEnabled,
        'shadow-intensity': shadowIntensity
      }}
    ]);
  } catch (e) {}
}

function updateTimeOfDay(minutes: number): void {
  STATE.settings.timeOfDay = minutes;
  updateTimeDisplay(minutes);
  updateLighting();

  // Sync
  if (syncManager?.isActive() && syncManager.getRole() !== 'slave') {
    syncManager.sendAmbiance({
      timeOfDay: STATE.settings.timeOfDay,
      date: STATE.settings.date,
      shadowsEnabled: STATE.settings.shadowsEnabled
    });
  }
}

function updateTimeDisplay(minutes: number): void {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const display = document.getElementById('time-display');
  if (display) {
    display.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

// ============================================
// PANELS
// ============================================
let currentModule: string | null = null;

function openModule(moduleName: string): void {
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.module === moduleName);
  });

  currentModule = moduleName;

  const panel = document.getElementById('side-panel');
  const title = document.getElementById('panel-title');
  const content = document.getElementById('panel-content');

  if (!panel || !title || !content) return;

  switch (moduleName) {
    case 'lieu':
      title.textContent = '📍 Lieu';
      content.innerHTML = generateLieuPanel();
      break;
    case 'donnees':
      title.textContent = '📂 Données';
      content.innerHTML = generateDonneesPanel();
      break;
    case 'fond':
      title.textContent = '🌍 Fond de carte';
      content.innerHTML = generateFondPanel();
      break;
    case 'ambiance':
      title.textContent = '☀️ Ambiance';
      content.innerHTML = generateAmbiancePanel();
      break;
    case 'vue':
      title.textContent = '🎯 Vue';
      content.innerHTML = generateVuePanel();
      break;
    case 'sync':
      title.textContent = '🔗 Synchronisation';
      content.innerHTML = generateSyncPanel();
      break;
  }

  panel.classList.remove('hidden');

  // Setup panel event listeners after content is rendered
  setupPanelEventListeners(moduleName);
}

function closePanel(): void {
  document.getElementById('side-panel')?.classList.add('hidden');
  document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
  currentModule = null;
}

function setupPanelEventListeners(moduleName: string): void {
  // Token input
  const tokenInput = document.getElementById('mapbox-token-input');
  tokenInput?.addEventListener('change', (e) => {
    saveMapboxToken((e.target as HTMLInputElement).value);
  });

  // Paris button
  document.getElementById('btn-center-paris')?.addEventListener('click', centerOnParis);

  // Style select
  document.getElementById('map-style-select')?.addEventListener('change', (e) => {
    changeMapStyle((e.target as HTMLSelectElement).value);
  });

  // Toggle buttons
  document.querySelectorAll('[data-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const key = (toggle as HTMLElement).dataset.toggle as keyof MapSettings;
      toggleSetting(key);
    });
  });

  // Terrain slider
  document.getElementById('terrain-slider')?.addEventListener('input', (e) => {
    updateTerrainExaggeration(parseFloat((e.target as HTMLInputElement).value));
  });

  // Date input
  document.getElementById('date-input')?.addEventListener('change', (e) => {
    updateDate((e.target as HTMLInputElement).value);
  });

  // View buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      setView((btn as HTMLElement).dataset.view!);
    });
  });

  // Sync toggle
  document.getElementById('sync-toggle')?.addEventListener('click', toggleSync);

  // Sync group
  document.getElementById('sync-group-btn')?.addEventListener('click', changeSyncGroup);

  // Role cards
  document.querySelectorAll('[data-role]').forEach(card => {
    card.addEventListener('click', () => {
      setSyncRole((card as HTMLElement).dataset.role as 'master' | 'peer' | 'slave');
    });
  });

  // Sync option toggles
  document.querySelectorAll('[data-sync-option]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const option = (toggle as HTMLElement).dataset.syncOption as keyof typeof STATE.sync;
      toggleSyncOption(option);
    });
  });

  // Data import - File
  document.getElementById('import-file-btn')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
  });

  document.getElementById('file-input')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && dataManager) {
      try {
        showLoading('Import en cours...');
        const source = await dataManager.importFile(file);
        dataManager.createLayer(source.id);

        // Zoom to layer bounds without triggering sync
        const layerId = dataManager.getLayers()[dataManager.getLayers().length - 1].id;
        zoomWithoutSync(() => dataManager!.zoomToLayer(layerId));

        hideLoading();
        showToast(`${source.metadata.featureCount} features importées`, 'success');
        openModule('donnees');
      } catch (err) {
        hideLoading();
        showToast(`Erreur: ${(err as Error).message}`, 'error');
      }
      input.value = ''; // Reset
    }
  });

  // Data import - Grist
  document.getElementById('import-grist-btn')?.addEventListener('click', importFromGrist);

  // Layer toggles
  document.querySelectorAll('[data-layer-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const layerId = (toggle as HTMLElement).dataset.layerToggle;
      if (layerId && dataManager) {
        const layer = dataManager.getLayer(layerId);
        if (layer) {
          dataManager.setLayerVisibility(layerId, !layer.visible);
          toggle.classList.toggle('active');
        }
      }
    });
  });

  // Layer zoom
  document.querySelectorAll('[data-zoom-layer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layerId = (btn as HTMLElement).dataset.zoomLayer;
      if (layerId && dataManager) {
        zoomWithoutSync(() => dataManager!.zoomToLayer(layerId));
      }
    });
  });

  // Layer delete
  document.querySelectorAll('[data-delete-layer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layerId = (btn as HTMLElement).dataset.deleteLayer;
      if (layerId && dataManager) {
        dataManager.removeLayer(layerId);
        openModule('donnees');
      }
    });
  });

  // Layer opacity
  document.querySelectorAll('[data-opacity-layer]').forEach(slider => {
    slider.addEventListener('input', () => {
      const layerId = (slider as HTMLElement).dataset.opacityLayer;
      const value = parseInt((slider as HTMLInputElement).value) / 100;
      if (layerId && dataManager) {
        dataManager.setLayerOpacity(layerId, value);
      }
    });
  });

  // Layer style
  document.querySelectorAll('[data-style-layer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layerId = (btn as HTMLElement).dataset.styleLayer;
      if (layerId) {
        showStyleDialog(layerId);
      }
    });
  });
}

// ============================================
// PANEL GENERATORS
// ============================================
function generateLieuPanel(): string {
  return `
    <div class="panel-section">
      <div class="section-title">Token Mapbox</div>
      <div class="input-group">
        <input type="text" class="input-field" id="mapbox-token-input"
               placeholder="pk...." value="${CONFIG.mapbox.token}">
      </div>
      <p style="font-size: 11px; color: var(--text-muted);">
        Obtenez votre token sur <a href="https://mapbox.com" target="_blank" style="color: var(--primary);">mapbox.com</a>
      </p>
    </div>

    <div class="panel-section">
      <div class="section-title">Position</div>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
        ${STATE.location.name || 'Non défini'}<br>
        ${STATE.location.lat?.toFixed(5) || '-'}°N, ${STATE.location.lng?.toFixed(5) || '-'}°E
      </p>
      <button class="btn btn-secondary btn-full" id="btn-center-paris">
        🎯 Recentrer sur Paris
      </button>
    </div>
  `;
}

function generateDonneesPanel(): string {
  const layers = dataManager?.getLayers() || [];
  const sources = dataManager?.getSources() || [];

  const layersHtml = layers.length === 0
    ? `<p class="empty-message">Aucune couche. Importez des données.</p>`
    : layers.map(layer => {
        const source = dataManager?.getSource(layer.sourceId);
        return `
          <div class="layer-item" data-layer-id="${layer.id}">
            <div class="layer-header">
              <div class="layer-visibility">
                <div class="toggle ${layer.visible ? 'active' : ''}" data-layer-toggle="${layer.id}"></div>
              </div>
              <span class="layer-name">${layer.name}</span>
              <span class="layer-count">${source?.metadata.featureCount || 0}</span>
            </div>
            <div class="layer-actions">
              <button class="layer-action-btn" data-zoom-layer="${layer.id}" title="Zoomer">🔍</button>
              <button class="layer-action-btn" data-style-layer="${layer.id}" title="Style">🎨</button>
              <button class="layer-action-btn" data-delete-layer="${layer.id}" title="Supprimer">🗑️</button>
            </div>
            <div class="layer-opacity">
              <input type="range" min="0" max="100" value="${layer.opacity * 100}"
                     data-opacity-layer="${layer.id}" class="opacity-slider">
            </div>
          </div>
        `;
      }).join('');

  return `
    <div class="panel-section">
      <div class="section-title">Import</div>
      <div class="import-buttons">
        <button class="btn btn-primary btn-full" id="import-file-btn">
          📁 Importer un fichier
        </button>
        <input type="file" id="file-input" accept=".geojson,.json,.csv,.kml,.gpx" style="display:none">
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
        Formats: GeoJSON, CSV (avec WKT/lat-lng), KML, GPX
      </p>
    </div>

    <div class="panel-section">
      <div class="section-title">Import depuis Grist</div>
      <div class="input-group">
        <select class="input-field" id="grist-geom-column">
          <option value="">Colonne géométrie...</option>
        </select>
      </div>
      <button class="btn btn-secondary btn-full" id="import-grist-btn" style="margin-top: 8px;">
        📊 Importer la table actuelle
      </button>
    </div>

    <div class="panel-section">
      <div class="section-title">Couches (${layers.length})</div>
      <div class="layers-list">
        ${layersHtml}
      </div>
    </div>
  `;
}

function generateFondPanel(): string {
  return `
    <div class="panel-section">
      <div class="section-title">Style de carte</div>
      <select class="input-field" id="map-style-select">
        <option value="standard" ${STATE.settings.mapStyle === 'standard' ? 'selected' : ''}>Standard (3D)</option>
        <option value="streets" ${STATE.settings.mapStyle === 'streets' ? 'selected' : ''}>Streets</option>
        <option value="satellite" ${STATE.settings.mapStyle === 'satellite' ? 'selected' : ''}>Satellite</option>
        <option value="satellite-streets" ${STATE.settings.mapStyle === 'satellite-streets' ? 'selected' : ''}>Satellite + Streets</option>
      </select>
    </div>

    <div class="panel-section">
      <div class="section-title">Éléments 3D</div>
      <div class="toggle-group">
        <span class="toggle-label">🏢 Bâtiments 3D</span>
        <div class="toggle ${STATE.settings.show3dBuildings ? 'active' : ''}" data-toggle="show3dBuildings"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">🏛️ Monuments 3D</span>
        <div class="toggle ${STATE.settings.show3dLandmarks ? 'active' : ''}" data-toggle="show3dLandmarks"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">🌳 Arbres 3D</span>
        <div class="toggle ${STATE.settings.show3dTrees ? 'active' : ''}" data-toggle="show3dTrees"></div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Terrain</div>
      <div class="toggle-group">
        <span class="toggle-label">🏔️ Relief 3D</span>
        <div class="toggle ${STATE.settings.terrain3D ? 'active' : ''}" data-toggle="terrain3D"></div>
      </div>
      ${STATE.settings.terrain3D ? `
        <div class="slider-group">
          <div class="slider-header">
            <span class="slider-label">Exagération</span>
            <span class="slider-value" id="terrain-value">${STATE.settings.terrainExaggeration}x</span>
          </div>
          <input type="range" class="slider" id="terrain-slider" min="0.5" max="3" step="0.1"
                 value="${STATE.settings.terrainExaggeration}">
        </div>
      ` : ''}
    </div>
  `;
}

function generateAmbiancePanel(): string {
  return `
    <div class="panel-section">
      <div class="section-title">Éclairage</div>
      <div class="toggle-group">
        <span class="toggle-label">☀️ Position solaire réaliste</span>
        <div class="toggle ${STATE.settings.useRealisticSun ? 'active' : ''}" data-toggle="useRealisticSun"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">🌫️ Ombres</span>
        <div class="toggle ${STATE.settings.shadowsEnabled ? 'active' : ''}" data-toggle="shadowsEnabled"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">🌁 Brouillard</span>
        <div class="toggle ${STATE.settings.fogEnabled ? 'active' : ''}" data-toggle="fogEnabled"></div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Date</div>
      <input type="date" class="input-field" id="date-input" value="${STATE.settings.date}">
    </div>
  `;
}

function generateVuePanel(): string {
  const cam = map ? {
    lat: map.getCenter().lat.toFixed(5),
    lng: map.getCenter().lng.toFixed(5),
    zoom: map.getZoom().toFixed(1),
    pitch: map.getPitch().toFixed(0),
    bearing: map.getBearing().toFixed(0)
  } : { lat: '-', lng: '-', zoom: '-', pitch: '-', bearing: '-' };

  return `
    <div class="panel-section">
      <div class="section-title">Caméra actuelle</div>
      <div style="font-family: monospace; font-size: 12px; color: var(--text-secondary);">
        <p>Lat: ${cam.lat}° | Lng: ${cam.lng}°</p>
        <p>Zoom: ${cam.zoom} | Pitch: ${cam.pitch}° | Bearing: ${cam.bearing}°</p>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Vues prédéfinies</div>
      <button class="btn btn-secondary btn-full" style="margin-bottom: 8px;" data-view="top">
        ⬆️ Vue du dessus
      </button>
      <button class="btn btn-secondary btn-full" style="margin-bottom: 8px;" data-view="perspective">
        🎯 Vue perspective
      </button>
      <button class="btn btn-secondary btn-full" data-view="street">
        🚶 Vue rue
      </button>
    </div>
  `;
}

function generateSyncPanel(): string {
  const isActive = syncManager?.isActive() || false;
  const peerCount = syncManager?.getPeerCount() || 0;

  return `
    <div class="panel-section">
      <div class="section-title">État</div>
      <div class="toggle-group">
        <span class="toggle-label">🔗 Synchronisation activée</span>
        <div class="toggle ${isActive ? 'active' : ''}" id="sync-toggle"></div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Groupe de synchronisation</div>
      <div class="sync-group-input">
        <input type="text" class="input-field" id="sync-group-input"
               value="${STATE.sync.groupId}" placeholder="Nom du groupe">
        <button class="btn btn-secondary" id="sync-group-btn">OK</button>
      </div>
      <p style="font-size: 11px; color: var(--text-muted);">
        Les widgets avec le même groupe synchronisent leurs vues
      </p>
    </div>

    <div class="panel-section">
      <div class="section-title">Rôle</div>
      <div class="role-cards">
        <div class="role-card ${STATE.sync.role === 'master' ? 'active' : ''}" data-role="master">
          <div class="role-card-icon">👑</div>
          <div class="role-card-label">Master</div>
        </div>
        <div class="role-card ${STATE.sync.role === 'peer' ? 'active' : ''}" data-role="peer">
          <div class="role-card-icon">🔄</div>
          <div class="role-card-label">Peer</div>
        </div>
        <div class="role-card ${STATE.sync.role === 'slave' ? 'active' : ''}" data-role="slave">
          <div class="role-card-icon">👁️</div>
          <div class="role-card-label">Slave</div>
        </div>
      </div>
      <p style="font-size: 11px; color: var(--text-muted);">
        <b>Master</b>: Contrôle les autres<br>
        <b>Peer</b>: Synchronisation bidirectionnelle<br>
        <b>Slave</b>: Suit les autres
      </p>
    </div>

    <div class="panel-section">
      <div class="section-title">Paramètres synchronisés</div>
      <div class="toggle-group">
        <span class="toggle-label">📍 Position caméra</span>
        <div class="toggle ${STATE.sync.syncCamera ? 'active' : ''}" data-sync-option="syncCamera"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">☀️ Heure / Ambiance</span>
        <div class="toggle ${STATE.sync.syncAmbiance ? 'active' : ''}" data-sync-option="syncAmbiance"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">🎯 Sélection</span>
        <div class="toggle ${STATE.sync.syncSelection ? 'active' : ''}" data-sync-option="syncSelection"></div>
      </div>
      <div class="toggle-group">
        <span class="toggle-label">📂 Visibilité couches</span>
        <div class="toggle ${STATE.sync.syncLayers ? 'active' : ''}" data-sync-option="syncLayers"></div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Peers connectés</div>
      <div class="peer-count">
        <div class="peer-count-number">${peerCount}</div>
        <div class="peer-count-label">instance${peerCount > 1 ? 's' : ''} connectée${peerCount > 1 ? 's' : ''}</div>
      </div>
    </div>
  `;
}

// ============================================
// ACTIONS
// ============================================
function saveMapboxToken(token: string): void {
  CONFIG.mapbox.token = token;
  localStorage.setItem('smartmap3d_mapbox_token', token);

  if (!map && token) {
    initMap();
  }

  showToast('Token sauvegardé', 'success');
}

function centerOnParis(): void {
  if (map) {
    map.flyTo({ center: [2.3522, 48.8566], zoom: 17 });
  }
}

function changeMapStyle(style: string): void {
  STATE.settings.mapStyle = style;
  if (map) {
    map.setStyle(`mapbox://styles/mapbox/${style}`);
    map.once('idle', () => {
      updateMapSettings();
      updateLighting();
    });
  }
}

function toggleSetting(key: keyof MapSettings): void {
  (STATE.settings as any)[key] = !(STATE.settings as any)[key];
  updateMapSettings();
  if (currentModule) openModule(currentModule);
}

function updateTerrainExaggeration(value: number): void {
  STATE.settings.terrainExaggeration = value;
  const valueDisplay = document.getElementById('terrain-value');
  if (valueDisplay) valueDisplay.textContent = `${value}x`;
  updateMapSettings();
}

function updateDate(date: string): void {
  STATE.settings.date = date;
  updateLighting();
}

function setView(type: string): void {
  if (!map) return;

  switch (type) {
    case 'top':
      map.easeTo({ pitch: 0, bearing: 0 });
      break;
    case 'perspective':
      map.easeTo({ pitch: 60, bearing: 0 });
      break;
    case 'street':
      map.easeTo({ pitch: 85, zoom: 19 });
      break;
  }
}

function toggleSync(): void {
  if (syncManager?.isActive()) {
    syncManager.stop();
  } else {
    if (!syncManager) {
      syncManager = new SyncManager(STATE.sync.groupId, SyncPresets.peer());
    }
    syncManager.start();
  }
  updateSyncUI();
  openModule('sync');
}

function changeSyncGroup(): void {
  const input = document.getElementById('sync-group-input') as HTMLInputElement;
  if (syncManager && input?.value) {
    const config = STATE.sync.role === 'master' ? SyncPresets.master() :
                   STATE.sync.role === 'slave' ? SyncPresets.slave() :
                   SyncPresets.peer();

    syncManager.stop();
    syncManager = new SyncManager(input.value, config);
    STATE.sync.groupId = input.value;
    setupSyncCallbacks(); // Rebrancher les callbacks
    syncManager.start();
    updateSyncUI();

    showToast(`Groupe changé: ${input.value}`, 'success');
  }
}

function setSyncRole(role: 'master' | 'peer' | 'slave'): void {
  STATE.sync.role = role;
  if (syncManager) {
    const config = role === 'master' ? SyncPresets.master() :
                   role === 'slave' ? SyncPresets.slave() :
                   SyncPresets.peer();

    // Appliquer les options granulaires
    config.syncCamera = STATE.sync.syncCamera;
    config.syncAmbiance = STATE.sync.syncAmbiance;
    config.syncSelection = STATE.sync.syncSelection;
    config.syncLayers = STATE.sync.syncLayers;

    syncManager.stop();
    syncManager = new SyncManager(STATE.sync.groupId, config);
    setupSyncCallbacks(); // Rebrancher les callbacks
    syncManager.start();
    updateSyncUI();

    showToast(`Rôle changé: ${role}`, 'success');
  }
  openModule('sync');
}

function toggleSyncOption(option: string): void {
  // Toggle l'option dans STATE
  if (option === 'syncCamera') STATE.sync.syncCamera = !STATE.sync.syncCamera;
  else if (option === 'syncAmbiance') STATE.sync.syncAmbiance = !STATE.sync.syncAmbiance;
  else if (option === 'syncSelection') STATE.sync.syncSelection = !STATE.sync.syncSelection;
  else if (option === 'syncLayers') STATE.sync.syncLayers = !STATE.sync.syncLayers;

  // Mettre à jour la config du syncManager
  if (syncManager) {
    syncManager.updateConfig({
      syncCamera: STATE.sync.syncCamera,
      syncAmbiance: STATE.sync.syncAmbiance,
      syncSelection: STATE.sync.syncSelection,
      syncLayers: STATE.sync.syncLayers
    });
  }

  // Rafraîchir le panneau
  openModule('sync');
  console.log(`⚙️ Sync option ${option}: ${(STATE.sync as any)[option]}`);
}

function updateSyncUI(): void {
  const badge = document.getElementById('sync-badge');
  const status = document.getElementById('sync-status');
  const isActive = syncManager?.isActive() || false;
  const peerCount = syncManager?.getPeerCount() || 0;

  if (isActive) {
    badge?.classList.add('active');
    if (status) status.textContent = `${peerCount} peer${peerCount > 1 ? 's' : ''}`;
    STATE.sync.peerCount = peerCount;
  } else {
    badge?.classList.remove('active');
    if (status) status.textContent = 'Non connecté';
    STATE.sync.peerCount = 0;
  }

  STATE.sync.enabled = isActive;
}

// Rafraîchir le compteur de peers périodiquement
setInterval(() => {
  if (syncManager?.isActive()) {
    updateSyncUI();
  }
}, 2000);

// ============================================
// UI HELPERS
// ============================================
function showLoading(text: string): void {
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.textContent = text || 'Chargement...';
  document.getElementById('loading')?.classList.remove('hidden');
}

function hideLoading(): void {
  document.getElementById('loading')?.classList.add('hidden');
}

function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ============================================
// DATA IMPORT FUNCTIONS
// ============================================
async function importFromGrist(): Promise<void> {
  if (typeof grist === 'undefined') {
    showToast('Grist non disponible', 'error');
    return;
  }

  const geomSelect = document.getElementById('grist-geom-column') as HTMLSelectElement;
  const geomColumn = geomSelect?.value;

  if (!geomColumn) {
    showToast('Sélectionnez une colonne géométrie', 'warning');
    return;
  }

  try {
    showLoading('Import depuis Grist...');

    // Récupérer les données de la table
    const tableId = await grist.selectedTable.getTableId();
    const records = await grist.docApi.fetchTable(tableId);

    // Convertir en array d'objets
    const columns = Object.keys(records);
    const rowCount = records[columns[0]]?.length || 0;
    const data: Record<string, any>[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = { id: records.id?.[i] || i };
      for (const col of columns) {
        if (col !== 'id') {
          row[col] = records[col][i];
        }
      }
      data.push(row);
    }

    if (dataManager) {
      const source = dataManager.importFromGrist(data, geomColumn, `Table ${tableId}`);
      dataManager.createLayer(source.id);

      // Zoom to layer bounds without triggering sync
      const layerId = dataManager.getLayers()[dataManager.getLayers().length - 1].id;
      zoomWithoutSync(() => dataManager!.zoomToLayer(layerId));

      hideLoading();
      showToast(`${source.metadata.featureCount} features importées depuis Grist`, 'success');
      openModule('donnees');
    }
  } catch (err) {
    hideLoading();
    showToast(`Erreur: ${(err as Error).message}`, 'error');
  }
}

function showStyleDialog(layerId: string): void {
  if (!dataManager) return;

  const layer = dataManager.getLayer(layerId);
  const source = layer ? dataManager.getSource(layer.sourceId) : null;
  if (!layer || !source) return;

  const fields = source.metadata.fields.filter(f => f.type !== 'geometry');
  const numericFields = fields.filter(f => f.type === 'number');
  const textFields = fields.filter(f => f.type === 'string');

  const dialog = document.createElement('div');
  dialog.className = 'style-dialog-overlay';
  dialog.innerHTML = `
    <div class="style-dialog">
      <div class="style-dialog-header">
        <h3>🎨 Style: ${layer.name}</h3>
        <button class="style-dialog-close">×</button>
      </div>
      <div class="style-dialog-content">
        <div class="style-section">
          <label>Type de style</label>
          <select id="style-type">
            <option value="simple" ${layer.style.type === 'simple' ? 'selected' : ''}>Simple</option>
            <option value="categorized" ${layer.style.type === 'categorized' ? 'selected' : ''}>Catégorisé</option>
            <option value="graduated" ${layer.style.type === 'graduated' ? 'selected' : ''}>Gradué</option>
          </select>
        </div>

        <div class="style-section" id="style-field-section" style="display:${layer.style.type !== 'simple' ? 'block' : 'none'}">
          <label>Champ</label>
          <select id="style-field">
            <option value="">Sélectionner...</option>
            ${fields.map(f => `<option value="${f.name}">${f.name} (${f.type})</option>`).join('')}
          </select>
        </div>

        <div class="style-section">
          <label>Couleur principale</label>
          <input type="color" id="style-color" value="${layer.style.fillColor || layer.style.pointColor || '#4a9eff'}">
        </div>

        <div class="style-section">
          <label>Extrusion 3D</label>
          <div class="toggle ${layer.style.extrusion ? 'active' : ''}" id="style-extrusion-toggle"></div>
        </div>

        <div class="style-section" id="style-extrusion-field" style="display:${layer.style.extrusion ? 'block' : 'none'}">
          <label>Champ hauteur</label>
          <select id="extrusion-field">
            <option value="">Hauteur fixe</option>
            ${numericFields.map(f => `<option value="${f.name}" ${layer.style.extrusionField === f.name ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="style-dialog-footer">
        <button class="btn btn-secondary" id="style-cancel">Annuler</button>
        <button class="btn btn-primary" id="style-apply">Appliquer</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Events
  dialog.querySelector('.style-dialog-close')?.addEventListener('click', () => dialog.remove());
  dialog.querySelector('#style-cancel')?.addEventListener('click', () => dialog.remove());
  dialog.querySelector('.style-dialog-overlay')?.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.remove();
  });

  dialog.querySelector('#style-type')?.addEventListener('change', (e) => {
    const type = (e.target as HTMLSelectElement).value;
    const fieldSection = dialog.querySelector('#style-field-section') as HTMLElement;
    fieldSection.style.display = type !== 'simple' ? 'block' : 'none';
  });

  dialog.querySelector('#style-extrusion-toggle')?.addEventListener('click', (e) => {
    const toggle = e.target as HTMLElement;
    toggle.classList.toggle('active');
    const extrusionField = dialog.querySelector('#style-extrusion-field') as HTMLElement;
    extrusionField.style.display = toggle.classList.contains('active') ? 'block' : 'none';
  });

  dialog.querySelector('#style-apply')?.addEventListener('click', () => {
    const styleType = (dialog.querySelector('#style-type') as HTMLSelectElement).value;
    const styleField = (dialog.querySelector('#style-field') as HTMLSelectElement).value;
    const styleColor = (dialog.querySelector('#style-color') as HTMLInputElement).value;
    const extrusionEnabled = dialog.querySelector('#style-extrusion-toggle')?.classList.contains('active');
    const extrusionField = (dialog.querySelector('#extrusion-field') as HTMLSelectElement).value;

    if (styleType === 'categorized' && styleField) {
      dataManager!.createCategorizedStyle(layerId, styleField);
    } else if (styleType === 'graduated' && styleField) {
      dataManager!.createGraduatedStyle(layerId, styleField);
    } else {
      dataManager!.updateLayerStyle(layerId, {
        type: 'simple',
        fillColor: styleColor,
        pointColor: styleColor,
        strokeColor: styleColor,
        extrusion: extrusionEnabled,
        extrusionField: extrusionField || undefined,
        extrusionHeight: extrusionField ? undefined : 20
      });
    }

    dialog.remove();
    showToast('Style appliqué', 'success');
  });
}

// Charger les colonnes Grist pour le sélecteur
async function loadGristColumns(): Promise<void> {
  if (typeof grist === 'undefined') return;

  try {
    const tableId = await grist.selectedTable.getTableId();
    const columns = await grist.docApi.fetchTable(tableId);
    const columnNames = Object.keys(columns).filter(c => c !== 'id');

    const select = document.getElementById('grist-geom-column') as HTMLSelectElement;
    if (select) {
      select.innerHTML = '<option value="">Colonne géométrie...</option>' +
        columnNames.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  } catch (e) {
    console.log('Impossible de charger les colonnes Grist');
  }
}

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', init);
