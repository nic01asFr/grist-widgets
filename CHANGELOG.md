# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.1] - 2025-10-18

### 🔧 Corrections

- **Workflow GitHub Actions** : Correction du problème de cache npm qui empêchait le déploiement
  - Suppression de la dépendance au `package-lock.json` dans le workflow
  - Le workflow utilise maintenant `npm install` au lieu de `npm ci`
  - Build plus robuste et compatible avec différentes configurations

### ✨ Améliorations

- **Documentation** :
  - README enrichi avec instructions complètes de déploiement et d'utilisation
  - Ajout du guide de configuration GitHub Pages (`.github/GITHUB_PAGES_SETUP.md`)
  - Documentation détaillée des deux méthodes d'utilisation (manifest vs URL directe)
  
- **Outils de développement** :
  - Nouveau script `npm run verify` pour vérifier la configuration du dépôt
  - Amélioration du script de génération du manifest avec plus de détails
  - Meilleurs messages de log lors du build

- **Manifest** :
  - Ajout du champ `widgetId` pour une identification unique
  - Ajout du champ `renderAfterReady` pour un meilleur contrôle du rendu
  - Description plus détaillée du widget Geo-Semantic Map

### 📝 Documentation

- Instructions claires pour activer GitHub Pages
- Guide de troubleshooting pour les problèmes courants
- Documentation des URLs publiques du manifest et des widgets
- Exemples de configuration Docker pour Grist

## [1.0.0] - 2025-10-17

### ✨ Nouveautés

- **Premier widget** : Geo-Semantic Map
  - Support complet des formats WKT (Point, LineString, Polygon, Multi*)
  - Carte interactive avec Leaflet
  - Édition de géométries avec Leaflet.pm
  - Auto-zoom sur les données
  - Sélection de lignes dans Grist au clic
  
- **Infrastructure** :
  - Configuration GitHub Actions pour déploiement automatique
  - Scripts de build et de génération de manifest
  - Structure monorepo avec packages/
  
- **Documentation** :
  - README initial
  - Instructions de base

---

## Comment contribuer

Pour proposer une amélioration ou signaler un bug :

1. Créez une issue sur GitHub décrivant le problème ou la fonctionnalité
2. Si vous souhaitez contribuer du code, créez une Pull Request
3. Suivez les conventions de commit : `type: description` (ex: `feat: Add new widget`, `fix: Correct manifest URL`)

Types de commits :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation uniquement
- `style`: Formatage, point-virgules manquants, etc.
- `refactor`: Refactorisation du code
- `test`: Ajout ou modification de tests
- `chore`: Maintenance, mise à jour de dépendances
