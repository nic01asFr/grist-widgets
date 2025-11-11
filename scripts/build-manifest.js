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
  },
  {
    name: 'Reveal.js Minimal Example',
    description: 'Modèle minimal pour créer des widgets Grist avec présentation Reveal.js. Démontre la configuration sécurisée pour iframes et l\'intégration Grist API.',
    path: 'reveal-minimal-example',
    widgetId: '@nic01asFr/reveal-minimal-example',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Panoramax Explorer',
    description: 'Explorateur interactif d\'images Panoramax avec carte Leaflet. Mode exploration pour découvrir des panoramas et mode visualisation pour afficher les vues sauvegardées. Création automatique de table pour sauvegarder les vues favorites.',
    path: 'panoramax-explorer',
    widgetId: '@nic01asFr/panoramax-explorer',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Scrollytelling',
    description: 'Widget de storytelling visuel avec transitions fluides entre images et texte superposé. Supporte Markdown, 9 positions de texte, 6 types de transitions (fade, slide, zoom, crossfade), navigation par scroll/clavier, et auto-configuration des tables. Parfait pour créer des récits visuels immersifs et professionnels.',
    path: 'scrollytelling',
    widgetId: '@nic01asFr/scrollytelling',
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
