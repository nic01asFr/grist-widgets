# Grist Custom Widgets

🗺️ Collection de widgets custom pour Grist, hébergés sur GitHub Pages.

## 📦 Widgets Disponibles

### Geo-Semantic Map
![d4cdb104-9cd2-4c7d-9dec-8e2b83672f69.png](https://docs.numerique.gouv.fr/media/b494ac93-5286-4d16-909f-9c73eaeec82d/attachments/d4cdb104-9cd2-4c7d-9dec-8e2b83672f69.png)

Carte géospatiale interactive avec support WKT complet :
- ✅ Affichage : Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon
- ✅ Édition interactive via Leaflet.pm
- ✅ Recherche sémantique
- ✅ Filtrage par similarité

### Cluster Quest
Formation interactive pour maîtriser les clusters et vecteurs :
- ✅ 9 chapitres progressifs (débutant à avancé)
- ✅ Exercices pratiques avec création de données réelles
- ✅ Mode collaboratif avec authentification automatique
- ✅ Leaderboard multi-joueurs en temps réel
- ✅ Création automatique des tables Grist

## 🚀 Utilisation dans Grist

### Option 1 : Via l'URL du manifest (Recommandé)

#### Configuration Docker

```yaml
services:
  grist:
    image: nic01asfr/grist-core:latest
    environment:
      - GRIST_WIDGET_LIST_URL=https://nic01asfr.github.io/grist-widgets/manifest.json
    ports:
      - "8484:8484"
```

#### Dans Grist en ligne

1. Accédez aux paramètres de votre document Grist
2. Configurez l'URL de la liste des widgets : `https://nic01asfr.github.io/grist-widgets/manifest.json`
3. Les widgets apparaissent maintenant dans la galerie !

### Option 2 : URL directe du widget

Si vous ne pouvez pas configurer le manifest, utilisez l'URL directe :

1. Ouvrir un document Grist
2. Ajouter une page → Widget → Custom
3. Saisir l'URL du widget :
   - Geo Map : `https://nic01asfr.github.io/grist-widgets/geo-map/index.html`
   - Cluster Quest : `https://nic01asfr.github.io/grist-widgets/cluster-quest/index.html`
4. Configurer les mappages de colonnes

## 🔗 URLs

- **Manifest** : https://nic01asfr.github.io/grist-widgets/manifest.json
- **Geo Map** : https://nic01asfr.github.io/grist-widgets/geo-map/
- **Cluster Quest** : https://nic01asfr.github.io/grist-widgets/cluster-quest/
- **Repo** : https://github.com/nic01asFr/grist-widgets

## 🛠️ Développement

### Installation

```bash
# Cloner le repo
git clone https://github.com/nic01asFr/grist-widgets.git
cd grist-widgets

# Installer les dépendances
npm install
```

### Développement local d'un widget

```bash
# Widgets avec build (React)
npm run dev:geo-map

# Widgets statiques (HTML/CSS/JS)
# Ouvrir directement packages/cluster-quest/public/index.html
```

Le widget sera accessible sur http://localhost:3000

### Build et déploiement

Le déploiement est automatique via GitHub Actions lors d'un push sur `main` :

```bash
git add .
git commit -m "feat: Update widget"
git push origin main
```

Le workflow GitHub Actions :
1. Build les widgets avec compilation (geo-map, smart-gis)
2. Copie les widgets statiques (cluster-quest)
3. Génère le dossier `dist/` avec tous les fichiers
4. Crée le manifest.json
5. Déploie sur GitHub Pages

### Structure du projet

```
grist-widgets/
├── packages/
│   ├── geo-map/              # Widget Geo-Semantic Map (React)
│   │   ├── public/
│   │   ├── src/
│   │   └── package.json
│   ├── cluster-quest/        # Widget Formation Interactive (Statique)
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   ├── app.js
│   │   │   └── styles.css
│   │   ├── package.json
│   │   └── README.md
│   └── smart-gis/            # Widget Smart GIS (React)
├── scripts/
│   ├── build-manifest.js     # Génère manifest.json
│   └── prepare-dist.js       # Prépare le dossier de distribution
├── .github/
│   └── workflows/
│       └── deploy.yml        # Déploiement automatique
└── package.json
```

### Types de widgets

Le repo supporte deux types de widgets :

**Widgets avec build (React, etc.)** :
- Source dans `src/`
- Build dans `build/` (généré)
- Exemple : `geo-map`, `smart-gis`

**Widgets statiques (HTML/CSS/JS)** :
- Fichiers directement dans `public/`
- Pas de build nécessaire
- Exemple : `cluster-quest`

## 📚 Documentation

### Documentation Widgets

- **[Guide de Développement](./docs/WIDGET_DEVELOPMENT_GUIDE.md)** - Guide pratique pour créer des widgets production-ready
- **[Architecture](./docs/ARCHITECTURE.md)** - Principes fondamentaux et séparation des responsabilités
- **[Référence API](./docs/API_REFERENCE.md)** - Documentation complète des classes et utilitaires
- **[Patterns VECTOR_SEARCH](./docs/VECTOR_SEARCH_PATTERNS.md)** - Détecter et exploiter les patterns de recherche vectorielle
- **[Cluster Quest README](./packages/cluster-quest/README.md)** - Documentation du widget de formation

### Ressources Externes

- [Grist Custom Widgets](https://support.getgrist.com/widget-custom/)
- [Grist Plugin API](https://support.getgrist.com/code/modules/grist_plugin_api/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Leaflet.pm Documentation](https://github.com/geoman-io/leaflet-geoman)
- [Reveal.js Documentation](https://revealjs.com/)

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour ajouter un nouveau widget :

### Widget avec build (React, Vue, etc.)
1. Créer un dossier dans `packages/`
2. Ajouter le widget dans le tableau `builtWidgets` de `scripts/prepare-dist.js`
3. Ajouter le widget dans `scripts/build-manifest.js`
4. Soumettre une Pull Request

### Widget statique (HTML/CSS/JS)
1. Créer un dossier dans `packages/` avec un sous-dossier `public/`
2. Ajouter le widget dans le tableau `staticWidgets` de `scripts/prepare-dist.js`
3. Ajouter le widget dans `scripts/build-manifest.js`
4. Soumettre une Pull Request

## 📄 License

Apache-2.0

## 🐛 Problèmes connus et solutions

### Le widget ne s'affiche pas
- Vérifiez que GitHub Pages est activé (Settings → Pages)
- Vérifiez l'URL du manifest dans les paramètres Grist
- Consultez la console du navigateur pour les erreurs

### Erreur de build
- Vérifiez que toutes les dépendances sont installées
- Consultez les logs dans l'onglet Actions de GitHub

### Le manifest n'est pas à jour
- Attendez quelques minutes après le déploiement
- Videz le cache du navigateur
- Vérifiez que le workflow GitHub Actions s'est terminé avec succès

### Cluster Quest - Page blanche
- Le widget nécessite Reveal.js qui fonctionne uniquement sur GitHub Pages
- Ne pas utiliser dans le Custom Widget Builder direct de Grist
- Utiliser l'URL hébergée : `https://nic01asfr.github.io/grist-widgets/cluster-quest/`
