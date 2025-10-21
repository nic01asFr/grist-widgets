const fs = require('fs');
const path = require('path');

const baseUrl = process.env.BASE_URL || 'https://nic01asfr.github.io/grist-widgets';

const widgets = [
  {
    name: 'Geo-Semantic Map',
    description: 'Carte géospatiale interactive avec support WKT complet (Point, LineString, Polygon, Multi*). Édition interactive et recherche sémantique.',
    path: 'geo-map',
    widgetId: '@nic01asFr/geo-semantic-map',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Smart GIS',
    description: 'Système cartographique intelligent avec gestion multi-sources (IGN, OSM), édition avancée, styles personnalisés, import wizard, layer management. Phases 1-7/10 (70%).',
    path: 'smart-gis',
    widgetId: '@nic01asFr/smart-gis',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Cluster Quest',
    description: 'Formation interactive pour apprendre à maîtriser les clusters et vecteurs dans Grist. 9 chapitres, exercices pratiques, leaderboard multi-joueurs.',
    path: 'cluster-quest',
    widgetId: '@nic01asFr/cluster-quest',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  }
];

const manifest = widgets.map(widget => ({
  name: widget.name,
  description: widget.description,
  url: `${baseUrl}/${widget.path}/index.html`,
  widgetId: widget.widgetId,
  published: true,
  authors: widget.authors,
  lastUpdatedAt: new Date().toISOString(),
  accessLevel: widget.accessLevel,
  renderAfterReady: widget.renderAfterReady,
  isGristLabsMaintained: false
}));

const outputPath = path.join(__dirname, '../dist/manifest.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log('✅ Manifest généré:', manifest.length, 'widget(s)');
console.log('📍 Location:', outputPath);
console.log('🌐 Base URL:', baseUrl);
console.log('\n📦 Widgets:');
manifest.forEach(w => {
  console.log(`  - ${w.name}`);
  console.log(`    URL: ${w.url}`);
  console.log(`    ID: ${w.widgetId}`);
});
