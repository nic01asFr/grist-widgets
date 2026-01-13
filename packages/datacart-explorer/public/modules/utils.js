/**
 * DataCart Explorer - Utilities Module
 * Helper functions and utilities
 */

const Utils = {
    /**
     * Debounce function execution
     */
    debounce(fn, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Throttle function execution
     */
    throttle(fn, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHTML(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },

    /**
     * Format number with thousands separator
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('fr-FR').format(num);
    },

    /**
     * Format duration in seconds
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    },

    /**
     * Format file size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Truncate string with ellipsis
     */
    truncate(str, maxLength = 50) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Check if value is a geometry type
     */
    isGeometryType(type) {
        if (!type) return false;
        const lowerType = type.toLowerCase();
        return CONFIG.columnTypes.geometry.some(g => lowerType.includes(g));
    },

    /**
     * Get column type category
     */
    getColumnCategory(type) {
        if (!type) return 'unknown';
        const lowerType = type.toLowerCase();
        
        for (const [category, types] of Object.entries(CONFIG.columnTypes)) {
            if (types.some(t => lowerType.includes(t))) {
                return category;
            }
        }
        return 'text';
    },

    /**
     * Parse GeoJSON string safely
     */
    parseGeoJSON(str) {
        try {
            if (typeof str === 'object') return str;
            return JSON.parse(str);
        } catch (e) {
            console.warn('Failed to parse GeoJSON:', e);
            return null;
        }
    },

    /**
     * Convert GeoJSON to Leaflet layer
     */
    geoJSONToLayer(geojson, options = {}) {
        if (!geojson) return null;
        
        const defaultStyle = {
            color: '#1565C0',
            weight: 2,
            opacity: 0.8,
            fillColor: '#1E88E5',
            fillOpacity: 0.3
        };

        return L.geoJSON(geojson, {
            style: { ...defaultStyle, ...options.style },
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 8,
                    ...defaultStyle,
                    ...options.style
                });
            },
            onEachFeature: options.onEachFeature
        });
    },

    /**
     * Get bounding box from GeoJSON
     */
    getBoundsFromGeoJSON(geojson) {
        try {
            const layer = L.geoJSON(geojson);
            return layer.getBounds();
        } catch (e) {
            return null;
        }
    },

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType = 'application/json') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Download as CSV
     */
    downloadCSV(data, filename) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(';'),
            ...data.map(row => 
                headers.map(h => {
                    let val = row[h];
                    if (val === null || val === undefined) return '';
                    if (typeof val === 'object') val = JSON.stringify(val);
                    // Escape quotes and wrap in quotes if contains separator
                    val = String(val).replace(/"/g, '""');
                    if (val.includes(';') || val.includes('\n') || val.includes('"')) {
                        val = `"${val}"`;
                    }
                    return val;
                }).join(';')
            )
        ].join('\n');
        
        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF';
        this.downloadFile(bom + csvContent, filename, 'text/csv;charset=utf-8');
    },

    /**
     * Download as GeoJSON
     */
    downloadGeoJSON(data, geometryColumn, filename) {
        const features = data
            .filter(row => row[geometryColumn])
            .map(row => {
                const geometry = this.parseGeoJSON(row[geometryColumn]);
                const properties = { ...row };
                delete properties[geometryColumn];
                
                return {
                    type: 'Feature',
                    geometry: geometry,
                    properties: properties
                };
            });

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        this.downloadFile(JSON.stringify(geojson, null, 2), filename);
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${this.sanitizeHTML(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 200);
        }, duration);
    },

    /**
     * Format SQL for display
     */
    formatSQL(sql) {
        if (!sql) return '';
        
        // Basic SQL formatting
        const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 
                         'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET'];
        
        let formatted = sql.trim();
        
        // Add newlines before major keywords
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            formatted = formatted.replace(regex, '\n' + kw);
        });
        
        return formatted.trim();
    },

    /**
     * Validate SQL is SELECT only
     */
    isSelectOnly(sql) {
        if (!sql) return false;
        
        const normalized = sql.trim().toUpperCase();
        const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
                          'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'EXEC'];
        
        // Check starts with SELECT or WITH (for CTEs)
        if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
            return false;
        }
        
        // Check for forbidden keywords
        for (const word of forbidden) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(sql)) {
                return false;
            }
        }
        
        return true;
    },

    /**
     * Extract table names from SQL
     */
    extractTablesFromSQL(sql) {
        if (!sql) return [];
        
        const tables = new Set();
        
        // Match FROM and JOIN clauses
        const fromRegex = /(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi;
        let match;
        
        while ((match = fromRegex.exec(sql)) !== null) {
            tables.add(match[1].toLowerCase());
        }
        
        return Array.from(tables);
    },

    /**
     * Safe JSON parse
     */
    safeJSONParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return defaultValue;
        }
    },

    /**
     * Format date for display
     */
    formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Sanitize column name for Grist
     */
    sanitizeColumnName(name) {
        if (!name) return 'column';
        // Replace invalid characters with underscore
        let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
        // Ensure starts with letter
        if (/^[0-9]/.test(sanitized)) {
            sanitized = 'col_' + sanitized;
        }
        return sanitized;
    },

    /**
     * Map PostgreSQL type to Grist type
     */
    pgTypeToGrist(pgType) {
        if (!pgType) return 'Text';
        const lower = pgType.toLowerCase();
        
        if (this.isGeometryType(lower)) return 'Text';
        if (CONFIG.columnTypes.numeric.some(t => lower.includes(t))) {
            return lower.includes('int') ? 'Int' : 'Numeric';
        }
        if (CONFIG.columnTypes.boolean.some(t => lower.includes(t))) return 'Bool';
        if (CONFIG.columnTypes.datetime.some(t => lower.includes(t))) {
            return lower.includes('date') && !lower.includes('time') ? 'Date' : 'DateTime';
        }
        return 'Text';
    },

    /**
     * Create DOM element with attributes
     */
    createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([k, v]) => {
                    el.dataset[k] = v;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });
        
        return el;
    },

    /**
     * Async fetch with timeout
     */
    async fetchWithTimeout(url, options = {}, timeout = CONFIG.defaults.timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Requête timeout - La requête a pris trop de temps');
            }
            throw error;
        }
    }
};

// Freeze utilities object
Object.freeze(Utils);
