// ========================================
// REVEAL.JS EDITOR - WYSIWYG Editor
// ========================================

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    TABLES: {
        PRESENTATIONS: 'Presentations',
        SLIDES: 'Slides',
        COMPONENTS: 'Components'
    },
    CANVAS: {
        WIDTH: 960,
        HEIGHT: 700,
        BACKGROUND: '#1a1a1a'
    },
    THEMES: [
        'black', 'white', 'league', 'sky', 'beige',
        'night', 'serif', 'simple', 'solarized', 'moon'
    ],
    LAYOUTS: [
        'title', 'content', 'two-column', 'three-column',
        'sidebar-left', 'sidebar-right', 'grid-2x2', 'full', 'custom'
    ],
    COMPONENT_TYPES: [
        'text', 'image', 'code', 'list', 'table',
        'quote', 'video', 'chart', 'shape', 'button'
    ]
};

// ========================================
// STATE MANAGEMENT
// ========================================
const appState = {
    gristReady: false,
    gristApi: null,
    docApi: null,
    presentations: [],
    slides: [],
    components: [],
    currentPresentation: null,
    currentSlide: null,
    selectedComponent: null,
    canvas: null,
    fabricObjects: new Map(),
    undoStack: [],
    redoStack: [],
    tablesExist: {
        presentations: false,
        slides: false,
        components: false
    }
};

// ========================================
// GRIST API INITIALIZATION
// ========================================
async function initializeGristAPI() {
    console.log('🔌 Initializing Grist API...');

    try {
        appState.gristApi = grist;

        await grist.ready({
            requiredAccess: 'full',
            columns: []
        });

        appState.docApi = grist.docApi;
        appState.gristReady = true;

        console.log('✅ Grist API ready');

        const tablesCheck = await checkRequiredTables();

        if (tablesCheck.allExist) {
            updateSyncStatus('connected', 'Connecté');
            hideSetupScreen();
            await loadData();
        } else {
            updateSyncStatus('error', 'Tables manquantes');
            showSetupError(tablesCheck.missing);
        }

    } catch (error) {
        console.error('❌ Error initializing Grist API:', error);
        updateSyncStatus('error', 'Erreur connexion');
    }
}

async function checkRequiredTables() {
    const result = { allExist: true, missing: [] };

    for (const [key, tableName] of Object.entries(CONFIG.TABLES)) {
        try {
            await appState.docApi.fetchTable(tableName);
            const stateKey = key.toLowerCase();
            appState.tablesExist[stateKey] = true;
            console.log('✓ Table found:', tableName);
        } catch (error) {
            const stateKey = key.toLowerCase();
            appState.tablesExist[stateKey] = false;
            result.allExist = false;
            result.missing.push(tableName);
            console.log('✗ Table missing:', tableName);
        }
    }

    return result;
}

async function loadData() {
    console.log('📊 Loading data...');

    try {
        const [presentations, slides, components] = await Promise.all([
            appState.docApi.fetchTable(CONFIG.TABLES.PRESENTATIONS),
            appState.docApi.fetchTable(CONFIG.TABLES.SLIDES),
            appState.docApi.fetchTable(CONFIG.TABLES.COMPONENTS)
        ]);

        appState.presentations = presentations.id.map((id, i) => ({
            id,
            title: presentations.title?.[i],
            theme: presentations.theme?.[i] || 'black',
            transition: presentations.transition?.[i] || 'slide',
            active: presentations.active?.[i]
        }));

        appState.slides = slides.id.map((id, i) => ({
            id,
            presentation: slides.presentation?.[i],
            order: slides.order?.[i] || 0,
            title: slides.title?.[i],
            layout: slides.layout?.[i] || 'content',
            background_color: slides.background_color?.[i]
        }));

        appState.components = components.id.map((id, i) => ({
            id,
            slide: components.slide?.[i],
            order: components.order?.[i] || 0,
            type: components.type?.[i] || 'text',
            content: components.content?.[i],
            position: components.position?.[i] || 'center',
            width: components.width?.[i],
            height: components.height?.[i],
            style_preset: components.style_preset?.[i],
            color: components.color?.[i],
            font_size: components.font_size?.[i]
        }));

        populatePresentationSelect();
        console.log('✅ Data loaded');

    } catch (error) {
        console.error('❌ Error loading data:', error);
    }
}

// ========================================
// FABRIC.JS CANVAS INITIALIZATION
// ========================================
function initializeCanvas() {
    const canvasElement = document.getElementById('canvas');

    appState.canvas = new fabric.Canvas('canvas', {
        width: CONFIG.CANVAS.WIDTH,
        height: CONFIG.CANVAS.HEIGHT,
        backgroundColor: CONFIG.CANVAS.BACKGROUND,
        selection: true,
        preserveObjectStacking: true
    });

    // Selection events
    appState.canvas.on('selection:created', handleSelection);
    appState.canvas.on('selection:updated', handleSelection);
    appState.canvas.on('selection:cleared', handleSelectionClear);

    // Object modification events
    appState.canvas.on('object:modified', handleObjectModified);

    console.log('🎨 Canvas initialized');
}

function handleSelection(e) {
    const activeObject = e.selected[0];
    if (activeObject && activeObject.componentData) {
        appState.selectedComponent = activeObject.componentData;
        updatePropertiesPanel();
    }
}

function handleSelectionClear() {
    appState.selectedComponent = null;
    clearPropertiesPanel();
}

function handleObjectModified(e) {
    const obj = e.target;
    if (obj && obj.componentData) {
        // Update component width/height only (position reste "center" ou autre)
        obj.componentData.width = Math.round(obj.width * obj.scaleX) + 'px';
        obj.componentData.height = Math.round(obj.height * obj.scaleY) + 'px';

        // Debounced save to Grist
        debouncedSaveComponent(obj.componentData);
    }
}

// ========================================
// PRESENTATION MANAGEMENT
// ========================================
function populatePresentationSelect() {
    const select = document.getElementById('presentation-select');
    select.innerHTML = '<option value="">Sélectionner...</option>';

    appState.presentations.forEach(pres => {
        const option = document.createElement('option');
        option.value = pres.id;
        option.textContent = pres.title || `Présentation ${pres.id}`;
        select.appendChild(option);
    });

    // Auto-select first
    if (appState.presentations.length > 0) {
        select.value = appState.presentations[0].id;
        loadPresentation(appState.presentations[0].id);
    }
}

function loadPresentation(presentationId) {
    appState.currentPresentation = appState.presentations.find(p => p.id === presentationId);

    if (!appState.currentPresentation) return;

    const presentationSlides = appState.slides
        .filter(s => s.presentation === presentationId)
        .sort((a, b) => a.order - b.order);

    renderSlidesList(presentationSlides);

    // Load first slide
    if (presentationSlides.length > 0) {
        loadSlide(presentationSlides[0].id);
    }
}

// ========================================
// SLIDES MANAGEMENT
// ========================================
function renderSlidesList(slides) {
    const slidesList = document.getElementById('slides-list');

    if (slides.length === 0) {
        slidesList.innerHTML = `
            <div class="empty-state">
                <p>Aucun slide</p>
                <p style="font-size: 0.8em; opacity: 0.7;">Créez un slide pour commencer</p>
            </div>
        `;
        return;
    }

    slidesList.innerHTML = slides.map((slide, index) => `
        <div class="slide-item" data-slide-id="${slide.id}" onclick="loadSlide(${slide.id})">
            <div class="slide-thumbnail">Slide ${index + 1}</div>
            <div class="slide-info">
                <span class="slide-title">${slide.title || 'Sans titre'}</span>
                <span class="slide-number">#${index + 1}</span>
            </div>
        </div>
    `).join('');
}

function loadSlide(slideId) {
    appState.currentSlide = appState.slides.find(s => s.id === slideId);

    if (!appState.currentSlide) return;

    // Update UI
    document.querySelectorAll('.slide-item').forEach(item => {
        item.classList.toggle('active', item.dataset.slideId == slideId);
    });

    document.getElementById('current-slide-title').textContent =
        appState.currentSlide.title || `Slide ${appState.currentSlide.order}`;

    document.getElementById('layout-select').value = appState.currentSlide.layout;

    // Update canvas background
    if (appState.currentSlide.background_color) {
        appState.canvas.setBackgroundColor(appState.currentSlide.background_color, appState.canvas.renderAll.bind(appState.canvas));
    }

    // Load components
    loadSlideComponents(slideId);
}

function loadSlideComponents(slideId) {
    // Clear canvas
    appState.canvas.clear();
    appState.fabricObjects.clear();

    const slideComponents = appState.components
        .filter(c => c.slide === slideId)
        .sort((a, b) => a.order - b.order);

    slideComponents.forEach(component => {
        addComponentToCanvas(component);
    });

    appState.canvas.renderAll();
}

// ========================================
// COMPONENT RENDERING ON CANVAS
// ========================================
function addComponentToCanvas(component) {
    let fabricObject;

    switch (component.type) {
        case 'text':
            fabricObject = createTextObject(component);
            break;
        case 'image':
            fabricObject = createImageObject(component);
            break;
        case 'shape':
            fabricObject = createShapeObject(component);
            break;
        default:
            fabricObject = createPlaceholderObject(component);
    }

    if (fabricObject) {
        fabricObject.componentData = component;
        appState.canvas.add(fabricObject);
        appState.fabricObjects.set(component.id, fabricObject);
    }
}

function createTextObject(component) {
    // Convertir position en coordonnées
    const coords = getPositionCoords(component.position || 'center');

    const text = new fabric.Textbox(component.content || 'Double-clic pour éditer', {
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 300,
        fontSize: parseFloat(component.font_size) || 24,
        fill: component.color || '#ffffff',
        fontFamily: 'Arial',
        editable: false
    });

    // Double-click to edit
    text.on('mousedblclick', () => {
        openTextEditor(component);
    });

    return text;
}

// Convertir position textuelle en coordonnées
function getPositionCoords(position) {
    const positions = {
        'top-left': { x: 50, y: 50 },
        'top': { x: 480, y: 50 },
        'top-right': { x: 860, y: 50 },
        'left': { x: 50, y: 350 },
        'center': { x: 280, y: 250 },
        'right': { x: 660, y: 350 },
        'bottom-left': { x: 50, y: 600 },
        'bottom': { x: 480, y: 600 },
        'bottom-right': { x: 860, y: 600 }
    };
    return positions[position] || positions['center'];
}

function createImageObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    // Placeholder for images
    return new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 200,
        height: parseFloat(component.height) || 150,
        fill: '#333',
        stroke: '#666',
        strokeWidth: 2
    });
}

function createShapeObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    return new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 100,
        height: parseFloat(component.height) || 100,
        fill: component.color || '#4CAF50'
    });
}

function createPlaceholderObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    return new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: 150,
        height: 100,
        fill: '#2196F3',
        stroke: '#1976D2',
        strokeWidth: 2
    });
}

// ========================================
// DRAG & DROP FROM PALETTE
// ========================================
function initializeDragDrop() {
    const paletteItems = document.querySelectorAll('.palette-item');

    paletteItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });

    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.addEventListener('dragover', handleDragOver);
    canvasContainer.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    e.dataTransfer.setData('componentType', this.dataset.componentType);
    this.classList.add('dragging');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

async function handleDrop(e) {
    e.preventDefault();

    if (!appState.currentSlide) {
        alert('Veuillez sélectionner un slide d\'abord');
        return;
    }

    const componentType = e.dataTransfer.getData('componentType');

    // Calculate position relative to canvas
    const rect = appState.canvas.getElement().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create component in Grist
    await createComponent(componentType, x, y);
}

async function createComponent(type, x, y) {
    try {
        updateSyncStatus('syncing', 'Création...');

        const newOrder = Math.max(...appState.components.filter(c => c.slide === appState.currentSlide.id).map(c => c.order), 0) + 1;

        // Utiliser "position" au lieu de x/y pour la compatibilité avec reveal-builder
        const componentData = {
            slide: appState.currentSlide.id,
            order: newOrder,
            type: type,
            content: getDefaultContent(type),
            position: 'center',  // Position par défaut
            width: '400px',
            height: '200px',
            color: '#ffffff',
            font_size: '24px'
        };

        const result = await appState.docApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.COMPONENTS, null, componentData]
        ]);

        const componentId = result.retValues ? result.retValues[0] : result[0];

        // Reload slide
        await loadData();
        loadSlide(appState.currentSlide.id);

        updateSyncStatus('connected', 'Synchronisé');

    } catch (error) {
        console.error('❌ Error creating component:', error);
        updateSyncStatus('error', 'Erreur');
        alert('Erreur lors de la création du composant. Vérifiez que les tables existent.');
    }
}

function getDefaultContent(type) {
    const defaults = {
        text: 'Double-clic pour éditer',
        code: '// Code here',
        list: 'Item 1\nItem 2\nItem 3',
        quote: '"Citation"\n— Auteur',
        table: 'Col1,Col2\nVal1,Val2'
    };
    return defaults[type] || `${type} component`;
}

// ========================================
// PROPERTIES PANEL
// ========================================
function updatePropertiesPanel() {
    const container = document.getElementById('properties-content');

    if (!appState.selectedComponent) {
        clearPropertiesPanel();
        return;
    }

    const comp = appState.selectedComponent;

    container.innerHTML = `
        <div class="property-group">
            <h4>Type</h4>
            <p style="margin: 0;">${comp.type}</p>
        </div>

        <div class="property-group">
            <h4>Position</h4>
            <div class="form-group">
                <label>Position</label>
                <select id="prop-position">
                    <option value="top-left" ${comp.position === 'top-left' ? 'selected' : ''}>Haut Gauche</option>
                    <option value="top" ${comp.position === 'top' ? 'selected' : ''}>Haut Centre</option>
                    <option value="top-right" ${comp.position === 'top-right' ? 'selected' : ''}>Haut Droite</option>
                    <option value="left" ${comp.position === 'left' ? 'selected' : ''}>Milieu Gauche</option>
                    <option value="center" ${comp.position === 'center' || !comp.position ? 'selected' : ''}>Centre</option>
                    <option value="right" ${comp.position === 'right' ? 'selected' : ''}>Milieu Droite</option>
                    <option value="bottom-left" ${comp.position === 'bottom-left' ? 'selected' : ''}>Bas Gauche</option>
                    <option value="bottom" ${comp.position === 'bottom' ? 'selected' : ''}>Bas Centre</option>
                    <option value="bottom-right" ${comp.position === 'bottom-right' ? 'selected' : ''}>Bas Droite</option>
                </select>
            </div>
        </div>

        <div class="property-group">
            <h4>Taille</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur</label>
                    <input type="text" id="prop-width" value="${comp.width || 'auto'}">
                </div>
                <div class="form-group">
                    <label>Hauteur</label>
                    <input type="text" id="prop-height" value="${comp.height || 'auto'}">
                </div>
            </div>
        </div>

        ${comp.type === 'text' ? `
        <div class="property-group">
            <h4>Texte</h4>
            <div class="form-group">
                <label>Contenu</label>
                <textarea id="prop-content" rows="3">${comp.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Taille</label>
                <input type="text" id="prop-font-size" value="${comp.font_size || '24px'}">
            </div>
            <div class="form-group">
                <label>Couleur</label>
                <input type="text" id="prop-color" value="${comp.color || '#ffffff'}">
            </div>
        </div>
        ` : ''}

        <button class="btn-primary" style="width: 100%;" onclick="saveProperties()">
            💾 Appliquer
        </button>
    `;
}

function clearPropertiesPanel() {
    document.getElementById('properties-content').innerHTML = `
        <div class="empty-state">
            <p>Aucune sélection</p>
            <p style="font-size: 0.8em; opacity: 0.7;">Sélectionnez un composant</p>
        </div>
    `;
}

window.saveProperties = async function() {
    if (!appState.selectedComponent) return;

    const updates = {
        position: document.getElementById('prop-position')?.value || 'center',
        width: document.getElementById('prop-width')?.value,
        height: document.getElementById('prop-height')?.value
    };

    if (appState.selectedComponent.type === 'text') {
        updates.content = document.getElementById('prop-content')?.value;
        updates.font_size = document.getElementById('prop-font-size')?.value;
        updates.color = document.getElementById('prop-color')?.value;
    }

    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, appState.selectedComponent.id, updates]
        ]);

        await loadData();
        loadSlide(appState.currentSlide.id);
    } catch (error) {
        console.error('Error saving properties:', error);
    }
};

// ========================================
// TEXT EDITOR
// ========================================
let quillInstance = null;

function openTextEditor(component) {
    const modal = document.getElementById('text-editor-modal');
    modal.style.display = 'flex';

    if (!quillInstance) {
        quillInstance = new Quill('#text-editor-container', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                ]
            }
        });
    }

    quillInstance.setText(component.content || '');

    // Store current component for saving
    window.currentEditingComponent = component;
}

window.closeTextEditorModal = function() {
    document.getElementById('text-editor-modal').style.display = 'none';
};

window.saveTextEdit = async function() {
    if (!window.currentEditingComponent) return;

    const content = quillInstance.getText();

    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, window.currentEditingComponent.id, {
                content: content
            }]
        ]);

        await loadData();
        loadSlide(appState.currentSlide.id);
        closeTextEditorModal();
    } catch (error) {
        console.error('Error saving text:', error);
    }
};

// ========================================
// TEMPLATES
// ========================================
const SLIDE_TEMPLATES = [
    {
        name: 'Titre + Logo',
        description: 'Slide de titre avec logo',
        layout: 'title',
        components: [
            { type: 'image', position: 'top-right', width: '150px', height: '150px' },
            { type: 'text', position: 'center', width: '600px', content: '# Titre Principal', font_size: '48px', color: '#ffffff' }
        ]
    },
    {
        name: 'Deux Colonnes',
        description: 'Texte gauche, liste droite',
        layout: 'two-column',
        components: [
            { type: 'text', position: 'left', width: '400px', content: '## Titre\n\nTexte explicatif', font_size: '24px', color: '#ffffff' },
            { type: 'list', position: 'right', width: '400px', content: 'Point 1\nPoint 2\nPoint 3', font_size: '20px', color: '#ffffff' }
        ]
    },
    {
        name: 'Contenu Simple',
        description: 'Un seul texte centré',
        layout: 'content',
        components: [
            { type: 'text', position: 'center', width: '700px', content: '## Votre Titre\n\nVotre contenu ici...', font_size: '28px', color: '#ffffff' }
        ]
    }
];

function openTemplatesModal() {
    const modal = document.getElementById('templates-modal');
    const grid = document.getElementById('templates-grid');

    grid.innerHTML = SLIDE_TEMPLATES.map((template, i) => `
        <div class="template-item" onclick="applyTemplate(${i})">
            <div class="template-preview">${template.layout[0].toUpperCase()}</div>
            <div class="template-name">${template.name}</div>
            <div class="template-description">${template.description}</div>
        </div>
    `).join('');

    modal.style.display = 'flex';
}

window.closeTemplatesModal = function() {
    document.getElementById('templates-modal').style.display = 'none';
};

window.applyTemplate = async function(templateIndex) {
    if (!appState.currentPresentation) {
        alert('Créez une présentation d\'abord');
        return;
    }

    const template = SLIDE_TEMPLATES[templateIndex];

    try {
        // Create slide
        const slideResult = await appState.docApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.SLIDES, null, {
                presentation: appState.currentPresentation.id,
                order: appState.slides.filter(s => s.presentation === appState.currentPresentation.id).length + 1,
                title: template.name,
                layout: template.layout
            }]
        ]);

        const slideId = slideResult.retValues ? slideResult.retValues[0] : slideResult[0];

        // Create components
        for (let i = 0; i < template.components.length; i++) {
            const comp = template.components[i];
            await appState.docApi.applyUserActions([
                ['AddRecord', CONFIG.TABLES.COMPONENTS, null, {
                    slide: slideId,
                    order: i + 1,
                    ...comp
                }]
            ]);
        }

        await loadData();
        loadPresentation(appState.currentPresentation.id);
        loadSlide(slideId);
        closeTemplatesModal();

    } catch (error) {
        console.error('Error applying template:', error);
    }
};

// ========================================
// NEW SLIDE/PRESENTATION
// ========================================
window.addSlide = async function() {
    if (!appState.currentPresentation) {
        alert('Créez une présentation d\'abord');
        return;
    }

    try {
        const newOrder = Math.max(...appState.slides.filter(s => s.presentation === appState.currentPresentation.id).map(s => s.order), 0) + 1;

        const result = await appState.docApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.SLIDES, null, {
                presentation: appState.currentPresentation.id,
                order: newOrder,
                title: `Slide ${newOrder}`,
                layout: 'content'
            }]
        ]);

        await loadData();
        loadPresentation(appState.currentPresentation.id);
    } catch (error) {
        console.error('Error adding slide:', error);
    }
};

function openNewPresentationModal() {
    document.getElementById('new-presentation-modal').style.display = 'flex';
}

window.closeNewPresentationModal = function() {
    document.getElementById('new-presentation-modal').style.display = 'none';
};

window.createPresentation = async function() {
    const title = document.getElementById('new-pres-title').value.trim();
    const theme = document.getElementById('new-pres-theme').value;

    if (!title) {
        alert('Entrez un titre');
        return;
    }

    try {
        await appState.docApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.PRESENTATIONS, null, {
                title: title,
                theme: theme,
                transition: 'slide',
                active: false
            }]
        ]);

        await loadData();
        closeNewPresentationModal();
    } catch (error) {
        console.error('Error creating presentation:', error);
    }
};

// ========================================
// ALIGNMENT TOOLS
// ========================================
function alignLeft() {
    const active = appState.canvas.getActiveObject();
    if (active) {
        active.set({ left: 50 });
        appState.canvas.renderAll();
        handleObjectModified({ target: active });
    }
}

function alignCenter() {
    const active = appState.canvas.getActiveObject();
    if (active) {
        active.set({ left: (CONFIG.CANVAS.WIDTH - active.width * active.scaleX) / 2 });
        appState.canvas.renderAll();
        handleObjectModified({ target: active });
    }
}

function alignRight() {
    const active = appState.canvas.getActiveObject();
    if (active) {
        active.set({ left: CONFIG.CANVAS.WIDTH - active.width * active.scaleX - 50 });
        appState.canvas.renderAll();
        handleObjectModified({ target: active });
    }
}

function alignTop() {
    const active = appState.canvas.getActiveObject();
    if (active) {
        active.set({ top: 50 });
        appState.canvas.renderAll();
        handleObjectModified({ target: active });
    }
}

function alignMiddle() {
    const active = appState.canvas.getActiveObject();
    if (active) {
        active.set({ top: (CONFIG.CANVAS.HEIGHT - active.height * active.scaleY) / 2 });
        appState.canvas.renderAll();
        handleObjectModified({ target: active });
    }
}

function alignBottom() {
    const active = appState.canvas.getActiveObject();
    if (active) {
        active.set({ top: CONFIG.CANVAS.HEIGHT - active.height * active.scaleY - 50 });
        appState.canvas.renderAll();
        handleObjectModified({ target: active });
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function updateSyncStatus(status, text) {
    const dot = document.getElementById('sync-indicator');
    const statusText = document.getElementById('sync-text');

    dot.className = 'sync-dot';
    if (status === 'connected') {
        dot.classList.add('connected');
    } else if (status === 'syncing') {
        dot.classList.add('syncing');
    }

    statusText.textContent = text;
}

function hideSetupScreen() {
    document.getElementById('setup-screen').style.display = 'none';
}

function showSetupError(missing) {
    const errorDiv = document.getElementById('setup-error');
    const actionsDiv = document.getElementById('setup-actions');

    errorDiv.innerHTML = `
        <div style="background: rgba(244, 67, 54, 0.2); border: 2px solid #F44336; padding: 1em; border-radius: 8px;">
            <p><strong>⚠️ Tables manquantes :</strong></p>
            <p style="font-size: 0.85em;">${missing.join(', ')}</p>
        </div>
    `;

    errorDiv.style.display = 'block';
    actionsDiv.style.display = 'block';

    document.getElementById('setup-status').style.display = 'none';
}

// Debounced save
const debouncedSaveComponent = debounce(async (component) => {
    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, component.id, {
                width: component.width,
                height: component.height
            }]
        ]);
    } catch (error) {
        console.error('Error saving component:', error);
    }
}, 500);

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// TABLE CREATION
// ========================================
window.createMissingTables = async function() {
    const statusDiv = document.getElementById('setup-status');
    const errorDiv = document.getElementById('setup-error');
    const actionsDiv = document.getElementById('setup-actions');

    statusDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    actionsDiv.style.display = 'none';
    statusDiv.innerHTML = '<div class="spinner"></div><p>Création des tables...</p>';

    try {
        const tablesToCreate = [];

        if (!appState.tablesExist.presentations) {
            tablesToCreate.push(['AddTable', CONFIG.TABLES.PRESENTATIONS, [
                { id: 'title', fields: { type: 'Text', label: 'Titre' } },
                { id: 'theme', fields: { type: 'Choice', label: 'Thème', widgetOptions: JSON.stringify({ choices: CONFIG.THEMES }) } },
                { id: 'transition', fields: { type: 'Choice', label: 'Transition', widgetOptions: JSON.stringify({ choices: ['slide', 'fade', 'zoom', 'convex', 'concave', 'none'] }) } },
                { id: 'active', fields: { type: 'Bool', label: 'Active' } }
            ]]);
        }

        if (!appState.tablesExist.slides) {
            tablesToCreate.push(['AddTable', CONFIG.TABLES.SLIDES, [
                { id: 'presentation', fields: { type: 'Ref:Presentations', label: 'Présentation' } },
                { id: 'order', fields: { type: 'Int', label: 'Ordre' } },
                { id: 'title', fields: { type: 'Text', label: 'Titre' } },
                { id: 'layout', fields: { type: 'Choice', label: 'Layout', widgetOptions: JSON.stringify({ choices: CONFIG.LAYOUTS }) } },
                { id: 'background_color', fields: { type: 'Text', label: 'Couleur fond' } }
            ]]);
        }

        if (!appState.tablesExist.components) {
            tablesToCreate.push(['AddTable', CONFIG.TABLES.COMPONENTS, [
                { id: 'slide', fields: { type: 'Ref:Slides', label: 'Slide' } },
                { id: 'order', fields: { type: 'Int', label: 'Ordre' } },
                { id: 'type', fields: { type: 'Choice', label: 'Type', widgetOptions: JSON.stringify({ choices: CONFIG.COMPONENT_TYPES }) } },
                { id: 'content', fields: { type: 'Text', label: 'Contenu' } },
                { id: 'position', fields: { type: 'Choice', label: 'Position', widgetOptions: JSON.stringify({ choices: ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] }) } },
                { id: 'width', fields: { type: 'Text', label: 'Largeur' } },
                { id: 'height', fields: { type: 'Text', label: 'Hauteur' } },
                { id: 'style_preset', fields: { type: 'Text', label: 'Style' } },
                { id: 'color', fields: { type: 'Text', label: 'Couleur' } },
                { id: 'font_size', fields: { type: 'Text', label: 'Taille police' } }
            ]]);
        }

        for (const action of tablesToCreate) {
            await appState.docApi.applyUserActions([action]);
        }

        statusDiv.innerHTML = '<p style="color: #4CAF50;">✅ Tables créées avec succès!</p>';

        setTimeout(async () => {
            const check = await checkRequiredTables();
            if (check.allExist) {
                hideSetupScreen();
                await loadData();
                updateSyncStatus('connected', 'Connecté');
            }
        }, 1000);

    } catch (error) {
        console.error('❌ Error creating tables:', error);
        statusDiv.innerHTML = `
            <div style="background: rgba(244, 67, 54, 0.2); border: 2px solid #F44336; padding: 1em; border-radius: 8px;">
                <p><strong>❌ Erreur lors de la création :</strong></p>
                <p style="font-size: 0.85em;">${error.message}</p>
            </div>
        `;
        actionsDiv.style.display = 'block';
    }
};

// ========================================
// UNDO/REDO
// ========================================
function saveToHistory() {
    const state = {
        components: JSON.parse(JSON.stringify(appState.components))
    };
    appState.undoStack.push(state);
    appState.redoStack = [];

    // Limit stack size
    if (appState.undoStack.length > 50) {
        appState.undoStack.shift();
    }
}

function undo() {
    if (appState.undoStack.length === 0) return;

    const currentState = {
        components: JSON.parse(JSON.stringify(appState.components))
    };
    appState.redoStack.push(currentState);

    const previousState = appState.undoStack.pop();
    appState.components = previousState.components;

    if (appState.currentSlide) {
        loadSlideComponents(appState.currentSlide.id);
    }
}

function redo() {
    if (appState.redoStack.length === 0) return;

    const currentState = {
        components: JSON.parse(JSON.stringify(appState.components))
    };
    appState.undoStack.push(currentState);

    const nextState = appState.redoStack.pop();
    appState.components = nextState.components;

    if (appState.currentSlide) {
        loadSlideComponents(appState.currentSlide.id);
    }
}

// ========================================
// ZOOM CONTROLS
// ========================================
let canvasZoom = 1.0;

function zoomIn() {
    canvasZoom = Math.min(canvasZoom + 0.1, 2.0);
    applyZoom();
}

function zoomOut() {
    canvasZoom = Math.max(canvasZoom - 0.1, 0.5);
    applyZoom();
}

function applyZoom() {
    appState.canvas.setZoom(canvasZoom);
    appState.canvas.renderAll();
}

// ========================================
// BACKGROUND COLOR
// ========================================
let colorPickerInstance = null;

function initializeColorPicker() {
    const pickerButton = document.getElementById('bg-color-picker');

    if (pickerButton && typeof Pickr !== 'undefined') {
        colorPickerInstance = Pickr.create({
            el: pickerButton,
            theme: 'nano',
            default: '#1a1a1a',
            swatches: [
                '#1a1a1a', '#2a2a2a', '#667eea', '#764ba2',
                '#F44336', '#4CAF50', '#2196F3', '#FF9800'
            ],
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    save: true
                }
            }
        });

        colorPickerInstance.on('save', (color) => {
            if (appState.currentSlide && color) {
                const hexColor = color.toHEXA().toString();
                updateSlideBackground(hexColor);
            }
            colorPickerInstance.hide();
        });
    }
}

async function updateSlideBackground(color) {
    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.SLIDES, appState.currentSlide.id, {
                background_color: color
            }]
        ]);

        appState.canvas.setBackgroundColor(color, appState.canvas.renderAll.bind(appState.canvas));
        await loadData();
    } catch (error) {
        console.error('Error updating background:', error);
    }
}

// ========================================
// ENHANCED COMPONENT RENDERERS
// ========================================
function createCodeObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    return new fabric.Textbox(component.content || '// Code here', {
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 400,
        fontSize: 16,
        fill: '#00ff00',
        backgroundColor: '#1e1e1e',
        fontFamily: 'monospace',
        editable: false
    });
}

function createListObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    const items = (component.content || 'Item 1\nItem 2').split('\n');
    const listText = items.map(item => '• ' + item).join('\n');

    return new fabric.Textbox(listText, {
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 300,
        fontSize: parseFloat(component.font_size) || 20,
        fill: component.color || '#ffffff',
        fontFamily: 'Arial',
        editable: false
    });
}

function createQuoteObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    return new fabric.Textbox(component.content || '"Citation"\n— Auteur', {
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 400,
        fontSize: parseFloat(component.font_size) || 24,
        fill: component.color || '#ffffff',
        fontStyle: 'italic',
        fontFamily: 'Georgia',
        editable: false
    });
}

function createButtonObject(component) {
    const coords = getPositionCoords(component.position || 'center');
    const text = new fabric.Text(component.content || 'Button', {
        left: coords.x,
        top: coords.y,
        fontSize: 18,
        fill: '#ffffff',
        fontFamily: 'Arial'
    });

    const rect = new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: parseFloat(component.width) || 150,
        height: parseFloat(component.height) || 50,
        fill: '#4CAF50',
        rx: 6,
        ry: 6
    });

    const group = new fabric.Group([rect, text], {
        left: coords.x,
        top: coords.y
    });

    return group;
}

// Update addComponentToCanvas to use new renderers
const originalAddComponentToCanvas = addComponentToCanvas;
addComponentToCanvas = function(component) {
    let fabricObject;

    switch (component.type) {
        case 'text':
            fabricObject = createTextObject(component);
            break;
        case 'image':
            fabricObject = createImageObject(component);
            break;
        case 'shape':
            fabricObject = createShapeObject(component);
            break;
        case 'code':
            fabricObject = createCodeObject(component);
            break;
        case 'list':
            fabricObject = createListObject(component);
            break;
        case 'quote':
            fabricObject = createQuoteObject(component);
            break;
        case 'button':
            fabricObject = createButtonObject(component);
            break;
        default:
            fabricObject = createPlaceholderObject(component);
    }

    if (fabricObject) {
        fabricObject.componentData = component;
        appState.canvas.add(fabricObject);
        appState.fabricObjects.set(component.id, fabricObject);
    }
};

// ========================================
// DELETE COMPONENT
// ========================================
window.deleteComponent = async function() {
    const active = appState.canvas.getActiveObject();
    if (!active || !active.componentData) return;

    if (!confirm('Supprimer ce composant ?')) return;

    try {
        await appState.docApi.applyUserActions([
            ['RemoveRecord', CONFIG.TABLES.COMPONENTS, active.componentData.id]
        ]);

        appState.canvas.remove(active);
        await loadData();
        clearPropertiesPanel();
    } catch (error) {
        console.error('Error deleting component:', error);
    }
};

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas
    initializeCanvas();
    initializeDragDrop();
    initializeColorPicker();

    // Button listeners
    document.getElementById('btn-new-presentation')?.addEventListener('click', openNewPresentationModal);
    document.getElementById('btn-add-slide')?.addEventListener('click', addSlide);
    document.getElementById('btn-templates')?.addEventListener('click', openTemplatesModal);

    // Undo/Redo
    document.getElementById('btn-undo')?.addEventListener('click', undo);
    document.getElementById('btn-redo')?.addEventListener('click', redo);

    // Zoom
    document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
    document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);

    // Delete
    document.getElementById('btn-delete')?.addEventListener('click', deleteComponent);

    // Alignment buttons
    document.getElementById('btn-align-left')?.addEventListener('click', alignLeft);
    document.getElementById('btn-align-center')?.addEventListener('click', alignCenter);
    document.getElementById('btn-align-right')?.addEventListener('click', alignRight);
    document.getElementById('btn-align-top')?.addEventListener('click', alignTop);
    document.getElementById('btn-align-middle')?.addEventListener('click', alignMiddle);
    document.getElementById('btn-align-bottom')?.addEventListener('click', alignBottom);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
                e.preventDefault();
                redo();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteComponent();
            }
        }
    });

    // Presentation select
    document.getElementById('presentation-select')?.addEventListener('change', (e) => {
        if (e.target.value) {
            loadPresentation(parseInt(e.target.value));
        }
    });

    // Layout select
    document.getElementById('layout-select')?.addEventListener('change', async (e) => {
        if (appState.currentSlide) {
            try {
                await appState.docApi.applyUserActions([
                    ['UpdateRecord', CONFIG.TABLES.SLIDES, appState.currentSlide.id, {
                        layout: e.target.value
                    }]
                ]);
                await loadData();
            } catch (error) {
                console.error('Error updating layout:', error);
            }
        }
    });
});

// ========================================
// INITIALIZATION
// ========================================
console.log('🚀 Reveal.js Editor starting...');
console.log('📝 Version: 1.0.0');

initializeGristAPI();
