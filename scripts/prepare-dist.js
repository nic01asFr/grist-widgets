const fs = require('fs-extra');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

console.log('🚀 Préparation du dossier dist...');

// Créer dist/
fs.ensureDirSync(distDir);

// Liste des widgets à copier
const widgets = ['geo-map'];

let successCount = 0;

widgets.forEach(widget => {
  const buildPath = path.join(__dirname, '../packages', widget, 'build');
  const distPath = path.join(distDir, widget);
  
  if (fs.existsSync(buildPath)) {
    fs.copySync(buildPath, distPath);
    console.log(`✅ ${widget} → dist/${widget}/`);
    successCount++;
  } else {
    console.warn(`⚠️  Build non trouvé pour ${widget}`);
  }
});

// Générer manifest
console.log('\n📝 Génération du manifest...');
require('./build-manifest.js');

console.log(`\n✅ Préparation terminée - ${successCount} widget(s) copié(s)`);
