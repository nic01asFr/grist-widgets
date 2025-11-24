/**
 * BasemapProvider - Manage basemap tile layers
 *
 * Provides multiple basemap options:
 * - OpenStreetMap (default)
 * - IGN Plan, Satellite, Orthophoto
 * - Stamen Toner, Terrain, Watercolor
 * - CartoDB Light, Dark
 * - Esri Satellite
 */

class BasemapProvider {
  constructor() {
    this.basemaps = {
      osm: {
        id: 'osm',
        name: 'OpenStreetMap',
        icon: '🗺️',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        category: 'Standard'
      },

      ign_plan: {
        id: 'ign_plan',
        name: 'IGN Plan',
        icon: '🇫🇷',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
        attribution: '&copy; <a href="https://www.ign.fr">IGN</a>',
        maxZoom: 18,
        category: 'IGN France'
      },

      ign_satellite: {
        id: 'ign_satellite',
        name: 'IGN Satellite',
        icon: '🛰️',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',
        attribution: '&copy; <a href="https://www.ign.fr">IGN</a>',
        maxZoom: 19,
        category: 'IGN France'
      },

      ign_cadastre: {
        id: 'ign_cadastre',
        name: 'IGN Cadastre',
        icon: '📋',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
        attribution: '&copy; <a href="https://www.ign.fr">IGN</a>',
        maxZoom: 20,
        category: 'IGN France'
      },

      carto_light: {
        id: 'carto_light',
        name: 'CartoDB Light',
        icon: '☀️',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
        category: 'CartoDB'
      },

      carto_dark: {
        id: 'carto_dark',
        name: 'CartoDB Dark',
        icon: '🌙',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
        category: 'CartoDB'
      },

      carto_voyager: {
        id: 'carto_voyager',
        name: 'CartoDB Voyager',
        icon: '🧭',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
        category: 'CartoDB'
      },

      esri_satellite: {
        id: 'esri_satellite',
        name: 'Esri Satellite',
        icon: '🌍',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
        maxZoom: 18,
        category: 'Esri'
      },

      esri_topo: {
        id: 'esri_topo',
        name: 'Esri Topographic',
        icon: '⛰️',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
        maxZoom: 18,
        category: 'Esri'
      },

      stamen_toner: {
        id: 'stamen_toner',
        name: 'Stamen Toner',
        icon: '🖊️',
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png',
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
        subdomains: 'abcd',
        category: 'Stamen'
      },

      stamen_terrain: {
        id: 'stamen_terrain',
        name: 'Stamen Terrain',
        icon: '🏔️',
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
        subdomains: 'abcd',
        category: 'Stamen'
      },

      stamen_watercolor: {
        id: 'stamen_watercolor',
        name: 'Stamen Watercolor',
        icon: '🎨',
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 16,
        subdomains: 'abcd',
        category: 'Stamen'
      }
    };

    this.currentBasemap = 'osm';
  }

  /**
   * Get all basemaps grouped by category
   */
  getBasemapsByCategory() {
    const grouped = {};

    Object.values(this.basemaps).forEach(basemap => {
      if (!grouped[basemap.category]) {
        grouped[basemap.category] = [];
      }
      grouped[basemap.category].push(basemap);
    });

    return grouped;
  }

  /**
   * Get all basemaps as flat array
   */
  getAllBasemaps() {
    return Object.values(this.basemaps);
  }

  /**
   * Get basemap config by ID
   */
  getBasemap(id) {
    return this.basemaps[id] || this.basemaps.osm;
  }

  /**
   * Get current basemap
   */
  getCurrentBasemap() {
    return this.getBasemap(this.currentBasemap);
  }

  /**
   * Set current basemap
   */
  setCurrentBasemap(id) {
    if (this.basemaps[id]) {
      this.currentBasemap = id;
      console.log('[BasemapProvider] Switched to:', id);
      return this.getBasemap(id);
    }

    console.warn('[BasemapProvider] Invalid basemap ID:', id);
    return null;
  }

  /**
   * Get basemap tile layer properties for Leaflet
   */
  getTileLayerProps(id) {
    const basemap = this.getBasemap(id);

    return {
      url: basemap.url,
      attribution: basemap.attribution,
      maxZoom: basemap.maxZoom,
      subdomains: basemap.subdomains || 'abc'
    };
  }
}

export default new BasemapProvider();
