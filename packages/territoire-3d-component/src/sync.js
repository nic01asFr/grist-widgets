/**
 * ════════════════════════════════════════════════════════════
 * MULTI-VIEW SYNC MODULE v2
 * Synchronisation temps réel + paramètres de vue relatifs
 * ════════════════════════════════════════════════════════════
 *
 * Paramètres URL supportés:
 * - channel: groupe de synchronisation
 * - master: true/false
 * - d: coefficient distance (défaut: 1)
 * - rx: rotation élévation (-360 à 360, signe = miroir)
 * - ry: rotation azimut (-360 à 360, signe = miroir)
 * - ox: offset latéral en mètres
 * - oy: offset profondeur en mètres
 * - oz: offset vertical en mètres
 */

import { Vector3, Spherical, MathUtils } from 'three';

// ════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════

const SYNC_TABLE = 'T3D_Sync';
const THROTTLE_MS = 33; // ~30fps pour BroadcastChannel
const GRIST_SAVE_DEBOUNCE = 500; // Sauvegarde Grist moins fréquente

// ════════════════════════════════════════════════════════════
// MULTI-VIEW SYNC CLASS
// ════════════════════════════════════════════════════════════

export class MultiViewSync {
    constructor() {
        // Identifiant unique du widget
        this.id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

        // Configuration depuis URL
        this.params = new URLSearchParams(location.search);
        this.channel = this.params.get('channel') || 'default';
        this.isMaster = this.params.get('master') === 'true';

        // Paramètres de vue relative
        this.viewParams = {
            d: parseFloat(this.params.get('d')) || 1,
            rx: parseFloat(this.params.get('rx')) || 0,
            ry: parseFloat(this.params.get('ry')) || 0,
            ox: parseFloat(this.params.get('ox')) || 0,
            oy: parseFloat(this.params.get('oy')) || 0,
            oz: parseFloat(this.params.get('oz')) || 0
        };

        // Calculer les modes miroir depuis le signe
        this.mirrorX = this.viewParams.rx < 0;
        this.mirrorY = this.viewParams.ry < 0;
        this.viewParams.rx = Math.abs(this.viewParams.rx);
        this.viewParams.ry = Math.abs(this.viewParams.ry);

        // État interne
        this.lastMasterState = null;
        this.lastTs = 0;
        this.receiving = false;
        this.enabled = true;
        this.gristReady = false;

        // Références 3D (connectées après init)
        this.cam = null;
        this.ctrl = null;
        this.inst = null;

        // BroadcastChannel pour sync temps réel
        this.bc = ('BroadcastChannel' in window)
            ? new BroadcastChannel(`t3d-${this.channel}`)
            : null;

        // Throttle/debounce
        this.lastBcTime = 0;
        this.gristSaveTimeout = null;

        // Callbacks
        this.onStatusChange = null;
        this.onUrlChange = null;
        this.onDisplayChange = null;

        // Vecteurs réutilisables (performance)
        this._tempVec = new Vector3();
        this._tempSpherical = new Spherical();

        this._initBroadcast();

        console.log(`🔄 Sync [${this.id}] channel="${this.channel}" ${this.isMaster ? 'MASTER' : 'SLAVE'}`);
        console.log(`   View params: d=${this.viewParams.d}, rx=${this.viewParams.rx}${this.mirrorX ? '(mirror)' : ''}, ry=${this.viewParams.ry}${this.mirrorY ? '(mirror)' : ''}`);
        console.log(`   Offsets: ox=${this.viewParams.ox}, oy=${this.viewParams.oy}, oz=${this.viewParams.oz}`);
    }

    // ════════════════════════════════════════════════════════════
    // INITIALISATION
    // ════════════════════════════════════════════════════════════

    _initBroadcast() {
        if (this.bc) {
            this.bc.addEventListener('message', (e) => this._onBroadcast(e.data));
        }
    }

    /**
     * Initialiser la connexion Grist et créer la table si nécessaire
     */
    async initGrist() {
        if (typeof grist === 'undefined') {
            console.log('⚠️ Grist non disponible');
            return;
        }

        try {
            // Vérifier/créer la table de sync
            await this._ensureSyncTable();

            // Charger l'état initial
            await this._loadInitialState();

            this.gristReady = true;
            console.log('✅ Grist sync prêt');

        } catch (e) {
            console.warn('⚠️ Erreur init Grist sync:', e.message);
        }
    }

    /**
     * Créer la table T3D_Sync si elle n'existe pas
     */
    async _ensureSyncTable() {
        if (typeof grist === 'undefined') return;

        try {
            const tables = await grist.docApi.listTables();

            if (!tables.includes(SYNC_TABLE)) {
                console.log(`📋 Création table ${SYNC_TABLE}...`);

                await grist.docApi.applyUserActions([
                    ['AddTable', SYNC_TABLE, [
                        { id: 'Channel', type: 'Text' },
                        { id: 'CopcUrl', type: 'Text' },
                        { id: 'Display', type: 'Text' },
                        { id: 'Px', type: 'Numeric' },
                        { id: 'Py', type: 'Numeric' },
                        { id: 'Pz', type: 'Numeric' },
                        { id: 'Tx', type: 'Numeric' },
                        { id: 'Ty', type: 'Numeric' },
                        { id: 'Tz', type: 'Numeric' },
                        { id: 'Zoom', type: 'Numeric' },
                        { id: 'MasterId', type: 'Text' },
                        { id: 'UpdatedAt', type: 'Numeric' }
                    ]]
                ]);

                console.log(`✅ Table ${SYNC_TABLE} créée`);
            }
        } catch (e) {
            console.warn('Erreur création table sync:', e);
        }
    }

    /**
     * Charger l'état initial depuis Grist
     */
    async _loadInitialState() {
        if (typeof grist === 'undefined') return null;

        try {
            const table = await grist.docApi.fetchTable(SYNC_TABLE);
            if (!table?.id?.length) return null;

            // Trouver la ligne pour notre channel
            const idx = table.Channel?.findIndex(c => c === this.channel);
            if (idx === -1 || idx === undefined) return null;

            const state = {
                url: table.CopcUrl?.[idx] || '',
                display: table.Display?.[idx] || 'classification',
                px: table.Px?.[idx] || 0,
                py: table.Py?.[idx] || 0,
                pz: table.Pz?.[idx] || 0,
                tx: table.Tx?.[idx] || 0,
                ty: table.Ty?.[idx] || 0,
                tz: table.Tz?.[idx] || 0,
                zoom: table.Zoom?.[idx] || 1,
                masterId: table.MasterId?.[idx] || '',
                ts: table.UpdatedAt?.[idx] || 0
            };

            this.lastTs = state.ts;
            this.lastMasterState = state;

            console.log('📥 État initial chargé depuis Grist');
            return state;

        } catch (e) {
            // Table vide ou pas encore de données
            return null;
        }
    }

    /**
     * Obtenir l'état initial (pour les slaves au démarrage)
     */
    async getInitialState() {
        return this.lastMasterState;
    }

    // ════════════════════════════════════════════════════════════
    // CONNEXION 3D
    // ════════════════════════════════════════════════════════════

    /**
     * Connecter le module aux contrôles Giro3D
     */
    connect(instance, controls) {
        this.inst = instance;
        this.ctrl = controls;
        this.cam = instance.view.camera;

        if (this.isMaster) {
            // Master: écouter les mouvements et broadcaster
            controls.addEventListener('change', () => {
                if (!this.receiving && this.enabled) {
                    this._broadcastState();
                }
            });

            controls.addEventListener('end', () => {
                if (this.enabled) {
                    this._saveToGrist();
                }
            });
        }

        this._notifyStatus();
        return this;
    }

    // ════════════════════════════════════════════════════════════
    // BROADCAST (temps réel)
    // ════════════════════════════════════════════════════════════

    /**
     * Diffuser l'état caméra via BroadcastChannel
     */
    _broadcastState() {
        if (!this.bc || !this.cam || !this.isMaster) return;

        // Throttle
        const now = performance.now();
        if (now - this.lastBcTime < THROTTLE_MS) return;
        this.lastBcTime = now;

        const state = this._getMasterState();

        this.bc.postMessage({
            type: 'camera',
            id: this.id,
            channel: this.channel,
            ts: Date.now(),
            ...state
        });
    }

    /**
     * Recevoir un message broadcast
     */
    _onBroadcast(data) {
        // Ignorer ses propres messages et autres channels
        if (data.id === this.id) return;
        if (data.channel !== this.channel) return;

        switch (data.type) {
            case 'camera':
                this._applyMasterState(data);
                break;
            case 'url':
                if (this.onUrlChange && data.url) {
                    this.onUrlChange(data.url);
                }
                break;
            case 'display':
                if (this.onDisplayChange && data.display) {
                    this.onDisplayChange(data.display);
                }
                break;
        }
    }

    /**
     * Notifier un changement d'URL (master only)
     */
    notifyUrlLoaded(url) {
        if (!this.isMaster || !this.bc) return;

        this.bc.postMessage({
            type: 'url',
            id: this.id,
            channel: this.channel,
            url: url
        });

        // Aussi sauvegarder dans Grist
        this._saveToGrist();
    }

    /**
     * Notifier un changement de mode d'affichage (master only)
     */
    notifyDisplayChange(display) {
        if (!this.isMaster || !this.bc) return;

        this.bc.postMessage({
            type: 'display',
            id: this.id,
            channel: this.channel,
            display: display
        });
    }

    // ════════════════════════════════════════════════════════════
    // TRANSFORMATION DE VUE
    // ════════════════════════════════════════════════════════════

    /**
     * Obtenir l'état actuel de la caméra master
     */
    _getMasterState() {
        const p = this.cam.position;
        const t = this.ctrl.target;
        return {
            px: p.x, py: p.y, pz: p.z,
            tx: t.x, ty: t.y, tz: t.z,
            zoom: this.cam.zoom || 1
        };
    }

    /**
     * Appliquer l'état du master avec transformations
     */
    _applyMasterState(masterState) {
        if (!this.cam || !this.ctrl) return;
        if (this.isMaster) return; // Master n'applique pas

        this.receiving = true;
        this.lastMasterState = masterState;

        // Position et target du master
        const masterPos = new Vector3(masterState.px, masterState.py, masterState.pz);
        const masterTarget = new Vector3(masterState.tx, masterState.ty, masterState.tz);

        // Calculer la nouvelle position/target pour ce slave
        const { position, target } = this._computeSlaveView(masterPos, masterTarget);

        // Appliquer
        this.cam.position.copy(position);
        this.ctrl.target.copy(target);

        // Zoom (avec coefficient distance)
        if (this.cam.isOrthographicCamera && masterState.zoom) {
            this.cam.zoom = masterState.zoom / this.viewParams.d;
            this.cam.updateProjectionMatrix();
        }

        this.ctrl.update();
        this.inst.notifyChange();

        requestAnimationFrame(() => {
            this.receiving = false;
        });
    }

    /**
     * Calculer la position/target du slave selon les paramètres de vue
     *
     * Système de coordonnées: Z-up (Lambert 93)
     * - ry: rotation azimutale (horizontale) autour de Z
     * - rx: rotation d'élévation (verticale)
     * - d: coefficient de distance
     * - ox, oy, oz: offset du target dans le référentiel de la vue master
     */
    _computeSlaveView(masterPos, masterTarget) {
        const { d, rx, ry, ox, oy, oz } = this.viewParams;

        // === ÉTAPE 1: Calculer le référentiel de la vue master ===
        // Vecteur du target vers la caméra master (direction de visée inversée)
        const camDir = new Vector3().subVectors(masterPos, masterTarget);
        const horizontalDist = Math.sqrt(camDir.x * camDir.x + camDir.y * camDir.y);
        const distance = camDir.length();

        // Azimut actuel du master (angle dans le plan XY, mesuré depuis +X)
        const masterAzimuth = Math.atan2(camDir.y, camDir.x);

        // Élévation actuelle du master (angle depuis le plan horizontal)
        const masterElevation = Math.atan2(camDir.z, horizontalDist);

        // === ÉTAPE 2: Calculer les offsets du target ===
        // Direction horizontale du master (projetée dans le plan XY)
        const forwardX = -Math.cos(masterAzimuth); // Direction vers laquelle regarde le master
        const forwardY = -Math.sin(masterAzimuth);

        // Direction "droite" (perpendiculaire, dans le plan XY)
        const rightX = -forwardY;
        const rightY = forwardX;

        // Appliquer les offsets dans le référentiel de la vue
        const slaveTarget = new Vector3(
            masterTarget.x + rightX * ox + forwardX * oy,
            masterTarget.y + rightY * ox + forwardY * oy,
            masterTarget.z + oz
        );

        // === ÉTAPE 3: Calculer la position du slave ===
        // Convertir les rotations en radians
        const ryRad = MathUtils.degToRad(ry);
        const rxRad = MathUtils.degToRad(rx);

        // Nouvel azimut du slave (master + décalage)
        // - Normal (ry > 0): slaveAzimuth = masterAzimuth + ry (suit le master)
        // - Miroir (ry < 0): slaveAzimuth = -masterAzimuth + ry (réflexion, mouvements inversés)
        const slaveAzimuth = this.mirrorY
            ? -masterAzimuth + ryRad  // Miroir: réflexion, quand master va à droite, slave va à gauche
            : masterAzimuth + ryRad;  // Normal: décalage fixe, slave suit le master

        // Nouvelle élévation du slave
        // - Normal: suit l'élévation du master avec décalage
        // - Miroir: réflexion verticale
        const slaveElevation = this.mirrorX
            ? -masterElevation + rxRad  // Miroir vertical
            : masterElevation + rxRad;  // Normal

        // Limiter l'élévation pour éviter les singularités
        const clampedElevation = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, slaveElevation));

        // Nouvelle distance (avec coefficient)
        const slaveDistance = distance * d;

        // Reconstruire la position du slave en coordonnées cartésiennes (Z-up)
        const cosElev = Math.cos(clampedElevation);
        const slavePos = new Vector3(
            slaveTarget.x + Math.cos(slaveAzimuth) * cosElev * slaveDistance,
            slaveTarget.y + Math.sin(slaveAzimuth) * cosElev * slaveDistance,
            slaveTarget.z + Math.sin(clampedElevation) * slaveDistance
        );

        return {
            position: slavePos,
            target: slaveTarget
        };
    }

    // ════════════════════════════════════════════════════════════
    // PERSISTANCE GRIST
    // ════════════════════════════════════════════════════════════

    /**
     * Sauvegarder l'état dans Grist (debounced)
     */
    _saveToGrist() {
        if (!this.gristReady || !this.isMaster) return;

        // Debounce
        if (this.gristSaveTimeout) {
            clearTimeout(this.gristSaveTimeout);
        }

        this.gristSaveTimeout = setTimeout(() => {
            this._doSaveToGrist();
        }, GRIST_SAVE_DEBOUNCE);
    }

    async _doSaveToGrist() {
        if (typeof grist === 'undefined' || !this.cam) return;

        const state = this._getMasterState();
        const ts = Date.now();

        try {
            const table = await grist.docApi.fetchTable(SYNC_TABLE);
            const idx = table?.Channel?.findIndex(c => c === this.channel);

            const record = {
                Channel: this.channel,
                CopcUrl: this.currentUrl || '',
                Display: this.currentDisplay || 'classification',
                Px: state.px,
                Py: state.py,
                Pz: state.pz,
                Tx: state.tx,
                Ty: state.ty,
                Tz: state.tz,
                Zoom: state.zoom,
                MasterId: this.id,
                UpdatedAt: ts
            };

            if (idx === -1 || idx === undefined) {
                // Créer nouvelle ligne
                await grist.docApi.applyUserActions([
                    ['AddRecord', SYNC_TABLE, null, record]
                ]);
            } else {
                // Mettre à jour
                const rowId = table.id[idx];
                await grist.docApi.applyUserActions([
                    ['UpdateRecord', SYNC_TABLE, rowId, record]
                ]);
            }

            this.lastTs = ts;

        } catch (e) {
            console.warn('Erreur sauvegarde Grist:', e);
        }
    }

    // ════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ════════════════════════════════════════════════════════════

    /**
     * Mettre à jour l'URL courante (pour sauvegarde)
     */
    setCurrentUrl(url) {
        this.currentUrl = url;
    }

    /**
     * Mettre à jour le mode d'affichage courant
     */
    setCurrentDisplay(display) {
        this.currentDisplay = display;
    }

    /**
     * Obtenir le status actuel
     */
    getStatus() {
        return {
            id: this.id,
            channel: this.channel,
            isMaster: this.isMaster,
            enabled: this.enabled,
            viewParams: this.viewParams,
            mirrorX: this.mirrorX,
            mirrorY: this.mirrorY,
            hasBroadcast: !!this.bc,
            gristReady: this.gristReady
        };
    }

    /**
     * Notifier le changement de status
     */
    _notifyStatus() {
        if (this.onStatusChange) {
            this.onStatusChange(this.getStatus());
        }
    }

    /**
     * Activer/désactiver la synchronisation
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this._notifyStatus();
    }

    /**
     * Forcer une synchronisation
     */
    forceSync() {
        if (this.isMaster) {
            this._broadcastState();
            this._saveToGrist();
        }
    }

    /**
     * Nettoyer les ressources
     */
    destroy() {
        if (this.bc) {
            this.bc.close();
            this.bc = null;
        }
        if (this.gristSaveTimeout) {
            clearTimeout(this.gristSaveTimeout);
        }
    }
}
