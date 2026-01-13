/**
 * DataCart Explorer - Explorer Module
 * Handles schema tree navigation and table details
 */

const Explorer = {
    // State
    schemas: {},
    selectedDatabase: CONFIG.defaults.database,
    selectedTable: null,
    expandedNodes: new Set(),
    filterText: '',
    
    // Callbacks
    onTableSelect: null,
    onQuickAction: null,

    /**
     * Initialize explorer
     */
    init() {
        this.setupEventListeners();
        this.selectedDatabase = GristBridge.getDefaultDatabase();
    },

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Search filter
        const searchInput = document.getElementById('explorer-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.filterText = e.target.value.toLowerCase();
                this.renderTree();
            }, 300));
        }
        
        // Close details button
        const closeBtn = document.getElementById('btn-close-details');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideDetails());
        }
        
        // Quick action buttons
        document.getElementById('btn-select-all')?.addEventListener('click', () => {
            if (this.selectedTable && this.onQuickAction) {
                this.onQuickAction('select-all', this.selectedTable);
            }
        });
        
        document.getElementById('btn-preview-map')?.addEventListener('click', () => {
            if (this.selectedTable && this.onQuickAction) {
                this.onQuickAction('preview-map', this.selectedTable);
            }
        });
        
        document.getElementById('btn-stats')?.addEventListener('click', () => {
            if (this.selectedTable && this.onQuickAction) {
                this.onQuickAction('stats', this.selectedTable);
            }
        });
    },

    /**
     * Set active database
     */
    setDatabase(database) {
        if (this.selectedDatabase === database) return;
        
        this.selectedDatabase = database;
        this.selectedTable = null;
        this.hideDetails();
        
        // Load schemas if not cached
        if (!this.schemas[database]) {
            this.loadSchemas(database);
        } else {
            this.renderTree();
        }
    },

    /**
     * Load schemas from n8n API
     */
    async loadSchemas(database) {
        const treeContainer = document.getElementById('schema-tree');
        if (!treeContainer) return;
        
        // Show loading
        treeContainer.innerHTML = `
            <div class="tree-loading">
                <div class="spinner"></div>
                <span>Chargement des schémas...</span>
            </div>
        `;
        
        try {
            const baseUrl = GristBridge.getN8nBaseUrl();
            const response = await Utils.fetchWithTimeout(
                `${baseUrl}${CONFIG.endpoints.schema}?database=${database}`,
                { method: 'GET' }
            );
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.schemas[database] = this.processSchemaData(data);
            this.renderTree();
            
        } catch (error) {
            console.error('Failed to load schemas:', error);
            treeContainer.innerHTML = `
                <div class="tree-loading">
                    <div class="error-icon">❌</div>
                    <span>Erreur de chargement</span>
                    <button class="btn btn-sm" onclick="Explorer.loadSchemas('${database}')">Réessayer</button>
                </div>
            `;
        }
    },

    /**
     * Process schema data from API
     */
    processSchemaData(data) {
        const schemas = {};
        
        if (Array.isArray(data)) {
            // Format: [{ schema, table, columns: [...] }]
            data.forEach(item => {
                const schemaName = item.schema || item.table_schema;
                const tableName = item.table || item.table_name;
                
                if (!schemas[schemaName]) {
                    schemas[schemaName] = { tables: {} };
                }
                
                if (tableName) {
                    schemas[schemaName].tables[tableName] = {
                        name: tableName,
                        schema: schemaName,
                        columns: item.columns || [],
                        hasGeometry: this.hasGeometryColumn(item.columns),
                        rowCount: item.row_count,
                        comment: item.comment || item.table_comment
                    };
                }
            });
        } else if (data.schemas) {
            // Format: { schemas: { schemaName: { tables: {...} } } }
            return data.schemas;
        }
        
        return schemas;
    },

    /**
     * Check if table has geometry column
     */
    hasGeometryColumn(columns) {
        if (!Array.isArray(columns)) return false;
        return columns.some(col => Utils.isGeometryType(col.type || col.data_type));
    },

    /**
     * Render the schema tree
     */
    renderTree() {
        const container = document.getElementById('schema-tree');
        if (!container) return;
        
        const schemas = this.schemas[this.selectedDatabase];
        if (!schemas) {
            container.innerHTML = `
                <div class="tree-loading">
                    <span>Aucun schéma chargé</span>
                </div>
            `;
            return;
        }
        
        const schemaNames = Object.keys(schemas).sort();
        
        if (schemaNames.length === 0) {
            container.innerHTML = `
                <div class="tree-loading">
                    <span>Aucun schéma trouvé</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        schemaNames.forEach(schemaName => {
            const schema = schemas[schemaName];
            const schemaNode = this.createSchemaNode(schemaName, schema);
            if (schemaNode) {
                container.appendChild(schemaNode);
            }
        });
    },

    /**
     * Create schema node element
     */
    createSchemaNode(schemaName, schema) {
        const tables = schema.tables || {};
        const tableNames = Object.keys(tables).sort();
        
        // Filter tables
        let filteredTables = tableNames;
        if (this.filterText) {
            filteredTables = tableNames.filter(name => 
                name.toLowerCase().includes(this.filterText) ||
                schemaName.toLowerCase().includes(this.filterText)
            );
            
            // Skip schema if no matching tables
            if (filteredTables.length === 0 && !schemaName.toLowerCase().includes(this.filterText)) {
                return null;
            }
        }
        
        const nodeId = `schema-${schemaName}`;
        const isExpanded = this.expandedNodes.has(nodeId) || this.filterText.length > 0;
        
        const item = document.createElement('div');
        item.className = 'tree-item';
        
        item.innerHTML = `
            <div class="tree-node" data-node-id="${nodeId}">
                <span class="tree-toggle ${isExpanded ? 'expanded' : ''}">▶</span>
                <span class="tree-icon">${CONFIG.icons.schema}</span>
                <span class="tree-label">${Utils.sanitizeHTML(schemaName)}</span>
                <span class="tree-badge">${filteredTables.length}</span>
            </div>
            <div class="tree-children" style="display: ${isExpanded ? 'block' : 'none'}"></div>
        `;
        
        const nodeEl = item.querySelector('.tree-node');
        const childrenEl = item.querySelector('.tree-children');
        
        // Toggle expand on click
        nodeEl.addEventListener('click', () => {
            const toggle = nodeEl.querySelector('.tree-toggle');
            const isNowExpanded = toggle.classList.toggle('expanded');
            childrenEl.style.display = isNowExpanded ? 'block' : 'none';
            
            if (isNowExpanded) {
                this.expandedNodes.add(nodeId);
            } else {
                this.expandedNodes.delete(nodeId);
            }
        });
        
        // Add table nodes
        filteredTables.forEach(tableName => {
            const table = tables[tableName];
            const tableNode = this.createTableNode(schemaName, tableName, table);
            childrenEl.appendChild(tableNode);
        });
        
        return item;
    },

    /**
     * Create table node element
     */
    createTableNode(schemaName, tableName, table) {
        const nodeId = `table-${schemaName}.${tableName}`;
        const hasGeo = table.hasGeometry;
        const isSelected = this.selectedTable && 
            this.selectedTable.schema === schemaName && 
            this.selectedTable.name === tableName;
        
        const item = document.createElement('div');
        item.className = 'tree-item';
        
        item.innerHTML = `
            <div class="tree-node ${isSelected ? 'selected' : ''}" data-node-id="${nodeId}">
                <span class="tree-toggle" style="visibility: hidden;">▶</span>
                <span class="tree-icon">${hasGeo ? CONFIG.icons.tableGeo : CONFIG.icons.table}</span>
                <span class="tree-label" title="${Utils.sanitizeHTML(table.comment || tableName)}">${Utils.sanitizeHTML(tableName)}</span>
            </div>
        `;
        
        const nodeEl = item.querySelector('.tree-node');
        
        nodeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTable(schemaName, tableName, table);
        });
        
        return item;
    },

    /**
     * Select a table and show details
     */
    async selectTable(schemaName, tableName, table) {
        // Update selection state
        document.querySelectorAll('.tree-node.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        const nodeId = `table-${schemaName}.${tableName}`;
        const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeEl) {
            nodeEl.classList.add('selected');
        }
        
        // Load detailed column info if not present
        if (!table.columns || table.columns.length === 0) {
            try {
                const baseUrl = GristBridge.getN8nBaseUrl();
                const response = await Utils.fetchWithTimeout(
                    `${baseUrl}${CONFIG.endpoints.schema}?database=${this.selectedDatabase}&schema=${schemaName}&table=${tableName}`,
                    { method: 'GET' }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.columns) {
                        table.columns = data.columns;
                    } else if (Array.isArray(data) && data.length > 0) {
                        table.columns = data[0].columns || data;
                    }
                }
            } catch (error) {
                console.warn('Failed to load column details:', error);
            }
        }
        
        this.selectedTable = {
            ...table,
            schema: schemaName,
            name: tableName,
            fullName: `${schemaName}.${tableName}`
        };
        
        this.showDetails();
        
        if (this.onTableSelect) {
            this.onTableSelect(this.selectedTable);
        }
    },

    /**
     * Show table details panel
     */
    showDetails() {
        const panel = document.getElementById('table-details');
        if (!panel || !this.selectedTable) return;
        
        panel.style.display = 'flex';
        
        // Update title
        const titleEl = document.getElementById('details-table-name');
        if (titleEl) {
            titleEl.textContent = this.selectedTable.name;
        }
        
        // Update meta info
        const metaEl = document.getElementById('table-meta');
        if (metaEl) {
            const hasGeo = this.selectedTable.hasGeometry;
            const rowCount = this.selectedTable.rowCount;
            
            metaEl.innerHTML = `
                ${this.selectedTable.comment ? `<p>${Utils.sanitizeHTML(this.selectedTable.comment)}</p>` : ''}
                <p>📁 ${Utils.sanitizeHTML(this.selectedTable.schema)}</p>
                ${rowCount ? `<p>📏 ~${Utils.formatNumber(rowCount)} lignes</p>` : ''}
                ${hasGeo ? '<p>🌍 Table géographique</p>' : ''}
            `;
        }
        
        // Update columns list
        const columnsEl = document.getElementById('columns-list');
        if (columnsEl) {
            const columns = this.selectedTable.columns || [];
            
            if (columns.length === 0) {
                columnsEl.innerHTML = '<div class="empty-state">Colonnes non disponibles</div>';
            } else {
                columnsEl.innerHTML = columns.map(col => {
                    const colName = col.name || col.column_name;
                    const colType = col.type || col.data_type;
                    const isGeo = Utils.isGeometryType(colType);
                    const isPk = col.is_primary_key || col.constraint_type === 'PRIMARY KEY';
                    
                    let icon = CONFIG.icons.column;
                    if (isPk) icon = CONFIG.icons.columnKey;
                    else if (isGeo) icon = CONFIG.icons.columnGeo;
                    
                    return `
                        <div class="column-item" title="${Utils.sanitizeHTML(col.comment || '')}">
                            <span class="column-icon">${icon}</span>
                            <span class="column-name">${Utils.sanitizeHTML(colName)}</span>
                            <span class="column-type">${Utils.sanitizeHTML(colType)}</span>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // Update quick actions visibility
        const previewBtn = document.getElementById('btn-preview-map');
        if (previewBtn) {
            previewBtn.style.display = this.selectedTable.hasGeometry ? 'flex' : 'none';
        }
    },

    /**
     * Hide table details panel
     */
    hideDetails() {
        const panel = document.getElementById('table-details');
        if (panel) {
            panel.style.display = 'none';
        }
        this.selectedTable = null;
        
        // Clear selection
        document.querySelectorAll('.tree-node.selected').forEach(el => {
            el.classList.remove('selected');
        });
    },

    /**
     * Get selected table info
     */
    getSelectedTable() {
        return this.selectedTable;
    },

    /**
     * Generate SELECT * query for selected table
     */
    generateSelectAll(limit = 100) {
        if (!this.selectedTable) return '';
        
        const columns = this.selectedTable.columns || [];
        const geomCol = columns.find(c => Utils.isGeometryType(c.type || c.data_type));
        
        let selectCols = '*';
        if (geomCol) {
            const geomName = geomCol.name || geomCol.column_name;
            const otherCols = columns
                .filter(c => (c.name || c.column_name) !== geomName)
                .map(c => c.name || c.column_name)
                .join(', ');
            
            selectCols = otherCols ? 
                `${otherCols}, ST_AsGeoJSON(${geomName}) as geometry` :
                `ST_AsGeoJSON(${geomName}) as geometry`;
        }
        
        return `SELECT ${selectCols}\nFROM ${this.selectedTable.fullName}\nLIMIT ${limit};`;
    },

    /**
     * Generate statistics query for selected table
     */
    generateStatsQuery() {
        if (!this.selectedTable) return '';
        
        const columns = this.selectedTable.columns || [];
        const numericCols = columns.filter(c => {
            const type = (c.type || c.data_type || '').toLowerCase();
            return CONFIG.columnTypes.numeric.some(t => type.includes(t));
        });
        
        if (numericCols.length === 0) {
            return `SELECT COUNT(*) as total_rows\nFROM ${this.selectedTable.fullName};`;
        }
        
        const statsSelects = numericCols.slice(0, 5).map(col => {
            const name = col.name || col.column_name;
            return `
    MIN(${name}) as ${name}_min,
    MAX(${name}) as ${name}_max,
    AVG(${name})::numeric(10,2) as ${name}_avg`;
        }).join(',');
        
        return `SELECT 
    COUNT(*) as total_rows,${statsSelects}
FROM ${this.selectedTable.fullName};`;
    },

    /**
     * Refresh current database schemas
     */
    async refresh() {
        delete this.schemas[this.selectedDatabase];
        await this.loadSchemas(this.selectedDatabase);
    }
};
