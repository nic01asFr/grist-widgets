/**
 * ════════════════════════════════════════════════════════════
 * TERRITOIRE 3D COMPONENT
 * Widget Grist pour visualisation LiDAR HD IGN (COPC)
 * 
 * Fonctionnalités :
 * - Chargement nuages de points COPC
 * - 5 modes de colorisation
 * - Synchronisation multi-vues
 * - Mode standalone pour tests
 * ════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import * as Giro3D from '@giro3d/giro3d';
import { MultiViewSync } from './sync.js';

// Destructuring Giro3D
const { Instance, Map, Tiles3D, ColorLayer } = Giro3D;
const { PointCloudMaterial, MODE } = Giro3D.renderer.pointcloud;

// ════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════

const PARAMS = new URLSearchParams(location.search);

const CONFIG = {
    display: PARAMS.get('display') || 'classification',
    ui: PARAMS.get('ui') || 'full',
    master: PARAMS.get('master') === 'true',
    initialUrl: PARAMS.get('url') || ''
};

const DISPLAY_MODES = {
    classification: { mode: MODE.CLASSIFICATION, label: 'Classification IGN', color: '#6366f1' },
    elevation:      { mode: MODE.ELEVATION,      label: 'Élévation',         color: '#10b981' },
    intensity:      { mode: MODE.INTENSITY,      label: 'Intensité',         color: '#f59e0b' },
    ortho:          { mode: MODE.TEXTURE,        label: 'Orthophoto',        color: '#3b82f6' },
    rgb:            { mode: MODE.COLOR,          label: 'RGB',               color: '#ec4899' }
};

// Classification IGN LiDAR HD
const IGN_CLASSIFICATION = {
    1:  new THREE.Color('#AAAAAA'),  // Non classé
    2:  new THREE.Color('#AA5500'),  // Sol
    3:  new THREE.Color('#00AA00'),  // Végétation basse
    4:  new THREE.Color('#00DD00'),  // Végétation moyenne  
    5:  new THREE.Color('#00FF00'),  // Végétation haute
    6:  new THREE.Color('#FF0000'),  // Bâtiment
    9:  new THREE.Color('#0000FF'),  // Eau
    17: new THREE.Color('#FFFF00'),  // Pont
    64: new THREE.Color('#FF00FF'),  // Sursol pérenne
    65: new THREE.Color('#00FFFF'),  // Artefacts
    66: new THREE.Color('#888888'),  // Points virtuels
    67: new THREE.Color('#FF8800')   // Sursol synthétique
};

// ════════════════════════════════════════════════════════════
// ÉTAT GLOBAL
// ════════════════════════════════════════════════════════════

const state = {
    instance: null,
    map: null,
    controls: null,
    copc: null,
    orthoLayer: null,
    sync: null,
    currentDisplay: CONFIG.display,
    currentUrl: null,
    isGristEnv: false
};

// ════════════════════════════════════════════════════════════
// ÉLÉMENTS DOM
// ════════════════════════════════════════════════════════════

const DOM = {
    view: () => document.getElementById('view'),
    urlBar: () => document.getElementById('url-bar'),
    urlInput: () => document.getElementById('url-input'),
    urlLoad: () => document.getElementById('url-load'),
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
// INITIALISATION
// ════════════════════════════════════════════════════════════

async function init() {
    showLoading(true);
    
    try {
        // Détecter environnement Grist
        state.isGristEnv = detectGristEnvironment();
        
        // Initialiser Grist si disponible
        if (state.isGristEnv) {
            initGrist();
        }
        
        // Initialiser le moteur 3D
        await init3D();
        
        // Initialiser l'interface
        initUI();
        
        // Charger URL initiale si fournie
        if (CONFIG.initialUrl) {
            DOM.urlInput().value = CONFIG.initialUrl;
            await loadPointCloud(CONFIG.initialUrl);
        }
        
    } catch (e) {
        console.error('Erreur initialisation:', e);
        showError('Erreur d\'initialisation: ' + e.message);
    }
    
    showLoading(false);
}

/**
 * Détecter si on est dans un environnement Grist
 */
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
 * Initialiser la connexion Grist
 */
function initGrist() {
    grist.ready({
        requiredAccess: 'full',
        columns: [
            { name: 'COPC_URL', title: 'URL COPC', type: 'Text', optional: true },
            { name: 'url', title: 'URL', type: 'Text', optional: true }
        ]
    });
    
    // Écouter les changements de record
    grist.onRecord(async (record, mappings) => {
        if (!record) return;
        
        const mapped = grist.mapColumnNames(record, mappings);
        const url = mapped?.COPC_URL || mapped?.url || record.COPC_URL || record.url;
        
        if (url && url !== state.currentUrl) {
            DOM.urlInput().value = url;
            await loadPointCloud(url);
        }
    });
    
    // Masquer la barre URL en mode Grist (optionnel)
    // DOM.urlBar().classList.add('hidden');
}

/**
 * Initialiser le moteur 3D Giro3D
 */
async function init3D() {
    // Enregistrer le CRS Lambert 93
    await Giro3D.core.system.CoordinateSystem.get('EPSG:2154');
    
    // Créer l'instance Giro3D
    state.instance = new Instance({
        target: DOM.view(),
        crs: 'EPSG:2154',
        backgroundColor: 0x1a1a2e
    });
    
    // Créer le conteneur Map
    state.map = new Map({
        hillshading: true,
        segments: 64
    });
    state.instance.add(state.map);
    
    // Configurer les contrôles
    state.controls = state.instance.view.controls;
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.1;
    state.controls.minDistance = 10;
    state.controls.maxDistance = 50000;
    
    // Initialiser la synchronisation multi-vues
    state.sync = new MultiViewSync();
    state.sync.connect(state.instance, state.controls);
    state.sync.onStatusChange = updateSyncStatus;
    
    // Animation loop
    state.instance.addEventListener('update', () => {
        state.controls.update();
    });
}

// ════════════════════════════════════════════════════════════
// CHARGEMENT NUAGE DE POINTS
// ════════════════════════════════════════════════════════════

async function loadPointCloud(url) {
    if (!url || !url.trim()) {
        showError('URL vide');
        return;
    }
    
    // Valider l'URL
    if (!url.includes('.copc') && !url.includes('copc')) {
        showError('L\'URL doit pointer vers un fichier COPC (.copc.laz)');
        return;
    }
    
    showLoading(true);
    hideError();
    
    try {
        // Nettoyer l'ancien nuage
        if (state.copc) {
            state.map.removeLayer(state.copc);
            state.copc.dispose();
            state.copc = null;
        }
        
        // Supprimer l'ortho si présente
        removeOrthoLayer();
        
        console.log('📦 Chargement COPC:', url);
        
        // Créer la source COPC
        const source = new Giro3D.sources.COPCSource({
            url: url,
            // Options de performance
            workerCount: 4
        });
        
        // Créer l'entité avec le matériau approprié
        state.copc = new Tiles3D({
            source: source,
            material: createMaterial(state.currentDisplay)
        });
        
        // Ajouter à la map
        state.map.addLayer(state.copc);
        
        // Attendre que le nuage soit prêt
        await state.copc.whenReady();
        
        state.currentUrl = url;
        
        // Centrer la vue sur le nuage
        centerOnPointCloud();
        
        // Ajouter ortho si mode texture
        if (state.currentDisplay === 'ortho') {
            await addOrthoLayer();
        }
        
        // Mettre à jour l'affichage
        updatePointsCount();
        
        console.log('✅ COPC chargé avec succès');
        
    } catch (e) {
        console.error('❌ Erreur chargement COPC:', e);
        showError('Erreur de chargement: ' + e.message);
    }
    
    showLoading(false);
}

/**
 * Centrer la caméra sur le nuage de points
 */
function centerOnPointCloud() {
    if (!state.copc) return;
    
    const extent = state.copc.root?.extent || state.copc.extent;
    
    if (extent) {
        const centerX = (extent.west + extent.east) / 2;
        const centerY = (extent.south + extent.north) / 2;
        const width = extent.east - extent.west;
        const height = extent.north - extent.south;
        const size = Math.max(width, height);
        
        // Positionner le target au centre
        state.controls.target.set(centerX, centerY, 0);
        
        // Positionner la caméra
        state.instance.view.camera.position.set(
            centerX,
            centerY - size * 0.5,
            size * 0.7
        );
        
        state.controls.update();
        state.instance.notifyChange();
    }
}

// ════════════════════════════════════════════════════════════
// MATÉRIAU & COLORISATION
// ════════════════════════════════════════════════════════════

/**
 * Créer le matériau pour le mode d'affichage
 */
function createMaterial(displayMode) {
    const config = DISPLAY_MODES[displayMode];
    
    const material = new PointCloudMaterial({
        size: 2,
        mode: config.mode,
        minmax: displayMode === 'elevation' ? [0, 500] : undefined
    });
    
    // Appliquer la classification IGN
    if (displayMode === 'classification') {
        material.classification = IGN_CLASSIFICATION;
    }
    
    return material;
}

/**
 * Changer le mode d'affichage
 */
async function setDisplayMode(mode) {
    if (!DISPLAY_MODES[mode] || mode === state.currentDisplay) return;
    
    state.currentDisplay = mode;
    
    // Mettre à jour le matériau
    if (state.copc) {
        state.copc.material.dispose();
        state.copc.material = createMaterial(mode);
    }
    
    // Gérer l'orthophoto
    if (mode === 'ortho') {
        await addOrthoLayer();
    } else {
        removeOrthoLayer();
    }
    
    // Mettre à jour l'UI
    updateModeBadge();
    
    // Rafraîchir la vue
    if (state.instance) {
        state.instance.notifyChange();
    }
}

/**
 * Ajouter la couche orthophoto IGN
 */
async function addOrthoLayer() {
    if (state.orthoLayer) return;
    
    try {
        state.orthoLayer = new ColorLayer({
            name: 'ortho-ign',
            source: new Giro3D.sources.TiledImageSource({
                url: 'https://data.geopf.fr/wmts?' +
                     'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
                     '&LAYER=ORTHOIMAGERY.ORTHOPHOTOS' +
                     '&STYLE=normal&FORMAT=image/jpeg' +
                     '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                crs: 'EPSG:3857',
                format: 'image/jpeg'
            })
        });
        
        state.map.addLayer(state.orthoLayer);
        console.log('🗺️ Couche ortho ajoutée');
        
    } catch (e) {
        console.warn('⚠️ Ortho non disponible:', e);
    }
}

/**
 * Supprimer la couche orthophoto
 */
function removeOrthoLayer() {
    if (state.orthoLayer) {
        state.map.removeLayer(state.orthoLayer);
        state.orthoLayer = null;
    }
}

// ════════════════════════════════════════════════════════════
// INTERFACE UTILISATEUR
// ════════════════════════════════════════════════════════════

function initUI() {
    // Événement bouton charger
    DOM.urlLoad().addEventListener('click', () => {
        loadPointCloud(DOM.urlInput().value.trim());
    });
    
    // Entrée clavier dans l'input URL
    DOM.urlInput().addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadPointCloud(DOM.urlInput().value.trim());
        }
    });
    
    // Sélecteur de mode d'affichage
    DOM.displaySelect().value = CONFIG.display;
    DOM.displaySelect().addEventListener('change', (e) => {
        setDisplayMode(e.target.value);
    });
    
    // Fermer erreur
    DOM.errorClose().addEventListener('click', hideError);
    
    // Masquer contrôles si ui=minimal ou ui=none
    if (CONFIG.ui === 'minimal') {
        DOM.controls().classList.add('hidden');
    } else if (CONFIG.ui === 'none') {
        document.getElementById('ui-overlay').style.display = 'none';
    }
    
    // Mise à jour initiale
    updateModeBadge();
    updateSyncStatus(state.sync?.getStatus());
}

/**
 * Mettre à jour le badge du mode
 */
function updateModeBadge() {
    const badge = DOM.modeBadge();
    const config = DISPLAY_MODES[state.currentDisplay];
    
    badge.textContent = config.label;
    badge.className = state.currentDisplay;
    badge.style.backgroundColor = config.color;
}

/**
 * Mettre à jour le status de synchronisation
 */
function updateSyncStatus(status) {
    const el = DOM.syncStatus();
    if (!status || !el) return;
    
    if (status.isMaster) {
        el.textContent = '● MASTER';
        el.className = 'master';
    } else {
        el.textContent = '○ Synced';
        el.className = 'synced';
    }
}

/**
 * Mettre à jour le compteur de points
 */
function updatePointsCount() {
    const el = DOM.pointsCount();
    if (!el || !state.copc) return;
    
    // Note: le nombre de points n'est pas toujours disponible immédiatement
    const count = state.copc.root?.pointCount || 0;
    if (count > 0) {
        el.textContent = formatNumber(count) + ' pts';
    } else {
        el.textContent = '';
    }
}

/**
 * Formater un nombre avec séparateurs
 */
function formatNumber(n) {
    return new Intl.NumberFormat('fr-FR').format(n);
}

// ════════════════════════════════════════════════════════════
// LOADING & ERREURS
// ════════════════════════════════════════════════════════════

function showLoading(show) {
    const el = DOM.loading();
    if (show) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function showError(message) {
    const el = DOM.error();
    DOM.errorMessage().textContent = message;
    el.classList.remove('hidden');
}

function hideError() {
    DOM.error().classList.add('hidden');
}

// ════════════════════════════════════════════════════════════
// DÉMARRAGE
// ════════════════════════════════════════════════════════════

// Lancer l'initialisation
init().catch(console.error);

// Export pour debug
window.t3d = state;
