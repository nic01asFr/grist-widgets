/**
 * DataCatalog - Registry of Available Data Sources
 *
 * Manages catalog of data sources for agent-driven workflows:
 * - External services (IGN Géoplateforme, OSM)
 * - Project data (Grist tables)
 * - Capabilities and metadata for each source
 *
 * Used by QueryExecutor to fetch data based on natural language queries
 */

class DataCatalog {
  constructor() {
    this.sources = this.initializeSources();
    this.aliases = this.buildAliases();
  }

  initializeSources() {
    return {
      // ========================================
      // IGN Géoplateforme (French National Data)
      // ========================================
      ign: {
        id: 'ign',
        name: 'IGN Géoplateforme',
        type: 'wfs',
        endpoint: 'https://data.geopf.fr/wfs',
        description: 'Service WFS de l\'IGN - données administratives et topographiques françaises',

        capabilities: [
          'spatial_query',
          'bbox_filter',
          'attribute_filter',
          'crs_transform'
        ],

        defaultSRID: '4326',

        layers: {
          // Administrative boundaries
          'communes': {
            id: 'BDTOPO_V3:commune',
            name: 'Communes',
            geometryType: 'Polygon',
            searchable: true,
            attributes: ['nom', 'code_insee', 'population'],
            nlp_aliases: ['commune', 'communes', 'ville', 'villes', 'municipalité'],
            description: 'Limites administratives des communes françaises'
          },

          'departements': {
            id: 'BDTOPO_V3:departement',
            name: 'Départements',
            geometryType: 'Polygon',
            searchable: true,
            attributes: ['nom', 'code_insee', 'numero'],
            nlp_aliases: ['département', 'départements', 'dept'],
            description: 'Limites administratives des départements'
          },

          'regions': {
            id: 'BDTOPO_V3:region',
            name: 'Régions',
            geometryType: 'Polygon',
            searchable: true,
            attributes: ['nom', 'code_insee'],
            nlp_aliases: ['région', 'régions'],
            description: 'Limites administratives des régions'
          },

          'arrondissements': {
            id: 'ADMINEXPRESS-COG-CARTO.LATEST:arrondissement',
            name: 'Arrondissements',
            geometryType: 'Polygon',
            searchable: true,
            attributes: ['nom', 'code_insee'],
            nlp_aliases: ['arrondissement', 'arrondissements'],
            description: 'Arrondissements municipaux'
          },

          // Buildings and infrastructure
          'batiments': {
            id: 'BDTOPO_V3:batiment',
            name: 'Bâtiments',
            geometryType: 'Polygon',
            searchable: true,
            attributes: ['nature', 'usage', 'hauteur'],
            nlp_aliases: ['bâtiment', 'bâtiments', 'building', 'buildings', 'immeuble'],
            description: 'Emprises des bâtiments'
          },

          'routes': {
            id: 'BDTOPO_V3:route',
            name: 'Routes',
            geometryType: 'LineString',
            searchable: true,
            attributes: ['classe', 'nature', 'numero'],
            nlp_aliases: ['route', 'routes', 'voie', 'voies', 'rue', 'rues'],
            description: 'Réseau routier'
          },

          'cours_eau': {
            id: 'BDTOPO_V3:cours_d_eau',
            name: 'Cours d\'eau',
            geometryType: 'LineString',
            searchable: true,
            attributes: ['nom', 'classe', 'regime'],
            nlp_aliases: ['cours d\'eau', 'rivière', 'rivières', 'fleuve', 'fleuves'],
            description: 'Réseau hydrographique'
          }
        },

        // Build WFS GetFeature request
        buildRequest: (layer, options = {}) => {
          const params = new URLSearchParams({
            service: 'WFS',
            version: '2.0.0',
            request: 'GetFeature',
            typeName: layer,
            outputFormat: 'application/json',
            srsName: `EPSG:${options.srid || '4326'}`,
            count: options.maxFeatures || 1000
          });

          if (options.bbox) {
            params.append('bbox', `${options.bbox.join(',')},EPSG:4326`);
          }

          if (options.filter) {
            // CQL filter for attribute filtering
            params.append('cql_filter', options.filter);
          }

          return `https://data.geopf.fr/wfs?${params.toString()}`;
        }
      },

      // ========================================
      // OpenStreetMap (via Overpass API)
      // ========================================
      osm: {
        id: 'osm',
        name: 'OpenStreetMap',
        type: 'overpass',
        endpoint: 'https://overpass-api.de/api/interpreter',
        description: 'Données OpenStreetMap via Overpass API',

        capabilities: [
          'spatial_query',
          'bbox_filter',
          'tag_filter',
          'around_filter'
        ],

        tags: {
          // Points of interest
          'amenity': {
            description: 'Équipements et services',
            values: {
              'school': { aliases: ['école', 'écoles', 'school', 'schools'] },
              'hospital': { aliases: ['hôpital', 'hôpitaux', 'hospital', 'hospitals'] },
              'pharmacy': { aliases: ['pharmacie', 'pharmacies', 'pharmacy'] },
              'restaurant': { aliases: ['restaurant', 'restaurants'] },
              'cafe': { aliases: ['café', 'cafés', 'cafe', 'cafes'] },
              'bank': { aliases: ['banque', 'banques', 'bank', 'banks'] },
              'post_office': { aliases: ['poste', 'bureau de poste', 'post office'] },
              'library': { aliases: ['bibliothèque', 'bibliothèques', 'library'] },
              'town_hall': { aliases: ['mairie', 'mairies', 'town hall', 'hôtel de ville'] }
            }
          },

          // Transportation
          'highway': {
            description: 'Infrastructure routière',
            values: {
              'primary': { aliases: ['route principale', 'primary road'] },
              'secondary': { aliases: ['route secondaire', 'secondary road'] },
              'residential': { aliases: ['rue résidentielle', 'residential street'] },
              'footway': { aliases: ['chemin piéton', 'footpath', 'trottoir'] },
              'cycleway': { aliases: ['piste cyclable', 'bike path'] }
            }
          },

          // Buildings
          'building': {
            description: 'Bâtiments',
            values: {
              'yes': { aliases: ['bâtiment', 'building'] },
              'house': { aliases: ['maison', 'house'] },
              'apartments': { aliases: ['immeuble', 'appartements', 'apartments'] },
              'commercial': { aliases: ['commercial', 'commerce'] },
              'industrial': { aliases: ['industriel', 'industrial'] }
            }
          },

          // Natural features
          'natural': {
            description: 'Éléments naturels',
            values: {
              'water': { aliases: ['eau', 'water', 'lac', 'étang'] },
              'wood': { aliases: ['forêt', 'bois', 'forest', 'wood'] },
              'tree': { aliases: ['arbre', 'arbres', 'tree', 'trees'] },
              'peak': { aliases: ['sommet', 'pic', 'peak', 'mountain'] }
            }
          },

          // Landuse
          'landuse': {
            description: 'Utilisation du sol',
            values: {
              'residential': { aliases: ['résidentiel', 'residential'] },
              'commercial': { aliases: ['commercial', 'commerce'] },
              'industrial': { aliases: ['industriel', 'industrial', 'zone industrielle'] },
              'forest': { aliases: ['forêt', 'forest', 'bois'] },
              'farmland': { aliases: ['agricole', 'farmland', 'terres agricoles'] }
            }
          }
        },

        // Build Overpass query
        buildQuery: (tag, value, options = {}) => {
          const bbox = options.bbox ? `(${options.bbox[1]},${options.bbox[0]},${options.bbox[3]},${options.bbox[2]})` : '';

          let query = '[out:json][timeout:25];';

          if (options.around) {
            // Around query (radius search)
            query += `(
              node["${tag}"="${value}"](around:${options.around.radius},${options.around.lat},${options.around.lon});
              way["${tag}"="${value}"](around:${options.around.radius},${options.around.lat},${options.around.lon});
              relation["${tag}"="${value}"](around:${options.around.radius},${options.around.lat},${options.around.lon});
            );`;
          } else {
            // Bbox query
            query += `(
              node["${tag}"="${value}"]${bbox};
              way["${tag}"="${value}"]${bbox};
              relation["${tag}"="${value}"]${bbox};
            );`;
          }

          query += 'out geom;';

          return query;
        }
      },

      // ========================================
      // Project Data (Grist Tables)
      // ========================================
      project: {
        id: 'project',
        name: 'Projet Grist',
        type: 'grist',
        description: 'Données du projet stockées dans Grist',

        capabilities: [
          'full_crud',
          'formulas',
          'vector_search',
          'spatial_functions'
        ],

        tables: {
          'GIS_WorkSpace': {
            name: 'Workspace',
            description: 'Couche de travail principale',
            columns: {
              geometry_wgs84: { type: 'geometry', description: 'Géométrie WKT' },
              layer_name: { type: 'text', description: 'Nom du layer' },
              feature_name: { type: 'text', description: 'Nom de l\'entité' },
              geometry_type: { type: 'text', description: 'Type de géométrie' },
              properties: { type: 'json', description: 'Propriétés GeoJSON' },
              is_visible: { type: 'boolean', description: 'Visibilité' },
              z_index: { type: 'number', description: 'Ordre d\'affichage' }
            },
            searchableColumns: ['feature_name', 'layer_name', 'properties'],
            geometryColumn: 'geometry_wgs84'
          }
        }
      }
    };
  }

  /**
   * Build reverse index: alias -> source/layer
   */
  buildAliases() {
    const aliases = new Map();

    // IGN layers
    Object.entries(this.sources.ign.layers).forEach(([key, layer]) => {
      layer.nlp_aliases.forEach(alias => {
        aliases.set(alias.toLowerCase(), {
          source: 'ign',
          layer: key,
          layerId: layer.id
        });
      });
    });

    // OSM tags
    Object.entries(this.sources.osm.tags).forEach(([tag, tagDef]) => {
      Object.entries(tagDef.values).forEach(([value, valueDef]) => {
        valueDef.aliases.forEach(alias => {
          aliases.set(alias.toLowerCase(), {
            source: 'osm',
            tag: tag,
            value: value
          });
        });
      });
    });

    return aliases;
  }

  /**
   * Find matching data source from natural language
   *
   * @param {string} phrase - Natural language phrase (e.g., "écoles", "communes")
   * @returns {Object|null} - Match info or null
   */
  findByNLP(phrase) {
    const normalized = phrase.toLowerCase().trim();

    // Direct match
    if (this.aliases.has(normalized)) {
      return this.aliases.get(normalized);
    }

    // Fuzzy match (plural/singular variations)
    const variations = [
      normalized,
      normalized + 's',
      normalized.replace(/s$/, ''),
      normalized.replace(/x$/, ''),
      normalized + 'x'
    ];

    for (const variation of variations) {
      if (this.aliases.has(variation)) {
        return this.aliases.get(variation);
      }
    }

    return null;
  }

  /**
   * Get source by ID
   */
  getSource(sourceId) {
    return this.sources[sourceId];
  }

  /**
   * Get layer/tag metadata
   */
  getMetadata(sourceId, layerOrTag) {
    const source = this.sources[sourceId];

    if (sourceId === 'ign') {
      return source.layers[layerOrTag];
    } else if (sourceId === 'osm') {
      return source.tags[layerOrTag];
    } else if (sourceId === 'project') {
      return source.tables[layerOrTag];
    }

    return null;
  }

  /**
   * Get all capabilities for a source
   */
  getCapabilities(sourceId) {
    return this.sources[sourceId]?.capabilities || [];
  }

  /**
   * Check if source supports a capability
   */
  hasCapability(sourceId, capability) {
    return this.getCapabilities(sourceId).includes(capability);
  }

  /**
   * Get all available sources
   */
  getAllSources() {
    return Object.values(this.sources);
  }

  /**
   * Search catalog (for debugging/UI)
   */
  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    // Search IGN layers
    Object.entries(this.sources.ign.layers).forEach(([key, layer]) => {
      if (layer.name.toLowerCase().includes(lowerQuery) ||
          layer.description.toLowerCase().includes(lowerQuery) ||
          layer.nlp_aliases.some(a => a.toLowerCase().includes(lowerQuery))) {
        results.push({
          source: 'ign',
          layer: key,
          name: layer.name,
          description: layer.description
        });
      }
    });

    // Search OSM tags
    Object.entries(this.sources.osm.tags).forEach(([tag, tagDef]) => {
      Object.entries(tagDef.values).forEach(([value, valueDef]) => {
        if (valueDef.aliases.some(a => a.toLowerCase().includes(lowerQuery))) {
          results.push({
            source: 'osm',
            tag: tag,
            value: value,
            aliases: valueDef.aliases
          });
        }
      });
    });

    return results;
  }
}

// Singleton instance
const dataCatalog = new DataCatalog();

export default dataCatalog;
export { DataCatalog };
