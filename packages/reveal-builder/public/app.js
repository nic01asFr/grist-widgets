// ========================================
// REVEAL.JS BUILDER - GRIST WIDGET
// Data-driven presentation builder
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
    THEMES: [
        'black', 'white', 'league', 'sky', 'beige',
        'night', 'serif', 'simple', 'solarized', 'moon'
    ]
};

// ========================================
// STATE MANAGEMENT
// ========================================
const appState = {
    gristReady: false,
    gristApi: null,
    docApi: null,
    activePresentation: null,
    slides: [],
    components: [],
    tablesExist: {
        presentations: false,
        slides: false,
        components: false
    }
};

// ========================================
// STYLE PRESETS
// ========================================
const STYLE_PRESETS = {
    h1: { fontSize: '3em', fontWeight: 'bold', textTransform: 'uppercase' },
    h2: { fontSize: '2em', fontWeight: 'bold' },
    h3: { fontSize: '1.5em', fontWeight: 'bold' },
    h4: { fontSize: '1.2em', fontWeight: '600' },
    body: { fontSize: '1em', fontWeight: 'normal' },
    lead: { fontSize: '1.2em', fontWeight: 'normal' },
    caption: { fontSize: '0.8em', fontStyle: 'italic' },
    small: { fontSize: '0.7em', fontWeight: 'normal' },
    code: { fontSize: '0.9em', fontFamily: 'monospace' },
    quote: { fontSize: '1.1em', fontStyle: 'italic' }
};

// ========================================
// LAYOUT RENDERERS
// ========================================
const LAYOUTS = {
    title: {
        render: (slide, components) => `
            <div class="layout-title">
                ${components.map(c => renderComponent(c, 'center', 'title')).join('')}
            </div>
        `
    },

    content: {
        render: (slide, components) => `
            <div class="layout-content">
                ${components.map(c => renderComponent(c, null, 'content')).join('')}
            </div>
        `
    },

    'two-column': {
        render: (slide, components) => {
            const left = components.filter(c =>
                c.position === 'left' || c.position === 'col-1' || !c.position
            ).slice(0, Math.ceil(components.length / 2));
            const right = components.filter(c =>
                c.position === 'right' || c.position === 'col-2'
            );

            // Si pas de position spécifiée, split en 2
            if (right.length === 0 && left.length > 1) {
                const mid = Math.ceil(components.length / 2);
                return `
                    <div class="layout-two-column">
                        <div class="column-left">
                            ${components.slice(0, mid).map(c => renderComponent(c, null, 'two-column')).join('')}
                        </div>
                        <div class="column-right">
                            ${components.slice(mid).map(c => renderComponent(c, null, 'two-column')).join('')}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="layout-two-column">
                    <div class="column-left">
                        ${left.map(c => renderComponent(c, null, 'two-column')).join('')}
                    </div>
                    <div class="column-right">
                        ${right.map(c => renderComponent(c, null, 'two-column')).join('')}
                    </div>
                </div>
            `;
        }
    },

    'three-column': {
        render: (slide, components) => {
            const col1 = components.filter(c => c.position === 'col-1' || c.position === 'left');
            const col2 = components.filter(c => c.position === 'col-2' || c.position === 'center');
            const col3 = components.filter(c => c.position === 'col-3' || c.position === 'right');

            return `
                <div class="layout-three-column">
                    <div class="column">${col1.map(c => renderComponent(c, null, 'three-column')).join('')}</div>
                    <div class="column">${col2.map(c => renderComponent(c, null, 'three-column')).join('')}</div>
                    <div class="column">${col3.map(c => renderComponent(c, null, 'three-column')).join('')}</div>
                </div>
            `;
        }
    },

    'sidebar-left': {
        render: (slide, components) => {
            const left = components.filter(c => c.position === 'left' || c.position === 'col-1');
            const right = components.filter(c => c.position === 'right' || c.position === 'col-2' || !c.position);

            return `
                <div class="layout-sidebar-left">
                    <div class="sidebar">${left.map(c => renderComponent(c, null, 'sidebar-left')).join('')}</div>
                    <div class="main">${right.map(c => renderComponent(c, null, 'sidebar-left')).join('')}</div>
                </div>
            `;
        }
    },

    'sidebar-right': {
        render: (slide, components) => {
            const left = components.filter(c => c.position === 'left' || c.position === 'col-1' || !c.position);
            const right = components.filter(c => c.position === 'right' || c.position === 'col-2');

            return `
                <div class="layout-sidebar-right">
                    <div class="main">${left.map(c => renderComponent(c, null, 'sidebar-right')).join('')}</div>
                    <div class="sidebar">${right.map(c => renderComponent(c, null, 'sidebar-right')).join('')}</div>
                </div>
            `;
        }
    },

    'grid-2x2': {
        render: (slide, components) => `
            <div class="layout-grid-2x2">
                ${components.slice(0, 4).map(c => `
                    <div class="grid-item">${renderComponent(c, null, 'grid-2x2')}</div>
                `).join('')}
            </div>
        `
    },

    full: {
        render: (slide, components) => `
            <div class="layout-full">
                ${components.map(c => renderComponent(c, null, 'full')).join('')}
            </div>
        `
    },

    custom: {
        render: (slide, components) => `
            <div class="layout-custom">
                ${components.map(c => renderComponent(c, c.position, 'custom')).join('')}
            </div>
        `
    }
};

// ========================================
// COMPONENT RENDERERS
// ========================================
const COMPONENT_RENDERERS = {
    text: (c) => {
        // Si le contenu commence par # ou -, c'est du markdown
        const content = c.content || '';
        if (content.trim().match(/^(#|##|###|-|\*|>)/m)) {
            // Utiliser marked.js si disponible, sinon fallback
            if (typeof marked !== 'undefined') {
                return marked.parse(content);
            }
        }
        return `<p>${escapeHTML(content)}</p>`;
    },

    image: (c) => {
        const url = c.url || getAttachmentUrl(c.attachment);
        if (!url) return '<p style="opacity: 0.5;">⚠️ Aucune image</p>';

        const alt = c.content || 'Image';
        return `<img src="${url}" alt="${escapeHTML(alt)}" style="max-width: 100%; height: auto;" />`;
    },

    code: (c) => {
        if (!c.content) return '';

        const language = detectLanguage(c.content);

        // Utiliser highlight.js si disponible, sinon fallback
        if (typeof hljs !== 'undefined') {
            try {
                const highlighted = hljs.highlightAuto(c.content, [language]).value;
                return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
            } catch (error) {
                console.warn('Error with hljs, using fallback:', error);
                return `<pre><code class="language-${language}">${escapeHTML(c.content)}</code></pre>`;
            }
        } else {
            console.log('⚠️ hljs not available, using plain code block');
            // Fallback sans coloration syntaxique
            return `<pre><code class="language-${language}">${escapeHTML(c.content)}</code></pre>`;
        }
    },

    list: (c) => {
        if (!c.content) return '';

        const items = c.content.split('\n').filter(line => line.trim());
        return `<ul>${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
    },

    table: (c) => {
        if (!c.content) return '';

        try {
            const lines = c.content.split('\n').filter(line => line.trim());
            const rows = lines.map(line => line.split(/,|\t/));

            if (rows.length === 0) return '';

            const headers = rows[0];
            const data = rows.slice(1);

            return `
                <table class="data-table">
                    <thead>
                        <tr>${headers.map(h => `<th>${escapeHTML(h.trim())}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>${row.map(cell => `<td>${escapeHTML(cell.trim())}</td>`).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error rendering table:', error);
            return '<p style="opacity: 0.5;">⚠️ Erreur format tableau</p>';
        }
    },

    quote: (c) => {
        if (!c.content) return '';

        const parts = c.content.split('\n—');
        const quote = parts[0].replace(/^[""]|[""]$/g, '').trim();
        const author = parts[1] ? parts[1].trim() : null;

        return `
            <blockquote class="quote-block">
                <p>${escapeHTML(quote)}</p>
                ${author ? `<cite>— ${escapeHTML(author)}</cite>` : ''}
            </blockquote>
        `;
    },

    video: (c) => {
        let url = c.url || getAttachmentUrl(c.attachment);
        if (!url) return '<p style="opacity: 0.5;">⚠️ Aucune vidéo</p>';

        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = extractYouTubeId(url);
            if (videoId) {
                return `
                    <iframe
                        width="100%"
                        height="400"
                        src="https://www.youtube.com/embed/${videoId}"
                        frameborder="0"
                        allowfullscreen>
                    </iframe>
                `;
            }
        }

        // Vimeo
        if (url.includes('vimeo.com')) {
            const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
            if (videoId) {
                return `
                    <iframe
                        width="100%"
                        height="400"
                        src="https://player.vimeo.com/video/${videoId}"
                        frameborder="0"
                        allowfullscreen>
                    </iframe>
                `;
            }
        }

        // Vidéo standard
        return `
            <video controls style="max-width: 100%; height: auto;">
                <source src="${url}">
                Votre navigateur ne supporte pas la vidéo.
            </video>
        `;
    },

    iframe: (c) => {
        if (!c.url) return '<p style="opacity: 0.5;">⚠️ Aucune URL</p>';

        return `
            <iframe
                src="${escapeHTML(c.url)}"
                style="width: 100%; height: 500px; border: none;">
            </iframe>
        `;
    },

    chart: (c) => {
        if (!c.content) return '<p style="opacity: 0.5;">⚠️ Aucune donnée</p>';

        // Vérifier si Chart.js est disponible
        if (typeof Chart === 'undefined') {
            return '<p style="opacity: 0.5;">⚠️ Chart.js non disponible</p>';
        }

        const chartId = `chart-${c.id || Math.random().toString(36).substr(2, 9)}`;

        // Initialiser le graphique après un court délai
        setTimeout(() => {
            try {
                const config = JSON.parse(c.content);
                const ctx = document.getElementById(chartId);

                if (ctx) {
                    new Chart(ctx, config);
                }
            } catch (error) {
                console.error('Error creating chart:', error);
            }
        }, 200);

        return `<canvas id="${chartId}" style="max-height: 400px;"></canvas>`;
    },

    shape: (c) => {
        const shapes = {
            rectangle: '<div class="shape shape-rectangle"></div>',
            circle: '<div class="shape shape-circle"></div>',
            'arrow-right': '<div class="shape shape-arrow">→</div>',
            'arrow-down': '<div class="shape shape-arrow">↓</div>',
            triangle: '<div class="shape shape-triangle"></div>'
        };

        return shapes[c.content] || shapes.rectangle;
    },

    button: (c) => {
        if (!c.content) return '';

        const parts = c.content.split('|');
        const label = parts[0] || 'Button';
        const action = parts[1] || '';

        return `
            <button
                class="interactive-button"
                onclick="handleButtonAction('${escapeHTML(action)}')">
                ${escapeHTML(label)}
            </button>
        `;
    }
};

// ========================================
// COMPONENT RENDERER
// ========================================
function renderComponent(component, positionOverride = null, slideLayout = 'content') {
    const position = positionOverride || component.position || 'center';
    const preset = STYLE_PRESETS[component.style_preset] || {};

    // Ajouter le layout au composant pour le positionnement
    component._slideLayout = slideLayout;

    // Construire les styles
    const styles = {};

    // Appliquer preset D'ABORD (sera écrasé par les propriétés spécifiques du composant)
    Object.assign(styles, preset);

    // POSITIONNEMENT MODERNE avec Flexbox/Grid
    // Pour layout "custom" uniquement: utiliser position absolute (grille 12x12)
    // Pour les autres layouts: le positionnement est géré par flex/grid dans le CSS
    if (slideLayout === 'custom') {
        // Layout custom: position absolute avec coordonnées (ancien système)
        if (component.x_percent !== undefined && component.x_percent !== null &&
            component.y_percent !== undefined && component.y_percent !== null) {
            styles.position = 'absolute';
            styles.left = `${component.x_percent}%`;
            styles.top = `${component.y_percent}%`;
            console.log(`📍 [Custom] Component ${component.type} positioned at (${component.x_percent.toFixed(1)}%, ${component.y_percent.toFixed(1)}%)`);
        }
    } else {
        // Layouts modernes (flex/grid): pas de position absolute
        // Le positionnement est géré par les classes flex/grid du layout

        // Flex alignment pour composant individuel
        if (component.position) {
            const alignmentMap = {
                'top-left': { alignSelf: 'flex-start', justifySelf: 'flex-start' },
                'top': { alignSelf: 'flex-start', justifySelf: 'center' },
                'top-right': { alignSelf: 'flex-start', justifySelf: 'flex-end' },
                'left': { alignSelf: 'center', justifySelf: 'flex-start' },
                'center': { alignSelf: 'center', justifySelf: 'center' },
                'right': { alignSelf: 'center', justifySelf: 'flex-end' },
                'bottom-left': { alignSelf: 'flex-end', justifySelf: 'flex-start' },
                'bottom': { alignSelf: 'flex-end', justifySelf: 'center' },
                'bottom-right': { alignSelf: 'flex-end', justifySelf: 'flex-end' }
            };

            const alignment = alignmentMap[component.position];
            if (alignment) {
                Object.assign(styles, alignment);
            }
        }

        // Order pour contrôler l'ordre d'affichage dans flex
        if (component.order !== undefined && component.order !== null) {
            styles.order = component.order;
        }

        console.log(`📍 [${slideLayout}] Component ${component.type} using flex/grid positioning`);
    }

    // Dimensions en pourcentages (PRIORITÉ) ou pixels (FALLBACK)
    if (component.width_percent !== undefined && component.width_percent !== null) {
        styles.width = `${component.width_percent}%`;
    } else if (component.width && component.width !== 'auto') {
        styles.width = typeof component.width === 'number' ? `${component.width}px` : component.width;
    }

    if (component.height_percent !== undefined && component.height_percent !== null) {
        styles.height = `${component.height_percent}%`;
    } else if (component.height && component.height !== 'auto') {
        styles.height = typeof component.height === 'number' ? `${component.height}px` : component.height;
    }

    const fontSize = component.font_size === 'custom'
        ? component.font_size_custom
        : component.font_size;
    if (fontSize) {
        styles.fontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
    }

    // Propriétés du composant ÉCRASENT le preset
    if (component.color) styles.color = component.color;
    if (component.background) styles.background = component.background;
    if (component.align) styles.textAlign = component.align;

    // Padding
    const paddingMap = { small: '0.5em', medium: '1em', large: '2em' };
    if (component.padding && component.padding !== 'none') {
        styles.padding = paddingMap[component.padding] || component.padding;
    }

    // Border
    if (component.border) {
        styles.border = `2px solid ${component.border_color || 'rgba(255,255,255,0.3)'}`;
    }

    // Border radius
    const radiusMap = { small: '4px', medium: '8px', large: '16px', circle: '50%' };
    if (component.border_radius && component.border_radius !== 'none') {
        styles.borderRadius = radiusMap[component.border_radius] || component.border_radius;
    }

    // Shadow
    if (component.shadow) {
        styles.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    }

    // Custom CSS
    if (component.custom_css) {
        try {
            const customStyles = parseCssString(component.custom_css);
            Object.assign(styles, customStyles);
        } catch (e) {
            console.warn('Invalid custom CSS:', component.custom_css);
        }
    }

    const cssString = objectToCSS(styles);

    // Classes
    const classes = [
        'component',
        `component-${component.type}`,
        `position-${position}`,
        component.animation && component.animation !== 'none' ? `animate-${component.animation}` : '',
        component.border ? 'has-border' : '',
        component.shadow ? 'has-shadow' : ''
    ].filter(Boolean).join(' ');

    // Animation fragment Reveal.js
    const fragmentClass = component.animation && component.animation.startsWith('fragment-')
        ? ` class="fragment ${component.animation}"`
        : '';

    // Rendre le contenu
    const renderer = COMPONENT_RENDERERS[component.type] || COMPONENT_RENDERERS.text;
    const content = renderer(component);

    return `
        <div class="${classes}" style="${cssString}"${fragmentClass}>
            ${content}
        </div>
    `;
}

// ========================================
// SLIDE RENDERER
// ========================================
function renderSlide(slide, components) {
    const layout = LAYOUTS[slide.layout] || LAYOUTS.content;

    // Background
    const backgroundAttrs = [];

    if (slide.background_color) {
        backgroundAttrs.push(`data-background-color="${slide.background_color}"`);
    }

    if (slide.background_image && slide.background_image.length > 0) {
        const url = getAttachmentUrl(slide.background_image);
        if (url) {
            backgroundAttrs.push(`data-background-image="${url}"`);

            if (slide.background_size) {
                backgroundAttrs.push(`data-background-size="${slide.background_size}"`);
            }

            if (slide.background_opacity) {
                backgroundAttrs.push(`data-background-opacity="${slide.background_opacity}"`);
            }
        }
    }

    // Transition
    if (slide.transition_override) {
        backgroundAttrs.push(`data-transition="${slide.transition_override}"`);
    }

    // Auto-animate
    if (slide.auto_animate) {
        backgroundAttrs.push(`data-auto-animate`);
    }

    // Notes
    const notes = slide.notes ? `<aside class="notes">${escapeHTML(slide.notes)}</aside>` : '';

    return `
        <section
            data-slide-id="${slide.id}"
            ${backgroundAttrs.join(' ')}>
            ${layout.render(slide, components)}
            ${notes}
        </section>
    `;
}

// ========================================
// PRESENTATION BUILDER
// ========================================
function buildPresentation(presentation, slides, components) {
    console.log('🎬 Building presentation:', presentation.title);

    // Filtrer et trier les slides
    const sortedSlides = slides
        .filter(s => s.presentation === presentation.id)
        .sort((a, b) => a.order - b.order);

    console.log(`📊 ${sortedSlides.length} slides found`);

    // Générer HTML pour chaque slide
    const slidesHTML = sortedSlides.map(slide => {
        const slideComponents = components
            .filter(c => c.slide === slide.id)
            .sort((a, b) => a.order - b.order);

        console.log(`  Slide ${slide.order}: ${slideComponents.length} components`);

        return renderSlide(slide, slideComponents);
    });

    // Injecter dans le DOM
    const slidesContainer = document.querySelector('.reveal .slides');
    slidesContainer.innerHTML = slidesHTML.join('');

    // Mettre à jour le thème
    updateTheme(presentation.theme || 'black');

    // Mettre à jour UI
    document.getElementById('presentation-title').textContent = presentation.title || 'Sans titre';
    document.getElementById('slide-count').textContent = `${sortedSlides.length} slide${sortedSlides.length > 1 ? 's' : ''}`;

    // Réinitialiser Reveal.js et afficher quand prêt
    requestAnimationFrame(() => {
        if (typeof Reveal !== 'undefined') {
            Reveal.sync();
            Reveal.layout();
            console.log('✅ Reveal.js synced');

            // Afficher les slides maintenant qu'elles sont prêtes
            requestAnimationFrame(() => {
                document.querySelector('.reveal').classList.add('ready');
                console.log('✅ Slides visibles');
            });
        }
    });
}

// ========================================
// GRIST API
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

        // Vérifier les tables
        const tablesCheck = await checkRequiredTables();

        if (tablesCheck.allExist) {
            updateConnectionStatus('connected', 'Connecté');
            hideSetupScreen();

            // Charger les données
            await loadPresentations();
        } else {
            updateConnectionStatus('warning', 'Tables manquantes');
            showSetupError(tablesCheck.missing);
        }

    } catch (error) {
        console.error('❌ Error initializing Grist API:', error);
        updateConnectionStatus('error', 'Erreur connexion');
        showSetupError([error.message]);
    }
}

async function checkRequiredTables() {
    const result = {
        allExist: true,
        missing: []
    };

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

async function loadPresentations() {
    console.log('📊 Loading presentations...');

    try {
        // Charger toutes les tables
        const [presentations, slides, components] = await Promise.all([
            appState.docApi.fetchTable(CONFIG.TABLES.PRESENTATIONS),
            appState.docApi.fetchTable(CONFIG.TABLES.SLIDES),
            appState.docApi.fetchTable(CONFIG.TABLES.COMPONENTS)
        ]);

        // Trouver la présentation active
        const activeIndex = presentations.active ? presentations.active.indexOf(true) : -1;

        if (activeIndex === -1) {
            console.log('⚠️ No active presentation');
            showMessage('Aucune présentation active. Activez une présentation dans la table Presentations.');
            return;
        }

        // Construire l'objet présentation
        appState.activePresentation = {
            id: presentations.id[activeIndex],
            title: presentations.title?.[activeIndex],
            theme: presentations.theme?.[activeIndex] || 'black',
            transition: presentations.transition?.[activeIndex] || 'slide',
            controls: presentations.controls?.[activeIndex] !== false,
            progress_bar: presentations.progress_bar?.[activeIndex] !== false,
            slide_number: presentations.slide_number?.[activeIndex] !== false
        };

        // Construire les slides
        appState.slides = slides.id.map((id, i) => ({
            id,
            presentation: slides.presentation?.[i],
            order: slides.order?.[i] || 0,
            title: slides.title?.[i],
            layout: slides.layout?.[i] || 'content',
            background_type: slides.background_type?.[i],
            background_color: slides.background_color?.[i],
            background_image: slides.background_image?.[i],
            background_size: slides.background_size?.[i],
            background_opacity: slides.background_opacity?.[i],
            transition_override: slides.transition_override?.[i],
            auto_animate: slides.auto_animate?.[i],
            notes: slides.notes?.[i]
        }));

        // Construire les composants
        appState.components = components.id.map((id, i) => ({
            id,
            slide: components.slide?.[i],
            order: components.order?.[i] || 0,
            type: components.type?.[i] || 'text',
            content: components.content?.[i],
            attachment: components.attachment?.[i],
            url: components.url?.[i],
            position: components.position?.[i],
            width: components.width?.[i],
            height: components.height?.[i],
            style_preset: components.style_preset?.[i],
            align: components.align?.[i],
            font_size: components.font_size?.[i],
            font_size_custom: components.font_size_custom?.[i],
            color: components.color?.[i],
            background: components.background?.[i],
            padding: components.padding?.[i],
            border: components.border?.[i],
            border_color: components.border_color?.[i],
            border_radius: components.border_radius?.[i],
            shadow: components.shadow?.[i],
            animation: components.animation?.[i],
            custom_css: components.custom_css?.[i],
            // Coordonnées pixels (fallback)
            x_canvas: components.x_canvas?.[i],
            y_canvas: components.y_canvas?.[i],
            // Coordonnées pourcentages (PRIORITÉ)
            x_percent: components.x_percent?.[i],
            y_percent: components.y_percent?.[i],
            width_percent: components.width_percent?.[i],
            height_percent: components.height_percent?.[i]
        }));

        // Build presentation
        buildPresentation(appState.activePresentation, appState.slides, appState.components);

        // Listen for updates
        grist.onRecords(() => {
            console.log('📡 Data updated, reloading...');
            loadPresentations();
        });

    } catch (error) {
        console.error('❌ Error loading presentations:', error);
        showMessage('Erreur lors du chargement : ' + error.message);
    }
}

// ========================================
// TABLE CREATION
// ========================================
async function createTables() {
    console.log('🔨 Creating tables...');

    const setupStatus = document.getElementById('setup-status');
    setupStatus.innerHTML = '<div class="spinner"></div><p>Création des tables en cours...</p>';

    try {
        // Table Presentations
        if (!appState.tablesExist.presentations) {
            console.log('Creating Presentations table...');
            await appState.docApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.PRESENTATIONS, [
                    { id: 'title', type: 'Text' },
                    { id: 'theme', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: CONFIG.THEMES
                    })},
                    { id: 'transition', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['slide', 'fade', 'zoom', 'convex', 'concave', 'none']
                    })},
                    { id: 'active', type: 'Bool' },
                    { id: 'controls', type: 'Bool' },
                    { id: 'progress_bar', type: 'Bool' },
                    { id: 'slide_number', type: 'Bool' }
                ]]
            ]);
            console.log('✅ Presentations table created');
        }

        // Table Slides
        if (!appState.tablesExist.slides) {
            console.log('Creating Slides table...');
            await appState.docApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.SLIDES, [
                    { id: 'presentation', type: `Ref:${CONFIG.TABLES.PRESENTATIONS}` },
                    { id: 'order', type: 'Int' },
                    { id: 'title', type: 'Text' },
                    { id: 'layout', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['title', 'content', 'two-column', 'three-column', 'sidebar-left', 'sidebar-right', 'image-text', 'grid-2x2', 'full', 'custom']
                    })},
                    { id: 'background_type', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['color', 'image', 'gradient', 'video']
                    })},
                    { id: 'background_color', type: 'Text' },
                    { id: 'background_image', type: 'Attachments' },
                    { id: 'background_size', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['cover', 'contain', 'auto']
                    })},
                    { id: 'background_opacity', type: 'Numeric' },
                    { id: 'transition_override', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['slide', 'fade', 'zoom', 'convex', 'concave', 'none']
                    })},
                    { id: 'auto_animate', type: 'Bool' },
                    { id: 'notes', type: 'Text' }
                ]]
            ]);
            console.log('✅ Slides table created');
        }

        // Table Components
        if (!appState.tablesExist.components) {
            console.log('Creating Components table...');
            await appState.docApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.COMPONENTS, [
                    { id: 'slide', type: `Ref:${CONFIG.TABLES.SLIDES}` },
                    { id: 'order', type: 'Int' },
                    { id: 'type', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['text', 'image', 'code', 'list', 'table', 'quote', 'video', 'iframe', 'chart', 'shape', 'button']
                    })},
                    { id: 'content', type: 'Text' },
                    { id: 'attachment', type: 'Attachments' },
                    { id: 'url', type: 'Text' },
                    { id: 'position', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['center', 'left', 'right', 'top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right', 'col-1', 'col-2', 'col-3']
                    })},
                    { id: 'width', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['auto', '25%', '33%', '50%', '66%', '75%', '100%']
                    })},
                    { id: 'height', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['auto', '25%', '50%', '75%', '100%']
                    })},
                    { id: 'style_preset', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['h1', 'h2', 'h3', 'h4', 'body', 'lead', 'caption', 'small', 'code', 'quote']
                    })},
                    { id: 'align', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['left', 'center', 'right', 'justify']
                    })},
                    { id: 'font_size', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['0.5em', '0.75em', '1em', '1.5em', '2em', '3em', 'custom']
                    })},
                    { id: 'font_size_custom', type: 'Text' },
                    { id: 'color', type: 'Text' },
                    { id: 'background', type: 'Text' },
                    { id: 'padding', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['none', 'small', 'medium', 'large']
                    })},
                    { id: 'border', type: 'Bool' },
                    { id: 'border_color', type: 'Text' },
                    { id: 'border_radius', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['none', 'small', 'medium', 'large', 'circle']
                    })},
                    { id: 'shadow', type: 'Bool' },
                    { id: 'animation', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['none', 'fade-in', 'slide-in-left', 'slide-in-right', 'slide-in-up', 'slide-in-down', 'zoom-in', 'zoom-out', 'fragment-fade', 'fragment-grow', 'fragment-shrink']
                    })},
                    { id: 'custom_css', type: 'Text' }
                ]]
            ]);
            console.log('✅ Components table created');
        }

        setupStatus.innerHTML = '<p style="color: #4CAF50;">✅ Tables créées avec succès !</p>';

        setTimeout(() => {
            hideSetupScreen();
            loadPresentations();
        }, 1500);

    } catch (error) {
        console.error('❌ Error creating tables:', error);
        setupStatus.innerHTML = `<p style="color: #F44336;">❌ Erreur: ${error.message}</p>`;
    }
}

// ========================================
// REVEAL.JS INITIALIZATION
// ========================================
function initializeRevealJS() {
    if (typeof Reveal === 'undefined') {
        console.error('❌ Reveal.js not loaded yet');
        return false;
    }

    try {
        Reveal.initialize({
            hash: false,
            embedded: true,
            slideNumber: 'c/t',
            transition: 'slide',
            keyboard: true,
            overview: true,
            center: false,  // Désactivé pour alignement cohérent avec l'éditeur
            touch: true,
            controls: true,
            progress: true,
            margin: 0,      // Pas de marge pour correspondance exacte avec l'éditeur
            width: 960,     // Dimensions exactes (natives)
            height: 700,    // Dimensions exactes (natives)
            minScale: 1.0,  // Échelle fixe 1:1 comme l'éditeur
            maxScale: 1.0   // Pas de scaling, correspondance exacte avec l'éditeur
        });

        Reveal.on('ready', () => {
            console.log('🎬 Reveal.js ready');
            // Afficher les slides une fois Reveal.js prêt
            requestAnimationFrame(() => {
                document.querySelector('.reveal').classList.add('ready');
            });
        });

        Reveal.on('slidechanged', (event) => {
            console.log('📍 Slide changed:', event.indexh);
        });

        console.log('✅ Reveal.js initialized');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Reveal.js:', error);
        return false;
    }
}

function waitForReveal() {
    if (typeof Reveal !== 'undefined') {
        console.log('✅ Reveal.js detected');
        initializeRevealJS();
    } else {
        console.log('⏳ Waiting for Reveal.js...');
        setTimeout(waitForReveal, 100);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getAttachmentUrl(attachmentCell) {
    if (!attachmentCell || attachmentCell.length === 0) return '';

    const attachment = attachmentCell[0];
    return attachment.url || attachment;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function detectLanguage(code) {
    if (code.includes('function') || code.includes('const') || code.includes('let')) return 'javascript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('SELECT') || code.includes('FROM')) return 'sql';
    if (code.includes('<div') || code.includes('<html')) return 'html';
    if (code.includes('{') && code.includes('}')) return 'css';
    return 'plaintext';
}

function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,
        /youtube\.com\/embed\/([^?]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

function objectToCSS(obj) {
    return Object.entries(obj)
        .map(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssKey}: ${value}`;
        })
        .join('; ');
}

function parseCssString(cssString) {
    const styles = {};
    cssString.split(';').forEach(rule => {
        const [key, value] = rule.split(':').map(s => s.trim());
        if (key && value) {
            const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styles[camelKey] = value;
        }
    });
    return styles;
}

function updateTheme(theme) {
    const themeLink = document.getElementById('reveal-theme');
    themeLink.href = `https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/${theme}.css`;
}

function updateConnectionStatus(status, text) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');

    statusDot.className = '';
    if (status === 'connected') {
        statusDot.classList.add('connected');
    } else if (status === 'error') {
        statusDot.classList.add('error');
    } else if (status === 'warning') {
        statusDot.classList.add('warning');
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
        <div class="message-box error">
            <p><strong>⚠️ Tables manquantes détectées :</strong></p>
            <p style="font-size: 0.85em;">${missing.join(', ')}</p>
        </div>
    `;

    errorDiv.style.display = 'block';
    actionsDiv.style.display = 'block';

    document.getElementById('setup-status').style.display = 'none';
}

function showMessage(message) {
    console.log('💬', message);
    // Could show a toast notification
}

function handleButtonAction(action) {
    console.log('🔘 Button action:', action);

    if (action.startsWith('http')) {
        window.open(action, '_blank');
    } else if (action.startsWith('slide:')) {
        const slideNumber = parseInt(action.replace('slide:', ''));
        Reveal.slide(slideNumber);
    }
}

// ========================================
// EVENT HANDLERS
// ========================================
document.getElementById('btn-create-tables')?.addEventListener('click', createTables);

document.getElementById('btn-reload')?.addEventListener('click', () => {
    console.log('🔄 Reloading presentation...');
    loadPresentations();
});

document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    }
});

// ========================================
// INITIALIZATION
// ========================================
console.log('🚀 Reveal.js Builder starting...');
console.log('📝 Version: 1.1.0 (with hljs fallback)');
console.log('📚 hljs available:', typeof hljs !== 'undefined');
console.log('📊 Chart available:', typeof Chart !== 'undefined');
console.log('📝 marked available:', typeof marked !== 'undefined');

waitForReveal();
initializeGristAPI();
