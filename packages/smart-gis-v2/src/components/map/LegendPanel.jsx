/**
 * LegendPanel - Display dynamic legends for data-driven styling
 *
 * Features:
 * - Shows legends for all layers with active style rules
 * - Collapsible/expandable
 * - Positioned on map
 * - Auto-generated from style rules
 */

import React, { useEffect, useState } from 'react';
import StateManager from '../../core/StateManager';
import StyleRuleEngine from '../../services/StyleRuleEngine';
import './LegendPanel.css';

const LegendPanel = () => {
  const [styleRules, setStyleRules] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Subscribe to style rules changes
    const unsubscribe = StateManager.subscribe('layers.styleRules', (rules) => {
      setStyleRules(rules || {});
    });

    // Load initial rules
    const initialRules = StateManager.getState('layers.styleRules');
    setStyleRules(initialRules || {});

    return unsubscribe;
  }, []);

  // Check if there are any active rules
  const hasActiveRules = Object.keys(styleRules).length > 0;

  if (!hasActiveRules) {
    return null;
  }

  return (
    <div className={`legend-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="legend-header" onClick={() => setCollapsed(!collapsed)}>
        <h4>Légende</h4>
        <button className="toggle-btn">
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <div className="legend-body">
          {Object.entries(styleRules).map(([layerName, rule]) => (
            <LayerLegend key={layerName} layerName={layerName} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * LayerLegend - Legend for a single layer
 */
const LayerLegend = ({ layerName, rule }) => {
  const legendItems = StyleRuleEngine.generateLegendItems(rule);

  return (
    <div className="layer-legend">
      <h5 className="legend-layer-name">{layerName}</h5>
      <div className="legend-field-info">
        <span className="legend-type-badge">{getLegendTypeLabel(rule.type)}</span>
        <span className="legend-field-name">{rule.field}</span>
      </div>
      <div className="legend-items">
        {legendItems.map((item, index) => (
          <LegendItem key={index} item={item} ruleType={rule.type} />
        ))}
      </div>
    </div>
  );
};

/**
 * LegendItem - Single legend entry
 */
const LegendItem = ({ item, ruleType }) => {
  return (
    <div className="legend-item">
      {ruleType === 'proportional' ? (
        <div
          className="legend-symbol legend-circle"
          style={{
            width: `${item.size}px`,
            height: `${item.size}px`,
            backgroundColor: item.color,
            borderRadius: '50%'
          }}
        />
      ) : (
        <div
          className="legend-symbol legend-square"
          style={{
            backgroundColor: item.color
          }}
        />
      )}
      <span className="legend-label">{item.label}</span>
    </div>
  );
};

/**
 * Get human-readable label for rule type
 */
const getLegendTypeLabel = (type) => {
  const labels = {
    categorized: 'Catégorisé',
    graduated: 'Gradué',
    proportional: 'Proportionnel',
    expression: 'Expression'
  };
  return labels[type] || type;
};

export default LegendPanel;
