# Cache Distribué pour Référentiels Partagés

Architecture de partage de données lourdes (référentiels, géométries, index) entre widgets Grist.

## Problématique

### Scénario typique

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Document Grist                                   │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Carte       │  │ Formulaire  │  │ Stats       │  │ 3D View     │    │
│  │ smart-gis   │  │ saisie      │  │ dashboard   │  │ territoire  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│        │               │                │                │              │
│        ▼               ▼                ▼                ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     BESOIN COMMUN                                │   │
│  │                                                                  │   │
│  │  • Référentiel communes (35,000 entrées, 2.5 MB)                │   │
│  │  • Géométries départements (GeoJSON, 15 MB)                     │   │
│  │  • Index de recherche adresses                                   │   │
│  │  • Métadonnées couches IGN                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ❌ PROBLÈME: Chaque widget charge séparément = 4x la bande passante    │
│  ❌ PROBLÈME: Temps de chargement multiplié                             │
│  ❌ PROBLÈME: Mémoire gaspillée (données dupliquées)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Solution : Cache distribué

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Document Grist                                   │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Carte       │  │ Formulaire  │  │ Stats       │  │ 3D View     │    │
│  │ smart-gis   │  │ saisie      │  │ dashboard   │  │ territoire  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┴────────┬───────┴────────────────┘            │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      SharedCache                                 │   │
│  │                                                                  │   │
│  │  ┌──────────────────┐  BroadcastChannel  ┌──────────────────┐  │   │
│  │  │ Widget A charge  │ ───────────────▶   │ Widgets B,C,D    │  │   │
│  │  │ les données      │                    │ réutilisent      │  │   │
│  │  └──────────────────┘  ◀─────────────── └──────────────────┘  │   │
│  │                         Demandes/Réponses                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ✓ SOLUTION: 1 seul chargement, N widgets bénéficient                  │
│  ✓ SOLUTION: Temps de chargement divisé                                 │
│  ✓ SOLUTION: Mémoire partagée (dans limites du navigateur)             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Composants

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SharedCacheManager                               │
│                                                                          │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────┐   │
│  │  CacheRegistry  │   │  BroadcastLayer │   │  StorageAdapter     │   │
│  │                 │   │                 │   │                     │   │
│  │  - entries{}    │   │  - channel      │   │  - memory (fast)    │   │
│  │  - metadata{}   │   │  - listeners    │   │  - indexedDB (big)  │   │
│  │  - ttl{}        │   │  - queue        │   │  - grist table      │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────────────┘   │
│           │                    │                        │                │
│           └────────────────────┼────────────────────────┘                │
│                                ▼                                         │
│                    ┌───────────────────────┐                            │
│                    │    CacheEntry         │                            │
│                    │                       │                            │
│                    │  - key: string        │                            │
│                    │  - data: any          │                            │
│                    │  - version: number    │                            │
│                    │  - source: string     │                            │
│                    │  - loadedAt: number   │                            │
│                    │  - expiresAt: number  │                            │
│                    │  - size: number       │                            │
│                    │  - checksum: string   │                            │
│                    └───────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Messages BroadcastChannel

```typescript
// Types de messages
type CacheMessage =
    | { type: 'CACHE_REQUEST'; key: string; requesterId: string }
    | { type: 'CACHE_RESPONSE'; key: string; entry: CacheEntry }
    | { type: 'CACHE_INVALIDATE'; key: string; reason: string }
    | { type: 'CACHE_ANNOUNCE'; key: string; metadata: CacheMetadata }
    | { type: 'CACHE_PING'; requesterId: string }
    | { type: 'CACHE_PONG'; responderId: string; keys: string[] };
```

---

## Implémentation

### SharedCacheManager

```javascript
class SharedCacheManager {
    constructor(options = {}) {
        this.id = generateWidgetId();
        this.channel = new BroadcastChannel(options.channel || 'grist-shared-cache');
        this.entries = new Map();          // key → CacheEntry
        this.pending = new Map();          // key → Promise
        this.options = {
            maxMemoryMB: options.maxMemoryMB || 50,
            defaultTTL: options.defaultTTL || 3600000,  // 1 heure
            useIndexedDB: options.useIndexedDB || true,
            ...options
        };

        this._setupListeners();
    }

    // ========== API PUBLIQUE ==========

    /**
     * Obtenir une entrée du cache (locale ou distante)
     */
    async get(key, loader) {
        // 1. Cache local?
        if (this.entries.has(key)) {
            const entry = this.entries.get(key);
            if (!this._isExpired(entry)) {
                return entry.data;
            }
        }

        // 2. Requête en cours?
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }

        // 3. Demander aux autres widgets
        const promise = this._requestFromPeers(key, loader);
        this.pending.set(key, promise);

        try {
            const data = await promise;
            return data;
        } finally {
            this.pending.delete(key);
        }
    }

    /**
     * Stocker une entrée et la partager
     */
    async set(key, data, options = {}) {
        const entry = {
            key,
            data,
            version: options.version || Date.now(),
            source: this.id,
            loadedAt: Date.now(),
            expiresAt: Date.now() + (options.ttl || this.options.defaultTTL),
            size: this._estimateSize(data),
            checksum: this._computeChecksum(data)
        };

        // Vérifier la limite mémoire
        await this._ensureMemoryLimit(entry.size);

        // Stocker localement
        this.entries.set(key, entry);

        // Persister si demandé
        if (options.persist) {
            await this._persistToIndexedDB(entry);
        }

        // Annoncer aux autres
        this._broadcast({
            type: 'CACHE_ANNOUNCE',
            key,
            metadata: {
                version: entry.version,
                size: entry.size,
                checksum: entry.checksum,
                source: this.id
            }
        });

        return entry;
    }

    /**
     * Invalider une entrée (locale et distante)
     */
    invalidate(key, reason = 'manual') {
        this.entries.delete(key);

        this._broadcast({
            type: 'CACHE_INVALIDATE',
            key,
            reason
        });
    }

    /**
     * Précharger des entrées au démarrage
     */
    async preload(keys, loaders) {
        const promises = keys.map((key, i) =>
            this.get(key, loaders[i] || loaders[key])
        );
        return Promise.all(promises);
    }

    // ========== LOGIQUE INTERNE ==========

    async _requestFromPeers(key, loader) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                // Personne n'a répondu, charger nous-même
                this._loadAndShare(key, loader).then(resolve).catch(reject);
            }, 500);  // 500ms pour attendre les pairs

            // Écouter les réponses
            const handler = (event) => {
                if (event.data.type === 'CACHE_RESPONSE' && event.data.key === key) {
                    clearTimeout(timeout);
                    this.channel.removeEventListener('message', handler);

                    const entry = event.data.entry;
                    this.entries.set(key, entry);
                    resolve(entry.data);
                }
            };

            this.channel.addEventListener('message', handler);

            // Envoyer la demande
            this._broadcast({
                type: 'CACHE_REQUEST',
                key,
                requesterId: this.id
            });
        });
    }

    async _loadAndShare(key, loader) {
        if (!loader) {
            throw new Error(`No loader provided for key: ${key}`);
        }

        const data = await loader();
        const entry = await this.set(key, data);
        return data;
    }

    _setupListeners() {
        this.channel.addEventListener('message', (event) => {
            const msg = event.data;

            switch (msg.type) {
                case 'CACHE_REQUEST':
                    this._handleRequest(msg);
                    break;

                case 'CACHE_RESPONSE':
                    // Géré dans _requestFromPeers
                    break;

                case 'CACHE_INVALIDATE':
                    this.entries.delete(msg.key);
                    break;

                case 'CACHE_ANNOUNCE':
                    this._handleAnnounce(msg);
                    break;

                case 'CACHE_PING':
                    this._handlePing(msg);
                    break;
            }
        });
    }

    _handleRequest(msg) {
        if (msg.requesterId === this.id) return;

        const entry = this.entries.get(msg.key);
        if (entry && !this._isExpired(entry)) {
            this._broadcast({
                type: 'CACHE_RESPONSE',
                key: msg.key,
                entry
            });
        }
    }

    _handleAnnounce(msg) {
        // Un autre widget a chargé des données
        // On peut les demander si on en a besoin plus tard
        console.log(`Cache available: ${msg.key} from ${msg.metadata.source}`);
    }

    _handlePing(msg) {
        this._broadcast({
            type: 'CACHE_PONG',
            responderId: this.id,
            keys: Array.from(this.entries.keys())
        });
    }

    _broadcast(message) {
        this.channel.postMessage(message);
    }

    _isExpired(entry) {
        return Date.now() > entry.expiresAt;
    }

    _estimateSize(data) {
        return new Blob([JSON.stringify(data)]).size;
    }

    _computeChecksum(data) {
        // Simple hash pour détecter les changements
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(16);
    }

    async _ensureMemoryLimit(newSize) {
        const maxBytes = this.options.maxMemoryMB * 1024 * 1024;
        let currentSize = Array.from(this.entries.values())
            .reduce((sum, e) => sum + e.size, 0);

        if (currentSize + newSize > maxBytes) {
            // Éviction LRU
            const sorted = Array.from(this.entries.entries())
                .sort((a, b) => a[1].loadedAt - b[1].loadedAt);

            while (currentSize + newSize > maxBytes && sorted.length > 0) {
                const [key, entry] = sorted.shift();
                this.entries.delete(key);
                currentSize -= entry.size;
            }
        }
    }

    async _persistToIndexedDB(entry) {
        if (!this.options.useIndexedDB) return;

        const db = await this._getDB();
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put(entry);
        await tx.complete;
    }

    async _getDB() {
        if (this._db) return this._db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('grist-shared-cache', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this._db = request.result;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
        });
    }

    // ========== NETTOYAGE ==========

    destroy() {
        this.channel.close();
        this.entries.clear();
        this.pending.clear();
    }
}
```

---

## Cas d'usage : Référentiels IGN

### 1. Référentiel Communes

```javascript
// Définition du référentiel
const REFERENTIELS = {
    communes: {
        key: 'ref:communes:fr',
        loader: async () => {
            const response = await fetch(
                'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,centre'
            );
            return response.json();
        },
        ttl: 24 * 3600 * 1000,  // 24h (données stables)
        version: '2024-01'
    },

    departements: {
        key: 'ref:departements:fr',
        loader: async () => {
            const response = await fetch(
                'https://geo.api.gouv.fr/departements?fields=nom,code,codeRegion'
            );
            return response.json();
        },
        ttl: 24 * 3600 * 1000
    },

    communesGeo: {
        key: 'ref:communes:geo:fr',
        loader: async () => {
            // GeoJSON des contours (plus lourd)
            const response = await fetch(
                'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes.geojson'
            );
            return response.json();
        },
        ttl: 7 * 24 * 3600 * 1000,  // 1 semaine
        persist: true  // Sauvegarder en IndexedDB
    }
};

// Utilisation dans un widget
const cache = new SharedCacheManager({ channel: 'ign-referentiels' });

async function initWidget() {
    // Précharger les référentiels essentiels
    const [communes, departements] = await cache.preload(
        ['ref:communes:fr', 'ref:departements:fr'],
        {
            'ref:communes:fr': REFERENTIELS.communes.loader,
            'ref:departements:fr': REFERENTIELS.departements.loader
        }
    );

    console.log(`${communes.length} communes chargées`);
    setupAutocomplete(communes);
}
```

### 2. Autocomplétion partagée

```javascript
// Widget Formulaire
class CommuneAutocomplete {
    constructor(cache) {
        this.cache = cache;
        this.index = null;
    }

    async init() {
        // Récupérer ou construire l'index
        this.index = await this.cache.get('index:communes:search', async () => {
            const communes = await this.cache.get('ref:communes:fr');
            return this._buildSearchIndex(communes);
        });
    }

    _buildSearchIndex(communes) {
        // Index simple par préfixe
        const index = {};

        communes.forEach(c => {
            const normalized = this._normalize(c.nom);
            for (let i = 1; i <= normalized.length; i++) {
                const prefix = normalized.substring(0, i);
                if (!index[prefix]) index[prefix] = [];
                if (index[prefix].length < 100) {  // Limiter par préfixe
                    index[prefix].push({
                        code: c.code,
                        nom: c.nom,
                        cp: c.codesPostaux?.[0],
                        dep: c.codeDepartement
                    });
                }
            }
        });

        return index;
    }

    _normalize(str) {
        return str.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    search(query, limit = 10) {
        const normalized = this._normalize(query);
        const matches = this.index[normalized] || [];
        return matches.slice(0, limit);
    }
}

// Utilisation
const autocomplete = new CommuneAutocomplete(cache);
await autocomplete.init();

// Recherche instantanée (pas de fetch)
const results = autocomplete.search('par');
// → [{ code: '75056', nom: 'Paris', ... }, { code: '69123', nom: 'Paris-l\'Hôpital', ... }]
```

### 3. Géométries à la demande

```javascript
// Chargement progressif des géométries
class GeoLoader {
    constructor(cache) {
        this.cache = cache;
    }

    async getCommuneGeometry(codeInsee) {
        const key = `geo:commune:${codeInsee}`;

        return this.cache.get(key, async () => {
            // Charger depuis l'API si pas en cache
            const response = await fetch(
                `https://geo.api.gouv.fr/communes/${codeInsee}?fields=contour&format=geojson`
            );
            const data = await response.json();
            return data.contour;
        });
    }

    async getDepartementGeometry(codeDep) {
        const key = `geo:departement:${codeDep}`;

        return this.cache.get(key, async () => {
            const response = await fetch(
                `https://geo.api.gouv.fr/departements/${codeDep}?fields=contour&format=geojson`
            );
            const data = await response.json();
            return data.contour;
        });
    }

    // Précharger un ensemble de géométries
    async preloadCommunes(codesInsee) {
        const promises = codesInsee.map(code => this.getCommuneGeometry(code));
        return Promise.all(promises);
    }
}
```

### 4. Tuiles vectorielles partagées

```javascript
// Cache de tuiles pour cartes
class TileCache {
    constructor(cache) {
        this.cache = cache;
        this.tileSize = 256;
    }

    _tileKey(layer, z, x, y) {
        return `tile:${layer}:${z}:${x}:${y}`;
    }

    async getTile(layer, z, x, y) {
        const key = this._tileKey(layer, z, x, y);

        return this.cache.get(key, async () => {
            const url = this._buildTileUrl(layer, z, x, y);
            const response = await fetch(url);

            if (layer.endsWith('.pbf')) {
                // Tuile vectorielle
                return await response.arrayBuffer();
            } else {
                // Tuile raster
                return await response.blob();
            }
        });
    }

    _buildTileUrl(layer, z, x, y) {
        // Exemple avec IGN
        const token = config.get('ignToken');
        return `https://wxs.ign.fr/${token}/geoportail/wmts?` +
            `SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&` +
            `LAYER=${layer}&STYLE=normal&FORMAT=image/png&` +
            `TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
    }

    // Précharger les tuiles visibles
    async preloadViewport(layer, bounds, zoom) {
        const tiles = this._getTilesInBounds(bounds, zoom);
        const promises = tiles.map(t => this.getTile(layer, zoom, t.x, t.y));
        return Promise.all(promises);
    }

    _getTilesInBounds(bounds, zoom) {
        // Convertir bounds en indices de tuiles
        const tiles = [];
        const n = Math.pow(2, zoom);

        const xMin = Math.floor((bounds.west + 180) / 360 * n);
        const xMax = Math.floor((bounds.east + 180) / 360 * n);

        const yMin = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) +
            1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
        const yMax = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) +
            1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);

        for (let x = xMin; x <= xMax; x++) {
            for (let y = yMin; y <= yMax; y++) {
                tiles.push({ x, y });
            }
        }

        return tiles;
    }
}
```

---

## Stratégies d'invalidation

### 1. TTL (Time To Live)

```javascript
// Données avec durée de vie fixe
await cache.set('ref:communes:fr', data, {
    ttl: 24 * 3600 * 1000  // 24 heures
});

// Vérification automatique à chaque get()
```

### 2. Version-based

```javascript
// Invalider quand la version change
const CURRENT_VERSION = '2024-01-15';

async function loadWithVersion(key, loader) {
    const cached = await cache.get(key);

    if (cached && cached.version === CURRENT_VERSION) {
        return cached.data;
    }

    // Version différente, recharger
    const data = await loader();
    await cache.set(key, data, { version: CURRENT_VERSION });
    return data;
}
```

### 3. Event-based (depuis Grist)

```javascript
// Grist peut notifier les changements
grist.onRecords((records) => {
    // Une table de configuration a changé
    if (records.some(r => r.type === 'referentiel_update')) {
        const updated = records.filter(r => r.type === 'referentiel_update');

        updated.forEach(r => {
            cache.invalidate(`ref:${r.referentiel}`, 'grist_update');
        });
    }
});
```

### 4. Stale-While-Revalidate

```javascript
class SWRCache extends SharedCacheManager {
    async get(key, loader, options = {}) {
        const entry = this.entries.get(key);

        if (entry) {
            // Retourner immédiatement même si expiré
            const data = entry.data;

            // Revalider en arrière-plan si expiré
            if (this._isExpired(entry)) {
                this._revalidateInBackground(key, loader);
            }

            return data;
        }

        // Pas en cache, charger normalement
        return super.get(key, loader);
    }

    async _revalidateInBackground(key, loader) {
        try {
            const freshData = await loader();
            await this.set(key, freshData);
            console.log(`Revalidated: ${key}`);
        } catch (error) {
            console.warn(`Revalidation failed for ${key}:`, error);
            // Garder les données périmées
        }
    }
}
```

### 5. Dependency-based

```javascript
// Invalider les dépendants quand le parent change
const DEPENDENCIES = {
    'ref:communes:fr': [
        'index:communes:search',
        'index:communes:byDepartement',
        'stats:communes:population'
    ]
};

cache.invalidate = function(key, reason) {
    // Invalider l'entrée
    this.entries.delete(key);

    // Invalider les dépendants
    const deps = DEPENDENCIES[key] || [];
    deps.forEach(depKey => {
        this.entries.delete(depKey);
    });

    this._broadcast({
        type: 'CACHE_INVALIDATE',
        key,
        reason,
        cascaded: deps
    });
};
```

---

## Optimisations

### 1. Compression

```javascript
// Compresser les grandes entrées
async function compressedSet(cache, key, data, options = {}) {
    const json = JSON.stringify(data);

    if (json.length > 100000) {  // > 100KB
        // Utiliser CompressionStream si disponible
        if (typeof CompressionStream !== 'undefined') {
            const blob = new Blob([json]);
            const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
            const compressed = await new Response(stream).arrayBuffer();

            return cache.set(key, {
                compressed: true,
                data: compressed
            }, options);
        }
    }

    return cache.set(key, data, options);
}

async function compressedGet(cache, key, loader) {
    const entry = await cache.get(key, loader);

    if (entry?.compressed) {
        const stream = new Blob([entry.data]).stream()
            .pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        return JSON.parse(text);
    }

    return entry;
}
```

### 2. Chunking pour gros transferts

```javascript
// Découper les gros référentiels en chunks
const CHUNK_SIZE = 500;  // entrées par chunk

async function loadInChunks(cache, key, loader) {
    // Vérifier si les chunks existent
    const metadata = await cache.get(`${key}:meta`);

    if (metadata) {
        // Assembler les chunks
        const chunks = await Promise.all(
            Array.from({ length: metadata.chunkCount }, (_, i) =>
                cache.get(`${key}:chunk:${i}`)
            )
        );
        return chunks.flat();
    }

    // Charger et découper
    const fullData = await loader();
    const chunks = [];

    for (let i = 0; i < fullData.length; i += CHUNK_SIZE) {
        const chunk = fullData.slice(i, i + CHUNK_SIZE);
        chunks.push(chunk);
        await cache.set(`${key}:chunk:${chunks.length - 1}`, chunk);
    }

    await cache.set(`${key}:meta`, {
        chunkCount: chunks.length,
        totalItems: fullData.length
    });

    return fullData;
}
```

### 3. Lazy loading par zone

```javascript
// Charger uniquement les données de la zone visible
class ZonedCache {
    constructor(cache) {
        this.cache = cache;
        this.zoneSize = 100000;  // 100km en mètres
    }

    _getZoneKey(x, y) {
        const zoneX = Math.floor(x / this.zoneSize);
        const zoneY = Math.floor(y / this.zoneSize);
        return `zone:${zoneX}:${zoneY}`;
    }

    async getDataInBounds(bounds, loader) {
        // Identifier les zones touchées
        const zones = this._getZonesInBounds(bounds);

        // Charger chaque zone
        const zoneData = await Promise.all(
            zones.map(z => this.cache.get(z.key, () => loader(z.bounds)))
        );

        // Fusionner
        return zoneData.flat();
    }

    _getZonesInBounds(bounds) {
        const zones = [];
        const minZoneX = Math.floor(bounds.minX / this.zoneSize);
        const maxZoneX = Math.floor(bounds.maxX / this.zoneSize);
        const minZoneY = Math.floor(bounds.minY / this.zoneSize);
        const maxZoneY = Math.floor(bounds.maxY / this.zoneSize);

        for (let x = minZoneX; x <= maxZoneX; x++) {
            for (let y = minZoneY; y <= maxZoneY; y++) {
                zones.push({
                    key: `zone:${x}:${y}`,
                    bounds: {
                        minX: x * this.zoneSize,
                        maxX: (x + 1) * this.zoneSize,
                        minY: y * this.zoneSize,
                        maxY: (y + 1) * this.zoneSize
                    }
                });
            }
        }

        return zones;
    }
}
```

---

## Monitoring

```javascript
// Statistiques du cache
class CacheStats {
    constructor(cache) {
        this.cache = cache;
        this.stats = {
            hits: 0,
            misses: 0,
            broadcasts: 0,
            bytesTransferred: 0
        };
    }

    getReport() {
        const entries = Array.from(this.cache.entries.values());
        const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

        return {
            entriesCount: entries.length,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            ...this.stats,
            entriesBySource: this._groupBySource(entries)
        };
    }

    _groupBySource(entries) {
        return entries.reduce((acc, e) => {
            acc[e.source] = (acc[e.source] || 0) + 1;
            return acc;
        }, {});
    }
}

// Afficher dans la console
const stats = new CacheStats(cache);
console.table(stats.getReport());
```

---

## Intégration avec SyncManager

```javascript
// Le cache peut être utilisé comme source de données pour le sync
import { SyncManager } from './sync.js';
import { SharedCacheManager } from './cache.js';

const cache = new SharedCacheManager({ channel: 'referentiels' });
const sync = new SyncManager({ channel: 'widgets', master: true });

// Synchroniser le référentiel actif
sync.register('activeReferentiel', {
    get: () => state.activeRef,
    set: async (refKey) => {
        // Charger le référentiel via le cache partagé
        const data = await cache.get(refKey, REFERENTIELS[refKey].loader);
        applyReferentiel(data);
    }
});
```

---

## Résumé

| Aspect | Approche |
|--------|----------|
| **Transport** | BroadcastChannel (même origine) |
| **Stockage court** | Map en mémoire (50 MB max) |
| **Stockage long** | IndexedDB (persistant) |
| **Invalidation** | TTL + Version + Events |
| **Optimisation** | Compression, Chunking, Zoning |
| **Monitoring** | Stats hits/misses, taille |

Le cache distribué permet de :
- ✅ Charger les référentiels une seule fois
- ✅ Partager entre tous les widgets du document
- ✅ Persister entre les sessions (IndexedDB)
- ✅ Invalider proprement quand les données changent
