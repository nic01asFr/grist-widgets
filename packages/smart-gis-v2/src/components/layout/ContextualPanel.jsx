/**
 * ContextualPanel - Appears on selection/tool activation (Level 3)
 */

import React, { useEffect, useState } from 'react';
import StateManager from '../../core/StateManager';

const ContextualPanel = () => {
  const [selection, setSelection] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = StateManager.subscribe('selection.ids', (ids) => {
      setSelection(ids);
      setVisible(ids.length > 0);
    });

    setSelection(StateManager.getState('selection.ids'));

    return unsubscribe;
  }, []);

  if (!visible) return null;

  return (
    <div className="contextual-panel">
      <div className="panel-header">
        <h3>Selection Details</h3>
        <button
          className="btn-close"
          onClick={() => StateManager.setState('selection.ids', [], 'Clear selection')}
        >
          ✕
        </button>
      </div>

      <div className="panel-content">
        <p><strong>{selection.length}</strong> feature(s) selected</p>

        <div className="panel-actions">
          <button className="btn-action">View Details</button>
          <button className="btn-action">Apply Tool</button>
          <button className="btn-action">Export</button>
        </div>
      </div>
    </div>
  );
};

export default ContextualPanel;
