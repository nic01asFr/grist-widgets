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
    name: 'Smart GIS v2',
    description: 'Réécriture complète du système GIS avec 30+ outils spatiaux (mesure, transformation, analyse, requêtes), import wizard multi-format (GeoJSON, CSV, WFS), recherche hybride (sémantique + spatiale), layer management avancé. Architecture QGIS-like professionnelle. 196KB gzipped. Phases 1-6/9 (80%).',
    path: 'smart-gis-v2',
    widgetId: '@nic01asFr/smart-gis-v2',
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
    name: 'Reveal.js Builder',
    description: 'Créateur de présentations Reveal.js data-driven. Configurez vos slides, layouts et composants directement dans des tables Grist. 10 layouts, 11 types de composants (texte, image, code, graphiques, etc.), styles prédéfinis, animations, et preview temps réel.',
    path: 'reveal-builder',
    widgetId: '@nic01asFr/reveal-builder',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Reveal.js Editor',
    description: 'Éditeur visuel WYSIWYG pour créer et éditer des présentations Reveal.js dans Grist. Interface 3 panneaux avec glisser-déposer, édition visuelle, templates prédéfinis, alignement automatique, undo/redo, zoom, et synchronisation automatique avec Grist. Fonctionne avec Reveal.js Builder pour la visualisation.',
    path: 'reveal-editor',
    widgetId: '@nic01asFr/reveal-editor',
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
  },
  {
    name: 'Territoire 3D',
    description: 'Jumeau numérique LiDAR HD IGN avec Giro3D. Visualisation de nuages de points COPC, 4 modes d\'affichage (classification IGN, orthophoto, élévation, intensité), filtrage par classe, Eye Dome Lighting. Architecture 1 dalle = 1 document Grist. Support import BD TOPO, OSM et GeoJSON.',
    path: 'territoire-3d',
    widgetId: '@nic01asFr/territoire-3d',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Territoire 3D Component',
    description: 'Widget multi-vues synchronisé pour visualisation LiDAR HD IGN (COPC). 5 modes de colorisation (classification, élévation, intensité, orthophoto, RGB), synchronisation temps réel entre widgets via BroadcastChannel, architecture master/slave. Lambert 93 (EPSG:2154).',
    path: 'territoire-3d-component',
    widgetId: '@nic01asFr/territoire-3d-component',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Smart Map 3D',
    description: 'Widget cartographique 3D synchronisable avec Mapbox GL JS. Multi-vues avec synchronisation caméra/sélection/couches, terrain 3D, éclairage réaliste SunCalc, modèles GLTF, symbolisation avancée (catégorisée/graduée), intégration Grist. Architecture modulaire TypeScript.',
    path: 'smart-map-3d',
    widgetId: '@nic01asFr/smart-map-3d',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Maquette 3D',
    description: 'Widget complet de maquette territoriale 3D avec Mapbox. Style Standard, bâtiments/arbres/monuments 3D, terrain, éclairage solaire réaliste avec SunCalc, import multi-format (GeoJSON, KML, GPX, OSM), modèles GLTF, multi-styles par couche, symbolisation catégorisée/graduée, sélection avancée.',
    path: 'Maquette_3d',
    widgetId: '@nic01asFr/maquette-3d',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'DataCart Explorer',
    description: 'Explorateur SQL pour bases de données DataCart (CEREMA). Interface 3 panneaux avec explorateur de schémas, assistant IA NL2SQL, éditeur CodeMirror avec autocomplétion, et visualisation des résultats (tableau + carte Leaflet). Export CSV, GeoJSON et vers Grist. Intégration n8n pour exécution sécurisée.',
    path: 'datacart-explorer',
    widgetId: '@nic01asFr/datacart-explorer',
    accessLevel: 'full',
    renderAfterReady: true,
    authors: [{
      name: 'nic01asFr',
      url: 'https://github.com/nic01asFr'
    }]
  },
  {
    name: 'Chart Agent Pro',
    description: 'Générateur de visualisations intelligent avec assistant IA. Analyse automatique du schéma Grist, suggestions contextualisées, chat conversationnel pour créer des graphiques (bar, pie, line, sankey, scatter, treemap). Intégration n8n + Albert API pour génération HTML dynamique.',
    path: 'chart-agent-pro',
    widgetId: '@nic01asFr/chart-agent-pro',
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
