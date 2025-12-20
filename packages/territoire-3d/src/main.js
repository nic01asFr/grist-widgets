// ============================================================
// IMPORTS
// ============================================================
import './styles.css';

import Instance from '@giro3d/giro3d/core/Instance.js';
import CoordinateSystem from '@giro3d/giro3d/core/geographic/CoordinateSystem.js';
import PointCloud from '@giro3d/giro3d/entities/PointCloud.js';
import COPCSource from '@giro3d/giro3d/sources/COPCSource.js';
import ColorLayer from '@giro3d/giro3d/core/layer/ColorLayer.js';
import TiledImageSource from '@giro3d/giro3d/sources/TiledImageSource.js';
import Extent from '@giro3d/giro3d/core/geographic/Extent.js';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { Vector3, Box3 } from 'three';

// OpenLayers for WMS/WMTS sources (static import)
import TileWMS from 'ol/source/TileWMS.js';

// LAZ-PERF WebAssembly path (use jsDelivr for better CORS support)
import { setLazPerfPath } from '@giro3d/giro3d/sources/las/config.js';
setLazPerfPath('https://cdn.jsdelivr.net/npm/laz-perf@0.0.6/lib');

// ============================================================
// NOTE: Fetch throttler DISABLED - it corrupts COPC Range requests
// The 429 errors from IGN are acceptable, data loads correctly
// Future: implement IndexedDB cache at chunk level instead
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    // CRS Lambert 93
    crs: 'EPSG:2154',
    proj4def: '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',

    // Demo COPC (Oslandia Paris dataset)
    demoUrl: 'https://3d.oslandia.com/giro3d/pointclouds/lidarhd/paris/LHD_FXX_0643_6862_PTS_O_LAMB93_IGN69.copc.laz',
    demoName: 'Paris - 0643_6862',

    // WMS IGN Orthophoto
    orthoWms: 'https://data.geopf.fr/wms-r',
    orthoLayer: 'HR.ORTHOIMAGERY.ORTHOPHOTOS',

    // IGN LiDAR HD Classifications
    classifications: {
        1: { name: 'Non classifié', color: '#808080' },
        2: { name: 'Sol', color: '#8B4513' },
        3: { name: 'Végétation basse', color: '#90EE90' },
        4: { name: 'Végétation moyenne', color: '#32CD32' },
        5: { name: 'Végétation haute', color: '#228B22' },
        6: { name: 'Bâtiment', color: '#CD853F' },
        9: { name: 'Eau', color: '#4169E1' },
        17: { name: 'Pont', color: '#808080' },
        64: { name: 'Sursol pérenne', color: '#94a770' },
        65: { name: 'Artefacts', color: '#d3ff00' },
        67: { name: 'Points virtuels', color: '#00ff8d' }
    },

    // Grist tables
    tables: {
        config: 'Config',
        objects: 'Objects',
        models: 'Models_Lib',
        styles: 'Display_Styles'
    }
};

// ============================================================
// STATE
// ============================================================
const state = {
    instance: null,
    pointCloud: null,
    colorLayer: null,
    controls: null,

    // Data
    copcUrl: null,
    tileName: null,
    objects: [],

    // UI
    currentMode: 'navigate',
    currentDisplay: 'classification',
    selectedObject: null,

    // Grist
    gristReady: false,
    gristConfig: null,
    tablesReady: false
};

// ============================================================
// UTILITIES
// ============================================================
function showLoading(text = 'Chargement...', progress = 0) {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingProgress').style.width = `${progress}%`;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function updateProgress(progress) {
    document.getElementById('loadingProgress').style.width = `${Math.round(progress * 100)}%`;
}

function setStatus(type, text) {
    const badge = document.getElementById('statusBadge');
    badge.className = `status-badge ${type}`;
    badge.textContent = text;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function togglePanel(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function closePanel(id) {
    document.getElementById(id).classList.add('hidden');
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

// ============================================================
// GIRO3D INITIALIZATION
// ============================================================
async function initGiro3D() {
    console.log('🗺️ Initializing Giro3D...');

    // Register Lambert 93 (Giro3D 1.0.0 API)
    CoordinateSystem.register(CONFIG.crs, CONFIG.proj4def);
    console.log('✅ CRS registered:', CONFIG.crs);

    // Create instance
    state.instance = new Instance({
        target: 'view',
        crs: CONFIG.crs,
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

// ============================================================
// POINT CLOUD LOADING
// ============================================================
async function loadPointCloud(url, name = 'Dalle') {
    if (!state.instance) {
        await initGiro3D();
    }

    showLoading('Connexion au fichier COPC...', 0);
    setStatus('loading', 'Chargement...');

    try {
        console.log('📥 Loading COPC:', url);

        // Create COPC source
        const source = new COPCSource({ url });

        // Track progress
        source.addEventListener('progress', () => {
            updateProgress(source.progress);
        });

        showLoading('Initialisation du nuage de points...', 10);

        // Initialize source to get metadata
        console.log('🔄 Initializing COPC source...');
        await source.initialize();
        console.log('✅ COPC source initialized');

        // Debug: Log entire source object to see what's available
        console.log('🔍 Source object keys:', Object.keys(source));
        console.log('🔍 Source.metadata:', source.metadata);

        // Safely get point count - try multiple possible locations
        let pointCount = 0;
        if (source.metadata && typeof source.metadata.pointCount === 'number') {
            pointCount = source.metadata.pointCount;
        } else if (typeof source.pointCount === 'number') {
            pointCount = source.pointCount;
        } else if (source.header && typeof source.header.pointCount === 'number') {
            pointCount = source.header.pointCount;
        }

        console.log('📊 COPC metadata:', {
            pointCount,
            crs: source.crs,
            bounds: source.bounds,
            metadata: source.metadata,
            header: source.header
        });

        showLoading('Création du nuage de points...', 30);

        // Create point cloud entity
        // Higher subdivisionThreshold = fewer chunks loaded = fewer requests
        state.pointCloud = new PointCloud({
            source,
            subdivisionThreshold: 2.5  // Reduced detail to limit requests (was 1.5)
        });

        showLoading('Ajout à la scène...', 50);

        // Add to scene
        await state.instance.add(state.pointCloud);

        showLoading('Configuration de la caméra...', 80);

        // Setup camera and controls
        await setupCamera();

        // Update UI
        state.copcUrl = url;
        state.tileName = name;
        document.getElementById('tileName').textContent = name;
        document.getElementById('infoPoints').textContent = formatNumber(pointCount);

        // Populate classification toggles
        populateClassificationToggles();

        // Apply default display mode
        setDisplayMode('classification');

        hideLoading();
        setStatus('ready', `${formatNumber(pointCount)} pts`);
        showToast(`Nuage chargé: ${formatNumber(pointCount)} points`, 'success');

        console.log('✅ Point cloud loaded successfully');

    } catch (error) {
        console.error('❌ Error loading point cloud:', error);
        hideLoading();
        setStatus('error', 'Erreur');
        showToast(`Erreur: ${error.message}`, 'error');
    }
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

    // Position camera
    const camera = state.instance.view.camera;
    camera.position.set(
        center.x - size.x * 0.5,
        center.y - size.y * 0.5,
        center.z + size.z * 2
    );

    // Setup MapControls
    state.controls = new MapControls(camera, state.instance.domElement);
    state.controls.target.copy(center);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.15;
    state.controls.maxPolarAngle = Math.PI / 2.1;

    state.instance.view.setControls(state.controls);

    // Update controls
    state.controls.update();

    console.log('📷 Camera setup complete', { center, size });
}

// ============================================================
// DISPLAY MODES
// ============================================================
function setDisplayMode(mode) {
    state.currentDisplay = mode;

    // Update UI
    document.querySelectorAll('.display-option').forEach(el => {
        el.classList.toggle('active', el.dataset.display === mode);
    });

    if (!state.pointCloud) return;

    try {
        const pc = state.pointCloud;

        switch (mode) {
            case 'classification':
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Classification');
                console.log('🎨 Display mode: classification');
                break;

            case 'rgb':
                // Native RGB colors from LiDAR HD (PDRF 7/8 = RGB)
                // Note: Many IGN LiDAR HD tiles don't have RGB - use orthophoto instead
                pc.setColoringMode('attribute');

                // Check supported attributes first
                const supportedAttrs = pc.getSupportedAttributes ? pc.getSupportedAttributes() : [];
                console.log('🔍 Supported attributes:', supportedAttrs);

                // Look for Color attribute (case-sensitive, Giro3D uses "Color")
                if (supportedAttrs.includes('Color')) {
                    pc.setActiveAttribute('Color');
                    console.log('🎨 Display mode: RGB (using Color attribute)');
                    showToast('Couleurs RGB natives activées', 'success');
                } else {
                    // No RGB available - inform user and suggest orthophoto
                    console.warn('⚠️ RGB attribute not available in this tile');
                    showToast('Pas de RGB natif - utilisez "Orthophoto IGN"', 'warning');
                    // Fall back to classification
                    pc.setActiveAttribute('Classification');
                }
                break;

            case 'ortho':
                loadOrthoColorization();
                return; // loadOrthoColorization handles notifyChange

            case 'elevation':
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Z');
                // Use a bright elevation colormap with proper bounds
                console.log('🎨 Display mode: elevation');
                break;

            case 'intensity':
                pc.setColoringMode('attribute');
                pc.setActiveAttribute('Intensity');
                console.log('🎨 Display mode: intensity');
                break;
        }

        state.instance.notifyChange();
    } catch (error) {
        console.warn('⚠️ Error setting display mode:', error.message);
    }
}

async function loadOrthoColorization() {
    if (!state.pointCloud) return;

    showToast('Chargement de l\'orthophoto IGN...', 'info');

    try {
        // Get extent from point cloud in Lambert 93
        const bbox = state.pointCloud.getBoundingBox();
        const extent = new Extent(
            CONFIG.crs,
            bbox.min.x, bbox.max.x,
            bbox.min.y, bbox.max.y
        );

        console.log('📷 Loading ortho for extent:', extent);

        // IGN Geoplateforme WMS-R service in Lambert 93
        // HR.ORTHOIMAGERY.ORTHOPHOTOS = ortho 20cm, ORTHOIMAGERY.ORTHOPHOTOS.BDORTHO = standard
        const orthoSource = new TiledImageSource({
            source: new TileWMS({
                url: 'https://data.geopf.fr/wms-r',
                projection: CONFIG.crs,
                params: {
                    LAYERS: 'HR.ORTHOIMAGERY.ORTHOPHOTOS',
                    FORMAT: 'image/jpeg',
                    CRS: CONFIG.crs,
                    VERSION: '1.3.0'
                },
                crossOrigin: 'anonymous'
            }),
            crs: CONFIG.crs
        });

        state.colorLayer = new ColorLayer({
            name: 'ortho_ign',
            source: orthoSource,
            extent
        });

        state.pointCloud.setColorLayer(state.colorLayer);
        state.pointCloud.setColoringMode('layer');
        state.instance.notifyChange();

        console.log('✅ Orthophoto layer applied');
        showToast('Orthophoto IGN appliquée', 'success');

    } catch (error) {
        console.error('❌ Error loading orthophoto:', error);
        showToast('Erreur orthophoto: ' + error.message, 'error');
    }
}

function populateClassificationToggles() {
    const container = document.getElementById('classToggles');
    container.innerHTML = '';

    for (const [code, info] of Object.entries(CONFIG.classifications)) {
        const toggle = document.createElement('label');
        toggle.className = 'class-toggle';
        toggle.innerHTML = `
            <input type="checkbox" checked data-class="${code}">
            <div class="class-color" style="background:${info.color}"></div>
            <span class="class-name">${info.name}</span>
            <span class="class-code">${code}</span>
        `;

        toggle.querySelector('input').addEventListener('change', (e) => {
            updateClassificationVisibility();
        });

        container.appendChild(toggle);
    }
}

function updateClassificationVisibility() {
    if (!state.pointCloud) return;

    // Giro3D 1.0.0: Use pointCloudClassifications array
    const classifications = state.pointCloud.pointCloudClassifications;
    if (!classifications) {
        console.warn('⚠️ pointCloudClassifications not available');
        return;
    }

    // Get checked classes
    const checkedClasses = new Set();
    document.querySelectorAll('#classToggles input:checked').forEach(input => {
        checkedClasses.add(parseInt(input.dataset.class));
    });

    // Update visibility for each classification
    for (let i = 0; i < classifications.length; i++) {
        if (classifications[i]) {
            classifications[i].visible = checkedClasses.has(i);
        }
    }

    state.instance.notifyChange();
}

// ============================================================
// GRIST INTEGRATION
// ============================================================
async function initGrist() {
    if (typeof grist === 'undefined') {
        console.log('ℹ️ Grist not available, standalone mode');
        return false;
    }

    try {
        await grist.ready({
            requiredAccess: 'full',
            allowSelectBy: true,
            columns: [
                { name: 'CopcUrl', type: 'Text', optional: true },
                { name: 'TileName', type: 'Text', optional: true }
            ]
        });

        state.gristReady = true;
        console.log('✅ Grist connected');

        // Create tables first (blocking) - required before reading config
        try {
            await createGristTables();
            console.log('✅ Tables ready');
        } catch (e) {
            console.warn('⚠️ Table creation:', e.message);
        }

        // Listen for record selection
        grist.onRecord(handleGristRecord);
        grist.onRecords(handleGristRecords);

        // Try to load config from table
        await loadConfigFromGrist();

        return true;

    } catch (error) {
        console.warn('⚠️ Grist init error:', error);
        return false;
    }
}

async function loadConfigFromGrist() {
    if (!state.gristReady) return;

    // Load config from Config table (primary source)
    try {
        const data = await grist.docApi.fetchTable(CONFIG.tables.config);
        console.log('📋 Config table data:', data);

        if (data.id && data.id.length > 0) {
            const config = {
                copcUrl: data.CopcUrl?.[0],
                tileName: data.TileName?.[0] || data.Name?.[0],
                tileRef: data.TileRef?.[0],
                source: data.Source?.[0],
                bboxMinX: data.Bbox_MinX?.[0],
                bboxMinY: data.Bbox_MinY?.[0],
                bboxMaxX: data.Bbox_MaxX?.[0],
                bboxMaxY: data.Bbox_MaxY?.[0]
            };

            if (config.copcUrl) {
                console.log('📋 Config loaded from Grist table:', config);
                state.gristConfig = config;

                // Pre-fill setup form (in case user wants to reconfigure)
                if (config.tileRef) {
                    document.getElementById('setupTileRef').value = config.tileRef;
                }
                if (config.tileName) {
                    document.getElementById('setupTileName').value = config.tileName;
                }
                if (config.source) {
                    document.getElementById('setupSource').value = config.source;
                }

                // Auto-load point cloud
                document.getElementById('setupOverlay').classList.add('hidden');
                await loadPointCloud(config.copcUrl, config.tileName || 'Dalle');
            }
        }
    } catch (error) {
        console.log('ℹ️ Config table not found or empty:', error.message);
    }

    // Try to load Objects table
    try {
        await loadObjectsFromGrist();
    } catch (error) {
        console.log('ℹ️ Objects table not found or empty');
    }
}

// ============================================================
// AUTO-CONFIGURATION
// ============================================================

// Helper: wrap RPC call with timeout to avoid hanging
async function withTimeout(promise, ms, fallback) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
    );
    try {
        return await Promise.race([promise, timeout]);
    } catch (error) {
        if (error.message === 'Timeout') {
            console.warn(`⚠️ RPC timeout after ${ms}ms, continuing...`);
            return fallback;
        }
        throw error;
    }
}

// Check if table exists, create if not
// Strategy: Try to create directly, catch "already exists" error
async function ensureTableExists(tableName, schema) {
    console.log(`🔍 Ensuring table ${tableName} exists...`);

    try {
        // Directly try to create the table
        // If it already exists, Grist will throw an error
        await grist.docApi.applyUserActions([
            ['AddTable', tableName, schema]
        ]);
        console.log(`✅ Table ${tableName} created`);
        return { created: true };
    } catch (error) {
        const errorMsg = error?.message || String(error);

        // Check if error indicates table already exists
        if (errorMsg.includes('already exists') ||
            errorMsg.includes('duplicate') ||
            errorMsg.includes('Table') && errorMsg.includes('exists')) {
            console.log(`ℹ️ Table ${tableName} already exists`);
            return { created: false, exists: true };
        }

        // For other errors, log but continue
        console.warn(`⚠️ Table ${tableName} error:`, errorMsg);
        return { created: false, error: errorMsg };
    }
}

// Table schemas
const TABLE_SCHEMAS = {
    [CONFIG.tables.config]: [
        { id: 'TileName', type: 'Text' },
        { id: 'TileRef', type: 'Text' },
        { id: 'CopcUrl', type: 'Text' },
        { id: 'Bbox_MinX', type: 'Numeric' },
        { id: 'Bbox_MinY', type: 'Numeric' },
        { id: 'Bbox_MaxX', type: 'Numeric' },
        { id: 'Bbox_MaxY', type: 'Numeric' },
        { id: 'PointCount', type: 'Int' },
        { id: 'Source', type: 'Text' },
        { id: 'CreatedAt', type: 'DateTime' }
    ],
    [CONFIG.tables.objects]: [
        { id: 'Name', type: 'Text' },
        { id: 'Type', type: 'Text' },
        { id: 'Category', type: 'Choice' },
        { id: 'X', type: 'Numeric' },
        { id: 'Y', type: 'Numeric' },
        { id: 'Z', type: 'Numeric' },
        { id: 'Status', type: 'Choice' },
        { id: 'SourceBD', type: 'Text' },
        { id: 'OsmId', type: 'Text' },
        { id: 'Lon', type: 'Numeric' },
        { id: 'Lat', type: 'Numeric' }
    ]
};

async function createGristTables() {
    // Skip if already done
    if (state.tablesReady) {
        console.log('✅ Tables already ready (cached)');
        return true;
    }

    if (!state.gristReady) {
        console.log('⚠️ createGristTables: Grist not ready');
        return false;
    }

    const startTime = performance.now();

    // First, check which tables already exist by trying to fetch them
    const tablesToCreate = [];

    for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
        try {
            await grist.docApi.fetchTable(tableName);
            console.log(`ℹ️ Table ${tableName} already exists`);
        } catch (e) {
            // Table doesn't exist, needs to be created
            tablesToCreate.push(['AddTable', tableName, schema]);
        }
    }

    // If all tables exist, we're done
    if (tablesToCreate.length === 0) {
        state.tablesReady = true;
        const elapsed = Math.round(performance.now() - startTime);
        console.log(`✅ All tables already exist (${elapsed}ms)`);
        return true;
    }

    // Create only missing tables
    console.log(`📊 Creating ${tablesToCreate.length} missing table(s)...`);

    try {
        await grist.docApi.applyUserActions(tablesToCreate);
        state.tablesReady = true;
        const elapsed = Math.round(performance.now() - startTime);
        console.log(`✅ Tables created in ${elapsed}ms`);
        return true;

    } catch (error) {
        const errorMsg = error?.message || String(error);

        // If tables already exist (race condition), that's fine
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
            state.tablesReady = true;
            console.log(`ℹ️ Tables already exist (race condition handled)`);
            return true;
        }

        console.error('❌ Error creating tables:', errorMsg);
        throw error;
    }
}

async function saveConfigToGrist(config) {
    if (!state.gristReady) return;

    try {
        // Use fetchTable to check if table exists and get existing data
        let existing;
        try {
            existing = await grist.docApi.fetchTable(CONFIG.tables.config);
        } catch (e) {
            console.log('ℹ️ Config table not found, skipping save');
            return;
        }

        if (existing.id && existing.id.length > 0) {
            // Update existing
            console.log('📝 Updating existing config record...');
            await grist.docApi.applyUserActions([
                ['UpdateRecord', CONFIG.tables.config, existing.id[0], {
                    TileName: config.tileName,
                    TileRef: config.tileRef,
                    CopcUrl: config.copcUrl,
                    Bbox_MinX: config.bboxMinX,
                    Bbox_MinY: config.bboxMinY,
                    Bbox_MaxX: config.bboxMaxX,
                    Bbox_MaxY: config.bboxMaxY,
                    PointCount: config.pointCount,
                    Source: config.source
                }]
            ]);
        } else {
            // Create new
            console.log('📝 Creating new config record...');
            await grist.docApi.applyUserActions([
                ['AddRecord', CONFIG.tables.config, null, {
                    TileName: config.tileName,
                    TileRef: config.tileRef,
                    CopcUrl: config.copcUrl,
                    Bbox_MinX: config.bboxMinX,
                    Bbox_MinY: config.bboxMinY,
                    Bbox_MaxX: config.bboxMaxX,
                    Bbox_MaxY: config.bboxMaxY,
                    PointCount: config.pointCount,
                    Source: config.source,
                    CreatedAt: Math.floor(Date.now() / 1000) // Grist DateTime = seconds
                }]
            ]);
        }

        console.log('✅ Config saved to Grist');

    } catch (error) {
        console.error('❌ Error saving config:', error);
    }
}

// ============================================================
// OSM IMPORT
// ============================================================
async function importFromOSM(bbox) {
    // bbox: { minX, minY, maxX, maxY } in Lambert 93
    // Need to convert to WGS84 for Overpass

    showToast('Import OSM en cours...', 'info');

    try {
        // Convert Lambert 93 bbox to WGS84 (approximate)
        const wgs84Bbox = lambert93ToWGS84Bbox(bbox);

        // Overpass query for urban furniture
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="bench"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
                node["amenity"="waste_basket"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
                node["highway"="street_lamp"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
                node["highway"="traffic_signals"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
                node["natural"="tree"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
                node["amenity"="shelter"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
                node["tourism"="information"](${wgs84Bbox.south},${wgs84Bbox.west},${wgs84Bbox.north},${wgs84Bbox.east});
            );
            out body;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) throw new Error('Overpass API error');

        const data = await response.json();
        const elements = data.elements || [];

        console.log(`📥 OSM: ${elements.length} éléments trouvés`);

        if (elements.length === 0) {
            showToast('Aucun objet OSM trouvé dans cette zone', 'warning');
            return [];
        }

        // Convert to objects and save to Grist
        const objects = elements.map(el => {
            const lambert = wgs84ToLambert93(el.lon, el.lat);
            return {
                name: el.tags?.name || getOSMTypeName(el.tags),
                type: getOSMType(el.tags),
                category: getOSMCategory(el.tags),
                x: lambert.x,
                y: lambert.y,
                z: 0,
                status: 'Importé',
                sourceBD: 'OSM',
                osmId: `node/${el.id}`,
                lon: el.lon,
                lat: el.lat
            };
        });

        // Save to Grist
        if (state.gristReady && objects.length > 0) {
            await saveObjectsToGrist(objects);
        }

        showToast(`${objects.length} objets importés depuis OSM`, 'success');
        return objects;

    } catch (error) {
        console.error('❌ OSM import error:', error);
        showToast('Erreur import OSM: ' + error.message, 'error');
        return [];
    }
}

async function saveObjectsToGrist(objects) {
    if (!state.gristReady || objects.length === 0) return;

    try {
        const actions = objects.map(obj => [
            'AddRecord', CONFIG.tables.objects, null, {
                Name: obj.name,
                Type: obj.type,
                Category: obj.category,
                X: obj.x,
                Y: obj.y,
                Z: obj.z,
                Status: obj.status,
                SourceBD: obj.sourceBD,
                OsmId: obj.osmId || '',
                Lon: obj.lon || 0,
                Lat: obj.lat || 0
            }
        ]);

        await grist.docApi.applyUserActions(actions);
        console.log(`✅ ${objects.length} objects saved to Grist`);

    } catch (error) {
        console.error('❌ Error saving objects:', error);
    }
}

// Coordinate conversion helpers (approximate)
function lambert93ToWGS84Bbox(bbox) {
    // Simplified conversion for France
    // More accurate would use proj4
    const toWGS84 = (x, y) => ({
        lon: (x - 700000) / 111320 / Math.cos(46.5 * Math.PI / 180) + 3,
        lat: (y - 6600000) / 111320 + 46.5
    });

    const sw = toWGS84(bbox.minX, bbox.minY);
    const ne = toWGS84(bbox.maxX, bbox.maxY);

    return {
        west: sw.lon,
        south: sw.lat,
        east: ne.lon,
        north: ne.lat
    };
}

function wgs84ToLambert93(lon, lat) {
    // Simplified inverse conversion
    return {
        x: (lon - 3) * 111320 * Math.cos(46.5 * Math.PI / 180) + 700000,
        y: (lat - 46.5) * 111320 + 6600000
    };
}

function getOSMType(tags) {
    if (tags?.amenity === 'bench') return 'banc';
    if (tags?.amenity === 'waste_basket') return 'poubelle';
    if (tags?.highway === 'street_lamp') return 'lampadaire';
    if (tags?.highway === 'traffic_signals') return 'feu_tricolore';
    if (tags?.natural === 'tree') return 'arbre';
    if (tags?.amenity === 'shelter') return 'abribus';
    if (tags?.tourism === 'information') return 'panneau';
    return 'autre';
}

function getOSMTypeName(tags) {
    const typeNames = {
        'banc': 'Banc',
        'poubelle': 'Corbeille',
        'lampadaire': 'Lampadaire',
        'feu_tricolore': 'Feu tricolore',
        'arbre': 'Arbre',
        'abribus': 'Abribus',
        'panneau': 'Panneau info'
    };
    return typeNames[getOSMType(tags)] || 'Objet';
}

function getOSMCategory(tags) {
    if (tags?.natural === 'tree') return 'Végétation';
    if (tags?.highway) return 'Voirie';
    return 'Mobilier urbain';
}

// ============================================================
// TILE URL BUILDER & IGN WFS INTEGRATION
// ============================================================

// IGN Géoplateforme WFS configuration
const IGN_WFS = {
    url: 'https://data.geopf.fr/wfs/ows',
    layer: 'IGNF_NUAGES-DE-POINTS-LIDAR-HD:dalle',
    // Fallback storage URLs
    ovhStorage: 'https://storage.sbg.cloud.ovh.net/v1/AUTH_63234f509d6048bca3c9fd7928720ca1/ppk-lidar'
};

// Query IGN WFS to find COPC URL for a specific tile
async function queryIGNWfsForTile(tileRef) {
    const match = tileRef.match(/^(\d{4})_(\d{4})$/);
    if (!match) return null;

    const [, xKm, yKm] = match;
    const x = parseInt(xKm) * 1000;
    const y = parseInt(yKm) * 1000;

    // Build WFS GetFeature request with BBOX filter
    const bbox = `${x},${y},${x + 1000},${y + 1000},EPSG:2154`;

    const wfsUrl = `${IGN_WFS.url}?` + new URLSearchParams({
        SERVICE: 'WFS',
        VERSION: '2.0.0',
        REQUEST: 'GetFeature',
        TYPENAMES: IGN_WFS.layer,
        OUTPUTFORMAT: 'application/json',
        SRSNAME: 'EPSG:2154',
        BBOX: bbox
    });

    console.log('🔍 Querying IGN WFS for tile:', tileRef);

    try {
        const response = await fetch(wfsUrl);
        if (!response.ok) {
            throw new Error(`WFS error: ${response.status}`);
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
            // Find the exact tile matching our reference
            const feature = data.features.find(f => {
                const name = f.properties?.nom || f.properties?.name || '';
                return name.includes(`${xKm}_${yKm}`);
            }) || data.features[0];

            // Extract COPC URL from feature properties
            const copcUrl = feature.properties?.url ||
                           feature.properties?.url_telechargement ||
                           feature.properties?.lien_telechargement;

            if (copcUrl) {
                console.log('✅ Found COPC URL via WFS:', copcUrl);
                return {
                    url: copcUrl,
                    properties: feature.properties,
                    geometry: feature.geometry
                };
            }
        }

        console.log('⚠️ No COPC URL found in WFS response');
        return null;

    } catch (error) {
        console.warn('⚠️ WFS query failed:', error.message);
        return null;
    }
}

// Build COPC URL with multiple fallback strategies
async function buildCopcUrl(tileRef, source) {
    const match = tileRef.match(/^(\d{4})_(\d{4})$/);
    if (!match) return null;

    const [, x, y] = match;

    switch (source) {
        case 'oslandia':
            // Oslandia Paris tiles
            return `https://3d.oslandia.com/giro3d/pointclouds/lidarhd/paris/LHD_FXX_${x}_${y}_PTS_O_LAMB93_IGN69.copc.laz`;

        case 'ign':
            // Try WFS query first
            const wfsResult = await queryIGNWfsForTile(tileRef);
            if (wfsResult?.url) {
                return wfsResult.url;
            }

            // Fallback: try direct OVH storage URL pattern
            // The block code (2 letters) is derived from tile position
            // This is a heuristic - real block codes vary by region
            const blockCodes = getBlockCodeForTile(x, y);
            for (const blockCode of blockCodes) {
                const url = `${IGN_WFS.ovhStorage}/${blockCode}/LHD_FXX_${x}_${y}_PTS_O_LAMB93_IGN69.copc.laz`;
                if (await checkUrlExists(url)) {
                    return url;
                }
            }

            // Final fallback: new Géoplateforme URL pattern
            return `https://data.geopf.fr/telechargement/download/LiDARHD-NUALID/NUALHD_1-0__LAZ_LAMB93_D077/LHD_FXX_${x}_${y}_PTS_LAMB93_IGN69.copc.laz`;

        case 'custom':
            return null; // User will provide URL

        default:
            return null;
    }
}

// Check if URL exists (HEAD request)
async function checkUrlExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

// Heuristic to guess block codes for a tile
function getBlockCodeForTile(xKm, yKm) {
    // Known block codes and their approximate regions
    // This is a simplified mapping - real data would come from WFS
    const x = parseInt(xKm);
    const y = parseInt(yKm);

    const blockMap = [
        // Paris region
        { minX: 600, maxX: 700, minY: 6800, maxY: 6900, codes: ['FP', 'FQ'] },
        // Millau region
        { minX: 650, maxX: 750, minY: 6300, maxY: 6400, codes: ['LP'] },
        // La Rochelle region
        { minX: 350, maxX: 420, minY: 6500, maxY: 6600, codes: ['FK'] },
        // Bordeaux region
        { minX: 380, maxX: 450, minY: 6400, maxY: 6500, codes: ['GK', 'GL'] },
        // Lyon region
        { minX: 800, maxX: 880, minY: 6500, maxY: 6600, codes: ['NO', 'NP'] },
        // Rennes region
        { minX: 300, maxX: 380, minY: 6780, maxY: 6850, codes: ['DP', 'DQ'] }
    ];

    for (const region of blockMap) {
        if (x >= region.minX && x <= region.maxX &&
            y >= region.minY && y <= region.maxY) {
            return region.codes;
        }
    }

    // Default: try common codes
    return ['D077', 'FP', 'FK', 'LP'];
}

function getTileBbox(tileRef) {
    // Tile ref is in km, each tile is 1km x 1km
    const match = tileRef.match(/^(\d{4})_(\d{4})$/);
    if (!match) return null;

    const x = parseInt(match[1]) * 1000; // Convert km to m
    const y = parseInt(match[2]) * 1000;

    return {
        minX: x,
        minY: y,
        maxX: x + 1000,
        maxY: y + 1000
    };
}

// Get list of available tiles from IGN WFS
async function getAvailableTilesInBbox(bbox) {
    const wfsUrl = `${IGN_WFS.url}?` + new URLSearchParams({
        SERVICE: 'WFS',
        VERSION: '2.0.0',
        REQUEST: 'GetFeature',
        TYPENAMES: IGN_WFS.layer,
        OUTPUTFORMAT: 'application/json',
        SRSNAME: 'EPSG:2154',
        BBOX: `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY},EPSG:2154`,
        COUNT: '100'
    });

    try {
        const response = await fetch(wfsUrl);
        if (!response.ok) return [];

        const data = await response.json();
        return (data.features || []).map(f => ({
            name: f.properties?.nom || 'Dalle',
            url: f.properties?.url || f.properties?.url_telechargement,
            bbox: f.bbox,
            properties: f.properties
        }));

    } catch (error) {
        console.warn('⚠️ Failed to get available tiles:', error);
        return [];
    }
}

async function loadObjectsFromGrist() {
    if (!state.gristReady) return;

    try {
        // Use fetchTable directly - it will throw if table doesn't exist
        const data = await grist.docApi.fetchTable(CONFIG.tables.objects);

        if (!data.id || data.id.length === 0) {
            state.objects = [];
            updateObjectsList();
            return;
        }

        state.objects = [];
        for (let i = 0; i < data.id.length; i++) {
            if (data.X?.[i] != null && data.Y?.[i] != null) {
                state.objects.push({
                    id: data.id[i],
                    name: data.Name?.[i] || `Objet ${data.id[i]}`,
                    type: data.Type?.[i] || 'inconnu',
                    category: data.Category?.[i] || 'Autre',
                    x: data.X[i],
                    y: data.Y[i],
                    z: data.Z?.[i] || 0,
                    status: data.Status?.[i] || 'Importé',
                    sourceBD: data.SourceBD?.[i] || 'Manuel'
                });
            }
        }

        console.log(`📦 ${state.objects.length} objects loaded from Grist`);
        updateObjectsList();
        document.getElementById('infoObjects').textContent = state.objects.length;

    } catch (error) {
        // Table doesn't exist or other error - just log and continue
        console.log('ℹ️ Objects table not available:', error.message);
        state.objects = [];
        updateObjectsList();
    }
}

function handleGristRecord(record) {
    if (!record) return;

    // If record has CopcUrl, it's a config record
    if (record.CopcUrl) {
        loadPointCloud(record.CopcUrl, record.TileName || record.Name || 'Dalle');
    }

    // If record is an object, select it
    if (record.X != null && record.Y != null) {
        selectObject(record.id);
    }
}

function handleGristRecords(records) {
    // Reload objects when data changes
    loadObjectsFromGrist();
}

// ============================================================
// OBJECTS MANAGEMENT
// ============================================================
function updateObjectsList() {
    const container = document.getElementById('objectList');
    const countEl = document.getElementById('objectCount');

    countEl.textContent = state.objects.length;
    document.getElementById('statTotal').textContent = state.objects.length;
    document.getElementById('statVerified').textContent =
        state.objects.filter(o => o.status === 'Vérifié').length;

    if (state.objects.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:11px;">
                Aucun objet<br>
                <small>Utilisez "Importer" pour ajouter des objets</small>
            </div>
        `;
        return;
    }

    container.innerHTML = state.objects.map(obj => `
        <div class="object-item ${state.selectedObject?.id === obj.id ? 'selected' : ''}"
             data-id="${obj.id}">
            <div class="object-icon">${getObjectIcon(obj.type)}</div>
            <div class="object-info">
                <div class="object-name">${obj.name}</div>
                <div class="object-meta">${obj.type} • ${obj.sourceBD}</div>
            </div>
            <span class="object-status ${obj.status.toLowerCase()}">${obj.status}</span>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.object-item').forEach(el => {
        el.addEventListener('click', () => {
            selectObject(parseInt(el.dataset.id));
        });
    });
}

function getObjectIcon(type) {
    const icons = {
        'lampadaire': '💡',
        'arbre': '🌳',
        'banc': '🪑',
        'poubelle': '🗑️',
        'feu_tricolore': '🚦',
        'abribus': '🚏',
        'panneau': '🪧',
        'borne': '🔌',
        'batiment': '🏢'
    };
    return icons[type?.toLowerCase()] || '📦';
}

function selectObject(objectId) {
    state.selectedObject = state.objects.find(o => o.id === objectId);
    updateObjectsList();

    if (state.selectedObject && state.instance) {
        // Pan to object location
        const { x, y, z } = state.selectedObject;
        state.controls.target.set(x, y, z);
        state.instance.view.camera.position.set(x - 50, y - 50, z + 100);
        state.controls.update();
        state.instance.notifyChange();
    }

    // Sync with Grist
    if (state.gristReady && objectId) {
        grist.setCursorPos({ rowId: objectId }).catch(() => {});
    }
}

// ============================================================
// EVENT HANDLERS
// ============================================================
function setupEventListeners() {
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentMode = btn.dataset.mode;
        });
    });

    // Panel toggles
    document.getElementById('btnDisplay').addEventListener('click', () => togglePanel('displayPanel'));
    document.getElementById('btnObjects').addEventListener('click', () => togglePanel('objectsPanel'));
    document.getElementById('btnImport').addEventListener('click', () => {
        document.getElementById('importModal').classList.remove('hidden');
    });

    // Fit to view
    document.getElementById('btnFit').addEventListener('click', () => {
        if (state.pointCloud) {
            setupCamera();
            showToast('Vue ajustée', 'success');
        }
    });

    // Close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.close;
            if (target.includes('Modal')) {
                document.getElementById(target).classList.add('hidden');
            } else {
                closePanel(target);
            }
        });
    });

    // Display mode options
    document.querySelectorAll('.display-option').forEach(el => {
        el.addEventListener('click', () => {
            setDisplayMode(el.dataset.display);
        });
    });

    // Point size slider
    document.getElementById('pointSizeSlider').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('pointSizeValue').textContent = value;
        if (state.pointCloud) {
            state.pointCloud.setPointSize(value);
            state.instance.notifyChange();
        }
    });

    // Point budget slider
    document.getElementById('pointBudgetSlider').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        document.getElementById('pointBudgetValue').textContent = value;
    });

    // EDL toggle
    document.getElementById('edlToggle').addEventListener('change', (e) => {
        if (state.instance) {
            state.instance.renderingOptions.enableEDL = e.target.checked;
            state.instance.notifyChange();
        }
    });

    // Setup tabs
    document.querySelectorAll('.setup-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.setup-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab === 'reference' ? 'tabReference' : 'tabUrl';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Main setup button - FULL AUTO-CONFIGURATION
    document.getElementById('btnSetup').addEventListener('click', runFullSetup);

    // Demo button
    document.getElementById('btnDemo').addEventListener('click', () => {
        document.getElementById('setupTileRef').value = '0643_6862';
        document.getElementById('setupTileName').value = 'Paris Centre';
        document.getElementById('setupSource').value = 'oslandia';
        runFullSetup();
    });

    // Import options
    document.getElementById('importBdTopo').addEventListener('click', async () => {
        if (!state.gristConfig?.bboxMinX) {
            showToast('Chargez d\'abord une dalle', 'warning');
            return;
        }
        showToast('Import BD TOPO en développement...', 'info');
        // TODO: Implement BD TOPO WFS import
    });

    document.getElementById('importOsm').addEventListener('click', async () => {
        if (!state.gristConfig) {
            showToast('Chargez d\'abord une dalle', 'warning');
            return;
        }
        document.getElementById('importModal').classList.add('hidden');
        const bbox = {
            minX: state.gristConfig.bboxMinX,
            minY: state.gristConfig.bboxMinY,
            maxX: state.gristConfig.bboxMaxX,
            maxY: state.gristConfig.bboxMaxY
        };
        await importFromOSM(bbox);
        await loadObjectsFromGrist();
    });

    document.getElementById('importGeojson').addEventListener('click', () => {
        // Create hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.geojson,.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const geojson = JSON.parse(text);
                await importFromGeoJSON(geojson);
            } catch (err) {
                showToast('Erreur lecture GeoJSON: ' + err.message, 'error');
            }
        };
        input.click();
        document.getElementById('importModal').classList.add('hidden');
    });
}

// ============================================================
// FULL AUTO-SETUP WORKFLOW
// ============================================================
async function runFullSetup() {
    console.log('🚀 Starting full setup...');

    const statusEl = document.getElementById('setupStatus');
    const statusCopc = document.getElementById('statusCopc');
    const statusImport = document.getElementById('statusImport');

    // Reset all status icons to waiting state
    [statusCopc, statusImport].forEach(el => {
        el.classList.remove('active', 'done', 'error');
        el.querySelector('.status-icon').textContent = '○';
    });

    // Get form values
    const activeTab = document.querySelector('.setup-tab.active')?.dataset.tab;
    let copcUrl, tileRef, tileName, source;

    if (activeTab === 'url') {
        copcUrl = document.getElementById('setupCopcUrl').value.trim();
        tileName = document.getElementById('setupTileName').value.trim() || 'Dalle';
        tileRef = '';
        source = 'custom';
    } else {
        tileRef = document.getElementById('setupTileRef').value.trim();
        source = document.getElementById('setupSource').value;
        tileName = document.getElementById('setupTileName').value.trim() || `Dalle ${tileRef}`;

        // Validate tile reference format
        if (!tileRef.match(/^\d{4}_\d{4}$/)) {
            showToast('Format invalide. Utilisez XXXX_YYYY (ex: 0643_6862)', 'warning');
            return;
        }

        // Show searching message for IGN source
        if (source === 'ign') {
            showToast('Recherche de la dalle sur IGN Géoplateforme...', 'info');
        }

        // Build URL (async for IGN WFS query)
        copcUrl = await buildCopcUrl(tileRef, source);
    }

    const autoImport = document.getElementById('setupAutoImport').checked;

    console.log('📋 Setup config:', { copcUrl, tileRef, tileName, source, autoImport, gristReady: state.gristReady });

    // Validate
    if (!copcUrl) {
        if (activeTab === 'url') {
            showToast('URL COPC requise', 'warning');
        } else {
            showToast('Dalle non trouvée. Vérifiez la référence ou essayez une autre source.', 'warning');
        }
        return;
    }

    // Show status panel
    statusEl.classList.remove('hidden');

    // Get bbox from tile ref
    const bbox = tileRef ? getTileBbox(tileRef) : null;

    // Load point cloud
    console.log('☁️ Loading point cloud from:', copcUrl);
    statusCopc.classList.add('active');
    statusCopc.querySelector('.status-icon').textContent = '⏳';

    try {
        document.getElementById('setupOverlay').classList.add('hidden');
        await loadPointCloud(copcUrl, tileName);
        console.log('✅ Point cloud loaded successfully');

        // Get actual bbox from loaded point cloud
        let actualBbox = bbox;
        if (state.pointCloud) {
            const pcBbox = state.pointCloud.getBoundingBox();
            if (pcBbox && !pcBbox.isEmpty()) {
                actualBbox = {
                    minX: pcBbox.min.x,
                    minY: pcBbox.min.y,
                    maxX: pcBbox.max.x,
                    maxY: pcBbox.max.y
                };
                console.log('📦 Actual bbox from point cloud:', actualBbox);
            }
        }

        // Save config to Grist
        const config = {
            tileName,
            tileRef,
            copcUrl,
            bboxMinX: actualBbox?.minX,
            bboxMinY: actualBbox?.minY,
            bboxMaxX: actualBbox?.maxX,
            bboxMaxY: actualBbox?.maxY,
            pointCount: state.pointCloud?.source?.metadata?.pointCount || state.pointCloud?.source?.pointCount || state.pointCloud?.source?.header?.pointCount || 0,
            source
        };

        state.gristConfig = config;

        if (state.gristReady) {
            console.log('💾 Saving config to Grist table...');
            await saveConfigToGrist(config);
            console.log('✅ Config saved to Grist table');
        }

        statusCopc.classList.remove('active');
        statusCopc.classList.add('done');
        statusCopc.querySelector('.status-icon').textContent = '✅';

        // Step 3: Import from OSM if requested
        console.log('🌍 Step 3: OSM import - autoImport:', autoImport, 'hasBbox:', !!actualBbox);
        if (autoImport && actualBbox) {
            statusImport.classList.add('active');
            statusImport.querySelector('.status-icon').textContent = '⏳';
            console.log('🌍 Importing from OSM...');

            try {
                await importFromOSM(actualBbox);
                await loadObjectsFromGrist();
                console.log('✅ OSM import completed');
                statusImport.classList.remove('active');
                statusImport.classList.add('done');
                statusImport.querySelector('.status-icon').textContent = '✅';
            } catch (err) {
                console.error('❌ OSM import error:', err);
                statusImport.classList.add('error');
                statusImport.querySelector('.status-icon').textContent = '❌';
            }
        } else {
            console.log('⏭️ Skipping OSM import');
            statusImport.querySelector('.status-icon').textContent = '⏭️';
            statusImport.querySelector('span:last-child').textContent = autoImport ? 'Import OSM (pas de bbox)' : 'Import OSM (ignoré)';
        }

        console.log('🎉 Full setup completed!');
        showToast('Configuration complète !', 'success');

    } catch (err) {
        console.error('❌ Point cloud loading error:', err);
        statusCopc.classList.add('error');
        statusCopc.querySelector('.status-icon').textContent = '❌';
        document.getElementById('setupOverlay').classList.remove('hidden');
        showToast('Erreur chargement: ' + err.message, 'error');
    }
}

// ============================================================
// GEOJSON IMPORT
// ============================================================
async function importFromGeoJSON(geojson) {
    if (!geojson.features || geojson.features.length === 0) {
        showToast('GeoJSON vide ou invalide', 'warning');
        return;
    }

    showToast(`Import de ${geojson.features.length} objets...`, 'info');

    const objects = geojson.features
        .filter(f => f.geometry?.type === 'Point')
        .map(f => {
            const [lon, lat] = f.geometry.coordinates;
            const lambert = wgs84ToLambert93(lon, lat);
            return {
                name: f.properties?.name || f.properties?.nom || 'Objet',
                type: f.properties?.type || 'autre',
                category: f.properties?.category || f.properties?.categorie || 'Autre',
                x: lambert.x,
                y: lambert.y,
                z: f.properties?.z || f.properties?.altitude || 0,
                status: 'Importé',
                sourceBD: 'GeoJSON',
                lon,
                lat
            };
        });

    if (objects.length === 0) {
        showToast('Aucun point trouvé dans le GeoJSON', 'warning');
        return;
    }

    if (state.gristReady) {
        await saveObjectsToGrist(objects);
        await loadObjectsFromGrist();
    }

    showToast(`${objects.length} objets importés depuis GeoJSON`, 'success');
}

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
    console.log('🗺️ Territoire 3D - Jumeau Numérique LiDAR HD');

    try {
        setupEventListeners();
        console.log('✅ Event listeners setup');

        // Try Grist first
        const gristOk = await initGrist();
        console.log('ℹ️ Grist status:', gristOk ? 'connected' : 'standalone');

        if (gristOk && state.gristConfig?.copcUrl) {
            // Config loaded from Grist, point cloud loading handled
            console.log('✅ Configuration loaded from Grist');
        } else {
            // Show setup screen
            document.getElementById('setupOverlay').classList.remove('hidden');
            console.log('📋 Setup screen displayed');
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        // Show setup screen anyway
        document.getElementById('setupOverlay').classList.remove('hidden');
        showToast('Erreur d\'initialisation: ' + error.message, 'error');
    }
}

// Start
console.log('🚀 Starting Territoire 3D...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
