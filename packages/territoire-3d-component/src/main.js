/**
 * ════════════════════════════════════════════════════════════
 * TERRITOIRE 3D COMPONENT
 * Widget Grist pour visualisation LiDAR HD IGN (COPC)
 * Multi-vues synchronisées avec paramètres relatifs
 * ════════════════════════════════════════════════════════════
 *
 * Paramètres URL:
 * - channel: groupe de synchronisation
 * - master: true/false (définit le master)
 * - display: classification|elevation|intensity|ortho|rgb
 * - d: coefficient distance (défaut: 1)
 * - rx: rotation élévation (-360/+360, signe = miroir)
 * - ry: rotation azimut (-360/+360, signe = miroir)
 * - ox: offset latéral (mètres)
 * - oy: offset profondeur (mètres)
 * - oz: offset vertical (mètres)
 * - ui: full|minimal|none
 * - url: URL COPC initiale
 */

// CSS import for Vite
import './styles.css';

// Three.js imports
import { Vector3, Color } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

// Giro3D imports - explicit paths required
import Instance from '@giro3d/giro3d/core/Instance.js';
import CoordinateSystem from '@giro3d/giro3d/core/geographic/CoordinateSystem.js';
import PointCloud from '@giro3d/giro3d/entities/PointCloud.js';
import COPCSource from '@giro3d/giro3d/sources/COPCSource.js';
import ColorLayer from '@giro3d/giro3d/core/layer/ColorLayer.js';
import TiledImageSource from '@giro3d/giro3d/sources/TiledImageSource.js';
import Map from '@giro3d/giro3d/entities/Map.js';
import Extent from '@giro3d/giro3d/core/geographic/Extent.js';
import ColorMap from '@giro3d/giro3d/core/ColorMap.js';
import { setLazPerfPath } from '@giro3d/giro3d/sources/las/config.js';

// OpenLayers for tile source
import XYZ from 'ol/source/XYZ.js';

// Sync module
import { MultiViewSync } from './sync.js';

// ════════════════════════════════════════════════════════════
// LAZ-PERF CONFIGURATION
// ════════════════════════════════════════════════════════════
setLazPerfPath('https://cdn.jsdelivr.net/npm/laz-perf@0.0.6/lib');

// ════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════

const PARAMS = new URLSearchParams(location.search);

const CONFIG = {
    display: PARAMS.get('display') || 'classification',
    ui: PARAMS.get('ui') || 'full',
    master: PARAMS.get('master') === 'true',
    channel: PARAMS.get('channel') || 'default',
    initialUrl: PARAMS.get('url') || '',
    crs: 'EPSG:2154',
    proj4def: '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
};

// Classification IGN LiDAR HD
const IGN_CLASSIFICATION = {
    1:  { name: 'Non classifié', color: '#808080' },
    2:  { name: 'Sol', color: '#8B4513' },
    3:  { name: 'Végétation basse', color: '#90EE90' },
    4:  { name: 'Végétation moyenne', color: '#32CD32' },
    5:  { name: 'Végétation haute', color: '#228B22' },
    6:  { name: 'Bâtiment', color: '#CD853F' },
    9:  { name: 'Eau', color: '#4169E1' },
    17: { name: 'Pont', color: '#808080' },
    64: { name: 'Sursol pérenne', color: '#94a770' },
    65: { name: 'Artefacts', color: '#d3ff00' },
    67: { name: 'Points virtuels', color: '#00ff8d' }
};

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════

const state = {
    instance: null,
    pointCloud: null,
    colorLayer: null,
    orthoMap: null,
    controls: null,
    sync: null,
    currentDisplay: CONFIG.display,
    currentUrl: null,
    isGristEnv: false
};

// ════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ════════════════════════════════════════════════════════════

const DOM = {
    view: () => document.getElementById('view'),
    urlInput: () => document.getElementById('url-input'),
    urlLoad: () => document.getElementById('url-load'),
    urlBar: () => document.getElementById('url-bar'),
    modeBadge: () => document.getElementById('mode-badge'),
    syncStatus: () => document.getElementById('sync-status'),
    pointsCount: () => document.getElementById('points-count'),
    controls: () => document.getElementById('controls'),
    displaySelect: () => document.getElementById('display-select'),
    loading: () => document.getElementById('loading'),
    error: () => document.getElementById('error'),
    errorMessage: () => document.getElementById('error-message'),
    errorClose: () => document.getElementById('error-close')
};

// ════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════

async function init() {
    showLoading(true);

    try {
        // Detect Grist environment
        state.isGristEnv = detectGristEnvironment();

        // Initialize sync module
        state.sync = new MultiViewSync();

        // Setup sync callbacks (before Grist init)
        setupSyncCallbacks();

        // Initialize Grist if available
        if (state.isGristEnv) {
            await initGrist();
        }

        // Initialize 3D engine
        await init3D();

        // Initialize UI
        initUI();

        // Load initial URL or get from sync
        await loadInitialData();

    } catch (e) {
        console.error('Initialization error:', e);
        showError('Erreur d\'initialisation: ' + e.message);
    }

    showLoading(false);
}

function detectGristEnvironment() {
    try {
        return typeof grist !== 'undefined' &&
               window.parent !== window &&
               window.frameElement !== null;
    } catch (e) {
        return false;
    }
}

/**
 * Configure les callbacks du module de synchronisation
 */
function setupSyncCallbacks() {
    // Callback: URL changée par le master
    state.sync.onUrlChange = async (url) => {
        if (url && url !== state.currentUrl) {
            console.log('📥 Sync: Chargement URL depuis master:', url);
            DOM.urlInput().value = url;
            await loadPointCloud(url);
        }
    };

    // Callback: Mode d'affichage changé par le master
    state.sync.onDisplayChange = (display) => {
        if (display && display !== state.currentDisplay) {
            console.log('📥 Sync: Mode display depuis master:', display);
            DOM.displaySelect().value = display;
            setDisplayMode(display);
        }
    };

    // Callback: Status sync changé
    state.sync.onStatusChange = updateSyncStatus;
}

async function initGrist() {
    grist.ready({
        requiredAccess: 'full',
        columns: [
            { name: 'COPC_URL', title: 'URL COPC', type: 'Text', optional: true },
            { name: 'url', title: 'URL', type: 'Text', optional: true }
        ]
    });

    // Initialiser la table de sync
    await state.sync.initGrist();

    // Écouter les changements de record (pour le master)
    if (CONFIG.master) {
        grist.onRecord(async (record, mappings) => {
            if (!record) return;

            const mapped = grist.mapColumnNames(record, mappings);
            const url = mapped?.COPC_URL || mapped?.url || record.COPC_URL || record.url;

            if (url && url !== state.currentUrl) {
                DOM.urlInput().value = url;
                await loadPointCloud(url);
            }
        });
    }
}

async function init3D() {
    console.log('🗺️ Initializing Giro3D...');

    // Register Lambert 93
    CoordinateSystem.register(CONFIG.crs, CONFIG.proj4def);
    console.log('✅ CRS registered:', CONFIG.crs);

    // Register EPSG:3857 for orthophoto
    CoordinateSystem.register(
        'EPSG:3857',
        '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
    );

    // Get CRS object (required for Map entity)
    const instanceCrs = CoordinateSystem.get(CONFIG.crs);

    // Create Giro3D instance
    state.instance = new Instance({
        target: DOM.view(),
        crs: instanceCrs,
        renderer: {
            logarithmicDepthBuffer: true
        }
    });

    // Enable post-processing
    state.instance.renderingOptions.enableEDL = true;
    state.instance.renderingOptions.EDLRadius = 0.6;
    state.instance.renderingOptions.EDLStrength = 5;
    state.instance.renderingOptions.enableInpainting = true;
    state.instance.renderingOptions.enablePointCloudOcclusion = true;

    console.log('✅ Giro3D instance created');
}

/**
 * Charge les données initiales (URL param ou état sync)
 */
async function loadInitialData() {
    // Priorité 1: URL dans les paramètres
    if (CONFIG.initialUrl) {
        DOM.urlInput().value = CONFIG.initialUrl;
        await loadPointCloud(CONFIG.initialUrl);
        return;
    }

    // Priorité 2: État initial depuis sync (pour les slaves)
    if (!CONFIG.master) {
        const initialState = await state.sync.getInitialState();
        if (initialState?.url) {
            console.log('📥 Chargement depuis état sync initial');
            DOM.urlInput().value = initialState.url;
            await loadPointCloud(initialState.url);

            // Appliquer aussi le mode d'affichage
            if (initialState.display && initialState.display !== state.currentDisplay) {
                DOM.displaySelect().value = initialState.display;
                setDisplayMode(initialState.display);
            }
        }
    }
}

// ════════════════════════════════════════════════════════════
// POINT CLOUD LOADING
// ════════════════════════════════════════════════════════════

async function loadPointCloud(url) {
    if (!url || !url.trim()) {
        showError('URL vide');
        return;
    }

    if (!url.includes('.copc') && !url.includes('copc')) {
        showError('L\'URL doit pointer vers un fichier COPC (.copc.laz)');
        return;
    }

    showLoading(true);
    hideError();

    try {
        // Clean previous point cloud
        if (state.pointCloud) {
            state.instance.remove(state.pointCloud);
            state.pointCloud = null;
        }

        // Remove ortho if present
        removeOrthoLayer();

        console.log('📦 Loading COPC:', url);

        // Create COPC source
        const source = new COPCSource({ url });

        // Initialize source
        await source.initialize();

        // Get point count
        let pointCount = source.metadata?.pointCount || source.pointCount || 0;

        console.log('📊 COPC metadata:', {
            pointCount,
            crs: source.crs,
            bounds: source.bounds
        });

        // Create point cloud entity
        state.pointCloud = new PointCloud({
            source,
            subdivisionThreshold: 2.5
        });

        // Add to scene
        await state.instance.add(state.pointCloud);

        state.currentUrl = url;

        // Update sync module
        state.sync.setCurrentUrl(url);

        // Setup camera
        await setupCamera();

        // Apply display mode
        setDisplayMode(state.currentDisplay);

        // Update UI
        updatePointsCount(pointCount);

        // Notifier les slaves (si master)
        if (CONFIG.master) {
            state.sync.notifyUrlLoaded(url);
        }

        console.log('✅ COPC loaded successfully');

    } catch (e) {
        console.error('❌ COPC loading error:', e);
        showError('Erreur de chargement: ' + e.message);
    }

    showLoading(false);
}

async function setupCamera() {
    if (!state.pointCloud) return;

    const bbox = state.pointCloud.getBoundingBox();
    if (!bbox || bbox.isEmpty()) {
        console.warn('⚠️ Empty bounding box');
        return;
    }

    const center = new Vector3();
    bbox.getCenter(center);

    const size = new Vector3();
    bbox.getSize(size);

    const camera = state.instance.view.camera;
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.5;

    camera.position.set(
        center.x - distance * 0.5,
        center.y - distance * 0.5,
        center.z + distance
    );

    camera.near = 1;
    camera.far = maxDim * 10;
    camera.updateProjectionMatrix();

    // Setup MapControls
    state.controls = new MapControls(camera, state.instance.domElement);
    state.controls.target.copy(center);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.15;
    state.controls.maxPolarAngle = Math.PI / 2.1;
    state.controls.minDistance = 10;

    state.instance.view.setControls(state.controls);
    state.controls.update();

    // Connect sync module
    if (state.sync) {
        state.sync.connect(state.instance, state.controls);
    }

    console.log('📷 Camera setup complete');
}

// ════════════════════════════════════════════════════════════
// DISPLAY MODES
// ════════════════════════════════════════════════════════════

function setDisplayMode(mode) {
    const previousMode = state.currentDisplay;
    state.currentDisplay = mode;

    // Update sync module
    state.sync.setCurrentDisplay(mode);

    if (!state.pointCloud) return;

    try {
        const pc = state.pointCloud;

        // Cleanup from ortho mode
        if (previousMode === 'ortho' && mode !== 'ortho') {
            if (state.orthoMap) {
                state.instance.remove(state.orthoMap);
                state.orthoMap = null;
            }
            if (state.colorLayer) {
                state.colorLayer = null;
            }
            pc.setColorLayer(null);
            pc.setColoringMode('attribute');
            state.instance.notifyChange(pc);
        }

        switch (mode) {
            case 'classification':
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Classification');
                break;

            case 'rgb':
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Color');
                break;

            case 'ortho':
                loadOrthoColorization();
                return;

            case 'elevation':
                const bbox = pc.getBoundingBox();
                if (bbox && !bbox.isEmpty()) {
                    const minZ = bbox.min.z;
                    const maxZ = bbox.max.z;
                    const colors = createElevationGradient(256);
                    const colorMap = new ColorMap({ colors, min: minZ, max: maxZ });
                    pc.setAttributeColorMap('Z', colorMap);
                }
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Z');
                break;

            case 'intensity':
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Intensity');
                break;
        }

        state.instance.notifyChange(pc);
        updateModeBadge();

        // Notifier les slaves (si master)
        if (CONFIG.master) {
            state.sync.notifyDisplayChange(mode);
        }

    } catch (error) {
        console.warn('⚠️ Error setting display mode:', error.message);
    }
}

function createElevationGradient(steps) {
    const colors = [];
    const gradientStops = [
        { pos: 0, color: new Color('#0000ff') },
        { pos: 0.25, color: new Color('#00ffff') },
        { pos: 0.5, color: new Color('#00ff00') },
        { pos: 0.75, color: new Color('#ffff00') },
        { pos: 1, color: new Color('#ff0000') },
    ];

    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        let stop1 = gradientStops[0];
        let stop2 = gradientStops[gradientStops.length - 1];

        for (let j = 0; j < gradientStops.length - 1; j++) {
            if (t >= gradientStops[j].pos && t <= gradientStops[j + 1].pos) {
                stop1 = gradientStops[j];
                stop2 = gradientStops[j + 1];
                break;
            }
        }

        const localT = (t - stop1.pos) / (stop2.pos - stop1.pos);
        const color = new Color().lerpColors(stop1.color, stop2.color, localT);
        colors.push(color);
    }

    return colors;
}

async function loadOrthoColorization() {
    if (!state.pointCloud) return;

    try {
        const bbox = state.pointCloud.getBoundingBox();
        const crs = CoordinateSystem.get(CONFIG.crs);
        const extent = Extent.fromBox3(crs, bbox);

        // Create Map entity
        state.orthoMap = new Map({ extent });
        state.orthoMap.object3d.position.z = bbox.min.z - 100;
        state.orthoMap.visible = false;

        await state.instance.add(state.orthoMap);

        // Create ColorLayer with ESRI imagery
        state.colorLayer = new ColorLayer({
            extent,
            resolutionFactor: 0.5,
            source: new TiledImageSource({
                source: new XYZ({
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    projection: 'EPSG:3857',
                    crossOrigin: 'anonymous',
                }),
            }),
        });

        await state.orthoMap.addLayer(state.colorLayer);
        state.pointCloud.setColorLayer(state.colorLayer);
        state.pointCloud.setColoringMode('layer');

        state.instance.notifyChange(state.pointCloud);
        updateModeBadge();

        console.log('✅ Ortho colorization applied');

    } catch (error) {
        console.error('❌ Ortho error:', error);
    }
}

function removeOrthoLayer() {
    if (state.orthoMap) {
        state.instance.remove(state.orthoMap);
        state.orthoMap = null;
    }
    state.colorLayer = null;
}

// ════════════════════════════════════════════════════════════
// UI
// ════════════════════════════════════════════════════════════

function initUI() {
    // URL bar events
    DOM.urlLoad().addEventListener('click', () => {
        loadPointCloud(DOM.urlInput().value.trim());
    });

    DOM.urlInput().addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadPointCloud(DOM.urlInput().value.trim());
        }
    });

    // Display mode selector
    DOM.displaySelect().value = CONFIG.display;
    DOM.displaySelect().addEventListener('change', (e) => {
        setDisplayMode(e.target.value);
    });

    // Error close button
    DOM.errorClose().addEventListener('click', hideError);

    // UI visibility
    if (CONFIG.ui === 'minimal') {
        DOM.controls()?.classList.add('hidden');
        DOM.urlBar()?.classList.add('hidden');
    } else if (CONFIG.ui === 'none') {
        document.getElementById('ui-overlay')?.style.setProperty('display', 'none');
    }

    // Hide URL bar for slaves (they get URL from master)
    if (!CONFIG.master && CONFIG.ui !== 'full') {
        DOM.urlBar()?.classList.add('hidden');
    }

    updateModeBadge();
    updateSyncStatus(state.sync.getStatus());
}

const DISPLAY_LABELS = {
    classification: { label: 'Classification', color: '#6366f1' },
    elevation: { label: 'Élévation', color: '#10b981' },
    intensity: { label: 'Intensité', color: '#f59e0b' },
    ortho: { label: 'Orthophoto', color: '#3b82f6' },
    rgb: { label: 'RGB', color: '#ec4899' }
};

function updateModeBadge() {
    const badge = DOM.modeBadge();
    if (!badge) return;

    const config = DISPLAY_LABELS[state.currentDisplay];
    badge.textContent = config.label;
    badge.style.backgroundColor = config.color;
}

function updateSyncStatus(status) {
    const el = DOM.syncStatus();
    if (!status || !el) return;

    if (status.isMaster) {
        el.textContent = `● MASTER [${status.channel}]`;
        el.className = 'master';
    } else {
        el.textContent = `○ SLAVE [${status.channel}]`;
        el.className = 'synced';
    }

    // Afficher les paramètres de vue si non-défaut
    const vp = status.viewParams;
    if (vp && (vp.d !== 1 || vp.rx !== 0 || vp.ry !== 0 || vp.ox !== 0 || vp.oy !== 0 || vp.oz !== 0)) {
        const parts = [];
        if (vp.d !== 1) parts.push(`d:${vp.d}`);
        if (vp.rx !== 0) parts.push(`rx:${status.mirrorX ? '-' : ''}${vp.rx}`);
        if (vp.ry !== 0) parts.push(`ry:${status.mirrorY ? '-' : ''}${vp.ry}`);
        if (vp.ox !== 0) parts.push(`ox:${vp.ox}`);
        if (vp.oy !== 0) parts.push(`oy:${vp.oy}`);
        if (vp.oz !== 0) parts.push(`oz:${vp.oz}`);
        el.textContent += ` ${parts.join(' ')}`;
    }
}

function updatePointsCount(count) {
    const el = DOM.pointsCount();
    if (!el) return;

    if (count > 0) {
        el.textContent = formatNumber(count) + ' pts';
    } else {
        el.textContent = '';
    }
}

function formatNumber(n) {
    return new Intl.NumberFormat('fr-FR').format(n);
}

function showLoading(show) {
    const el = DOM.loading();
    if (!el) return;
    if (show) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function showError(message) {
    const el = DOM.error();
    const msg = DOM.errorMessage();
    if (!el || !msg) return;
    msg.textContent = message;
    el.classList.remove('hidden');
}

function hideError() {
    const el = DOM.error();
    if (el) el.classList.add('hidden');
}

// ════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════

init().catch(console.error);

// Debug export
window.t3d = state;
