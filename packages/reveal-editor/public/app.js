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
        WIDTH: 960,  // Aligné avec Reveal.js
        HEIGHT: 700, // Aligné avec Reveal.js
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
        'quote', 'video', 'iframe', 'chart', 'shape', 'button'
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
            await ensureCanvasColumns();
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
            url: components.url?.[i],
            position: components.position?.[i] || 'center',
            width: components.width?.[i],
            height: components.height?.[i],
            style_preset: components.style_preset?.[i],
            color: components.color?.[i],
            background: components.background?.[i],
            font_size: components.font_size?.[i],
            x_canvas: components.x_canvas?.[i],
            y_canvas: components.y_canvas?.[i]
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
        // Update component position, width, height (valeurs numériques)
        obj.componentData.x_canvas = Math.round(obj.left);
        obj.componentData.y_canvas = Math.round(obj.top);
        obj.componentData.width = Math.round(obj.width * obj.scaleX);
        obj.componentData.height = Math.round(obj.height * obj.scaleY);

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

    // Show slide properties in panel
    showSlideProperties();
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
    const coords = getComponentCoords(component);

    const text = new fabric.Textbox(component.content || 'Double-clic pour éditer', {
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 300,
        fontSize: Number(component.font_size) || 24,
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

// Helper: obtenir coordonnées d'un composant
function getComponentCoords(component) {
    // Priorité 1: coordonnées canvas sauvegardées
    if (component.x_canvas !== undefined && component.y_canvas !== undefined) {
        return { x: component.x_canvas, y: component.y_canvas };
    }
    // Priorité 2: position prédéfinie
    return getPositionCoords(component.position || 'center');
}

// Convertir position textuelle en coordonnées (pour canvas 960x700)
function getPositionCoords(position) {
    const positions = {
        'top-left': { x: 80, y: 80 },
        'top': { x: 430, y: 80 },
        'top-right': { x: 780, y: 80 },
        'left': { x: 80, y: 325 },
        'center': { x: 430, y: 325 },
        'right': { x: 780, y: 325 },
        'bottom-left': { x: 80, y: 570 },
        'bottom': { x: 430, y: 570 },
        'bottom-right': { x: 780, y: 570 }
    };
    return positions[position] || positions['center'];
}

function createImageObject(component) {
    const coords = getComponentCoords(component);
    const imageUrl = component.url || component.attachment;

    if (!imageUrl) {
        // Placeholder si pas d'URL
        return new fabric.Rect({
            left: coords.x,
            top: coords.y,
            width: Number(component.width) || 200,
            height: Number(component.height) || 150,
            fill: '#333',
            stroke: '#666',
            strokeWidth: 2
        });
    }

    // Créer un placeholder temporaire
    const placeholder = new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 200,
        height: Number(component.height) || 150,
        fill: '#333',
        stroke: '#666',
        strokeWidth: 2,
        opacity: 0.5
    });

    // Charger l'image réelle
    fabric.Image.fromURL(imageUrl, (img) => {
        if (!img) return;

        img.set({
            left: coords.x,
            top: coords.y,
            scaleX: (Number(component.width) || 200) / img.width,
            scaleY: (Number(component.height) || 150) / img.height
        });

        img.componentData = component;

        // Remplacer le placeholder par l'image réelle
        const index = appState.canvas.getObjects().indexOf(placeholder);
        if (index !== -1) {
            appState.canvas.remove(placeholder);
            appState.canvas.insertAt(img, index);
            appState.fabricObjects.set(component.id, img);
            appState.canvas.renderAll();
        }
    }, { crossOrigin: 'anonymous' });

    return placeholder;
}

function createShapeObject(component) {
    const coords = getComponentCoords(component);
    return new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 100,
        height: Number(component.height) || 100,
        fill: component.color || '#4CAF50'
    });
}

function createPlaceholderObject(component) {
    const coords = getComponentCoords(component);
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

        // Utiliser coordonnées canvas pour positionnement précis (valeurs numériques)
        const componentData = {
            slide: appState.currentSlide.id,
            order: newOrder,
            type: type,
            content: getDefaultContent(type),
            position: 'center',  // Position par défaut pour compatibilité
            width: 300,
            height: 150,
            color: '#ffffff',
            font_size: 24,
            x_canvas: Math.round(x),
            y_canvas: Math.round(y)
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

    // Utilise la fonction du fichier properties-panels.js
    container.innerHTML = getPropertiesHTML(comp);
}

function clearPropertiesPanel() {
    // Quand on désélectionne un composant, afficher les propriétés de la slide
    if (appState.currentSlide) {
        showSlideProperties();
    } else {
        document.getElementById('properties-content').innerHTML = `
            <div class="empty-state">
                <p>Aucune sélection</p>
                <p style="font-size: 0.8em; opacity: 0.7;">Sélectionnez un composant ou une slide</p>
            </div>
        `;
    }
}

window.saveProperties = async function() {
    if (!appState.selectedComponent) return;

    const updates = {};
    const type = appState.selectedComponent.type;

    // Position et taille EN POURCENTAGES (interface principale)
    const xPercentValue = document.getElementById('prop-x-percent')?.value;
    const yPercentValue = document.getElementById('prop-y-percent')?.value;
    const widthPercentValue = document.getElementById('prop-width-percent')?.value;
    const heightPercentValue = document.getElementById('prop-height-percent')?.value;

    // Convertir pourcentages → pixels pour le canvas
    if (xPercentValue !== '') {
        updates.x_canvas = Math.round((parseFloat(xPercentValue) / 100) * CONFIG.CANVAS.WIDTH);
        updates.x_percent = parseFloat(xPercentValue);
    }
    if (yPercentValue !== '') {
        updates.y_canvas = Math.round((parseFloat(yPercentValue) / 100) * CONFIG.CANVAS.HEIGHT);
        updates.y_percent = parseFloat(yPercentValue);
    }
    if (widthPercentValue !== '') {
        updates.width = Math.round((parseFloat(widthPercentValue) / 100) * CONFIG.CANVAS.WIDTH);
        updates.width_percent = parseFloat(widthPercentValue);
    }
    if (heightPercentValue !== '') {
        updates.height = Math.round((parseFloat(heightPercentValue) / 100) * CONFIG.CANVAS.HEIGHT);
        updates.height_percent = parseFloat(heightPercentValue);
    }

    // Propriétés spécifiques au type
    const contentElem = document.getElementById('prop-content');
    const urlElem = document.getElementById('prop-url');
    const colorElem = document.getElementById('prop-color');
    const backgroundElem = document.getElementById('prop-background');
    const fontSizeElem = document.getElementById('prop-font-size');

    // Content (pour la plupart des types)
    if (contentElem) {
        updates.content = contentElem.value;
    }

    // URL (pour image, video, iframe, button)
    if (urlElem) {
        updates.url = urlElem.value;
    }

    // Couleur (pour text, code, list, quote, table, shape, button)
    if (colorElem) {
        updates.color = colorElem.value;
    }

    // Background (pour button)
    if (backgroundElem) {
        updates.background = backgroundElem.value;
    }

    // Font size (pour text, list, quote)
    if (fontSizeElem) {
        const fontSize = fontSizeElem.value;
        if (fontSize !== '') updates.font_size = parseInt(fontSize);
    }

    console.log(`💾 Saving properties for ${type}:`, updates);

    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, appState.selectedComponent.id, updates]
        ]);

        // Mettre à jour l'objet local
        Object.assign(appState.selectedComponent, updates);

        // Recharger et rafraîchir l'affichage
        await loadData();
        loadSlide(appState.currentSlide.id);

        console.log('✅ Properties saved successfully');
    } catch (error) {
        console.error('❌ Error saving properties:', error);
        alert('Erreur lors de la sauvegarde des propriétés');
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
// SLIDE PROPERTIES
// ========================================
function showSlideProperties() {
    if (!appState.currentSlide) return;

    const container = document.getElementById('properties-content');
    const slide = appState.currentSlide;

    container.innerHTML = `
        <div style="padding: 1em;">
            <h3 style="margin-top: 0;">📄 Propriétés de la Slide</h3>

            <div style="margin-bottom: 1em;">
                <label style="display: block; margin-bottom: 0.5em; color: #aaa;">Titre:</label>
                <input type="text" id="slide-prop-title" value="${slide.title || ''}"
                    style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #555; border-radius: 4px;">
            </div>

            <div style="margin-bottom: 1em;">
                <label style="display: block; margin-bottom: 0.5em; color: #aaa;">Layout:</label>
                <select id="slide-prop-layout"
                    style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <option value="title" ${slide.layout === 'title' ? 'selected' : ''}>Title</option>
                    <option value="content" ${slide.layout === 'content' ? 'selected' : ''}>Content</option>
                    <option value="two-col" ${slide.layout === 'two-col' ? 'selected' : ''}>Two Columns</option>
                    <option value="full" ${slide.layout === 'full' ? 'selected' : ''}>Full</option>
                </select>
            </div>

            <div style="margin-bottom: 1em;">
                <label style="display: block; margin-bottom: 0.5em; color: #aaa;">Couleur de fond:</label>
                <input type="color" id="slide-prop-background" value="${slide.background_color || '#1a1a1a'}"
                    style="width: 100%; height: 40px; background: #2a2a2a; border: 1px solid #555; border-radius: 4px; cursor: pointer;">
            </div>

            <div style="margin-bottom: 1em;">
                <label style="display: block; margin-bottom: 0.5em; color: #aaa;">Ordre:</label>
                <input type="number" id="slide-prop-order" value="${slide.order || 1}"
                    style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #555; border-radius: 4px;">
            </div>

            <button onclick="saveSlideProperties()"
                style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                💾 Enregistrer
            </button>
        </div>
    `;
}

window.saveSlideProperties = async function() {
    if (!appState.currentSlide) return;

    const title = document.getElementById('slide-prop-title').value;
    const layout = document.getElementById('slide-prop-layout').value;
    const backgroundColor = document.getElementById('slide-prop-background').value;
    const order = parseInt(document.getElementById('slide-prop-order').value);

    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.SLIDES, appState.currentSlide.id, {
                title: title,
                layout: layout,
                background_color: backgroundColor,
                order: order
            }]
        ]);

        // Update local state
        appState.currentSlide.title = title;
        appState.currentSlide.layout = layout;
        appState.currentSlide.background_color = backgroundColor;
        appState.currentSlide.order = order;

        // Update UI
        document.getElementById('current-slide-title').textContent = title || `Slide ${order}`;
        document.getElementById('layout-select').value = layout;

        // Update canvas background
        appState.canvas.setBackgroundColor(backgroundColor, appState.canvas.renderAll.bind(appState.canvas));

        // Reload data to update slide list
        await loadData();

        console.log('✅ Slide properties saved');
    } catch (error) {
        console.error('❌ Error saving slide properties:', error);
        alert('Erreur lors de la sauvegarde des propriétés');
    }
};

// ========================================
// CONTENT EDITOR (for code, list, quote)
// ========================================
function openContentEditor(component, title) {
    const modal = document.getElementById('content-editor-modal');
    const titleElement = document.getElementById('content-editor-title');
    const textarea = document.getElementById('content-editor-textarea');

    titleElement.textContent = title;
    textarea.value = component.content || '';
    modal.style.display = 'flex';

    // Store current component for saving
    window.currentEditingComponent = component;
}

window.closeContentEditorModal = function() {
    document.getElementById('content-editor-modal').style.display = 'none';
};

window.saveContentEdit = async function() {
    if (!window.currentEditingComponent) return;

    const content = document.getElementById('content-editor-textarea').value;

    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, window.currentEditingComponent.id, {
                content: content
            }]
        ]);

        await loadData();
        loadSlide(appState.currentSlide.id);
        closeContentEditorModal();
    } catch (error) {
        console.error('Error saving content:', error);
    }
};

// ========================================
// BUTTON EDITOR
// ========================================
function openButtonEditor(component) {
    const modal = document.getElementById('button-editor-modal');
    document.getElementById('button-content').value = component.content || '';
    document.getElementById('button-url').value = component.url || '';
    modal.style.display = 'flex';

    // Store current component for saving
    window.currentEditingComponent = component;
}

window.closeButtonEditorModal = function() {
    document.getElementById('button-editor-modal').style.display = 'none';
};

window.saveButtonEdit = async function() {
    if (!window.currentEditingComponent) return;

    const content = document.getElementById('button-content').value;
    const url = document.getElementById('button-url').value;

    try {
        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, window.currentEditingComponent.id, {
                content: content,
                url: url
            }]
        ]);

        await loadData();
        loadSlide(appState.currentSlide.id);
        closeButtonEditorModal();
    } catch (error) {
        console.error('Error saving button:', error);
    }
};

// ========================================
// TEMPLATES DEMONSTRATION COMPLETE
// Démontre TOUS les layouts et TOUS les composants
const SLIDE_TEMPLATES = [
    // ========================================
    // 1. LAYOUT: TITLE
    // ========================================
    {
        name: '1️⃣ Layout: Title',
        description: 'Layout page de titre',
        layout: 'title',
        background_color: '#667eea',
        components: [
            {
                type: 'text',
                width_percent: 80, height_percent: 18,
                content: '# Démonstration Complète',
                font_size: 64,
                color: '#ffffff',
                position: 'center'
            },
            {
                type: 'text',
                width_percent: 70, height_percent: 12,
                content: '9 Layouts • 11 Composants • 9 Positions',
                font_size: 28,
                color: '#e0e7ff',
                position: 'center'
            }
        ]
    },

    // ========================================
    // 2. LAYOUT: CONTENT
    // ========================================
    {
        name: '2️⃣ Layout: Content',
        description: 'Layout contenu simple',
        layout: 'content',
        background_color: '#2a2a2a',
        components: [
            {
                type: 'text',
                width_percent: 90, height_percent: 12,
                content: '## Layout: Content',
                font_size: 36,
                color: '#ffffff',
                position: 'top'
            },
            {
                type: 'text',
                width_percent: 80, height_percent: 30,
                content: 'Ce layout permet un contenu centré simple.\n\nIdéal pour un message unique et percutant.',
                font_size: 24,
                color: '#cccccc',
                position: 'center'
            }
        ]
    },

    // ========================================
    // 3. LAYOUT: TWO-COLUMN
    // ========================================
    {
        name: '3️⃣ Layout: Two-Column',
        description: 'Layout deux colonnes',
        layout: 'two-column',
        background_color: '#1a1a1a',
        components: [
            // Colonne gauche
            {
                type: 'text',
                width_percent: 80, height_percent: 15,
                content: '### Colonne Gauche',
                font_size: 24,
                color: '#4CAF50',
                position: 'left'
            },
            {
                type: 'list',
                width_percent: 80, height_percent: 50,
                content: '✓ Point 1\n✓ Point 2\n✓ Point 3\n✓ Point 4\n✓ Point 5',
                font_size: 20,
                color: '#cccccc',
                position: 'left'
            },
            // Colonne droite
            {
                type: 'text',
                width_percent: 80, height_percent: 15,
                content: '### Colonne Droite',
                font_size: 24,
                color: '#2196F3',
                position: 'right'
            },
            {
                type: 'chart',
                width_percent: 80, height_percent: 50,
                color: '#2196F3',
                position: 'right'
            }
        ]
    },

    // ========================================
    // 4. LAYOUT: THREE-COLUMN
    // ========================================
    {
        name: '4️⃣ Layout: Three-Column',
        description: 'Layout trois colonnes',
        layout: 'three-column',
        background_color: '#2a2a2a',
        components: [
            // Colonne 1
            {
                type: 'shape',
                width_percent: 60, height_percent: 20,
                color: '#4CAF50',
                position: 'col-1'
            },
            {
                type: 'text',
                width_percent: 60, height_percent: 15,
                content: '1',
                font_size: 56,
                color: '#ffffff',
                position: 'col-1'
            },
            {
                type: 'text',
                width_percent: 80, height_percent: 25,
                content: '### Créer\n\nAjoutez contenu',
                font_size: 18,
                color: '#cccccc',
                position: 'col-1'
            },
            // Colonne 2
            {
                type: 'shape',
                width_percent: 60, height_percent: 20,
                color: '#2196F3',
                position: 'col-2'
            },
            {
                type: 'text',
                width_percent: 60, height_percent: 15,
                content: '2',
                font_size: 56,
                color: '#ffffff',
                position: 'col-2'
            },
            {
                type: 'text',
                width_percent: 80, height_percent: 25,
                content: '### Éditer\n\nPersonnalisez',
                font_size: 18,
                color: '#cccccc',
                position: 'col-2'
            },
            // Colonne 3
            {
                type: 'shape',
                width_percent: 60, height_percent: 20,
                color: '#F44336',
                position: 'col-3'
            },
            {
                type: 'text',
                width_percent: 60, height_percent: 15,
                content: '3',
                font_size: 56,
                color: '#ffffff',
                position: 'col-3'
            },
            {
                type: 'text',
                width_percent: 80, height_percent: 25,
                content: '### Présenter\n\nAffichez',
                font_size: 18,
                color: '#cccccc',
                position: 'col-3'
            }
        ]
    },

    // ========================================
    // 5. LAYOUT: SIDEBAR-LEFT
    // ========================================
    {
        name: '5️⃣ Layout: Sidebar-Left',
        description: 'Layout sidebar gauche',
        layout: 'sidebar-left',
        background_color: '#1a1a1a',
        components: [
            // Sidebar gauche (col-1)
            {
                type: 'shape',
                width_percent: 85, height_percent: 85,
                color: '#2a2a2a',
                position: 'col-1'
            },
            {
                type: 'list',
                width_percent: 80, height_percent: 70,
                content: '📌 Navigation\n\n• Section 1\n• Section 2\n• Section 3\n• Section 4\n• Section 5',
                font_size: 16,
                color: '#4CAF50',
                position: 'col-1'
            },
            // Contenu principal (col-2)
            {
                type: 'text',
                width_percent: 85, height_percent: 60,
                content: '### Contenu Principal\n\nLe sidebar à gauche peut contenir un menu, une table des matières, ou des informations contextuelles.\n\nLe contenu principal occupe l\'espace restant.',
                font_size: 20,
                color: '#cccccc',
                position: 'col-2'
            }
        ]
    },

    // ========================================
    // 6. LAYOUT: SIDEBAR-RIGHT
    // ========================================
    {
        name: '6️⃣ Layout: Sidebar-Right',
        description: 'Layout sidebar droite',
        layout: 'sidebar-right',
        background_color: '#2a2a2a',
        components: [
            // Contenu principal (col-1)
            {
                type: 'code',
                width_percent: 85, height_percent: 60,
                content: '// Exemple d\'intégration\ngrist.ready();\n\ngrist.onRecords(records => {\n  records.forEach(rec => {\n    const data = rec.fields;\n    processData(data);\n  });\n});\n\nfunction processData(data) {\n  console.log(data);\n}',
                font_size: 16,
                color: '#00ff00',
                position: 'col-1'
            },
            // Sidebar droite (col-2)
            {
                type: 'shape',
                width_percent: 85, height_percent: 85,
                color: '#1a1a1a',
                position: 'col-2'
            },
            {
                type: 'text',
                width_percent: 80, height_percent: 70,
                content: '💡 Notes\n\nLe sidebar à droite est parfait pour:\n\n• Annotations\n• Explications\n• Références\n• Liens utiles',
                font_size: 15,
                color: '#FFC107',
                position: 'col-2'
            }
        ]
    },

    // ========================================
    // 7. LAYOUT: GRID-2X2
    // ========================================
    {
        name: '7️⃣ Layout: Grid-2x2',
        description: 'Layout grille 2x2',
        layout: 'grid-2x2',
        background_color: '#1a1a1a',
        components: [
            // Case 1 (top-left)
            {
                type: 'text',
                width_percent: 80, height_percent: 70,
                content: '📊\n\nGraphique\nCase 1',
                font_size: 22,
                color: '#ffffff',
                background: '#4CAF50',
                padding: 'medium',
                position: 'center'
            },
            // Case 2 (top-right)
            {
                type: 'text',
                width_percent: 80, height_percent: 70,
                content: '📈\n\nDonnées\nCase 2',
                font_size: 22,
                color: '#ffffff',
                background: '#2196F3',
                padding: 'medium',
                position: 'center'
            },
            // Case 3 (bottom-left)
            {
                type: 'text',
                width_percent: 80, height_percent: 70,
                content: '💻\n\nCode\nCase 3',
                font_size: 22,
                color: '#ffffff',
                background: '#F44336',
                padding: 'medium',
                position: 'center'
            },
            // Case 4 (bottom-right)
            {
                type: 'text',
                width_percent: 80, height_percent: 70,
                content: '🎯\n\nRésultats\nCase 4',
                font_size: 22,
                color: '#ffffff',
                background: '#FFC107',
                padding: 'medium',
                position: 'center'
            }
        ]
    },

    // ========================================
    // 8. LAYOUT: FULL
    // ========================================
    {
        name: '8️⃣ Layout: Full',
        description: 'Layout plein écran',
        layout: 'full',
        background_color: '#000000',
        components: [
            {
                type: 'video',
                width_percent: 100, height_percent: 100,
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                position: 'center'
            },
            {
                type: 'text',
                width_percent: 80,
                content: 'Layout Full - Médias plein écran',
                font_size: 20,
                color: '#ffffff',
                position: 'bottom'
            }
        ]
    },

    // ========================================
    // 9. LAYOUT: CUSTOM
    // ========================================
    {
        name: '9️⃣ Layout: Custom',
        description: 'Layout personnalisé',
        layout: 'custom',
        background_color: '#2a2a2a',
        components: [
            {
                type: 'text',
                x_percent: 50, y_percent: 15,
                width_percent: 80, height_percent: 12,
                content: '## Layout: Custom',
                font_size: 28,
                color: '#ffffff'
            },
            {
                type: 'text',
                x_percent: 50, y_percent: 50,
                width_percent: 70, height_percent: 30,
                content: 'Le layout custom permet une disposition totalement libre.\n\nVous positionnez chaque élément exactement où vous voulez avec x_percent et y_percent.',
                font_size: 20,
                color: '#cccccc'
            }
        ]
    },

    // ========================================
    // 10. DEMO DES 9 POSITIONS
    // ========================================
    {
        name: '📍 Les 9 Positions',
        description: 'Démonstration positions (custom layout)',
        layout: 'custom',
        background_color: '#2a2a2a',
        components: [
            {
                type: 'text',
                x_percent: 50, y_percent: 8,
                width_percent: 80, height_percent: 10,
                content: '## 9 Positions Disponibles',
                font_size: 24,
                color: '#ffffff'
            },
            // Grille 3x3 - en custom layout, on utilise x_percent/y_percent, pas position
            { type: 'text', x_percent: 17, y_percent: 25, width_percent: 22, height_percent: 16, content: 'top-left', font_size: 16, color: '#ffffff', background: '#F44336', padding: 'medium' },
            { type: 'text', x_percent: 50, y_percent: 25, width_percent: 22, height_percent: 16, content: 'top', font_size: 16, color: '#ffffff', background: '#E91E63', padding: 'medium' },
            { type: 'text', x_percent: 83, y_percent: 25, width_percent: 22, height_percent: 16, content: 'top-right', font_size: 16, color: '#ffffff', background: '#9C27B0', padding: 'medium' },

            { type: 'text', x_percent: 17, y_percent: 50, width_percent: 22, height_percent: 16, content: 'left', font_size: 16, color: '#ffffff', background: '#3F51B5', padding: 'medium' },
            { type: 'text', x_percent: 50, y_percent: 50, width_percent: 22, height_percent: 16, content: 'center', font_size: 16, color: '#ffffff', background: '#2196F3', padding: 'medium' },
            { type: 'text', x_percent: 83, y_percent: 50, width_percent: 22, height_percent: 16, content: 'right', font_size: 16, color: '#ffffff', background: '#009688', padding: 'medium' },

            { type: 'text', x_percent: 17, y_percent: 75, width_percent: 22, height_percent: 16, content: 'bottom-left', font_size: 16, color: '#ffffff', background: '#4CAF50', padding: 'medium' },
            { type: 'text', x_percent: 50, y_percent: 75, width_percent: 22, height_percent: 16, content: 'bottom', font_size: 16, color: '#ffffff', background: '#8BC34A', padding: 'medium' },
            { type: 'text', x_percent: 83, y_percent: 75, width_percent: 22, height_percent: 16, content: 'bottom-right', font_size: 16, color: '#ffffff', background: '#FFC107', padding: 'medium' }
        ]
    },

    // ========================================
    // 11. PAGE DE FIN
    // ========================================
    {
        name: '🏁 Fin de la démo',
        description: 'Page de conclusion',
        layout: 'title',
        background_color: '#667eea',
        components: [
            {
                type: 'text',
                width_percent: 80,
                content: '## Démonstration Complète',
                font_size: 56,
                color: '#ffffff',
                position: 'center'
            },
            {
                type: 'list',
                width_percent: 60,
                content: '✅ 9 Layouts différents\n✅ 11 Types de composants\n✅ 9 Positions disponibles\n✅ Personnalisation complète',
                font_size: 20,
                color: '#e0e7ff',
                position: 'center'
            }
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
        // Create slide avec couleur de fond
        const slideData = {
            presentation: appState.currentPresentation.id,
            order: appState.slides.filter(s => s.presentation === appState.currentPresentation.id).length + 1,
            title: template.name,
            layout: template.layout
        };

        if (template.background_color) {
            slideData.background_color = template.background_color;
        }

        const slideResult = await appState.docApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.SLIDES, null, slideData]
        ]);

        const slideId = slideResult.retValues ? slideResult.retValues[0] : slideResult[0];

        // Create components - convertir pourcentages en pixels
        for (let i = 0; i < template.components.length; i++) {
            const comp = template.components[i];
            const componentData = {
                slide: slideId,
                order: i + 1,
                type: comp.type,
                content: comp.content,
                url: comp.url,
                position: comp.position,
                font_size: comp.font_size,
                color: comp.color,
                background: comp.background
            };

            // Convertir pourcentages → pixels + garder pourcentages
            if (comp.x_percent !== undefined) {
                componentData.x_percent = comp.x_percent;
                componentData.x_canvas = Math.round((comp.x_percent / 100) * CONFIG.CANVAS.WIDTH);
            }
            if (comp.y_percent !== undefined) {
                componentData.y_percent = comp.y_percent;
                componentData.y_canvas = Math.round((comp.y_percent / 100) * CONFIG.CANVAS.HEIGHT);
            }
            if (comp.width_percent !== undefined) {
                componentData.width_percent = comp.width_percent;
                componentData.width = Math.round((comp.width_percent / 100) * CONFIG.CANVAS.WIDTH);
            }
            if (comp.height_percent !== undefined) {
                componentData.height_percent = comp.height_percent;
                componentData.height = Math.round((comp.height_percent / 100) * CONFIG.CANVAS.HEIGHT);
            }

            await appState.docApi.applyUserActions([
                ['AddRecord', CONFIG.TABLES.COMPONENTS, null, componentData]
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
        const updates = {
            width: component.width,
            height: component.height
        };

        // Ajouter x_canvas et y_canvas si définis (pour l'éditeur)
        if (component.x_canvas !== undefined) {
            updates.x_canvas = component.x_canvas;
        }
        if (component.y_canvas !== undefined) {
            updates.y_canvas = component.y_canvas;
        }

        // Calculer automatiquement les pourcentages (pour le visualisateur)
        if (component.x_canvas !== undefined && CONFIG.CANVAS.WIDTH) {
            updates.x_percent = (component.x_canvas / CONFIG.CANVAS.WIDTH) * 100;
        }
        if (component.y_canvas !== undefined && CONFIG.CANVAS.HEIGHT) {
            updates.y_percent = (component.y_canvas / CONFIG.CANVAS.HEIGHT) * 100;
        }
        if (component.width !== undefined && CONFIG.CANVAS.WIDTH) {
            updates.width_percent = (component.width / CONFIG.CANVAS.WIDTH) * 100;
        }
        if (component.height !== undefined && CONFIG.CANVAS.HEIGHT) {
            updates.height_percent = (component.height / CONFIG.CANVAS.HEIGHT) * 100;
        }

        console.log(`💾 Saving component ${component.id}:`, {
            pixels: `(${updates.x_canvas}, ${updates.y_canvas}) ${updates.width}x${updates.height}`,
            percent: `(${updates.x_percent?.toFixed(1)}%, ${updates.y_percent?.toFixed(1)}%) ${updates.width_percent?.toFixed(1)}%x${updates.height_percent?.toFixed(1)}%`
        });

        await appState.docApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.COMPONENTS, component.id, updates]
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

// Ensure all positioning columns exist (pixels and percentages)
async function ensureCanvasColumns() {
    try {
        const tables = await appState.docApi.fetchTable('_grist_Tables');
        const componentsTableId = tables.id.find((id, i) => tables.tableId[i] === CONFIG.TABLES.COMPONENTS);

        if (!componentsTableId) return;

        const columns = await appState.docApi.fetchTable('_grist_Tables_column');
        const componentColumns = columns.id.filter((id, i) => columns.parentId[i] === componentsTableId);
        const columnNames = componentColumns.map((id, idx) => {
            const i = columns.id.indexOf(id);
            return columns.colId[i];
        });

        const columnsToAdd = [];

        // Colonnes pixels (pour l'éditeur)
        if (!columnNames.includes('x_canvas')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'x_canvas', { type: 'Numeric', label: 'X Canvas (px)' }]);
        }
        if (!columnNames.includes('y_canvas')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'y_canvas', { type: 'Numeric', label: 'Y Canvas (px)' }]);
        }

        // Colonnes pourcentages (pour le visualisateur)
        if (!columnNames.includes('x_percent')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'x_percent', { type: 'Numeric', label: 'X (%)' }]);
        }
        if (!columnNames.includes('y_percent')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'y_percent', { type: 'Numeric', label: 'Y (%)' }]);
        }
        if (!columnNames.includes('width_percent')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'width_percent', { type: 'Numeric', label: 'Largeur (%)' }]);
        }
        if (!columnNames.includes('height_percent')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'height_percent', { type: 'Numeric', label: 'Hauteur (%)' }]);
        }

        // Autres colonnes
        if (!columnNames.includes('url')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'url', { type: 'Text', label: 'URL' }]);
        }
        if (!columnNames.includes('background')) {
            columnsToAdd.push(['AddColumn', CONFIG.TABLES.COMPONENTS, 'background', { type: 'Text', label: 'Couleur fond' }]);
        }

        if (columnsToAdd.length > 0) {
            console.log('📊 Adding missing columns:', columnsToAdd.map(c => c[2]));
            await appState.docApi.applyUserActions(columnsToAdd);
        }
    } catch (error) {
        console.error('Error ensuring columns:', error);
    }
}

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
                { id: 'url', fields: { type: 'Text', label: 'URL' } },
                { id: 'position', fields: { type: 'Choice', label: 'Position', widgetOptions: JSON.stringify({ choices: ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] }) } },
                { id: 'width', fields: { type: 'Int', label: 'Largeur (px)' } },
                { id: 'height', fields: { type: 'Int', label: 'Hauteur (px)' } },
                { id: 'style_preset', fields: { type: 'Text', label: 'Style' } },
                { id: 'color', fields: { type: 'Text', label: 'Couleur' } },
                { id: 'background', fields: { type: 'Text', label: 'Couleur fond' } },
                { id: 'font_size', fields: { type: 'Int', label: 'Taille police (px)' } },
                { id: 'x_canvas', fields: { type: 'Numeric', label: 'X Canvas (px)' } },
                { id: 'y_canvas', fields: { type: 'Numeric', label: 'Y Canvas (px)' } },
                { id: 'x_percent', fields: { type: 'Numeric', label: 'X (%)' } },
                { id: 'y_percent', fields: { type: 'Numeric', label: 'Y (%)' } },
                { id: 'width_percent', fields: { type: 'Numeric', label: 'Largeur (%)' } },
                { id: 'height_percent', fields: { type: 'Numeric', label: 'Hauteur (%)' } }
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
                await ensureCanvasColumns();
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
    const coords = getComponentCoords(component);
    const codeBox = new fabric.Textbox(component.content || '// Code here\n// Double-clic pour éditer', {
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 400,
        fontSize: 16,
        fill: component.color || '#00ff00',
        backgroundColor: '#1e1e1e',
        fontFamily: 'monospace',
        editable: false
    });

    // Double-click to edit
    codeBox.on('mousedblclick', () => {
        openContentEditor(component, '💻 Éditer le code');
    });

    return codeBox;
}

function createListObject(component) {
    const coords = getComponentCoords(component);
    const items = (component.content || 'Item 1\nItem 2\nDouble-clic pour éditer').split('\n');
    const listText = items.map(item => '• ' + item).join('\n');

    const listBox = new fabric.Textbox(listText, {
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 300,
        fontSize: Number(component.font_size) || 20,
        fill: component.color || '#ffffff',
        fontFamily: 'Arial',
        editable: false
    });

    // Double-click to edit
    listBox.on('mousedblclick', () => {
        openContentEditor(component, '📋 Éditer la liste');
    });

    return listBox;
}

function createQuoteObject(component) {
    const coords = getComponentCoords(component);
    const quoteBox = new fabric.Textbox(component.content || '"Citation"\n— Auteur\n\nDouble-clic pour éditer', {
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 400,
        fontSize: Number(component.font_size) || 24,
        fill: component.color || '#ffffff',
        fontStyle: 'italic',
        fontFamily: 'Georgia',
        editable: false
    });

    // Double-click to edit
    quoteBox.on('mousedblclick', () => {
        openContentEditor(component, '💬 Éditer la citation');
    });

    return quoteBox;
}

function createButtonObject(component) {
    const coords = getComponentCoords(component);
    const text = new fabric.Text(component.content || 'Button', {
        fontSize: 18,
        fill: component.color || '#ffffff',
        fontFamily: 'Arial',
        originX: 'center',
        originY: 'center'
    });

    const rect = new fabric.Rect({
        width: Number(component.width) || 150,
        height: Number(component.height) || 50,
        fill: component.background || '#4CAF50',
        rx: 6,
        ry: 6,
        originX: 'center',
        originY: 'center'
    });

    const group = new fabric.Group([rect, text], {
        left: coords.x,
        top: coords.y
    });

    // Double-click to edit
    group.on('mousedblclick', () => {
        openButtonEditor(component);
    });

    return group;
}

function createTableObject(component) {
    const coords = getComponentCoords(component);
    // Placeholder pour table - afficher un rectangle avec grille
    return new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 300,
        height: Number(component.height) || 150,
        fill: 'transparent',
        stroke: component.color || '#666',
        strokeWidth: 2
    });
}

function createVideoObject(component) {
    const coords = getComponentCoords(component);
    const videoWidth = Number(component.width) || 400;
    const videoHeight = Number(component.height) || 225;

    // Rectangle noir pour fond vidéo
    const rect = new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: videoWidth,
        height: videoHeight,
        fill: '#000',
        stroke: '#666',
        strokeWidth: 2
    });

    // Icône play
    const playIcon = new fabric.Triangle({
        left: coords.x + videoWidth / 2,
        top: coords.y + videoHeight / 2,
        width: 50,
        height: 50,
        fill: '#fff',
        angle: 90,
        originX: 'center',
        originY: 'center'
    });

    // Texte avec URL si disponible
    const elements = [rect, playIcon];
    if (component.url) {
        const urlText = new fabric.Text(component.url.substring(0, 40) + '...', {
            left: coords.x + 10,
            top: coords.y + videoHeight - 30,
            fontSize: 12,
            fill: '#fff',
            fontFamily: 'monospace'
        });
        elements.push(urlText);
    }

    return new fabric.Group(elements, {
        left: coords.x,
        top: coords.y
    });
}

function createIframeObject(component) {
    const coords = getComponentCoords(component);
    const iframeWidth = Number(component.width) || 400;
    const iframeHeight = Number(component.height) || 300;

    // Rectangle avec bordure pointillée
    const rect = new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: iframeWidth,
        height: iframeHeight,
        fill: '#f0f0f0',
        stroke: '#999',
        strokeWidth: 2,
        strokeDashArray: [5, 5]
    });

    // Texte "IFRAME" au centre
    const label = new fabric.Text('IFRAME', {
        left: coords.x + iframeWidth / 2,
        top: coords.y + iframeHeight / 2 - 20,
        fontSize: 20,
        fill: '#666',
        fontFamily: 'Arial',
        originX: 'center',
        originY: 'center'
    });

    const elements = [rect, label];

    // Afficher l'URL si disponible
    if (component.url) {
        const urlText = new fabric.Text(component.url.substring(0, 50) + '...', {
            left: coords.x + iframeWidth / 2,
            top: coords.y + iframeHeight / 2 + 10,
            fontSize: 12,
            fill: '#666',
            fontFamily: 'monospace',
            originX: 'center',
            originY: 'center'
        });
        elements.push(urlText);
    }

    return new fabric.Group(elements, {
        left: coords.x,
        top: coords.y
    });
}

function createChartObject(component) {
    const coords = getComponentCoords(component);
    // Placeholder pour chart
    return new fabric.Rect({
        left: coords.x,
        top: coords.y,
        width: Number(component.width) || 350,
        height: Number(component.height) || 250,
        fill: '#2a2a2a',
        stroke: '#666',
        strokeWidth: 2
    });
}

// Renderers map - tous les types de composants
const COMPONENT_RENDERERS_MAP = {
    'text': createTextObject,
    'image': createImageObject,
    'code': createCodeObject,
    'list': createListObject,
    'table': createTableObject,
    'quote': createQuoteObject,
    'video': createVideoObject,
    'iframe': createIframeObject,
    'chart': createChartObject,
    'shape': createShapeObject,
    'button': createButtonObject
};

// Update addComponentToCanvas to use all renderers
const originalAddComponentToCanvas = addComponentToCanvas;
addComponentToCanvas = function(component) {
    const renderer = COMPONENT_RENDERERS_MAP[component.type] || createPlaceholderObject;
    const fabricObject = renderer(component);

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
