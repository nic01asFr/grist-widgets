/**
 * DataCart Explorer - Results Module
 * Handles results display (table, map, split view) and exports
 */

const Results = {
    // State
    data: null,
    columns: [],
    geometryColumn: null,
    currentView: 'table',
    currentPage: 1,
    pageSize: CONFIG.defaults.pageSize,
    sortColumn: null,
    sortDirection: 'asc',
    selectedRowIndex: null,
    
    // Map
    map: null,
    splitMap: null,
    geoJsonLayer: null,
    markers: null,
    
    // Callbacks
    onRowSelect: null,

    /**
     * Initialize results module
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.setView(view);
            });
        });
        
        // Export buttons
        document.getElementById('btn-export-csv')?.addEventListener('click', () => {
            this.exportCSV();
        });
        
        document.getElementById('btn-export-geojson')?.addEventListener('click', () => {
            this.exportGeoJSON();
        });
        
        document.getElementById('btn-export-grist')?.addEventListener('click', () => {
            this.showExportModal();
        });
    },

    /**
     * Set results data
     */
    setData(results) {
        this.data = results;
        this.columns = results.columns || [];
        this.currentPage = 1;
        this.selectedRowIndex = null;
        this.sortColumn = null;
        
        // Find geometry column
        this.geometryColumn = this.findGeometryColumn();
        
        // Update count display
        const countEl = document.getElementById('results-count');
        if (countEl) {
            const count = results.rows?.length || 0;
            countEl.textContent = `(${Utils.formatNumber(count)} lignes)`;
        }
        
        // Show results
        this.render();
    },

    /**
     * Find geometry column in results
     */
    findGeometryColumn() {
        if (!this.data?.rows?.length) return null;
        
        const firstRow = this.data.rows[0];
        
        // Check column metadata
        for (const col of this.columns) {
            if (Utils.isGeometryType(col.type)) {
                return col.name;
            }
        }
        
        // Check for common geometry column names
        const geoNames = ['geometry', 'geom', 'the_geom', 'wkb_geometry', 'shape'];
        for (const name of geoNames) {
            if (firstRow[name] !== undefined) {
                // Verify it looks like GeoJSON
                const value = firstRow[name];
                if (value && (typeof value === 'object' || (typeof value === 'string' && value.includes('coordinates')))) {
                    return name;
                }
            }
        }
        
        return null;
    },

    /**
     * Set current view mode
     */
    setView(view) {
        this.currentView = view;
        
        // Update toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update GeoJSON export button visibility
        const geoBtn = document.getElementById('btn-export-geojson');
        if (geoBtn) {
            geoBtn.style.display = this.geometryColumn ? 'inline-flex' : 'none';
        }
        
        this.render();
    },

    /**
     * Render results based on current view
     */
    render() {
        // Hide all containers
        document.getElementById('results-empty').style.display = 'none';
        document.getElementById('results-loading').style.display = 'none';
        document.getElementById('results-error').style.display = 'none';
        document.getElementById('results-table-container').style.display = 'none';
        document.getElementById('results-map-container').style.display = 'none';
        document.getElementById('results-split-container').style.display = 'none';
        
        if (!this.data || !this.data.rows || this.data.rows.length === 0) {
            document.getElementById('results-empty').style.display = 'flex';
            return;
        }
        
        switch (this.currentView) {
            case 'table':
                this.renderTable();
                break;
            case 'map':
                this.renderMap();
                break;
            case 'split':
                this.renderSplit();
                break;
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('results-empty').style.display = 'none';
        document.getElementById('results-error').style.display = 'none';
        document.getElementById('results-table-container').style.display = 'none';
        document.getElementById('results-map-container').style.display = 'none';
        document.getElementById('results-split-container').style.display = 'none';
        document.getElementById('results-loading').style.display = 'flex';
        
        // Start timer
        this.loadingStartTime = Date.now();
        this.updateLoadingTimer();
    },

    /**
     * Update loading timer
     */
    updateLoadingTimer() {
        const timerEl = document.getElementById('loading-timer');
        if (!timerEl || !this.loadingStartTime) return;
        
        const elapsed = Date.now() - this.loadingStartTime;
        timerEl.textContent = Utils.formatDuration(elapsed);
        
        if (document.getElementById('results-loading').style.display !== 'none') {
            requestAnimationFrame(() => this.updateLoadingTimer());
        }
    },

    /**
     * Show error state
     */
    showError(message, details = '') {
        document.getElementById('results-loading').style.display = 'none';
        document.getElementById('results-empty').style.display = 'none';
        document.getElementById('results-table-container').style.display = 'none';
        document.getElementById('results-map-container').style.display = 'none';
        document.getElementById('results-split-container').style.display = 'none';
        
        const errorContainer = document.getElementById('results-error');
        const messageEl = document.getElementById('error-message');
        const detailsEl = document.getElementById('error-details');
        
        if (messageEl) messageEl.textContent = message;
        if (detailsEl) {
            detailsEl.textContent = details;
            detailsEl.style.display = details ? 'block' : 'none';
        }
        
        errorContainer.style.display = 'flex';
        
        // Update count
        const countEl = document.getElementById('results-count');
        if (countEl) countEl.textContent = '';
    },

    /**
     * Render table view
     */
    renderTable() {
        const container = document.getElementById('results-table-container');
        container.style.display = 'flex';
        
        this.renderTableContent(
            document.getElementById('results-thead'),
            document.getElementById('results-tbody'),
            document.getElementById('table-pagination')
        );
    },

    /**
     * Render table content
     */
    renderTableContent(theadEl, tbodyEl, paginationEl) {
        if (!this.data?.rows) return;
        
        let rows = [...this.data.rows];
        
        // Sort if needed
        if (this.sortColumn) {
            rows.sort((a, b) => {
                let valA = a[this.sortColumn];
                let valB = b[this.sortColumn];
                
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                
                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        // Get columns (excluding geometry for display)
        const displayColumns = Object.keys(this.data.rows[0]).filter(col => {
            // Don't hide geometry column, but truncate it
            return true;
        });
        
        // Render header
        theadEl.innerHTML = `
            <tr>
                ${displayColumns.map(col => {
                    const isGeo = col === this.geometryColumn;
                    const isSorted = col === this.sortColumn;
                    const sortIcon = isSorted ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
                    return `<th data-column="${col}" class="${isGeo ? 'geometry' : ''}">${Utils.sanitizeHTML(col)}${sortIcon}</th>`;
                }).join('')}
            </tr>
        `;
        
        // Add sort listeners
        theadEl.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.column;
                if (this.sortColumn === col) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = col;
                    this.sortDirection = 'asc';
                }
                this.render();
            });
        });
        
        // Paginate
        const totalPages = Math.ceil(rows.length / this.pageSize);
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const pageRows = rows.slice(startIdx, startIdx + this.pageSize);
        
        // Render body
        tbodyEl.innerHTML = pageRows.map((row, idx) => {
            const globalIdx = startIdx + idx;
            const isSelected = globalIdx === this.selectedRowIndex;
            
            return `
                <tr data-index="${globalIdx}" class="${isSelected ? 'selected' : ''}">
                    ${displayColumns.map(col => {
                        let value = row[col];
                        const isGeo = col === this.geometryColumn;
                        
                        if (value === null || value === undefined) {
                            return '<td class="null-value">NULL</td>';
                        }
                        
                        if (isGeo) {
                            // Show truncated geometry
                            const display = typeof value === 'object' ? 
                                value.type || 'Geometry' : 
                                Utils.truncate(String(value), 30);
                            return `<td class="geometry" title="Cliquez pour voir sur la carte">🌍 ${Utils.sanitizeHTML(display)}</td>`;
                        }
                        
                        if (typeof value === 'object') {
                            value = JSON.stringify(value);
                        }
                        
                        return `<td title="${Utils.sanitizeHTML(String(value))}">${Utils.sanitizeHTML(Utils.truncate(String(value), 50))}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');
        
        // Add row click listeners
        tbodyEl.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const index = parseInt(tr.dataset.index, 10);
                this.selectRow(index);
            });
        });
        
        // Render pagination
        if (paginationEl) {
            this.renderPagination(paginationEl, totalPages);
        }
    },

    /**
     * Render pagination controls
     */
    renderPagination(container, totalPages) {
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        const pages = [];
        const current = this.currentPage;
        
        // Always show first page
        pages.push(1);
        
        // Show pages around current
        for (let i = Math.max(2, current - 2); i <= Math.min(totalPages - 1, current + 2); i++) {
            if (pages[pages.length - 1] !== i - 1) {
                pages.push('...');
            }
            pages.push(i);
        }
        
        // Always show last page
        if (totalPages > 1) {
            if (pages[pages.length - 1] !== totalPages - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }
        
        container.innerHTML = `
            <button class="page-btn" data-page="prev" ${current === 1 ? 'disabled' : ''}>←</button>
            ${pages.map(p => {
                if (p === '...') return '<span class="page-ellipsis">...</span>';
                return `<button class="page-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
            }).join('')}
            <button class="page-btn" data-page="next" ${current === totalPages ? 'disabled' : ''}>→</button>
        `;
        
        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page === 'prev') {
                    this.currentPage = Math.max(1, this.currentPage - 1);
                } else if (page === 'next') {
                    this.currentPage = Math.min(totalPages, this.currentPage + 1);
                } else {
                    this.currentPage = parseInt(page, 10);
                }
                this.render();
            });
        });
    },

    /**
     * Select a row
     */
    selectRow(index) {
        this.selectedRowIndex = index;
        
        // Update table selection
        document.querySelectorAll('.results-table tbody tr').forEach(tr => {
            tr.classList.toggle('selected', parseInt(tr.dataset.index, 10) === index);
        });
        
        // Highlight on map if geometry exists
        if (this.geometryColumn && this.data?.rows[index]) {
            const geom = this.data.rows[index][this.geometryColumn];
            if (geom) {
                this.highlightFeature(index, geom);
            }
        }
        
        // Callback
        if (this.onRowSelect) {
            this.onRowSelect(index, this.data.rows[index]);
        }
    },

    /**
     * Render map view
     */
    renderMap() {
        const container = document.getElementById('results-map-container');
        container.style.display = 'block';
        
        if (!this.geometryColumn) {
            container.innerHTML = `
                <div class="results-empty">
                    <div class="empty-icon">🗺️</div>
                    <p>Aucune colonne géométrique détectée</p>
                </div>
            `;
            return;
        }
        
        // Initialize map if needed
        if (!this.map) {
            this.map = L.map('results-map').setView(
                GristBridge.getMapCenter(),
                GristBridge.getMapZoom()
            );
            
            L.tileLayer(CONFIG.map.tileLayer, {
                attribution: CONFIG.map.attribution,
                maxZoom: CONFIG.map.maxZoom
            }).addTo(this.map);
        }
        
        // Clear previous layers
        if (this.geoJsonLayer) {
            this.map.removeLayer(this.geoJsonLayer);
        }
        if (this.markers) {
            this.map.removeLayer(this.markers);
        }
        
        // Create GeoJSON features
        const features = this.createFeatures();
        
        if (features.length === 0) {
            return;
        }
        
        // Use clustering for large datasets
        if (features.length > CONFIG.map.clusterThreshold) {
            this.markers = L.markerClusterGroup();
            
            features.forEach((feature, idx) => {
                const layer = L.geoJSON(feature, {
                    style: this.getFeatureStyle(idx),
                    pointToLayer: (f, latlng) => L.circleMarker(latlng, this.getFeatureStyle(idx))
                });
                
                layer.on('click', () => this.selectRow(idx));
                layer.bindPopup(() => this.createPopup(idx));
                this.markers.addLayer(layer);
            });
            
            this.map.addLayer(this.markers);
        } else {
            // Direct GeoJSON layer
            const geojson = {
                type: 'FeatureCollection',
                features: features
            };
            
            this.geoJsonLayer = L.geoJSON(geojson, {
                style: (feature) => this.getFeatureStyle(feature.properties._index),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, this.getFeatureStyle(feature.properties._index));
                },
                onEachFeature: (feature, layer) => {
                    const idx = feature.properties._index;
                    layer.on('click', () => this.selectRow(idx));
                    layer.bindPopup(() => this.createPopup(idx));
                }
            }).addTo(this.map);
        }
        
        // Fit bounds
        const bounds = this.geoJsonLayer?.getBounds() || this.markers?.getBounds();
        if (bounds?.isValid()) {
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }
        
        // Fix map size after display
        setTimeout(() => this.map.invalidateSize(), 100);
    },

    /**
     * Create GeoJSON features from data
     */
    createFeatures() {
        if (!this.data?.rows || !this.geometryColumn) return [];
        
        return this.data.rows
            .map((row, idx) => {
                const geomValue = row[this.geometryColumn];
                if (!geomValue) return null;
                
                let geometry;
                if (typeof geomValue === 'string') {
                    geometry = Utils.parseGeoJSON(geomValue);
                } else {
                    geometry = geomValue;
                }
                
                if (!geometry) return null;
                
                // Build properties (exclude geometry)
                const properties = { _index: idx };
                Object.entries(row).forEach(([key, value]) => {
                    if (key !== this.geometryColumn) {
                        properties[key] = value;
                    }
                });
                
                return {
                    type: 'Feature',
                    geometry: geometry,
                    properties: properties
                };
            })
            .filter(f => f !== null);
    },

    /**
     * Get feature style
     */
    getFeatureStyle(index) {
        const isSelected = index === this.selectedRowIndex;
        
        return {
            color: isSelected ? '#F57C00' : '#1565C0',
            weight: isSelected ? 3 : 2,
            opacity: isSelected ? 1 : 0.8,
            fillColor: isSelected ? '#FF9800' : '#1E88E5',
            fillOpacity: isSelected ? 0.5 : 0.3,
            radius: isSelected ? 10 : 6
        };
    },

    /**
     * Create popup content
     */
    createPopup(index) {
        const row = this.data.rows[index];
        if (!row) return '';
        
        const displayCols = Object.keys(row)
            .filter(k => k !== this.geometryColumn)
            .slice(0, 8); // Limit to 8 properties
        
        return `
            <div class="popup-content">
                <div class="popup-title">Entité #${index + 1}</div>
                ${displayCols.map(col => `
                    <div class="popup-row">
                        <span class="popup-label">${Utils.sanitizeHTML(col)}</span>
                        <span class="popup-value">${Utils.sanitizeHTML(Utils.truncate(String(row[col] ?? 'NULL'), 30))}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Highlight feature on map
     */
    highlightFeature(index, geometry) {
        if (!this.map) return;
        
        // Refresh layer styles
        if (this.geoJsonLayer) {
            this.geoJsonLayer.setStyle((feature) => this.getFeatureStyle(feature.properties._index));
        }
        
        // Zoom to feature
        const geom = typeof geometry === 'string' ? Utils.parseGeoJSON(geometry) : geometry;
        if (geom) {
            const bounds = Utils.getBoundsFromGeoJSON(geom);
            if (bounds?.isValid()) {
                this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
    },

    /**
     * Render split view
     */
    renderSplit() {
        const container = document.getElementById('results-split-container');
        container.style.display = 'flex';
        
        // Create table in split-table
        const splitTableEl = document.getElementById('split-table');
        splitTableEl.innerHTML = `
            <div class="table-wrapper">
                <table class="results-table">
                    <thead id="split-thead"></thead>
                    <tbody id="split-tbody"></tbody>
                </table>
            </div>
            <div class="table-pagination" id="split-pagination"></div>
        `;
        
        this.renderTableContent(
            document.getElementById('split-thead'),
            document.getElementById('split-tbody'),
            document.getElementById('split-pagination')
        );
        
        // Create map in split-map
        const splitMapEl = document.getElementById('split-map');
        splitMapEl.innerHTML = '<div id="split-map-container" style="height: 100%; width: 100%;"></div>';
        
        if (!this.geometryColumn) {
            splitMapEl.innerHTML = `
                <div class="results-empty" style="height: 100%;">
                    <div class="empty-icon">🗺️</div>
                    <p>Pas de géométrie</p>
                </div>
            `;
            return;
        }
        
        // Initialize split map
        if (!this.splitMap) {
            this.splitMap = L.map('split-map-container').setView(
                GristBridge.getMapCenter(),
                GristBridge.getMapZoom()
            );
            
            L.tileLayer(CONFIG.map.tileLayer, {
                attribution: CONFIG.map.attribution,
                maxZoom: CONFIG.map.maxZoom
            }).addTo(this.splitMap);
        }
        
        // Add features to split map
        const features = this.createFeatures();
        if (features.length > 0) {
            const geojson = {
                type: 'FeatureCollection',
                features: features
            };
            
            const layer = L.geoJSON(geojson, {
                style: (feature) => this.getFeatureStyle(feature.properties._index),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, this.getFeatureStyle(feature.properties._index));
                },
                onEachFeature: (feature, layer) => {
                    layer.on('click', () => this.selectRow(feature.properties._index));
                    layer.bindPopup(() => this.createPopup(feature.properties._index));
                }
            }).addTo(this.splitMap);
            
            const bounds = layer.getBounds();
            if (bounds?.isValid()) {
                this.splitMap.fitBounds(bounds, { padding: [20, 20] });
            }
        }
        
        setTimeout(() => this.splitMap?.invalidateSize(), 100);
    },

    /**
     * Export to CSV
     */
    exportCSV() {
        if (!this.data?.rows?.length) {
            Utils.showToast('Aucune donnée à exporter', 'warning');
            return;
        }
        
        const timestamp = new Date().toISOString().slice(0, 10);
        Utils.downloadCSV(this.data.rows, `datacart_export_${timestamp}.csv`);
        Utils.showToast('Export CSV téléchargé', 'success');
    },

    /**
     * Export to GeoJSON
     */
    exportGeoJSON() {
        if (!this.data?.rows?.length || !this.geometryColumn) {
            Utils.showToast('Aucune donnée géographique à exporter', 'warning');
            return;
        }
        
        const timestamp = new Date().toISOString().slice(0, 10);
        Utils.downloadGeoJSON(this.data.rows, this.geometryColumn, `datacart_export_${timestamp}.geojson`);
        Utils.showToast('Export GeoJSON téléchargé', 'success');
    },

    /**
     * Show export to Grist modal
     */
    showExportModal() {
        if (!this.data?.rows?.length) {
            Utils.showToast('Aucune donnée à exporter', 'warning');
            return;
        }
        
        const modal = document.getElementById('modal-export-grist');
        if (!modal) return;
        
        // Update row count
        document.getElementById('export-row-count').textContent = Utils.formatNumber(this.data.rows.length);
        
        // Generate default table name
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        document.getElementById('new-table-name').value = `DC_Results_${timestamp}`;
        
        // Populate columns checklist
        const columnsContainer = document.getElementById('export-columns');
        const cols = Object.keys(this.data.rows[0]);
        
        columnsContainer.innerHTML = cols.map(col => {
            const isGeo = col === this.geometryColumn;
            return `
                <label>
                    <input type="checkbox" value="${Utils.sanitizeHTML(col)}" checked>
                    ${Utils.sanitizeHTML(col)} ${isGeo ? '🌍' : ''}
                </label>
            `;
        }).join('');
        
        // Load existing tables
        this.loadExistingTables();
        
        // Show modal
        modal.style.display = 'flex';
        
        // Setup close handlers
        modal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', () => modal.style.display = 'none');
        });
        
        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Radio toggle
        modal.querySelectorAll('input[name="export-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('new-table-name').disabled = e.target.value !== 'new';
                document.getElementById('existing-table').disabled = e.target.value !== 'existing';
            });
        });
        
        // Confirm button
        document.getElementById('btn-confirm-export').onclick = () => this.doExportToGrist();
    },

    /**
     * Load existing Grist tables
     */
    async loadExistingTables() {
        const select = document.getElementById('existing-table');
        const tables = await GristBridge.getExistingTables();
        
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        tables.forEach(t => {
            select.innerHTML += `<option value="${t}">${t}</option>`;
        });
    },

    /**
     * Execute export to Grist
     */
    async doExportToGrist() {
        const modal = document.getElementById('modal-export-grist');
        const mode = document.querySelector('input[name="export-mode"]:checked').value;
        const tableName = mode === 'new' ? 
            document.getElementById('new-table-name').value :
            document.getElementById('existing-table').value;
        
        if (!tableName) {
            Utils.showToast('Veuillez spécifier un nom de table', 'warning');
            return;
        }
        
        // Get selected columns
        const selectedColumns = Array.from(
            document.querySelectorAll('#export-columns input:checked')
        ).map(cb => cb.value);
        
        if (selectedColumns.length === 0) {
            Utils.showToast('Sélectionnez au moins une colonne', 'warning');
            return;
        }
        
        try {
            const result = await GristBridge.exportToGristTable(
                this.data,
                tableName,
                selectedColumns
            );
            
            modal.style.display = 'none';
            Utils.showToast(
                `✅ ${Utils.formatNumber(result.rowCount)} lignes exportées vers ${result.tableName}`,
                'success'
            );
        } catch (error) {
            Utils.showToast(`Erreur d'export: ${error.message}`, 'error');
        }
    },

    /**
     * Clear results
     */
    clear() {
        this.data = null;
        this.columns = [];
        this.geometryColumn = null;
        this.selectedRowIndex = null;
        
        document.getElementById('results-count').textContent = '';
        this.render();
    }
};
