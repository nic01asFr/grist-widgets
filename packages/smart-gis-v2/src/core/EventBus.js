/**
 * Event Bus for Inter-Component Communication
 *
 * Simple pub/sub pattern for decoupled component communication
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to event
   *
   * @param {string} eventName
   * @param {function} callback
   * @returns {function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    this.events.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit event
   *
   * @param {string} eventName
   * @param {any} data
   */
  emit(eventName, data) {
    if (!this.events.has(eventName)) return;

    this.events.get(eventName).forEach(callback => {
      callback(data);
    });
  }

  /**
   * Remove all listeners for event
   */
  off(eventName) {
    this.events.delete(eventName);
  }

  /**
   * Clear all events
   */
  clear() {
    this.events.clear();
  }
}

export default new EventBus();
