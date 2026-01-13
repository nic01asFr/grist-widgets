/**
 * DataCart Explorer - Main Application
 * Orchestrates all modules and handles global state
 */

const App = {
    // State
    currentDatabase: CONFIG.defaults.database,
    isInitialized: false,

    /**
     * Initialize application
     */
    async init() {
        console.log('🚀 Initializing DataCart Explorer...');
        
        try {
            // Initialize Grist Bridge first
            GristBridge.onReady = () => this.onGristReady();
            GristBridge.onQueriesChange = (queries) => this.renderSavedQueries(queries);
            await GristBridge.init();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateConnectionStatus('error', 'Erreur initialisation');
        }
    },

    /**
     * Called when Grist connection is ready
     */
    onGristReady() {
        console.log('✅ Grist ready, initializing modules...');
        
        // Initialize modules
        Explorer.init();
        Assistant.init();
        Editor.init();
        Results.init();
        
        // Setup callbacks
        this.setupCallbacks();
        
        // Setup global event listeners
        this.setupEventListeners();
        
        // Set initial database
        this.currentDatabase = GristBridge.getDefaultDatabase();
        this.setDatabase(this.currentDatabase);
        
        // Load schemas
        Explorer.loadSchemas(this.currentDatabase);
        
        // Render saved queries
        this.renderSavedQueries(GristBridge.savedQueries);
        
        // Update connection status
        this.updateConnectionStatus('connected', GristBridge.isWidgetMode ? 'Connecté à Grist' : 'Mode autonome');
        
        this.isInitialized = true;
        console.log('✅ DataCart Explorer initialized');
    },

    /**
     * Setup module callbacks
     */
    setupCallbacks() {
        // Explorer callbacks
        Explorer.onTableSelect = (table) => {
            // Could auto-populate editor or show preview
            console.log('Table selected:', table.fullName);
        };
        
        Explorer.onQuickAction = (action, table) => {
            switch (action) {
                case 'select-all':
                    const sql = Explorer.generateSelectAll();
                    Editor.setSQL(sql);
                    break;
                case 'preview-map':
                    const previewSql = Explorer.generateSelectAll(500);
                    Editor.setSQL(previewSql);
                    this.executeQuery(this.currentDatabase, previewSql);
                    Results.setView('map');
                    break;
                case 'stats':
                    const statsSql = Explorer.generateStatsQuery();
                    Editor.setSQL(statsSql);
                    this.executeQuery(this.currentDatabase, statsSql);
                    break;
            }
        };
        
        // Assistant callbacks
        Assistant.onSQLGenerated = (sql) => {
            Editor.setSQL(sql);
            Editor.focus();
        };
        
        // Editor callbacks
        Editor.onExecute = (database, sql) => {
            this.executeQuery(database, sql);
        };
        
        Editor.onSave = (database, sql) => {
            this.showSaveModal(database, sql);
        };
        
        // Results callbacks
        Results.onRowSelect = (index, row) => {
            // Sync with Grist if in widget mode
            if (GristBridge.isWidgetMode && row.id) {
                GristBridge.setCursorPos(row.id);
            }
        };
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Database selector
        document.querySelectorAll('.db-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const db = e.currentTarget.dataset.db;
                this.setDatabase(db);
            });
        });
        
        // Settings button
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Panel resize
        this.setupPanelResize();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Execute query
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                Editor.execute();
            }
            
            // Escape: Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            }
        });
        
        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            Editor.refresh();
            if (Results.map) Results.map.invalidateSize();
            if (Results.splitMap) Results.splitMap.invalidateSize();
        }, 200));
    },

    /**
     * Setup panel resize functionality
     */
    setupPanelResize() {
        const handle = document.getElementById('resize-left');
        const panel = document.getElementById('panel-left');
        
        if (!handle || !panel) return;
        
        let isResizing = false;
        let startX, startWidth;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            handle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const diff = e.clientX - startX;
            const newWidth = Math.min(
                Math.max(startWidth + diff, parseInt(getComputedStyle(panel).minWidth)),
                parseInt(getComputedStyle(panel).maxWidth)
            );
            
            panel.style.width = `${newWidth}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                Editor.refresh();
            }
        });
    },

    /**
     * Set current database
     */
    setDatabase(database) {
        this.currentDatabase = database;
        
        // Update UI
        document.querySelectorAll('.db-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.db === database);
        });
        
        // Update modules
        Explorer.setDatabase(database);
        Assistant.setDatabase(database);
        Editor.setDatabase(database);
        
        // Update autocomplete when schemas load
        const schemas = Explorer.schemas[database];
        if (schemas) {
            Editor.updateAutocomplete(schemas);
        }
    },

    /**
     * Execute SQL query
     */
    async executeQuery(database, sql) {
        if (!sql) {
            Utils.showToast('Requête vide', 'warning');
            return;
        }
        
        // Validate
        if (!Utils.isSelectOnly(sql)) {
            Utils.showToast('Seules les requêtes SELECT sont autorisées', 'error');
            return;
        }
        
        Results.showLoading();
        Editor.clearErrors();
        
        try {
            const baseUrl = GristBridge.getN8nBaseUrl();
            const maxResults = GristBridge.getMaxResults();
            
            const response = await Utils.fetchWithTimeout(
                `${baseUrl}${CONFIG.endpoints.execute}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        database: database,
                        sql: sql,
                        limit: maxResults
                    })
                }
            );
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw {
                    message: error.message || `Erreur HTTP ${response.status}`,
                    details: error.details || error.error,
                    line: error.line
                };
            }
            
            const result = await response.json();
            
            // Handle success
            Results.setData({
                rows: result.rows || result.data || result,
                columns: result.columns || [],
                executionTime: result.execution_time,
                rowCount: result.row_count
            });
            
            Utils.showToast(
                `✅ ${Utils.formatNumber(result.rows?.length || result.length)} résultats`,
                'success'
            );
            
        } catch (error) {
            console.error('Query execution failed:', error);
            
            // Show error
            Results.showError(
                error.message || 'Erreur d\'exécution',
                error.details || ''
            );
            
            // Highlight error line if available
            if (error.line) {
                Editor.highlightError(error.line, error.message);
            }
            
            Utils.showToast(error.message || 'Erreur d\'exécution', 'error');
        }
    },

    /**
     * Show save query modal
     */
    showSaveModal(database, sql) {
        const modal = document.getElementById('modal-save-query');
        if (!modal) return;
        
        // Populate fields
        document.getElementById('query-name').value = '';
        document.getElementById('query-description').value = '';
        document.getElementById('query-tags').value = '';
        document.getElementById('query-favorite').checked = false;
        document.getElementById('save-sql-preview').textContent = Utils.formatSQL(sql);
        
        // Show modal
        modal.style.display = 'flex';
        document.getElementById('query-name').focus();
        
        // Close handlers
        modal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', () => modal.style.display = 'none');
        });
        
        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Save handler
        document.getElementById('btn-confirm-save').onclick = async () => {
            const name = document.getElementById('query-name').value.trim();
            
            if (!name) {
                Utils.showToast('Le nom est requis', 'warning');
                return;
            }
            
            try {
                await GristBridge.saveQuery({
                    name: name,
                    description: document.getElementById('query-description').value,
                    database: database,
                    sql: sql,
                    tags: document.getElementById('query-tags').value,
                    is_favorite: document.getElementById('query-favorite').checked
                });
                
                modal.style.display = 'none';
                Utils.showToast('Requête sauvegardée', 'success');
                
            } catch (error) {
                Utils.showToast(`Erreur: ${error.message}`, 'error');
            }
        };
    },

    /**
     * Render saved queries list
     */
    renderSavedQueries(queries) {
        const container = document.getElementById('saved-queries');
        if (!container) return;
        
        if (!queries || queries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>Aucune requête sauvegardée</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = queries.map(q => `
            <div class="query-item ${q.is_favorite ? 'favorite' : ''}" data-id="${q.id}">
                <span class="query-star" title="Favori">${q.is_favorite ? '⭐' : '☆'}</span>
                <span class="query-name" title="${Utils.sanitizeHTML(q.description || q.sql)}">${Utils.sanitizeHTML(q.name)}</span>
                <span class="query-db">${q.database}</span>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.query-item').forEach(item => {
            const id = item.dataset.id;
            const query = queries.find(q => String(q.id) === id);
            
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('query-star')) {
                    // Toggle favorite
                    GristBridge.toggleFavorite(query.id);
                } else {
                    // Load query
                    this.setDatabase(query.database);
                    Editor.setSQL(query.sql);
                    GristBridge.updateQueryExecution(query.id);
                }
            });
        });
    },

    /**
     * Show settings modal
     */
    showSettingsModal() {
        const modal = document.getElementById('modal-settings');
        if (!modal) return;
        
        // Populate current values
        document.getElementById('setting-n8n-url').value = GristBridge.getN8nBaseUrl();
        document.getElementById('setting-max-results').value = GristBridge.getMaxResults();
        
        const center = GristBridge.getMapCenter();
        document.getElementById('setting-map-center').value = `${center[0]}, ${center[1]}`;
        document.getElementById('setting-map-zoom').value = GristBridge.getMapZoom();
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close handlers
        modal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', () => modal.style.display = 'none');
        });
        
        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Save handler
        document.getElementById('btn-save-settings').onclick = async () => {
            try {
                const centerStr = document.getElementById('setting-map-center').value;
                const centerParts = centerStr.split(',').map(s => parseFloat(s.trim()));
                
                await GristBridge.saveConfig({
                    n8n_base_url: document.getElementById('setting-n8n-url').value,
                    max_results: document.getElementById('setting-max-results').value,
                    map_default_center: JSON.stringify(centerParts),
                    map_default_zoom: document.getElementById('setting-map-zoom').value
                });
                
                modal.style.display = 'none';
                Utils.showToast('Paramètres enregistrés', 'success');
                
            } catch (error) {
                Utils.showToast(`Erreur: ${error.message}`, 'error');
            }
        };
    },

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status, text) {
        const container = document.getElementById('connection-status');
        if (!container) return;
        
        container.className = `connection-status ${status}`;
        container.querySelector('.status-text').textContent = text;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
