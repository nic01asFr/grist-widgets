/**
 * GristSystemManager - Gestion des tables système et persistance
 *
 * Initialise et gère les tables système Grist pour:
 * - Configuration du widget (_SmartMap3D_Config)
 * - Couches et styles (_SmartMap3D_Layers)
 * - Bookmarks/vues (_SmartMap3D_Bookmarks)
 */

declare const grist: any;

// ============================================
// TYPES
// ============================================

export interface WidgetConfig {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface LayerConfig {
  id: string;
  name: string;
  sourceType: 'file' | 'grist' | 'url';
  sourceRef: string;
  visible: boolean;
  opacity: number;
  styleJson: string;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkConfig {
  id: string;
  name: string;
  center: string; // JSON [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  timeOfDay: number;
  layersState: string; // JSON {layerId: visible}
  createdAt: string;
}

// ============================================
// SYSTEM TABLE DEFINITIONS
// ============================================

const SYSTEM_TABLES = {
  config: {
    name: '_SmartMap3D_Config',
    columns: [
      { id: 'key', type: 'Text', label: 'Clé' },
      { id: 'value', type: 'Text', label: 'Valeur' },
      { id: 'updatedAt', type: 'DateTime', label: 'Mis à jour' }
    ]
  },
  layers: {
    name: '_SmartMap3D_Layers',
    columns: [
      { id: 'name', type: 'Text', label: 'Nom' },
      { id: 'sourceType', type: 'Choice', label: 'Type source', options: ['file', 'grist', 'url'] },
      { id: 'sourceRef', type: 'Text', label: 'Référence source' },
      { id: 'visible', type: 'Bool', label: 'Visible' },
      { id: 'opacity', type: 'Numeric', label: 'Opacité' },
      { id: 'styleJson', type: 'Text', label: 'Style (JSON)' },
      { id: 'zIndex', type: 'Int', label: 'Ordre Z' },
      { id: 'createdAt', type: 'DateTime', label: 'Créé le' },
      { id: 'updatedAt', type: 'DateTime', label: 'Mis à jour' }
    ]
  },
  bookmarks: {
    name: '_SmartMap3D_Bookmarks',
    columns: [
      { id: 'name', type: 'Text', label: 'Nom' },
      { id: 'center', type: 'Text', label: 'Centre (JSON)' },
      { id: 'zoom', type: 'Numeric', label: 'Zoom' },
      { id: 'pitch', type: 'Numeric', label: 'Inclinaison' },
      { id: 'bearing', type: 'Numeric', label: 'Orientation' },
      { id: 'timeOfDay', type: 'Int', label: 'Heure du jour' },
      { id: 'layersState', type: 'Text', label: 'État couches (JSON)' },
      { id: 'createdAt', type: 'DateTime', label: 'Créé le' }
    ]
  }
};

// ============================================
// GRIST SYSTEM MANAGER
// ============================================

export class GristSystemManager {
  private initialized: boolean = false;
  private tables: Map<string, boolean> = new Map();
  private canCreateTables: boolean = false;

  /**
   * Check if Grist API is available
   */
  isGristAvailable(): boolean {
    return typeof grist !== 'undefined' && grist.docApi;
  }

  /**
   * Check if a specific system table is available
   */
  isTableAvailable(tableKey: 'config' | 'layers' | 'bookmarks'): boolean {
    return this.tables.get(tableKey) === true;
  }

  /**
   * Initialize system tables - check existing, don't block if can't create
   * Widgets typically don't have permission to create tables, so we gracefully
   * handle this and continue without system table features if needed.
   */
  async initialize(): Promise<boolean> {
    if (!this.isGristAvailable()) {
      console.log('⚠️ Grist non disponible - mode standalone');
      this.initialized = true;
      return false;
    }

    if (this.initialized) return true;

    try {
      console.log('🔧 Vérification des tables système...');

      // Check each system table - just check existence, don't try to create
      for (const [key, tableDef] of Object.entries(SYSTEM_TABLES)) {
        try {
          const exists = await this.tableExists(tableDef.name);
          if (exists) {
            console.log(`✓ Table ${tableDef.name} disponible`);
            this.tables.set(key, true);
          } else {
            console.log(`⚠️ Table ${tableDef.name} non trouvée (fonctionnalités limitées)`);
            this.tables.set(key, false);
          }
        } catch (e) {
          console.warn(`⚠️ Erreur vérification table ${tableDef.name}:`, e);
          this.tables.set(key, false);
        }
      }

      this.initialized = true;

      const availableCount = Array.from(this.tables.values()).filter(v => v).length;
      if (availableCount > 0) {
        console.log(`✅ ${availableCount}/${this.tables.size} tables système disponibles`);
      } else {
        console.log('ℹ️ Aucune table système - mode sans persistance');
      }

      return availableCount > 0;

    } catch (error) {
      console.warn('⚠️ Erreur vérification tables système:', error);
      this.initialized = true; // Mark as initialized anyway to not block
      return false;
    }
  }

  /**
   * Try to create system tables (requires document permissions)
   * Call this explicitly if you know you have permission
   */
  async createSystemTables(): Promise<boolean> {
    if (!this.isGristAvailable()) return false;

    let created = 0;
    for (const [key, tableDef] of Object.entries(SYSTEM_TABLES)) {
      if (this.tables.get(key)) continue; // Already exists

      try {
        const exists = await this.tableExists(tableDef.name);
        if (!exists) {
          await this.createSystemTable(tableDef.name, tableDef.columns);
          console.log(`✅ Table ${tableDef.name} créée`);
        }
        this.tables.set(key, true);
        created++;
      } catch (e) {
        console.warn(`❌ Impossible de créer ${tableDef.name}:`, e);
      }
    }

    this.canCreateTables = created > 0;
    return created > 0;
  }

  /**
   * Check if a table exists
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const tables = await grist.docApi.listTables();
      return tables.includes(tableName);
    } catch (e) {
      return false;
    }
  }

  /**
   * Create a system table with specified columns
   */
  private async createSystemTable(
    tableName: string,
    columns: Array<{ id: string; type: string; label: string; options?: string[] }>
  ): Promise<void> {
    // Create the table
    await grist.docApi.applyUserActions([
      ['AddTable', tableName, columns.map(col => ({
        id: col.id,
        type: col.type,
        label: col.label,
        ...(col.options ? { widgetOptions: JSON.stringify({ choices: col.options }) } : {})
      }))]
    ]);
  }

  // ============================================
  // CONFIG OPERATIONS
  // ============================================

  /**
   * Get a config value
   */
  async getConfig(key: string, defaultValue?: string): Promise<string | undefined> {
    if (!this.isGristAvailable() || !this.isTableAvailable('config')) return defaultValue;

    try {
      const records = await grist.docApi.fetchTable(SYSTEM_TABLES.config.name);
      const idx = records.key?.indexOf(key);
      if (idx !== undefined && idx >= 0) {
        return records.value[idx];
      }
    } catch (e) {
      console.warn('Erreur lecture config:', e);
    }

    return defaultValue;
  }

  /**
   * Set a config value
   */
  async setConfig(key: string, value: string): Promise<void> {
    if (!this.isGristAvailable() || !this.isTableAvailable('config')) return;

    try {
      const records = await grist.docApi.fetchTable(SYSTEM_TABLES.config.name);
      const idx = records.key?.indexOf(key);

      if (idx !== undefined && idx >= 0) {
        // Update existing
        await grist.docApi.applyUserActions([
          ['UpdateRecord', SYSTEM_TABLES.config.name, records.id[idx], {
            value,
            updatedAt: new Date().toISOString()
          }]
        ]);
      } else {
        // Create new
        await grist.docApi.applyUserActions([
          ['AddRecord', SYSTEM_TABLES.config.name, null, {
            key,
            value,
            updatedAt: new Date().toISOString()
          }]
        ]);
      }
    } catch (e) {
      console.warn('Erreur écriture config:', e);
    }
  }

  /**
   * Get all config values
   */
  async getAllConfig(): Promise<Record<string, string>> {
    if (!this.isGristAvailable() || !this.isTableAvailable('config')) return {};

    try {
      const records = await grist.docApi.fetchTable(SYSTEM_TABLES.config.name);
      const config: Record<string, string> = {};

      if (records.key && records.value) {
        for (let i = 0; i < records.key.length; i++) {
          config[records.key[i]] = records.value[i];
        }
      }

      return config;
    } catch (e) {
      return {};
    }
  }

  // ============================================
  // LAYER OPERATIONS
  // ============================================

  /**
   * Save a layer configuration
   */
  async saveLayer(layer: Omit<LayerConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!this.isGristAvailable() || !this.isTableAvailable('layers')) return null;

    try {
      const now = new Date().toISOString();
      const result = await grist.docApi.applyUserActions([
        ['AddRecord', SYSTEM_TABLES.layers.name, null, {
          ...layer,
          createdAt: now,
          updatedAt: now
        }]
      ]);

      return result?.[0] || null;
    } catch (e) {
      console.warn('Erreur sauvegarde layer:', e);
      return null;
    }
  }

  /**
   * Update a layer configuration
   */
  async updateLayer(id: number, updates: Partial<LayerConfig>): Promise<void> {
    if (!this.isGristAvailable() || !this.isTableAvailable('layers')) return;

    try {
      await grist.docApi.applyUserActions([
        ['UpdateRecord', SYSTEM_TABLES.layers.name, id, {
          ...updates,
          updatedAt: new Date().toISOString()
        }]
      ]);
    } catch (e) {
      console.warn('Erreur mise à jour layer:', e);
    }
  }

  /**
   * Delete a layer configuration
   */
  async deleteLayer(id: number): Promise<void> {
    if (!this.isGristAvailable() || !this.isTableAvailable('layers')) return;

    try {
      await grist.docApi.applyUserActions([
        ['RemoveRecord', SYSTEM_TABLES.layers.name, id]
      ]);
    } catch (e) {
      console.warn('Erreur suppression layer:', e);
    }
  }

  /**
   * Get all saved layers
   */
  async getLayers(): Promise<LayerConfig[]> {
    if (!this.isGristAvailable() || !this.isTableAvailable('layers')) return [];

    try {
      const records = await grist.docApi.fetchTable(SYSTEM_TABLES.layers.name);
      const layers: LayerConfig[] = [];

      if (records.id) {
        for (let i = 0; i < records.id.length; i++) {
          layers.push({
            id: records.id[i],
            name: records.name?.[i] || '',
            sourceType: records.sourceType?.[i] || 'file',
            sourceRef: records.sourceRef?.[i] || '',
            visible: records.visible?.[i] ?? true,
            opacity: records.opacity?.[i] ?? 1,
            styleJson: records.styleJson?.[i] || '{}',
            zIndex: records.zIndex?.[i] ?? 0,
            createdAt: records.createdAt?.[i] || '',
            updatedAt: records.updatedAt?.[i] || ''
          });
        }
      }

      return layers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    } catch (e) {
      return [];
    }
  }

  // ============================================
  // BOOKMARK OPERATIONS
  // ============================================

  /**
   * Save a bookmark
   */
  async saveBookmark(bookmark: Omit<BookmarkConfig, 'id' | 'createdAt'>): Promise<string | null> {
    if (!this.isGristAvailable() || !this.isTableAvailable('bookmarks')) return null;

    try {
      const result = await grist.docApi.applyUserActions([
        ['AddRecord', SYSTEM_TABLES.bookmarks.name, null, {
          ...bookmark,
          createdAt: new Date().toISOString()
        }]
      ]);

      return result?.[0] || null;
    } catch (e) {
      console.warn('Erreur sauvegarde bookmark:', e);
      return null;
    }
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(id: number): Promise<void> {
    if (!this.isGristAvailable() || !this.isTableAvailable('bookmarks')) return;

    try {
      await grist.docApi.applyUserActions([
        ['RemoveRecord', SYSTEM_TABLES.bookmarks.name, id]
      ]);
    } catch (e) {
      console.warn('Erreur suppression bookmark:', e);
    }
  }

  /**
   * Get all bookmarks
   */
  async getBookmarks(): Promise<BookmarkConfig[]> {
    if (!this.isGristAvailable() || !this.isTableAvailable('bookmarks')) return [];

    try {
      const records = await grist.docApi.fetchTable(SYSTEM_TABLES.bookmarks.name);
      const bookmarks: BookmarkConfig[] = [];

      if (records.id) {
        for (let i = 0; i < records.id.length; i++) {
          bookmarks.push({
            id: records.id[i],
            name: records.name?.[i] || '',
            center: records.center?.[i] || '[0,0]',
            zoom: records.zoom?.[i] ?? 10,
            pitch: records.pitch?.[i] ?? 0,
            bearing: records.bearing?.[i] ?? 0,
            timeOfDay: records.timeOfDay?.[i] ?? 720,
            layersState: records.layersState?.[i] || '{}',
            createdAt: records.createdAt?.[i] || ''
          });
        }
      }

      return bookmarks;
    } catch (e) {
      return [];
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get all tables in the document (for data import selection)
   */
  async getDocumentTables(): Promise<string[]> {
    if (!this.isGristAvailable()) return [];

    try {
      const tables = await grist.docApi.listTables();
      // Filter out system tables
      return tables.filter((t: string) => !t.startsWith('_'));
    } catch (e) {
      return [];
    }
  }

  /**
   * Get columns of a table
   */
  async getTableColumns(tableName: string): Promise<Array<{ id: string; type: string; label: string }>> {
    if (!this.isGristAvailable()) return [];

    try {
      const columns = await grist.docApi.fetchTable(tableName);
      return Object.keys(columns)
        .filter(k => k !== 'id' && k !== 'manualSort')
        .map(k => ({
          id: k,
          type: typeof columns[k]?.[0] || 'unknown',
          label: k
        }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetch all records from a table
   */
  async fetchTableData(tableName: string): Promise<Record<string, any>[]> {
    if (!this.isGristAvailable()) return [];

    try {
      const records = await grist.docApi.fetchTable(tableName);
      const data: Record<string, any>[] = [];

      const columns = Object.keys(records).filter(k => k !== 'manualSort');
      const rowCount = records[columns[0]]?.length || 0;

      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, any> = {};
        for (const col of columns) {
          row[col] = records[col]?.[i];
        }
        data.push(row);
      }

      return data;
    } catch (e) {
      console.warn('Erreur fetch table:', e);
      return [];
    }
  }

  /**
   * Detect geometry columns in a table
   */
  async detectGeometryColumns(tableName: string): Promise<string[]> {
    if (!this.isGristAvailable()) return [];

    try {
      const data = await this.fetchTableData(tableName);
      if (data.length === 0) return [];

      const geomColumns: string[] = [];
      const sample = data.slice(0, 10);

      for (const col of Object.keys(data[0])) {
        if (col === 'id') continue;

        // Check if column contains geometry-like data
        for (const row of sample) {
          const value = row[col];
          if (this.looksLikeGeometry(value)) {
            geomColumns.push(col);
            break;
          }
        }
      }

      return geomColumns;
    } catch (e) {
      return [];
    }
  }

  /**
   * Check if a value looks like geometry data
   */
  private looksLikeGeometry(value: any): boolean {
    if (!value) return false;

    // Already an object with type and coordinates
    if (typeof value === 'object' && value.type && value.coordinates) {
      return true;
    }

    if (typeof value !== 'string') return false;

    const str = value.trim().toUpperCase();

    // WKT patterns
    const wktTypes = ['POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON', 'GEOMETRYCOLLECTION'];
    if (wktTypes.some(t => str.startsWith(t))) {
      return true;
    }

    // GeoJSON patterns
    if (str.startsWith('{') && (str.includes('"TYPE"') || str.includes('"COORDINATES"'))) {
      return true;
    }

    return false;
  }

  /**
   * Export layer data to GeoJSON
   */
  exportToGeoJSON(features: any[]): string {
    const collection = {
      type: 'FeatureCollection',
      features: features.map((f, idx) => ({
        type: 'Feature',
        id: f.id || idx,
        geometry: f.geometry,
        properties: f.properties || {}
      }))
    };

    return JSON.stringify(collection, null, 2);
  }
}

export default GristSystemManager;
