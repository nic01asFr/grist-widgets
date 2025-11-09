/**
 * MenuContent Component
 * Smart GIS Widget v3.0
 *
 * Content switcher for tabbed menu
 */

import React from 'react';

const MenuContent = ({
  activeTab,
  layersContent,
  projectContent,
  searchContent,
}) => {
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
};

export default MenuContent;
