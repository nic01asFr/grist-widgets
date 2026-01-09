/**
 * MapCore - Gestion de la carte Mapbox GL JS
 *
 * Responsabilités :
 * - Initialisation de la carte
 * - Terrain 3D
 * - Éclairage avec SunCalc
 * - Configuration du style Standard
 */

import mapboxgl from 'mapbox-gl';
import SunCalc from 'suncalc';
import { MapSettings, MapStyle, AppConfig } from './types';
import { SyncManager, CameraState } from '../sync/SyncManager';

export interface MapCoreOptions {
  container: HTMLElement | string;
  config: AppConfig;
  settings: MapSettings;
  center?: [number, number];
  syncManager?: SyncManager;
}

const MAP_STYLES: Record<MapStyle, string> = {
  'standard': 'mapbox://styles/mapbox/standard',
  'streets': 'mapbox://styles/mapbox/streets-v12',
  'satellite': 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12'
};

export class MapCore {
  private map: mapboxgl.Map | null = null;
  private config: AppConfig;
  private settings: MapSettings;
  private syncManager?: SyncManager;
  private lightingUpdateTimeout: number | null = null;
  private isReady: boolean = false;

  // Callbacks
  private onReadyCallback?: () => void;
  private onMoveCallback?: (camera: CameraState) => void;
  private onClickCallback?: (e: mapboxgl.MapMouseEvent) => void;

  constructor(options: MapCoreOptions) {
    this.config = options.config;
    this.settings = options.settings;
    this.syncManager = options.syncManager;

    this.initMap(options.container, options.center);
  }

  private initMap(container: HTMLElement | string, center?: [number, number]): void {
    if (!this.config.mapbox.token) {
      console.error('❌ Token Mapbox manquant');
      return;
    }

    mapboxgl.accessToken = this.config.mapbox.token;

    const mapCenter = center || this.config.mapbox.defaultCenter;
    const style = MAP_STYLES[this.settings.mapStyle] || MAP_STYLES.standard;

    this.map = new mapboxgl.Map({
      container,
      style,
      center: mapCenter,
      zoom: this.config.mapbox.defaultZoom,
      pitch: this.config.mapbox.defaultPitch,
      bearing: this.config.mapbox.defaultBearing,
      antialias: true
    });

    // Contrôles
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Événements
    this.map.on('load', () => {
      console.log('✅ Carte chargée - attente idle...');
      this.map!.once('idle', () => this.onMapReady());
    });

    this.map.on('moveend', () => this.onMapMove());
    this.map.on('click', (e) => this.onMapClick(e));

    // Sync: écouter les mouvements pour les transmettre
    if (this.syncManager) {
      this.map.on('move', () => {
        if (this.syncManager && !this.syncManager.shouldIgnoreCamera()) {
          this.syncManager.sendCamera(this.getCameraState());
        }
      });
    }
  }

  private onMapReady(): void {
    console.log('✅ Carte idle - configuration');

    if (this.settings.mapStyle === 'standard') {
      this.setupStandardStyle();
    } else {
      this.setupMapLayers();
    }

    this.updateMapSettings();
    this.isReady = true;

    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  private onMapMove(): void {
    // Mettre à jour l'éclairage avec debounce
    if (this.settings.useRealisticSun) {
      if (this.lightingUpdateTimeout) {
        clearTimeout(this.lightingUpdateTimeout);
      }
      this.lightingUpdateTimeout = window.setTimeout(() => {
        this.updateLighting();
      }, 150);
    }

    // Notifier le callback
    if (this.onMoveCallback) {
      this.onMoveCallback(this.getCameraState());
    }
  }

  private onMapClick(e: mapboxgl.MapMouseEvent): void {
    if (this.onClickCallback) {
      this.onClickCallback(e);
    }
  }

  // ============================================
  // CONFIGURATION DU STYLE STANDARD
  // ============================================

  private setupStandardStyle(): void {
    if (!this.map) return;

    try {
      // Appliquer la config 3D
      this.apply3DConfig();

      // Appliquer la config des labels
      this.applyLabelsConfig();

      // Setup terrain et éclairage
      this.setupMapLayers();
    } catch (e) {
      console.warn('Erreur setup Standard style:', e);
    }
  }

  private apply3DConfig(): void {
    if (!this.map || typeof (this.map as any).setConfigProperty !== 'function') return;

    try {
      (this.map as any).setConfigProperty('basemap', 'show3dBuildings', this.settings.show3dBuildings);
      (this.map as any).setConfigProperty('basemap', 'show3dLandmarks', this.settings.show3dLandmarks);
      (this.map as any).setConfigProperty('basemap', 'show3dTrees', this.settings.show3dTrees);
      (this.map as any).setConfigProperty('basemap', 'show3dFacades', this.settings.show3dFacades ?? true);
    } catch (e) {
      console.warn('Erreur config 3D:', e);
    }
  }

  private applyLabelsConfig(): void {
    if (!this.map) return;

    if (this.settings.mapStyle === 'standard' && typeof (this.map as any).setConfigProperty === 'function') {
      try {
        (this.map as any).setConfigProperty('basemap', 'showPointOfInterestLabels', this.settings.showPOI);
        (this.map as any).setConfigProperty('basemap', 'showTransitLabels', this.settings.showTransit);
        (this.map as any).setConfigProperty('basemap', 'showPlaceLabels', this.settings.showPlaceLabels);
        (this.map as any).setConfigProperty('basemap', 'showRoadLabels', this.settings.showRoadLabels);
        (this.map as any).setConfigProperty('basemap', 'showPedestrianRoads', this.settings.showPedestrianRoads);
        (this.map as any).setConfigProperty('basemap', 'showAdminBoundaries', this.settings.showAdminBoundaries);
      } catch (e) {
        console.warn('Erreur config labels:', e);
      }
    }
  }

  // ============================================
  // SETUP DES COUCHES DE BASE
  // ============================================

  private setupMapLayers(): void {
    if (!this.map) return;

    // Ajouter la source de terrain
    if (!this.map.getSource('mapbox-dem')) {
      this.map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
    }

    // Ajouter les bâtiments 3D pour les styles non-Standard
    if (this.settings.mapStyle !== 'standard' && !this.map.getLayer('3d-buildings')) {
      if (this.map.getSource('composite')) {
        this.map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate', ['linear'], ['get', 'height'],
              0, '#d4d4d8',
              50, '#a1a1aa',
              100, '#71717a'
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.85
          }
        });
      }
    }
  }

  // ============================================
  // MISE À JOUR DES PARAMÈTRES
  // ============================================

  updateMapSettings(): void {
    if (!this.map) return;

    // Terrain 3D
    if (this.settings.terrain3D && this.map.getSource('mapbox-dem')) {
      this.map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: this.settings.terrainExaggeration
      });
    } else {
      this.map.setTerrain(null);
    }

    // Bâtiments 3D
    if (this.settings.mapStyle === 'standard') {
      this.apply3DConfig();
    } else if (this.map.getLayer('3d-buildings')) {
      this.map.setLayoutProperty('3d-buildings', 'visibility',
        this.settings.show3dBuildings ? 'visible' : 'none');
    }

    // Brouillard
    if (this.settings.fogEnabled) {
      this.map.setFog({
        'range': [0.5, 10],
        'color': '#dce6f2',
        'horizon-blend': 0.1
      });
    } else {
      this.map.setFog(null);
    }

    // Éclairage
    this.updateLighting();
  }

  updateSettings(newSettings: Partial<MapSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.updateMapSettings();
  }

  // ============================================
  // ÉCLAIRAGE AVEC SUNCALC
  // ============================================

  updateLighting(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    const minutes = this.settings.timeOfDay || 720;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const center = this.map.getCenter();
    if (!center) return;

    const lat = center.lat;
    const lng = center.lng;
    const date = new Date(this.settings.date || new Date());
    date.setHours(hours, mins, 0, 0);

    // Calcul position solaire
    let azimuth = 180;
    let altitude = 45;

    if (this.settings.useRealisticSun) {
      try {
        const sunPos = SunCalc.getPosition(date, lat, lng);
        if (sunPos && !isNaN(sunPos.azimuth) && !isNaN(sunPos.altitude)) {
          azimuth = ((sunPos.azimuth * 180 / Math.PI) + 180) % 360;
          altitude = sunPos.altitude * 180 / Math.PI;
        }
      } catch (e) {
        console.warn('SunCalc error:', e);
      }
    } else {
      // Calcul simplifié
      azimuth = ((hours - 6) / 12) * 180;
      altitude = hours >= 6 && hours <= 18 ? 90 - Math.abs(12 - hours) * 7.5 : 0;
    }

    // Conversion altitude → angle polaire (Mapbox attend l'angle depuis le zénith)
    const polarAngle = Math.max(5, Math.min(85, 90 - altitude));

    // Light preset pour style Standard
    if (this.settings.mapStyle === 'standard' && typeof (this.map as any).setConfigProperty === 'function') {
      try {
        let lightPreset = 'day';
        if (altitude < -6) lightPreset = 'night';
        else if (altitude < 0 || altitude < 15) lightPreset = hours < 12 ? 'dawn' : 'dusk';

        (this.map as any).setConfigProperty('basemap', 'lightPreset', lightPreset);
      } catch (e) {
        console.warn('Light preset error:', e);
      }
    }

    // Couleurs selon l'altitude du soleil
    const shadowsEnabled = this.settings.shadowsEnabled && altitude > 5;
    let sunColor = '#ffffff';
    let sunIntensity = 0.5;
    let ambientColor = '#ffffff';
    let ambientIntensity = 0.35;

    if (altitude < -6) {
      // Nuit
      sunColor = '#1a1a2e';
      sunIntensity = 0.05;
      ambientColor = '#1a1a2e';
      ambientIntensity = 0.1;
    } else if (altitude < 0) {
      // Crépuscule
      sunColor = '#ff6b6b';
      sunIntensity = 0.2;
      ambientColor = '#4a5568';
      ambientIntensity = 0.2;
    } else if (altitude < 10) {
      // Lever/coucher
      sunColor = '#ffb347';
      sunIntensity = 0.4;
      ambientColor = '#fff5eb';
      ambientIntensity = 0.3;
    } else if (altitude < 30) {
      // Matin/soir
      sunColor = '#fff5eb';
      sunIntensity = 0.5;
      ambientColor = '#ffffff';
      ambientIntensity = 0.35;
    } else {
      // Plein jour
      sunColor = '#ffffff';
      sunIntensity = 0.6;
      ambientColor = '#ffffff';
      ambientIntensity = 0.4;
    }

    // Intensité des ombres
    const shadowIntensity = shadowsEnabled ? Math.min(0.9, 0.4 + ((90 - altitude) / 150)) : 0;

    try {
      this.map.setLights([
        {
          id: 'ambient',
          type: 'ambient',
          properties: {
            color: ambientColor,
            intensity: ambientIntensity
          }
        },
        {
          id: 'sun',
          type: 'directional',
          properties: {
            direction: [azimuth, polarAngle],
            color: sunColor,
            intensity: sunIntensity,
            'cast-shadows': shadowsEnabled,
            'shadow-intensity': shadowIntensity
          }
        }
      ]);
    } catch (e) {
      // Fallback
      try {
        this.map.setLights([{
          id: 'main-light',
          type: 'flat',
          properties: {
            color: sunColor,
            intensity: sunIntensity,
            anchor: 'map',
            position: [1.5, azimuth, polarAngle]
          }
        }]);
      } catch (e2) {
        console.warn('Light fallback error:', e2);
      }
    }
  }

  // ============================================
  // CAMÉRA ET NAVIGATION
  // ============================================

  getCameraState(): CameraState {
    if (!this.map) {
      return { center: [0, 0], zoom: 0, pitch: 0, bearing: 0 };
    }

    const center = this.map.getCenter();
    return {
      center: [center.lng, center.lat],
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing()
    };
  }

  setCameraState(camera: CameraState, animate: boolean = true): void {
    if (!this.map) return;

    const options = {
      center: camera.center as [number, number],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing
    };

    if (animate) {
      this.map.easeTo(options);
    } else {
      this.map.jumpTo(options);
    }
  }

  flyTo(center: [number, number], zoom?: number): void {
    if (!this.map) return;

    this.map.flyTo({
      center,
      zoom: zoom || this.map.getZoom()
    });
  }

  fitBounds(bounds: mapboxgl.LngLatBoundsLike, padding: number = 50): void {
    if (!this.map) return;

    this.map.fitBounds(bounds, { padding, maxZoom: 18 });
  }

  // ============================================
  // STYLE
  // ============================================

  setStyle(style: MapStyle): void {
    if (!this.map) return;

    this.settings.mapStyle = style;
    this.map.setStyle(MAP_STYLES[style]);

    this.map.once('idle', () => {
      if (style === 'standard') {
        this.setupStandardStyle();
      } else {
        this.setupMapLayers();
      }
      this.updateMapSettings();
    });
  }

  // ============================================
  // CALLBACKS
  // ============================================

  onReady(callback: () => void): void {
    this.onReadyCallback = callback;
    if (this.isReady) {
      callback();
    }
  }

  onMove(callback: (camera: CameraState) => void): void {
    this.onMoveCallback = callback;
  }

  onClick(callback: (e: mapboxgl.MapMouseEvent) => void): void {
    this.onClickCallback = callback;
  }

  // ============================================
  // SYNC
  // ============================================

  setSyncManager(syncManager: SyncManager): void {
    this.syncManager = syncManager;

    // Écouter les changements de caméra du sync
    syncManager.setOnCameraChange((camera) => {
      this.setCameraState(camera, true);
    });
  }

  // ============================================
  // GETTERS
  // ============================================

  getMap(): mapboxgl.Map | null {
    return this.map;
  }

  getSettings(): MapSettings {
    return this.settings;
  }

  isMapReady(): boolean {
    return this.isReady;
  }

  // ============================================
  // DESTRUCTION
  // ============================================

  destroy(): void {
    if (this.lightingUpdateTimeout) {
      clearTimeout(this.lightingUpdateTimeout);
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.isReady = false;
  }
}

export default MapCore;
