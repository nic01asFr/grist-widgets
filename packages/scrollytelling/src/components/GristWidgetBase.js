/**
 * GristWidgetBase - Base class for Grist widgets
 * Handles 7-phase initialization and Grist API communication
 */

export class GristWidgetBase {
  constructor() {
    this.gristApi = null;
    this.docApi = null;
    this.ready = false;
    this.mode = 'view';
    this.mappings = {};
    this.onReadyCallback = null;
    this.onRecordsCallback = null;
    this.onMappingsCallback = null;
  }

  // Phase 1: Detect mode (view/edit)
  detectMode() {
    const urlParams = new URLSearchParams(window.location.search);
    this.mode = urlParams.get('mode') || 'view';
    console.log('Widget mode:', this.mode);
  }

  // Phase 2: Initialize Grist API
  async initializeGristApi() {
    if (typeof window.grist === 'undefined') {
      console.error('Grist API not found');
      throw new Error('Grist API not available');
    }

    this.gristApi = window.grist;
    await this.gristApi.ready({
      requiredAccess: 'full',
      columns: []
    });

    this.docApi = this.gristApi.docApi;
    console.log('Grist API initialized');
  }

  // Phase 3: Load configuration
  async loadConfiguration() {
    try {
      const options = await this.gristApi.getOptions();
      console.log('Widget options:', options);
      return options;
    } catch (error) {
      console.error('Error loading configuration:', error);
      return {};
    }
  }

  // Phase 4: Declare requirements (column mappings)
  async declareRequirements(mappings) {
    this.mappings = mappings;
    await this.gristApi.ready({
      requiredAccess: 'full',
      columns: Object.keys(mappings)
    });
    console.log('Requirements declared:', mappings);
  }

  // Phase 5: Setup event listeners
  setupEventListeners(onRecords, onMappings) {
    this.onRecordsCallback = onRecords;
    this.onMappingsCallback = onMappings;

    // Listen for data changes
    this.gristApi.onRecords((records, mappings) => {
      console.log('Received records:', records?.length || 0);
      if (mappings) {
        this.mappings = mappings;
        if (this.onMappingsCallback) {
          this.onMappingsCallback(mappings);
        }
      }
      if (this.onRecordsCallback) {
        this.onRecordsCallback(records);
      }
    });

    // Listen for record selection
    this.gristApi.onRecord((record) => {
      console.log('Selected record:', record?.id);
    });

    console.log('Event listeners setup');
  }

  // Phase 6: Load document metadata
  async loadDocumentMetadata() {
    try {
      const tables = await this.docApi.fetchTable('_grist_Tables');
      console.log('Document metadata loaded:', tables[2]?.length || 0, 'tables');
      return tables;
    } catch (error) {
      console.error('Error loading document metadata:', error);
      return null;
    }
  }

  // Phase 7: Initialize business components
  async initializeBusinessComponents(initCallback) {
    if (initCallback) {
      await initCallback();
    }
    this.ready = true;
    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
    console.log('Widget ready');
  }

  // Full initialization sequence
  async initialize(options = {}) {
    try {
      this.detectMode();
      await this.initializeGristApi();
      await this.loadConfiguration();

      if (options.mappings) {
        await this.declareRequirements(options.mappings);
      }

      if (options.onRecords || options.onMappings) {
        this.setupEventListeners(options.onRecords, options.onMappings);
      }

      await this.loadDocumentMetadata();
      await this.initializeBusinessComponents(options.onInit);

      return true;
    } catch (error) {
      console.error('Widget initialization error:', error);
      return false;
    }
  }

  // Helper methods
  async setCursor(recordId) {
    if (this.gristApi) {
      await this.gristApi.setCursorPos({ rowId: recordId });
    }
  }

  async updateRecord(tableName, recordId, fields) {
    if (this.docApi) {
      await this.docApi.applyUserActions([
        ['UpdateRecord', tableName, recordId, fields]
      ]);
    }
  }

  async addRecord(tableName, fields) {
    if (this.docApi) {
      await this.docApi.applyUserActions([
        ['AddRecord', tableName, null, fields]
      ]);
    }
  }

  onReady(callback) {
    this.onReadyCallback = callback;
    if (this.ready) {
      callback();
    }
  }
}

export default GristWidgetBase;
