// =========================================
// ZEBRA Reveal Builder - Main Application
// =========================================

class ZebraRevealBuilder {
    constructor() {
        this.gristReady = false;
        this.currentSlide = null;
        this.currentPresentation = null;
        this.slides = [];
        this.tables = [];
        this.isDirty = false;
        this.autoSaveInterval = null;
        
        this.init();
    }

    /**
     * Initialisation de l'application
     */
    async init() {
        console.log('🚀 Initialisation ZEBRA Reveal Builder...');
        
        try {
            // Initialiser Grist
            await this.initGrist();
            
            // Charger les templates dans l'UI
            this.loadTemplates();
            
            // Initialiser les event listeners
            this.initEventListeners();
            
            // Charger la présentation
            await this.loadPresentation();
            
            // Auto-save toutes les 30 secondes
            this.autoSaveInterval = setInterval(() => {
                if (this.isDirty) {
                    this.saveCurrentSlide();
                }
            }, 30000);
            
            console.log('✅ Application prête');
            
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            this.showError('Erreur d\'initialisation: ' + error.message);
        }
    }

    /**
     * Initialise la connexion avec Grist
     */
    async initGrist() {
        if (typeof grist === 'undefined') {
            console.warn('⚠️ Mode démo (Grist non disponible)');
            this.loadDemoData();
            return;
        }

        try {
            await grist.ready({ requiredAccess: 'full', columns: ['*'] });
            this.gristReady = true;
            console.log('✅ Grist connecté');
            
            // Créer les tables si nécessaire
            await this.ensureTablesExist();
            
            // Charger la liste des tables disponibles
            await this.loadAvailableTables();
            
        } catch (error) {
            console.error('❌ Erreur connexion Grist:', error);
            throw error;
        }
    }

    /**
     * Crée les tables nécessaires si elles n'existent pas
     */
    async ensureTablesExist() {
        if (!this.gristReady) return;

        try {
            const tables = await grist.docApi.listTables();
            const tableNames = tables.map(t => t.id);

            // Table ZEBRA_Presentations
            if (!tableNames.includes('ZEBRA_Presentations')) {
                await grist.docApi.applyUserActions([
                    ['AddTable', 'ZEBRA_Presentations', [
                        { id: 'id', type: 'Text' },
                        { id: 'title', type: 'Text' },
                        { id: 'subtitle', type: 'Text' },
                        { id: 'author', type: 'Text' },
                        { id: 'date', type: 'Date' },
                        { id: 'theme', type: 'Choice', widgetOptions: JSON.stringify({ choices: ['white', 'black', 'league', 'sky', 'beige'] }) },
                        { id: 'transition', type: 'Choice', widgetOptions: JSON.stringify({ choices: ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'] }) },
                        { id: 'slides_data', type: 'Text' },
                        { id: 'config_json', type: 'Text' },
                        { id: 'created_at', type: 'DateTime' },
                        { id: 'updated_at', type: 'DateTime' }
                    ]]
                ]);
                console.log('✅ Table ZEBRA_Presentations créée');
            }

            // Table ZEBRA_Slides
            if (!tableNames.includes('ZEBRA_Slides')) {
                await grist.docApi.applyUserActions([
                    ['AddTable', 'ZEBRA_Slides', [
                        { id: 'id', type: 'Text' },
                        { id: 'presentation_id', type: 'Text' },
                        { id: 'section', type: 'Choice', widgetOptions: JSON.stringify({ choices: ['intro', 'probleme', 'solution', 'donnees', 'ia', 'processus', 'resultats', 'impact', 'techno', 'deploiement', 'partenaires', 'qr', 'ressources', 'conclusion'] }) },
                        { id: 'order', type: 'Numeric' },
                        { id: 'type', type: 'Choice', widgetOptions: JSON.stringify({ choices: ['horizontal', 'vertical'] }) },
                        { id: 'title', type: 'Text' },
                        { id: 'content', type: 'Text' },
                        { id: 'notes', type: 'Text' },
                        { id: 'background', type: 'Text' },
                        { id: 'background_image', type: 'Text' },
                        { id: 'transition', type: 'Choice', widgetOptions: JSON.stringify({ choices: ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'] }) },
                        { id: 'data_source', type: 'Text' },
                        { id: 'template', type: 'Choice', widgetOptions: JSON.stringify({ choices: ['title', 'content', 'two-columns', 'image-left', 'image-right', 'quote', 'stats', 'comparison', 'timeline'] }) }
                    ]]
                ]);
                console.log('✅ Table ZEBRA_Slides créée');
            }

        } catch (error) {
            console.error('❌ Erreur création tables:', error);
        }
    }

    /**
     * Charge la liste des tables disponibles pour data binding
     */
    async loadAvailableTables() {
        if (!this.gristReady) return;

        try {
            const tables = await grist.docApi.listTables();
            this.tables = tables.map(t => t.id);
            
            // Mettre à jour le select de data source
            const select = document.getElementById('dataSourceTable');
            if (select) {
                select.innerHTML = '<option value="">Aucune</option>';
                this.tables.forEach(table => {
                    if (!table.startsWith('_grist_') && !table.startsWith('ZEBRA_')) {
                        const option = document.createElement('option');
                        option.value = table;
                        option.textContent = table;
                        select.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Erreur chargement tables:', error);
        }
    }

    /**
     * Charge les templates dans l'interface
     */
    loadTemplates() {
        const templateGrid = document.getElementById('templateGrid');
        if (!templateGrid) return;

        templateGrid.innerHTML = '';

        Object.entries(ZEBRA_TEMPLATES).forEach(([key, template]) => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.dataset.template = key;
            card.innerHTML = `
                <div class="template-icon">${template.icon}</div>
                <div class="template-name">${template.name}</div>
            `;
            
            card.addEventListener('click', () => {
                this.applyTemplate(key);
            });
            
            templateGrid.appendChild(card);
        });
    }

    /**
     * Applique un template à la slide courante
     */
    applyTemplate(templateKey) {
        if (!this.currentSlide) return;

        const template = ZEBRA_TEMPLATES[templateKey];
        if (!template) return;

        // Mettre à jour l'éditeur
        const editor = document.getElementById('slideEditor');
        if (editor) {
            editor.value = template.content;
            this.isDirty = true;
            this.updateCharCount();
        }

        // Highlight template actif
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-template="${templateKey}"]`)?.classList.add('active');
    }

    /**
     * Charge ou crée la présentation
     */
    async loadPresentation() {
        this.showLoading(true);

        try {
            if (!this.gristReady) {
                // Mode démo
                this.loadDemoData();
                return;
            }

            // Charger depuis Grist
            const presentations = await grist.docApi.fetchTable('ZEBRA_Presentations');
            const presRecords = this.convertGristTableToRecords(presentations);

            if (presRecords.length === 0) {
                // Créer une nouvelle présentation
                await this.createNewPresentation();
            } else {
                // Charger la première présentation
                this.currentPresentation = presRecords[0];
                await this.loadSlides();
            }

        } catch (error) {
            console.error('❌ Erreur chargement présentation:', error);
            this.showError('Erreur de chargement: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Crée une nouvelle présentation
     */
    async createNewPresentation() {
        const presentation = {
            id: `pres_${Date.now()}`,
            title: 'Présentation ZEBRA',
            subtitle: 'Diagnostic Sécurité Passages Piétons',
            author: 'CEREMA',
            date: new Date().toISOString().split('T')[0],
            theme: 'white',
            transition: 'slide',
            slides_data: '[]',
            config_json: '{}',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (this.gristReady) {
            await grist.docApi.applyUserActions([
                ['AddRecord', 'ZEBRA_Presentations', null, presentation]
            ]);
        }

        this.currentPresentation = presentation;
        
        // Créer des slides par défaut
        await this.createDefaultSlides();
    }

    /**
     * Crée les slides par défaut (14 sections ZEBRA)
     */
    async createDefaultSlides() {
        const sections = [
            'intro', 'probleme', 'solution', 'donnees', 'ia', 
            'processus', 'resultats', 'impact', 'techno', 
            'deploiement', 'partenaires', 'qr', 'ressources', 'conclusion'
        ];

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const template = ZEBRA_SECTION_TEMPLATES[section];
            
            const slide = {
                id: `slide_${Date.now()}_${i}`,
                presentation_id: this.currentPresentation.id,
                section,
                order: i + 1,
                type: 'horizontal',
                title: template?.title || `Section ${i + 1}`,
                content: template?.content || '',
                notes: '',
                background: '#ffffff',
                background_image: '',
                transition: 'slide',
                data_source: '',
                template: 'content'
            };

            if (this.gristReady) {
                await grist.docApi.applyUserActions([
                    ['AddRecord', 'ZEBRA_Slides', null, slide]
                ]);
            }

            this.slides.push(slide);
        }

        this.renderSlidesList();
    }

    /**
     * Charge les slides de la présentation courante
     */
    async loadSlides() {
        if (!this.gristReady || !this.currentPresentation) return;

        try {
            const slidesData = await grist.docApi.fetchTable('ZEBRA_Slides');
            const allSlides = this.convertGristTableToRecords(slidesData);
            
            // Filtrer par presentation_id et trier par order
            this.slides = allSlides
                .filter(s => s.presentation_id === this.currentPresentation.id)
                .sort((a, b) => a.order - b.order);

            this.renderSlidesList();

            // Sélectionner la première slide
            if (this.slides.length > 0) {
                this.selectSlide(this.slides[0].id);
            }

        } catch (error) {
            console.error('❌ Erreur chargement slides:', error);
        }
    }

    /**
     * Affiche la liste des slides dans le panneau gauche
     */
    renderSlidesList() {
        const slidesList = document.getElementById('slidesList');
        if (!slidesList) return;

        slidesList.innerHTML = '';

        this.slides.forEach(slide => {
            const item = document.createElement('div');
            item.className = 'slide-item';
            item.dataset.slideId = slide.id;
            
            item.innerHTML = `
                <div class="slide-item-header">
                    <div>
                        <div class="slide-item-title">${this.truncate(slide.title, 30)}</div>
                        <div class="slide-item-section">${slide.section}</div>
                    </div>
                    <div class="slide-item-actions">
                        <button class="slide-item-btn" data-action="duplicate" title="Dupliquer">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="slide-item-btn" data-action="delete" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (!e.target.closest('.slide-item-btn')) {
                    this.selectSlide(slide.id);
                }
            });

            item.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.duplicateSlide(slide.id);
            });

            item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSlide(slide.id);
            });

            slidesList.appendChild(item);
        });

        // Initialiser Sortable pour drag & drop
        if (typeof Sortable !== 'undefined') {
            new Sortable(slidesList, {
                animation: 150,
                onEnd: (evt) => {
                    this.reorderSlides(evt.oldIndex, evt.newIndex);
                }
            });
        }
    }

    /**
     * Sélectionne une slide
     */
    selectSlide(slideId) {
        const slide = this.slides.find(s => s.id === slideId);
        if (!slide) return;

        // Sauvegarder la slide précédente si modifiée
        if (this.isDirty && this.currentSlide) {
            this.saveCurrentSlide();
        }

        this.currentSlide = slide;
        this.isDirty = false;

        // Mettre à jour l'UI
        this.updateEditorWithSlide(slide);
        
        // Highlight dans la liste
        document.querySelectorAll('.slide-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-slide-id="${slideId}"]`)?.classList.add('active');
    }

    /**
     * Met à jour l'éditeur avec les données de la slide
     */
    updateEditorWithSlide(slide) {
        // Breadcrumb
        document.getElementById('editorBreadcrumb').textContent = 
            `${slide.section} > Slide ${slide.order}`;

        // Éditeur
        document.getElementById('slideEditor').value = slide.content || '';
        
        // Propriétés
        document.getElementById('slideSection').value = slide.section;
        document.getElementById('slideType').value = slide.type;
        document.getElementById('slideTransition').value = slide.transition;
        document.getElementById('slideBackground').value = slide.background;
        document.getElementById('slideBackgroundImage').value = slide.background_image || '';
        document.getElementById('slideNotes').value = slide.notes || '';
        document.getElementById('dataSourceTable').value = '';
        document.getElementById('dataQuery').value = slide.data_source || '';

        this.updateCharCount();
    }

    /**
     * Sauvegarde la slide courante
     */
    async saveCurrentSlide() {
        if (!this.currentSlide) return;

        try {
            // Récupérer les valeurs de l'UI
            const updates = {
                content: document.getElementById('slideEditor').value,
                section: document.getElementById('slideSection').value,
                type: document.getElementById('slideType').value,
                transition: document.getElementById('slideTransition').value,
                background: document.getElementById('slideBackground').value,
                background_image: document.getElementById('slideBackgroundImage').value,
                notes: document.getElementById('slideNotes').value,
                data_source: document.getElementById('dataQuery').value
            };

            // Mettre à jour localement
            Object.assign(this.currentSlide, updates);

            // Sauvegarder dans Grist
            if (this.gristReady) {
                const rowId = await this.getRowIdForSlide(this.currentSlide.id);
                if (rowId) {
                    await grist.docApi.applyUserActions([
                        ['UpdateRecord', 'ZEBRA_Slides', rowId, updates]
                    ]);
                }
            }

            this.isDirty = false;
            
            // Mettre à jour le statut
            const now = new Date();
            document.getElementById('lastSaved').textContent = 
                `Sauvegardé à ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

            this.renderSlidesList();

        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
            this.showError('Erreur de sauvegarde: ' + error.message);
        }
    }

    /**
     * Ajoute une nouvelle slide
     */
    async addSlide() {
        const newSlide = {
            id: `slide_${Date.now()}`,
            presentation_id: this.currentPresentation.id,
            section: 'intro',
            order: this.slides.length + 1,
            type: 'horizontal',
            title: '## Nouvelle Slide',
            content: 'Contenu à compléter...',
            notes: '',
            background: '#ffffff',
            background_image: '',
            transition: 'slide',
            data_source: '',
            template: 'content'
        };

        if (this.gristReady) {
            await grist.docApi.applyUserActions([
                ['AddRecord', 'ZEBRA_Slides', null, newSlide]
            ]);
        }

        this.slides.push(newSlide);
        this.renderSlidesList();
        this.selectSlide(newSlide.id);
    }

    /**
     * Duplique une slide
     */
    async duplicateSlide(slideId) {
        const original = this.slides.find(s => s.id === slideId);
        if (!original) return;

        const duplicate = {
            ...original,
            id: `slide_${Date.now()}`,
            order: original.order + 0.5
        };

        if (this.gristReady) {
            await grist.docApi.applyUserActions([
                ['AddRecord', 'ZEBRA_Slides', null, duplicate]
            ]);
        }

        this.slides.push(duplicate);
        this.slides.sort((a, b) => a.order - b.order);
        
        // Renormaliser les orders
        this.slides.forEach((s, i) => {
            s.order = i + 1;
        });

        this.renderSlidesList();
    }

    /**
     * Supprime une slide
     */
    async deleteSlide(slideId) {
        if (!confirm('Supprimer cette slide ?')) return;

        if (this.gristReady) {
            const rowId = await this.getRowIdForSlide(slideId);
            if (rowId) {
                await grist.docApi.applyUserActions([
                    ['RemoveRecord', 'ZEBRA_Slides', rowId]
                ]);
            }
        }

        this.slides = this.slides.filter(s => s.id !== slideId);
        this.renderSlidesList();

        // Sélectionner une autre slide
        if (this.slides.length > 0) {
            this.selectSlide(this.slides[0].id);
        }
    }

    /**
     * Réorganise les slides après drag & drop
     */
    async reorderSlides(oldIndex, newIndex) {
        const moved = this.slides.splice(oldIndex, 1)[0];
        this.slides.splice(newIndex, 0, moved);

        // Mettre à jour les orders
        for (let i = 0; i < this.slides.length; i++) {
            this.slides[i].order = i + 1;
            
            if (this.gristReady) {
                const rowId = await this.getRowIdForSlide(this.slides[i].id);
                if (rowId) {
                    await grist.docApi.applyUserActions([
                        ['UpdateRecord', 'ZEBRA_Slides', rowId, { order: i + 1 }]
                    ]);
                }
            }
        }
    }

    /**
     * Génère la présentation avec l'IA (MCP)
     */
    async generateWithAI() {
        this.showLoading(true, 'Génération avec IA...');

        try {
            const presentation = await mcpIntegration.generatePresentation({
                presentation_type: 'complete',
                target_audience: 'elus',
                data_scope: {
                    doc_id: this.currentPresentation?.id,
                    commune: 'Grenoble'
                }
            });

            // Remplacer les slides
            this.slides = presentation.slides;
            
            // Sauvegarder dans Grist
            if (this.gristReady) {
                for (const slide of this.slides) {
                    await grist.docApi.applyUserActions([
                        ['AddRecord', 'ZEBRA_Slides', null, slide]
                    ]);
                }
            }

            this.renderSlidesList();
            
            if (this.slides.length > 0) {
                this.selectSlide(this.slides[0].id);
            }

        } catch (error) {
            console.error('❌ Erreur génération IA:', error);
            this.showError('Erreur de génération: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Preview de la présentation
     */
    showPreview() {
        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('previewFrame');
        
        // Générer le HTML de la présentation
        const html = this.generateRevealHTML();
        
        // Créer un blob et l'afficher dans l'iframe
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        iframe.src = url;
        modal.style.display = 'block';
    }

    /**
     * Génère le HTML complet Reveal.js
     */
    generateRevealHTML() {
        const theme = this.currentPresentation?.theme || 'white';
        const transition = this.currentPresentation?.transition || 'slide';

        let slidesHTML = '';
        this.slides.forEach(slide => {
            const dataAttrs = [
                slide.transition !== 'slide' ? `data-transition="${slide.transition}"` : '',
                slide.background !== '#ffffff' ? `data-background="${slide.background}"` : '',
                slide.background_image ? `data-background-image="${slide.background_image}"` : ''
            ].filter(Boolean).join(' ');

            slidesHTML += `
                <section ${dataAttrs}>
                    ${marked.parse(slide.content || '')}
                    ${slide.notes ? `<aside class="notes">${slide.notes}</aside>` : ''}
                </section>
            `;
        });

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${this.currentPresentation?.title || 'Présentation ZEBRA'}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/${theme}.min.css">
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${slidesHTML}
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.js"></script>
    <script>
        Reveal.initialize({
            hash: false,
            embedded: true,
            transition: '${transition}',
            width: '100%',
            height: '100%'
        });
    </script>
</body>
</html>`;
    }

    // ... (suite dans partie 2)
