/**
 * ════════════════════════════════════════════════════════════
 * MULTI-VIEW SYNC MODULE
 * Synchronisation temps réel (BroadcastChannel) + persistance Grist
 * ════════════════════════════════════════════════════════════
 */

export class MultiViewSync {
    constructor() {
        // Identifiant unique du widget
        this.id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        
        // Configuration depuis URL
        this.params = new URLSearchParams(location.search);
        this.isMaster = this.params.get('master') === 'true';
        this.group = this.params.get('group') || 'default';
        
        // État interne
        this.lastState = null;
        this.lastTs = 0;
        this.receiving = false;
        this.enabled = true;
        
        // Références 3D (connectées après init)
        this.cam = null;
        this.ctrl = null;
        this.inst = null;
        
        // BroadcastChannel pour sync temps réel
        this.bc = ('BroadcastChannel' in window)
            ? new BroadcastChannel(`t3d-${this.group}`)
            : null;
        
        // Throttle configuration
        this.throttleMs = 33; // ~30fps
        this.lastBc = 0;
        
        // Callbacks
        this.onStatusChange = null;
        
        this._init();
    }

    async _init() {
        // Écouter les messages broadcast
        if (this.bc) {
            this.bc.addEventListener('message', (e) => this._onBroadcast(e.data));
        }
        
        // Écouter la table Grist (fallback Safari + état initial)
        if (typeof grist !== 'undefined') {
            grist.onRecords((records) => {
                if (records?.[0]) this._onGristRecord(records[0]);
            });
        }
        
        // Charger l'état initial depuis Grist
        await this._loadInitialState();
        
        console.log(`🔄 Sync initialisé [${this.id}] ${this.isMaster ? 'MASTER' : 'SLAVE'}`);
    }

    /**
     * Charger l'état caméra initial depuis la table Grist
     */
    async _loadInitialState() {
        if (typeof grist === 'undefined') return;
        
        try {
            const t = await grist.docApi.fetchTable('Camera_Sync');
            if (t?.id?.length) {
                this.lastTs = t.Ts?.[0] || 0;
                
                // Appliquer après un délai (attendre init 3D)
                setTimeout(() => {
                    this._applyState({
                        px: t.Px[0], py: t.Py[0], pz: t.Pz[0],
                        tx: t.Tx[0], ty: t.Ty[0], tz: t.Tz[0],
                        zm: t.Zm[0]
                    }, true);
                }, 200);
            }
        } catch (e) {
            // Table pas encore créée - normal au premier lancement
        }
    }

    /**
     * Connecter le module aux contrôles Giro3D
     */
    connect(instance, controls) {
        this.inst = instance;
        this.ctrl = controls;
        this.cam = instance.view.camera;
        
        // Écouter les mouvements caméra (broadcast en temps réel)
        controls.addEventListener('change', () => {
            if (!this.receiving && this.isMaster && this.enabled) {
                this._broadcastState();
            }
        });
        
        // Sauvegarder dans Grist à la fin du mouvement
        controls.addEventListener('end', () => {
            if (this.isMaster && this.enabled) {
                this._saveToGrist();
            }
        });
        
        this._notifyStatus();
        return this;
    }

    /**
     * Diffuser l'état caméra via BroadcastChannel
     */
    _broadcastState() {
        if (!this.bc || !this.cam) return;
        
        // Throttle pour limiter à ~30fps
        const now = performance.now();
        if (now - this.lastBc < this.throttleMs) return;
        this.lastBc = now;
        
        const state = this._getCurrentState();
        
        // Éviter les broadcasts si rien n'a changé
        if (this._isSameState(state)) return;
        this.lastState = state;
        
        this.bc.postMessage({
            id: this.id,
            ts: Date.now(),
            ...state
        });
    }

    /**
     * Recevoir un message broadcast d'un autre widget
     */
    _onBroadcast(data) {
        // Ignorer ses propres messages
        if (data.id === this.id) return;
        
        this._applyState(data);
    }

    /**
     * Sauvegarder l'état dans la table Grist
     */
    async _saveToGrist() {
        if (!this.cam || typeof grist === 'undefined') return;
        
        const state = this._getCurrentState();
        const ts = Date.now();
        
        try {
            const tables = await grist.docApi.listTables();
            
            if (!tables.includes('Camera_Sync')) {
                // Créer la table si elle n'existe pas
                await grist.docApi.applyUserActions([
                    ['AddTable', 'Camera_Sync', [
                        { id: 'Px', type: 'Numeric' },
                        { id: 'Py', type: 'Numeric' },
                        { id: 'Pz', type: 'Numeric' },
                        { id: 'Tx', type: 'Numeric' },
                        { id: 'Ty', type: 'Numeric' },
                        { id: 'Tz', type: 'Numeric' },
                        { id: 'Zm', type: 'Numeric' },
                        { id: 'Wr', type: 'Text' },
                        { id: 'Ts', type: 'Numeric' }
                    ]],
                    ['AddRecord', 'Camera_Sync', null, {
                        ...this._stateToRecord(state),
                        Wr: this.id,
                        Ts: ts
                    }]
                ]);
            } else {
                // Mettre à jour la ligne existante
                await grist.docApi.applyUserActions([
                    ['UpdateRecord', 'Camera_Sync', 1, {
                        ...this._stateToRecord(state),
                        Wr: this.id,
                        Ts: ts
                    }]
                ]);
            }
            
            this.lastTs = ts;
        } catch (e) {
            console.warn('Sync save error:', e);
        }
    }

    /**
     * Recevoir une mise à jour depuis la table Grist (fallback)
     */
    _onGristRecord(record) {
        // Ignorer si c'est notre propre écriture ou si plus ancien
        if (record.Wr === this.id) return;
        if (record.Ts <= this.lastTs) return;
        
        // Utiliser Grist uniquement si pas de BroadcastChannel (Safari)
        if (!this.bc) {
            this._applyState({
                px: record.Px, py: record.Py, pz: record.Pz,
                tx: record.Tx, ty: record.Ty, tz: record.Tz,
                zm: record.Zm
            });
        }
        
        this.lastTs = record.Ts;
    }

    /**
     * Appliquer un état caméra reçu
     */
    _applyState(state, force = false) {
        if (!this.cam || !this.ctrl) return;
        
        // Le master n'applique pas les états externes (sauf force)
        if (!force && this.isMaster) return;
        
        // Flag pour éviter les boucles
        this.receiving = true;
        
        // Appliquer position caméra
        this.cam.position.set(state.px, state.py, state.pz);
        
        // Appliquer target
        this.ctrl.target.set(state.tx, state.ty, state.tz);
        
        // Appliquer zoom (caméra orthographique)
        if (state.zm && this.cam.isOrthographicCamera) {
            this.cam.zoom = state.zm;
            this.cam.updateProjectionMatrix();
        }
        
        // Mettre à jour les contrôles
        this.ctrl.update();
        
        // Notifier Giro3D
        this.inst.notifyChange();
        
        // Débloquer après un frame
        requestAnimationFrame(() => {
            this.receiving = false;
        });
    }

    /**
     * Obtenir l'état actuel de la caméra
     */
    _getCurrentState() {
        const p = this.cam.position;
        const t = this.ctrl.target;
        return {
            px: p.x, py: p.y, pz: p.z,
            tx: t.x, ty: t.y, tz: t.z,
            zm: this.cam.zoom || 1
        };
    }

    /**
     * Convertir état vers format record Grist
     */
    _stateToRecord(s) {
        return {
            Px: s.px, Py: s.py, Pz: s.pz,
            Tx: s.tx, Ty: s.ty, Tz: s.tz,
            Zm: s.zm
        };
    }

    /**
     * Vérifier si l'état a changé significativement
     */
    _isSameState(s) {
        if (!this.lastState) return false;
        const epsilon = 0.1;
        return Math.abs(s.px - this.lastState.px) < epsilon &&
               Math.abs(s.py - this.lastState.py) < epsilon &&
               Math.abs(s.pz - this.lastState.pz) < epsilon;
    }

    /**
     * Notifier le changement de status
     */
    _notifyStatus() {
        if (this.onStatusChange) {
            this.onStatusChange(this.getStatus());
        }
    }

    // ════════════════════════════════════════════════════════════
    // API PUBLIQUE
    // ════════════════════════════════════════════════════════════

    /**
     * Obtenir le status actuel du sync
     */
    getStatus() {
        return {
            id: this.id,
            isMaster: this.isMaster,
            group: this.group,
            enabled: this.enabled,
            hasBroadcast: !!this.bc
        };
    }

    /**
     * Définir le rôle master/slave
     */
    setMaster(isMaster) {
        this.isMaster = isMaster;
        this._notifyStatus();
        console.log(`🔄 Widget ${this.id} → ${isMaster ? 'MASTER' : 'SLAVE'}`);
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
    }
}
