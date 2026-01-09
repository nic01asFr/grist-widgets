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

const STATE: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_SETTINGS }
};

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
  syncManager.start();
  updateSyncUI();

  // Setup event listeners
  setupEventListeners();
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

  // Sync camera
  let ignoreNextCamera = false;

  map.on('move', () => {
    if (syncManager && !ignoreNextCamera) {
      syncManager.sendCamera({
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    }
  });

  // Recevoir les updates de caméra
  syncManager?.setOnCameraChange((camera: CameraState) => {
    ignoreNextCamera = true;
    map.easeTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing
    });
    setTimeout(() => ignoreNextCamera = false, 100);
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

  hideLoading();
  showToast('Carte initialisée', 'success');
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
  return `
    <div class="panel-section">
      <p style="color: var(--text-muted); text-align: center; padding: 20px;">
        📂 Aucune couche<br>
        <span style="font-size: 12px;">Importez des données GeoJSON ou OSM</span>
      </p>
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
    const wasActive = syncManager.isActive();
    if (wasActive) syncManager.stop();

    syncManager = new SyncManager(input.value, {
      ...SyncPresets.peer(),
      role: STATE.sync.role
    });
    STATE.sync.groupId = input.value;

    if (wasActive) syncManager.start();
    showToast(`Groupe changé: ${input.value}`, 'success');
  }
}

function setSyncRole(role: 'master' | 'peer' | 'slave'): void {
  STATE.sync.role = role;
  if (syncManager) {
    const config = role === 'master' ? SyncPresets.master() :
                   role === 'slave' ? SyncPresets.slave() :
                   SyncPresets.peer();

    const wasActive = syncManager.isActive();
    syncManager.stop();

    syncManager = new SyncManager(STATE.sync.groupId, config);

    // Toujours redémarrer après changement de rôle
    syncManager.start();
    updateSyncUI();
  }
  openModule('sync');
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
// START
// ============================================
document.addEventListener('DOMContentLoaded', init);
