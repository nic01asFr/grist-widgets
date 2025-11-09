/**
 * MenuContent Component
 * Smart GIS Widget v3.0
 *
 * Content switcher for tabbed menu
 * Provides full height layout for child sections
 */

import React from 'react';

const MenuContent = ({
  activeTab,
  layersContent,
  projectContent,
  searchContent,
}) => {
  const content = (() => {
    switch (activeTab) {
      case 'layers':
        return layersContent || null;
      case 'project':
        return projectContent || null;
      case 'search':
        return searchContent || null;
      default:
        return null;
    }
  })();

  return (
    <div style={styles.container}>
      {content}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
};

export default MenuContent;
