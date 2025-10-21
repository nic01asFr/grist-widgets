const fs = require('fs-extra');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

console.log('🚀 Préparation du dossier dist...');

fs.ensureDirSync(distDir);

// Widgets avec build (React, etc.)
const builtWidgets = ['geo-map', 'smart-gis'];

// Widgets statiques (HTML/CSS/JS direct)
const staticWidgets = [
  { name: 'cluster-quest', source: 'public' }
];

let successCount = 0;
let failCount = 0;

// Copier les widgets avec build
builtWidgets.forEach(widget => {
  const buildPath = path.join(__dirname, '../packages', widget, 'build');
  const distPath = path.join(distDir, widget);
  
  if (fs.existsSync(buildPath)) {
    fs.copySync(buildPath, distPath);
    console.log(`✅ ${widget} → dist/${widget}/ (depuis build/)`);
    successCount++;
  } else {
    console.warn(`⚠️  Build non trouvé pour ${widget}`);
    failCount++;
  }
});

// Copier les widgets statiques
staticWidgets.forEach(({ name, source }) => {
  const sourcePath = path.join(__dirname, '../packages', name, source);
  const distPath = path.join(distDir, name);
  
  if (fs.existsSync(sourcePath)) {
    fs.copySync(sourcePath, distPath);
    console.log(`✅ ${name} → dist/${name}/ (depuis ${source}/)`);
    successCount++;
  } else {
    console.warn(`⚠️  Source non trouvé pour ${name}: ${sourcePath}`);
    failCount++;
  }
});

console.log('\n📝 Génération du manifest...');
require('./build-manifest.js');

console.log('\n✅ Préparation terminée');
console.log(`   ${successCount} widget(s) copié(s)`);
if (failCount > 0) {
  console.log(`   ${failCount} widget(s) ignoré(s)`);
}
