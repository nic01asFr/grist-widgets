/**
 * DataCart Explorer - Configuration Module
 * Manages application configuration and defaults
 */

const CONFIG = {
    // n8n Webhook Base URL
    n8nBaseUrl: 'https://n8n.pocfactory.cerema.fr/webhook',
    
    // Database configurations
    databases: {
        r_datacart: {
            name: 'r_datacart',
            label: 'Référentiels',
            description: 'Référentiels IGN (BDTOPO, AdminExpress, Cadastre, GPU, RPG)',
            icon: '📚'
        },
        e_datacart: {
            name: 'e_datacart',
            label: 'Externes',
            description: 'Données externes partenaires (BDNB, mesures compensatoires)',
            icon: '🌐'
        },
        m_datacart: {
            name: 'm_datacart',
            label: 'Métiers',
            description: 'Données métiers internes CEREMA',
            icon: '🏢'
        }
    },
    
    // Default settings
    defaults: {
        database: 'r_datacart',
        maxResults: 1000,
        pageSize: 50,
        mapCenter: [43.2965, 5.3698], // Marseille
        mapZoom: 10,
        timeout: 30000 // 30 seconds
    },
    
    // Map configuration
    map: {
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | DataCart CEREMA',
        maxZoom: 19,
        clusterThreshold: 500 // Enable clustering above this count
    },
    
    // Grist tables
    gristTables: {
        queries: 'DC_Queries',
        config: 'DC_Config'
    },
    
    // API endpoints
    endpoints: {
        schema: '/dc/schema',
        nl2sql: '/dc/nl2sql',
        execute: '/dc/execute',
        export: '/dc/export'
    },
    
    // Column type mappings
    columnTypes: {
        geometry: ['geometry', 'geography', 'point', 'linestring', 'polygon', 'multipoint', 'multilinestring', 'multipolygon'],
        numeric: ['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision', 'decimal'],
        text: ['text', 'varchar', 'character varying', 'char', 'character'],
        boolean: ['boolean', 'bool'],
        datetime: ['date', 'timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone', 'time'],
        json: ['json', 'jsonb']
    },
    
    // Icons for tree view
    icons: {
        database: '🗄️',
        schema: '📁',
        table: '📊',
        tableGeo: '🌍',
        column: '•',
        columnKey: '🔑',
        columnGeo: '🌍',
        columnFk: '🔗',
        favorite: '⭐',
        notFavorite: '☆'
    },
    
    // SQL reserved words for highlighting
    sqlKeywords: [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE',
        'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
        'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
        'AS', 'DISTINCT', 'ALL', 'UNION', 'INTERSECT', 'EXCEPT',
        'NULL', 'IS', 'TRUE', 'FALSE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF',
        'CAST', 'EXTRACT', 'DATE_PART'
    ],
    
    // PostGIS functions for autocomplete
    postgisFunctions: [
        'ST_AsGeoJSON', 'ST_AsText', 'ST_AsWKT', 'ST_GeomFromText', 'ST_GeomFromGeoJSON',
        'ST_Transform', 'ST_SetSRID', 'ST_SRID',
        'ST_Distance', 'ST_DWithin', 'ST_Within', 'ST_Contains', 'ST_Intersects',
        'ST_Buffer', 'ST_Centroid', 'ST_Union', 'ST_Intersection', 'ST_Difference',
        'ST_Area', 'ST_Length', 'ST_Perimeter',
        'ST_X', 'ST_Y', 'ST_XMin', 'ST_XMax', 'ST_YMin', 'ST_YMax',
        'ST_Envelope', 'ST_Extent', 'ST_MakeEnvelope',
        'ST_Point', 'ST_MakeLine', 'ST_MakePolygon',
        'ST_IsValid', 'ST_IsSimple', 'ST_IsEmpty', 'ST_GeometryType'
    ]
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.databases);
Object.freeze(CONFIG.defaults);
Object.freeze(CONFIG.map);
Object.freeze(CONFIG.gristTables);
Object.freeze(CONFIG.endpoints);
Object.freeze(CONFIG.columnTypes);
Object.freeze(CONFIG.icons);
