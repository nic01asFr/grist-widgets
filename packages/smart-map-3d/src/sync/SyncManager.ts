/**
 * SyncManager - Gestionnaire de synchronisation multi-vues
 *
 * Permet à plusieurs instances du widget de synchroniser :
 * - Position caméra (center, zoom, pitch, bearing)
 * - Sélection d'objets
 * - Visibilité des couches
 * - Paramètres d'ambiance (heure, éclairage)
 */

// Types de messages de synchronisation
export type SyncMessageType =
  | 'camera'      // Position caméra
  | 'selection'   // Sélection d'objets
  | 'layer'       // État des couches
  | 'ambiance'    // Heure, éclairage
  | 'join'        // Rejoindre un groupe
  | 'leave'       // Quitter un groupe
  | 'ping'        // Heartbeat
  | 'pong';       // Réponse heartbeat

export interface SyncMessage {
  type: SyncMessageType;
  groupId: string;
  instanceId: string;
  timestamp: number;
  payload: any;
}

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface SelectionState {
  layerId: string | null;
  featureIndices: number[];
}

export interface AmbianceState {
  timeOfDay: number;       // Minutes depuis minuit
  date: string;            // ISO date
  shadowsEnabled?: boolean;
  useRealisticSun?: boolean;
}

export interface LayerVisibilityState {
  layerId: string;
  visible: boolean;
}

// Configuration de synchronisation
export interface SyncConfig {
  syncCamera: boolean;
  syncSelection: boolean;
  syncLayers: boolean;
  syncAmbiance: boolean;
  role: 'master' | 'slave' | 'peer';
  transform?: CameraTransform;
}

// Transformation de caméra (pour vues décalées)
export interface CameraTransform {
  type: 'none' | 'offset' | 'mirror' | 'custom';
  offsetLng?: number;
  offsetLat?: number;
  bearingOffset?: number;
  pitchOffset?: number;
  zoomOffset?: number;
  customFn?: (camera: CameraState) => CameraState;
}

// Callback types
export type CameraCallback = (camera: CameraState, sourceId: string) => void;
export type SelectionCallback = (selection: SelectionState, sourceId: string) => void;
export type AmbianceCallback = (ambiance: AmbianceState, sourceId: string) => void;
export type LayerCallback = (layer: LayerVisibilityState, sourceId: string) => void;

/**
 * Classe principale de synchronisation
 */
export class SyncManager {
  private channel: BroadcastChannel | null = null;
  private instanceId: string;
  private groupId: string;
  private config: SyncConfig;
  private _isActive: boolean = false;

  // Callbacks
  private onCameraChange: CameraCallback | null = null;
  private onSelectionChange: SelectionCallback | null = null;
  private onAmbianceChange: AmbianceCallback | null = null;
  private onLayerChange: LayerCallback | null = null;

  // Debounce pour éviter les boucles
  private lastCameraSent: number = 0;
  private cameraDebounceMs: number = 50;
  private ignoreNextCamera: boolean = false;
  private cameraSendPaused: boolean = false;

  // Peers tracking
  private peers: Map<string, { lastSeen: number }> = new Map();
  private heartbeatInterval: number | null = null;

  constructor(groupId: string = 'default', config?: Partial<SyncConfig>) {
    this.instanceId = this.generateInstanceId();
    this.groupId = groupId;
    this.config = {
      syncCamera: true,
      syncSelection: true,
      syncLayers: true,
      syncAmbiance: true,
      role: 'peer',
      transform: { type: 'none' },
      ...config
    };
  }

  private generateInstanceId(): string {
    return `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Démarrer la synchronisation
   */
  start(): void {
    if (this._isActive) return;

    try {
      this.channel = new BroadcastChannel(`smart-map-3d-${this.groupId}`);
      this.channel.onmessage = (event) => this.handleMessage(event.data);
      this._isActive = true;

      // Annoncer notre présence
      this.sendMessage('join', { role: this.config.role });

      // Démarrer le heartbeat
      this.startHeartbeat();

      console.log(`🔗 Sync démarré: groupe="${this.groupId}", instance="${this.instanceId}"`);
    } catch (error) {
      console.error('Erreur démarrage sync:', error);
    }
  }

  /**
   * Arrêter la synchronisation
   */
  stop(): void {
    if (!this._isActive) return;

    this.sendMessage('leave', {});
    this.stopHeartbeat();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this._isActive = false;
    this.peers.clear();
    console.log(`🔌 Sync arrêté: instance="${this.instanceId}"`);
  }

  /**
   * Changer de groupe de synchronisation
   */
  changeGroup(newGroupId: string): void {
    const wasActive = this._isActive;
    if (wasActive) this.stop();

    this.groupId = newGroupId;
    this.peers.clear();

    if (wasActive) this.start();
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ============================================
  // ENVOI DE MESSAGES
  // ============================================

  private sendMessage(type: SyncMessageType, payload: any): void {
    if (!this.channel || !this._isActive) return;

    const message: SyncMessage = {
      type,
      groupId: this.groupId,
      instanceId: this.instanceId,
      timestamp: Date.now(),
      payload
    };

    this.channel.postMessage(message);
  }

  /**
   * Envoyer la position de la caméra
   */
  sendCamera(camera: CameraState): void {
    if (!this.config.syncCamera) return;
    if (this.config.role === 'slave') return; // Slaves ne transmettent pas
    if (this.cameraSendPaused) return; // Paused during programmatic camera changes

    const now = Date.now();
    if (now - this.lastCameraSent < this.cameraDebounceMs) return;

    this.lastCameraSent = now;
    this.sendMessage('camera', camera);
  }

  /**
   * Pause l'envoi des sync camera (pour fitBounds, etc.)
   */
  pauseCameraSend(): void {
    this.cameraSendPaused = true;
  }

  /**
   * Resume l'envoi des sync camera
   */
  resumeCameraSend(): void {
    this.cameraSendPaused = false;
  }

  /**
   * Check if camera send is paused
   */
  isCameraSendPaused(): boolean {
    return this.cameraSendPaused;
  }

  /**
   * Envoyer l'état de sélection
   */
  sendSelection(selection: SelectionState): void {
    if (!this.config.syncSelection) return;
    if (this.config.role === 'slave') return;

    this.sendMessage('selection', selection);
  }

  /**
   * Envoyer l'état d'ambiance
   */
  sendAmbiance(ambiance: AmbianceState): void {
    if (!this.config.syncAmbiance) return;
    if (this.config.role === 'slave') return;

    this.sendMessage('ambiance', ambiance);
  }

  /**
   * Envoyer la visibilité d'une couche
   */
  sendLayerVisibility(layer: LayerVisibilityState): void {
    if (!this.config.syncLayers) return;
    if (this.config.role === 'slave') return;

    this.sendMessage('layer', layer);
  }

  // ============================================
  // RÉCEPTION DE MESSAGES
  // ============================================

  private handleMessage(message: SyncMessage): void {
    // Ignorer nos propres messages
    if (message.instanceId === this.instanceId) return;

    // Ignorer les messages d'autres groupes
    if (message.groupId !== this.groupId) return;

    // Mettre à jour le tracking des peers
    this.peers.set(message.instanceId, { lastSeen: message.timestamp });

    switch (message.type) {
      case 'camera':
        this.handleCameraMessage(message);
        break;
      case 'selection':
        this.handleSelectionMessage(message);
        break;
      case 'ambiance':
        this.handleAmbianceMessage(message);
        break;
      case 'layer':
        this.handleLayerMessage(message);
        break;
      case 'join':
        console.log(`👋 Peer rejoint: ${message.instanceId}`);
        // Répondre avec un pong pour confirmer notre présence
        this.sendMessage('pong', { role: this.config.role });
        break;
      case 'leave':
        console.log(`👋 Peer parti: ${message.instanceId}`);
        this.peers.delete(message.instanceId);
        break;
      case 'ping':
        this.sendMessage('pong', {});
        break;
      case 'pong':
        // Peer est vivant, déjà mis à jour dans le tracking
        break;
    }
  }

  private handleCameraMessage(message: SyncMessage): void {
    if (!this.config.syncCamera) return;
    if (this.config.role === 'master') return; // Masters n'écoutent pas

    let camera: CameraState = message.payload;

    // Appliquer la transformation si configurée
    if (this.config.transform && this.config.transform.type !== 'none') {
      camera = this.applyTransform(camera);
    }

    if (this.onCameraChange) {
      this.ignoreNextCamera = true;
      this.onCameraChange(camera, message.instanceId);

      // Reset le flag après un court délai
      setTimeout(() => {
        this.ignoreNextCamera = false;
      }, 100);
    }
  }

  private handleSelectionMessage(message: SyncMessage): void {
    if (!this.config.syncSelection) return;
    if (this.config.role === 'master') return;

    if (this.onSelectionChange) {
      this.onSelectionChange(message.payload, message.instanceId);
    }
  }

  private handleAmbianceMessage(message: SyncMessage): void {
    if (!this.config.syncAmbiance) return;
    if (this.config.role === 'master') return;

    if (this.onAmbianceChange) {
      this.onAmbianceChange(message.payload, message.instanceId);
    }
  }

  private handleLayerMessage(message: SyncMessage): void {
    if (!this.config.syncLayers) return;
    if (this.config.role === 'master') return;

    if (this.onLayerChange) {
      this.onLayerChange(message.payload, message.instanceId);
    }
  }

  // ============================================
  // TRANSFORMATIONS DE CAMÉRA
  // ============================================

  private applyTransform(camera: CameraState): CameraState {
    const t = this.config.transform;
    if (!t) return camera;

    switch (t.type) {
      case 'offset':
        return {
          center: [
            camera.center[0] + (t.offsetLng || 0),
            camera.center[1] + (t.offsetLat || 0)
          ],
          zoom: camera.zoom + (t.zoomOffset || 0),
          pitch: camera.pitch + (t.pitchOffset || 0),
          bearing: camera.bearing + (t.bearingOffset || 0)
        };

      case 'mirror':
        // Vue miroir (utile pour comparaison avant/après)
        return {
          ...camera,
          bearing: (camera.bearing + 180) % 360
        };

      case 'custom':
        if (t.customFn) {
          return t.customFn(camera);
        }
        return camera;

      default:
        return camera;
    }
  }

  // ============================================
  // HEARTBEAT
  // ============================================

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.sendMessage('ping', {});
      this.cleanupStalePeers();
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private cleanupStalePeers(): void {
    const now = Date.now();
    const staleThreshold = 15000; // 15 secondes

    for (const [peerId, info] of this.peers.entries()) {
      if (now - info.lastSeen > staleThreshold) {
        console.log(`💀 Peer inactif supprimé: ${peerId}`);
        this.peers.delete(peerId);
      }
    }
  }

  // ============================================
  // SETTERS POUR CALLBACKS
  // ============================================

  setOnCameraChange(callback: CameraCallback): void {
    this.onCameraChange = callback;
  }

  setOnSelectionChange(callback: SelectionCallback): void {
    this.onSelectionChange = callback;
  }

  setOnAmbianceChange(callback: AmbianceCallback): void {
    this.onAmbianceChange = callback;
  }

  setOnLayerChange(callback: LayerCallback): void {
    this.onLayerChange = callback;
  }

  // ============================================
  // GETTERS
  // ============================================

  get id(): string {
    return this.instanceId;
  }

  get group(): string {
    return this.groupId;
  }

  get active(): boolean {
    return this._isActive;
  }

  get peerCount(): number {
    return this.peers.size;
  }

  get currentRole(): string {
    return this.config.role;
  }

  // Method accessors for compatibility
  isActive(): boolean {
    return this._isActive;
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getRole(): 'master' | 'slave' | 'peer' {
    return this.config.role;
  }

  shouldIgnoreCamera(): boolean {
    return this.ignoreNextCamera;
  }
}

/**
 * Factory pour créer des configurations de sync prédéfinies
 */
export const SyncPresets = {
  /**
   * Vue maître - contrôle les autres
   */
  master: (): Partial<SyncConfig> => ({
    role: 'master',
    syncCamera: true,
    syncSelection: true,
    syncLayers: true,
    syncAmbiance: true
  }),

  /**
   * Vue peer - synchronisation bidirectionnelle
   */
  peer: (): Partial<SyncConfig> => ({
    role: 'peer',
    syncCamera: true,
    syncSelection: true,
    syncLayers: true,
    syncAmbiance: true
  }),

  /**
   * Vue esclave - suit le maître
   */
  slave: (): Partial<SyncConfig> => ({
    role: 'slave',
    syncCamera: true,
    syncSelection: true,
    syncLayers: true,
    syncAmbiance: true
  }),

  /**
   * Vue décalée (vue d'un autre quartier)
   */
  offsetView: (offsetLng: number, offsetLat: number): Partial<SyncConfig> => ({
    role: 'slave',
    syncCamera: true,
    transform: {
      type: 'offset',
      offsetLng,
      offsetLat
    }
  }),

  /**
   * Vue satellite (zoom out de la vue principale)
   */
  satelliteView: (zoomOut: number = 3): Partial<SyncConfig> => ({
    role: 'slave',
    syncCamera: true,
    transform: {
      type: 'offset',
      zoomOffset: -zoomOut
    }
  }),

  /**
   * Vue miroir (180° de rotation)
   */
  mirrorView: (): Partial<SyncConfig> => ({
    role: 'slave',
    syncCamera: true,
    transform: {
      type: 'mirror'
    }
  }),

  /**
   * Caméra indépendante, mais sélection synchronisée
   */
  selectionOnly: (): Partial<SyncConfig> => ({
    role: 'peer',
    syncCamera: false,
    syncSelection: true,
    syncLayers: false,
    syncAmbiance: false
  }),

  /**
   * Tout synchronisé sauf la caméra
   */
  dataOnly: (): Partial<SyncConfig> => ({
    role: 'peer',
    syncCamera: false,
    syncSelection: true,
    syncLayers: true,
    syncAmbiance: true
  })
};

export default SyncManager;
