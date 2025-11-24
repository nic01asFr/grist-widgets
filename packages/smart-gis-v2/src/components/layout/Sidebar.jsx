/**
 * Sidebar - Tabbed Menu (Level 2)
 *
 * 4 tabs: Layers, Tools, Data Import, Search
 */

import React, { useEffect, useState } from 'react';
import StateManager from '../../core/StateManager';
import LayersPanel from '../panels/LayersPanel';
import ToolsPanel from '../panels/ToolsPanel';
import DataPanel from '../panels/DataPanel';
import SearchPanel from '../panels/SearchPanel';
import StylePanel from '../panels/StylePanel';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('layers');
  const [collapsed, setCollapsed] = useState(true); // Default: collapsed for full map view

  useEffect(() => {
    const unsubscribe = StateManager.subscribe('ui.activeTab', (tab) => {
      setActiveTab(tab);
    });

    setActiveTab(StateManager.getState('ui.activeTab'));

    return unsubscribe;
  }, []);

  const handleTabChange = (tabId) => {
    StateManager.setState('ui.activeTab', tabId, `Switch to ${tabId} tab`);
  };

  const toggleCollapse = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    StateManager.setState('ui.sidebarCollapsed', newValue, 'Toggle sidebar');
  };

  const tabs = [
    { id: 'layers', icon: '📚', label: 'Layers' },
    { id: 'styles', icon: '🎨', label: 'Styles' },
    { id: 'tools', icon: '🛠', label: 'Tools' },
    { id: 'data', icon: '📊', label: 'Import' },
    { id: 'search', icon: '🔍', label: 'Search' }
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Tab buttons */}
      <div className="sidebar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            {!collapsed && <span className="tab-label">{tab.label}</span>}
          </button>
        ))}

        <button
          className="collapse-button"
          onClick={toggleCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Tab content */}
      {!collapsed && (
        <div className="sidebar-content">
          {activeTab === 'layers' && <LayersPanel />}
          {activeTab === 'styles' && <StylePanel />}
          {activeTab === 'tools' && <ToolsPanel />}
          {activeTab === 'data' && <DataPanel />}
          {activeTab === 'search' && <SearchPanel />}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
