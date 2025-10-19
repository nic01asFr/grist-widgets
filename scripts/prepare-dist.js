const fs = require('fs-extra');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

console.log('🚀 Préparation du dossier dist...');

fs.ensureDirSync(distDir);

const widgets = ['geo-map', 'smart-gis'];

let successCount = 0;
let failCount = 0;

widgets.forEach(widget => {
  const buildPath = path.join(__dirname, '../packages', widget, 'build');
  const distPath = path.join(distDir, widget);
  
  if (fs.existsSync(buildPath)) {
    fs.copySync(buildPath, distPath);
    console.log(`✅ ${widget} → dist/${widget}/`);
    successCount++;
  } else {
    console.warn(`⚠️  Build non trouvé pour ${widget}`);
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
