/**
 * SelectionManager - Bidirectional selection synchronization with Grist
 *
 * Handles:
 * - Grist selection → Map highlight (onRecord)
 * - Map click → Grist cursor (setCursorPos)
 * - Multi-select support (Ctrl/Cmd + click)
 * - Selection state management
 *
 * Integration:
 * - Uses GristAPI for Grist communication
 * - Uses StateManager for local state
 * - Triggers map highlight updates via state changes
 */

import GristAPI from '../core/GristAPI';
import StateManager from '../core/StateManager';

class SelectionManager {
  constructor() {
    this.selectedIds = new Set();
    this.initialized = false;
    this.currentTableId = null;
  }

  /**
   * Initialize bidirectional selection sync
   *
   * @param {string} tableId - Default table to work with (e.g., 'GIS_WorkSpace')
   */
  initialize(tableId = 'GIS_WorkSpace') {
    if (this.initialized) {
      console.warn('[SelectionManager] Already initialized');
      return;
    }

    this.currentTableId = tableId;

    // Listen for selection changes FROM Grist
    this.setupGristListener();

    // Initialize state key for map highlighting
    StateManager.setState('selection.ids', [], 'Initialize selection');

    this.initialized = true;
    console.log('[SelectionManager] ✅ Initialized with table:', tableId);
  }

  /**
   * Setup listener for Grist selection changes
   * When user clicks a row in Grist, highlight it on the map
   */
  setupGristListener() {
    GristAPI.onRecordSelect((record) => {
      if (!record) {
        // No selection in Grist → clear map highlight
        this.clearSelection();
        return;
      }

      // Grist selected a record → update map highlight
      console.log('[SelectionManager] Grist selected record:', record.id);

      this.selectedIds.clear();
      this.selectedIds.add(record.id);

      // Update state to trigger map re-render with highlight
      StateManager.setState('selection.ids', [record.id], 'Grist selection');
    });
  }

  /**
   * Handle map click → select in Grist
   *
   * @param {number} recordId - The id of the clicked feature
   * @param {boolean} multiSelect - If true, add to selection (Ctrl/Cmd held)
   */
  async handleMapClick(recordId, multiSelect = false) {
    if (multiSelect) {
      // Multi-select: toggle the clicked feature
      if (this.selectedIds.has(recordId)) {
        this.selectedIds.delete(recordId);
      } else {
        this.selectedIds.add(recordId);
      }

      // Update local state immediately (instant visual feedback)
      StateManager.setState(
        'selection.ids',
        [...this.selectedIds],
        'Multi-select on map'
      );

      // Sync to Grist (note: Grist doesn't have native multi-select API yet,
      // so we just set cursor to the last clicked item)
      await GristAPI.setCursorPos(recordId);

    } else {
      // Single select: replace selection
      this.selectedIds.clear();
      this.selectedIds.add(recordId);

      // Update local state immediately
      StateManager.setState('selection.ids', [recordId], 'Single select on map');

      // Sync to Grist
      await GristAPI.setCursorPos(recordId);
    }

    console.log('[SelectionManager] Map selection updated:', [...this.selectedIds]);
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedIds.clear();
    StateManager.setState('selection.ids', [], 'Clear selection');
    console.log('[SelectionManager] Selection cleared');
  }

  /**
   * Check if a record is currently selected
   *
   * @param {number} recordId
   * @returns {boolean}
   */
  isSelected(recordId) {
    return this.selectedIds.has(recordId);
  }

  /**
   * Get all currently selected IDs
   *
   * @returns {Array<number>}
   */
  getSelectedIds() {
    return [...this.selectedIds];
  }

  /**
   * Programmatically set selection (and sync to Grist)
   *
   * @param {Array<number>} ids - Array of record IDs to select
   */
  async setSelection(ids) {
    this.selectedIds = new Set(ids);
    StateManager.setState('selection.ids', ids, 'Programmatic selection');

    // Sync to Grist (set cursor to first ID)
    if (ids.length > 0) {
      await GristAPI.setCursorPos(ids[0]);
    }

    console.log('[SelectionManager] Selection set to:', ids);
  }
}

export default new SelectionManager();
