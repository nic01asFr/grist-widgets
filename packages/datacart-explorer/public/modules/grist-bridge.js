/**
 * DataCart Explorer - Grist Bridge Module
 * Handles all interactions with Grist API
 */

const GristBridge = {
    // State
    isWidgetMode: false,
    isReady: false,
    docApi: null,
    config: {},
    savedQueries: [],
    
    // Callbacks
    onReady: null,
    onConfigChange: null,
    onQueriesChange: null,

    /**
     * Initialize Grist connection
     */
    async init() {
        try {
            // Check if running inside Grist
            this.isWidgetMode = typeof grist !== 'undefined';
            
            if (!this.isWidgetMode) {
                console.log('Running in standalone mode (outside Grist)');
                this.loadStandaloneConfig();
                this.isReady = true;
                if (this.onReady) this.onReady();
                return;
            }

            console.log('Initializing Grist connection...');
            
            // Initialize Grist API
            await grist.ready({
                requiredAccess: 'full',
                allowSelectBy: true
            });

            this.docApi = grist.docApi;
            
            // Setup system tables
            await this.setupSystemTables();
            
            // Load configuration
            await this.loadConfig();
            
            // Load saved queries
            await this.loadSavedQueries();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isReady = true;
            console.log('Grist connection ready');
            
            if (this.onReady) this.onReady();
            
        } catch (error) {
            console.error('Failed to initialize Grist:', error);
            // Fall back to standalone mode
            this.isWidgetMode = false;
            this.loadStandaloneConfig();
            this.isReady = true;
            if (this.onReady) this.onReady();
        }
    },

    /**
     * Load standalone configuration from localStorage
     */
    loadStandaloneConfig() {
        const stored = localStorage.getItem('datacart_config');
        this.config = stored ? Utils.safeJSONParse(stored, {}) : {};
        
        // Apply defaults
        this.config = {
            n8n_base_url: CONFIG.n8nBaseUrl,
            default_database: CONFIG.defaults.database,
            max_results: CONFIG.defaults.maxResults,
            map_default_center: JSON.stringify(CONFIG.defaults.mapCenter),
            map_default_zoom: CONFIG.defaults.mapZoom,
            ...this.config
        };
        
        // Load saved queries from localStorage
        const queries = localStorage.getItem('datacart_queries');
        this.savedQueries = queries ? Utils.safeJSONParse(queries, []) : [];
    },

    /**
     * Setup system tables (DC_Config, DC_Queries)
     */
    async setupSystemTables() {
        if (!this.docApi) return;

        try {
            const tables = await this.docApi.listTables();
            // listTables() returns array of strings (table names), not objects
            const tableIds = Array.isArray(tables) ? tables : [];

            // Check if table exists (exact match or with numeric suffix like DC_Config20)
            const configExists = tableIds.some(id =>
                typeof id === 'string' && (id === CONFIG.gristTables.config || id.startsWith(CONFIG.gristTables.config))
            );
            const queriesExists = tableIds.some(id =>
                typeof id === 'string' && (id === CONFIG.gristTables.queries || id.startsWith(CONFIG.gristTables.queries))
            );

            // Create DC_Config if not exists
            if (!configExists) {
                await this.createConfigTable();
            } else {
                console.log(`✅ ${CONFIG.gristTables.config} table already exists`);
            }

            // Create DC_Queries if not exists
            if (!queriesExists) {
                await this.createQueriesTable();
            } else {
                console.log(`✅ ${CONFIG.gristTables.queries} table already exists`);
            }

        } catch (error) {
            console.warn('Could not setup system tables:', error);
        }
    },

    /**
     * Create DC_Config table
     */
    async createConfigTable() {
        await this.docApi.applyUserActions([
            ['AddTable', CONFIG.gristTables.config, [
                { id: 'config_key', type: 'Text' },
                { id: 'config_value', type: 'Text' },
                { id: 'description', type: 'Text' }
            ]]
        ]);
        
        // Insert default values
        const defaults = [
            ['default_database', CONFIG.defaults.database, 'Base de données par défaut'],
            ['max_results', String(CONFIG.defaults.maxResults), 'Limite résultats par défaut'],
            ['n8n_base_url', CONFIG.n8nBaseUrl, 'URL webhooks n8n'],
            ['map_default_center', JSON.stringify(CONFIG.defaults.mapCenter), 'Centre carte par défaut'],
            ['map_default_zoom', String(CONFIG.defaults.mapZoom), 'Zoom carte par défaut']
        ];
        
        await this.docApi.applyUserActions([
            ['BulkAddRecord', CONFIG.gristTables.config,
                defaults.map(() => null),
                {
                    config_key: defaults.map(d => d[0]),
                    config_value: defaults.map(d => d[1]),
                    description: defaults.map(d => d[2])
                }
            ]
        ]);
        
        console.log('✅ DC_Config table created');
    },

    /**
     * Create DC_Queries table
     */
    async createQueriesTable() {
        await this.docApi.applyUserActions([
            ['AddTable', CONFIG.gristTables.queries, [
                { id: 'name', type: 'Text' },
                { id: 'description', type: 'Text' },
                { id: 'database', type: 'Choice' },
                { id: 'sql', type: 'Text' },
                { id: 'is_favorite', type: 'Bool' },
                { id: 'tags', type: 'Text' },
                { id: 'created_at', type: 'DateTime' },
                { id: 'last_used', type: 'DateTime' },
                { id: 'execution_count', type: 'Int' }
            ]]
        ]);
        
        // Configure Choice column
        await this.docApi.applyUserActions([
            ['ModifyColumn', CONFIG.gristTables.queries, 'database', {
                widgetOptions: JSON.stringify({
                    choices: ['r_datacart', 'e_datacart', 'm_datacart']
                })
            }]
        ]);
        
        console.log('✅ DC_Queries table created');
    },

    /**
     * Load configuration from DC_Config table
     */
    async loadConfig() {
        if (!this.docApi) return;
        
        try {
            const data = await this.docApi.fetchTable(CONFIG.gristTables.config);
            this.config = {};
            
            if (data.id && data.id.length > 0) {
                data.id.forEach((_, index) => {
                    const key = data.config_key[index];
                    const value = data.config_value[index];
                    if (key) this.config[key] = value;
                });
            }
            
            // Apply defaults for missing values
            this.config = {
                n8n_base_url: CONFIG.n8nBaseUrl,
                default_database: CONFIG.defaults.database,
                max_results: String(CONFIG.defaults.maxResults),
                map_default_center: JSON.stringify(CONFIG.defaults.mapCenter),
                map_default_zoom: String(CONFIG.defaults.mapZoom),
                ...this.config
            };
            
        } catch (error) {
            console.warn('Could not load config:', error);
            this.loadStandaloneConfig();
        }
    },

    /**
     * Load saved queries from DC_Queries table
     */
    async loadSavedQueries() {
        if (!this.docApi) return;
        
        try {
            const data = await this.docApi.fetchTable(CONFIG.gristTables.queries);
            this.savedQueries = [];
            
            if (data.id && data.id.length > 0) {
                data.id.forEach((id, index) => {
                    this.savedQueries.push({
                        id: id,
                        name: data.name[index] || '',
                        description: data.description[index] || '',
                        database: data.database[index] || CONFIG.defaults.database,
                        sql: data.sql[index] || '',
                        is_favorite: data.is_favorite[index] || false,
                        tags: data.tags[index] || '',
                        created_at: data.created_at[index],
                        last_used: data.last_used[index],
                        execution_count: data.execution_count[index] || 0
                    });
                });
            }
            
            // Sort: favorites first, then by last_used
            this.savedQueries.sort((a, b) => {
                if (a.is_favorite !== b.is_favorite) return b.is_favorite ? 1 : -1;
                return (b.last_used || 0) - (a.last_used || 0);
            });
            
            if (this.onQueriesChange) this.onQueriesChange(this.savedQueries);
            
        } catch (error) {
            console.warn('Could not load queries:', error);
        }
    },

    /**
     * Setup Grist event listeners
     */
    setupEventListeners() {
        if (!this.isWidgetMode) return;
        
        // Listen to DC_Queries changes
        grist.onRecords((records, mappedColumns) => {
            // This will trigger when the table the widget is attached to changes
            // We'll manually refresh queries periodically
        });
    },

    /**
     * Get configuration value
     */
    getConfig(key, defaultValue = null) {
        const value = this.config[key];
        if (value === undefined || value === null) return defaultValue;
        return value;
    },

    /**
     * Get n8n base URL
     */
    getN8nBaseUrl() {
        return this.getConfig('n8n_base_url', CONFIG.n8nBaseUrl);
    },

    /**
     * Get default database
     */
    getDefaultDatabase() {
        return this.getConfig('default_database', CONFIG.defaults.database);
    },

    /**
     * Get max results
     */
    getMaxResults() {
        return parseInt(this.getConfig('max_results', CONFIG.defaults.maxResults), 10);
    },

    /**
     * Get map center
     */
    getMapCenter() {
        const center = this.getConfig('map_default_center');
        return center ? Utils.safeJSONParse(center, CONFIG.defaults.mapCenter) : CONFIG.defaults.mapCenter;
    },

    /**
     * Get map zoom
     */
    getMapZoom() {
        return parseInt(this.getConfig('map_default_zoom', CONFIG.defaults.mapZoom), 10);
    },

    /**
     * Save configuration
     */
    async saveConfig(newConfig) {
        if (!this.isWidgetMode) {
            // Standalone mode - save to localStorage
            this.config = { ...this.config, ...newConfig };
            localStorage.setItem('datacart_config', JSON.stringify(this.config));
            if (this.onConfigChange) this.onConfigChange(this.config);
            return;
        }
        
        try {
            // Fetch current config
            const data = await this.docApi.fetchTable(CONFIG.gristTables.config);
            
            for (const [key, value] of Object.entries(newConfig)) {
                const index = data.config_key.indexOf(key);
                
                if (index !== -1) {
                    // Update existing
                    await this.docApi.applyUserActions([
                        ['UpdateRecord', CONFIG.gristTables.config, data.id[index], {
                            config_value: String(value)
                        }]
                    ]);
                } else {
                    // Add new
                    await this.docApi.applyUserActions([
                        ['AddRecord', CONFIG.gristTables.config, null, {
                            config_key: key,
                            config_value: String(value),
                            description: ''
                        }]
                    ]);
                }
                
                this.config[key] = value;
            }
            
            if (this.onConfigChange) this.onConfigChange(this.config);
            
        } catch (error) {
            console.error('Failed to save config:', error);
            throw error;
        }
    },

    /**
     * Save a query
     */
    async saveQuery(query) {
        const now = Date.now();
        const queryData = {
            name: query.name,
            description: query.description || '',
            database: query.database,
            sql: query.sql,
            is_favorite: query.is_favorite || false,
            tags: query.tags || '',
            created_at: now,
            last_used: now,
            execution_count: 0
        };
        
        if (!this.isWidgetMode) {
            // Standalone mode
            const existing = this.savedQueries.findIndex(q => q.name === query.name);
            if (existing !== -1) {
                queryData.execution_count = this.savedQueries[existing].execution_count;
                queryData.created_at = this.savedQueries[existing].created_at;
                this.savedQueries[existing] = { ...queryData, id: this.savedQueries[existing].id };
            } else {
                queryData.id = Utils.generateId();
                this.savedQueries.push(queryData);
            }
            localStorage.setItem('datacart_queries', JSON.stringify(this.savedQueries));
            if (this.onQueriesChange) this.onQueriesChange(this.savedQueries);
            return;
        }
        
        try {
            // Check if query with same name exists
            const data = await this.docApi.fetchTable(CONFIG.gristTables.queries);
            const existingIndex = data.name ? data.name.indexOf(query.name) : -1;
            
            if (existingIndex !== -1) {
                // Update existing
                await this.docApi.applyUserActions([
                    ['UpdateRecord', CONFIG.gristTables.queries, data.id[existingIndex], {
                        description: queryData.description,
                        database: queryData.database,
                        sql: queryData.sql,
                        is_favorite: queryData.is_favorite,
                        tags: queryData.tags,
                        last_used: queryData.last_used
                    }]
                ]);
            } else {
                // Add new
                await this.docApi.applyUserActions([
                    ['AddRecord', CONFIG.gristTables.queries, null, queryData]
                ]);
            }
            
            await this.loadSavedQueries();
            
        } catch (error) {
            console.error('Failed to save query:', error);
            throw error;
        }
    },

    /**
     * Delete a query
     */
    async deleteQuery(queryId) {
        if (!this.isWidgetMode) {
            this.savedQueries = this.savedQueries.filter(q => q.id !== queryId);
            localStorage.setItem('datacart_queries', JSON.stringify(this.savedQueries));
            if (this.onQueriesChange) this.onQueriesChange(this.savedQueries);
            return;
        }
        
        try {
            await this.docApi.applyUserActions([
                ['RemoveRecord', CONFIG.gristTables.queries, queryId]
            ]);
            await this.loadSavedQueries();
        } catch (error) {
            console.error('Failed to delete query:', error);
            throw error;
        }
    },

    /**
     * Toggle query favorite
     */
    async toggleFavorite(queryId) {
        const query = this.savedQueries.find(q => q.id === queryId);
        if (!query) return;
        
        const newValue = !query.is_favorite;
        
        if (!this.isWidgetMode) {
            query.is_favorite = newValue;
            localStorage.setItem('datacart_queries', JSON.stringify(this.savedQueries));
            if (this.onQueriesChange) this.onQueriesChange(this.savedQueries);
            return;
        }
        
        try {
            await this.docApi.applyUserActions([
                ['UpdateRecord', CONFIG.gristTables.queries, queryId, {
                    is_favorite: newValue
                }]
            ]);
            await this.loadSavedQueries();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    },

    /**
     * Update query execution stats
     */
    async updateQueryExecution(queryId) {
        const query = this.savedQueries.find(q => q.id === queryId);
        if (!query) return;
        
        const now = Date.now();
        const newCount = (query.execution_count || 0) + 1;
        
        if (!this.isWidgetMode) {
            query.last_used = now;
            query.execution_count = newCount;
            localStorage.setItem('datacart_queries', JSON.stringify(this.savedQueries));
            return;
        }
        
        try {
            await this.docApi.applyUserActions([
                ['UpdateRecord', CONFIG.gristTables.queries, queryId, {
                    last_used: now,
                    execution_count: newCount
                }]
            ]);
        } catch (error) {
            console.warn('Failed to update query stats:', error);
        }
    },

    /**
     * Export results to a new Grist table
     */
    async exportToGristTable(results, tableName, selectedColumns) {
        if (!this.isWidgetMode) {
            Utils.showToast('Export Grist non disponible en mode autonome', 'warning');
            return null;
        }
        
        if (!results.rows || results.rows.length === 0) {
            throw new Error('Aucune donnée à exporter');
        }
        
        try {
            // Filter columns
            const columns = selectedColumns || Object.keys(results.rows[0]);
            
            // Create table columns definition
            const gristColumns = columns.map(col => {
                const sampleValue = results.rows[0][col];
                const colInfo = results.columns?.find(c => c.name === col);
                const pgType = colInfo?.type || 'text';
                
                return {
                    id: Utils.sanitizeColumnName(col),
                    type: Utils.pgTypeToGrist(pgType)
                };
            });
            
            // Create the table
            await this.docApi.applyUserActions([
                ['AddTable', tableName, gristColumns]
            ]);
            
            // Prepare bulk data
            const recordData = {};
            columns.forEach(col => {
                const sanitizedCol = Utils.sanitizeColumnName(col);
                recordData[sanitizedCol] = results.rows.map(row => {
                    let value = row[col];
                    // Convert objects to JSON string
                    if (value !== null && typeof value === 'object') {
                        value = JSON.stringify(value);
                    }
                    return value;
                });
            });
            
            // Insert records in batches of 500
            const batchSize = 500;
            const totalRows = results.rows.length;
            
            for (let i = 0; i < totalRows; i += batchSize) {
                const batchCount = Math.min(batchSize, totalRows - i);
                const batchData = {};
                
                columns.forEach(col => {
                    const sanitizedCol = Utils.sanitizeColumnName(col);
                    batchData[sanitizedCol] = recordData[sanitizedCol].slice(i, i + batchCount);
                });
                
                await this.docApi.applyUserActions([
                    ['BulkAddRecord', tableName, 
                        Array(batchCount).fill(null),
                        batchData
                    ]
                ]);
            }
            
            return {
                tableName: tableName,
                rowCount: totalRows,
                columnCount: columns.length
            };
            
        } catch (error) {
            console.error('Failed to export to Grist:', error);
            throw error;
        }
    },

    /**
     * Get list of existing tables (for export modal)
     */
    async getExistingTables() {
        if (!this.isWidgetMode) return [];
        
        try {
            const tables = await this.docApi.listTables();
            return tables
                .map(t => t.id)
                .filter(id => !id.startsWith('DC_') && !id.startsWith('GriSt'));
        } catch (error) {
            return [];
        }
    },

    /**
     * Set cursor position in Grist
     */
    async setCursorPos(rowId) {
        if (!this.isWidgetMode) return;
        
        try {
            await grist.setCursorPos({ rowId: rowId });
        } catch (error) {
            console.warn('Failed to set cursor:', error);
        }
    }
};
