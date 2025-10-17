const fs = require('fs');
const path = require('path');

const baseUrl = process.env.BASE_URL || 'https://nic01asfr.github.io/grist-widgets';

const widgets = [
  {
    name: 'Geo-Semantic Map',
    description: 'Carte géospatiale interactive avec support WKT complet (Point, LineString, Polygon, Multi*)',
    path: 'geo-map',
    accessLevel: 'full',
    authors: [{ name: 'nic01asFr', url: 'https://github.com/nic01asFr' }]
  }
];

const manifest = widgets.map(widget => ({
  name: widget.name,
  description: widget.description,
  url: `${baseUrl}/${widget.path}/index.html`,
  published: true,
  authors: widget.authors,
  lastUpdatedAt: new Date().toISOString(),
  accessLevel: widget.accessLevel,
  isGristLabsMaintained: false
}));

const outputPath = path.join(__dirname, '../dist/manifest.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log('✅ Manifest généré:', manifest.length, 'widget(s)');
console.log('📍 Location:', outputPath);
console.log('🌐 Base URL:', baseUrl);
