/**
 * Demo entry point
 * Use this to test Phase 1 & 2 components
 *
 * To use: temporarily rename this to index.js and run `npm start`
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoPage from './components/DemoPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DemoPage />
  </React.StrictMode>
);
