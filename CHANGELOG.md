# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Cluster Quest Widget** - Formation interactive pour apprendre les clusters et vecteurs dans Grist
  - 9 chapitres progressifs (débutant à avancé)
  - Exercices pratiques avec création de vraies données
  - Authentification automatique avec comptes Grist (multi-fallback)
  - Leaderboard multi-joueurs en temps réel
  - Création automatique de 5 tables Grist
  - Interface Reveal.js pour navigation fluide
  - Mode collaboratif avec détection intelligente des utilisateurs
- Support des widgets statiques (HTML/CSS/JS) dans le système de build
- Distinction entre widgets avec build (React) et widgets statiques dans `prepare-dist.js`

### Changed
- `scripts/build-manifest.js` : Ajout de cluster-quest dans la liste des widgets
- `scripts/prepare-dist.js` : Support des widgets statiques avec copie depuis `public/`
- README.md : Documentation des deux types de widgets (build vs statique)

### Fixed
- Détection des tables Grist : Utilise `fetchTable()` au lieu de `listTables()`
- Authentification robuste avec 3 niveaux de fallback
- Gestion des erreurs avec messages utilisateurs clairs

## [1.0.0] - 2025-10-17

### Added
- Geo-Semantic Map widget avec support WKT complet
- Smart GIS widget (en développement, phase 7/10)
- Système de build automatisé avec GitHub Actions
- Génération automatique du manifest.json
- Documentation complète (guides, API, patterns)
