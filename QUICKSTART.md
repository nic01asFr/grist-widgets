# 🚀 Guide de démarrage rapide

Ce guide vous permet de déployer vos widgets Grist en quelques minutes.

## ✅ Ce qui a été configuré

Votre dépôt est maintenant prêt avec :

- ✅ **Workflow GitHub Actions** optimisé pour le déploiement automatique
- ✅ **Structure de projet** organisée avec packages/
- ✅ **Scripts de build** automatiques
- ✅ **Génération du manifest** pour Grist
- ✅ **Documentation complète**
- ✅ **Script de vérification** de la configuration

## 🎯 Étapes pour activer votre dépôt

### 1. Activer GitHub Pages (CRITIQUE)

Sans cette étape, vos widgets ne seront pas accessibles publiquement.

1. Allez dans **Settings** de votre dépôt
2. Dans le menu de gauche, cliquez sur **Pages**
3. Dans **Build and deployment** :
   - **Source** : Sélectionnez "**GitHub Actions**"
4. Sauvegardez

### 2. Vérifier le déploiement

1. Allez dans l'onglet **Actions**
2. Le workflow "Deploy Widgets to GitHub Pages" devrait s'exécuter automatiquement
3. Attendez qu'il se termine (✅ vert)
4. Vos widgets seront alors disponibles !

### 3. Tester l'installation

Une fois le déploiement terminé (environ 5 minutes), testez ces URLs :

```
https://nic01asfr.github.io/grist-widgets/manifest.json
https://nic01asfr.github.io/grist-widgets/geo-map/
```

Si vous obtenez un contenu (et pas une erreur 404), c'est bon ! ✅

## 🛠️ Utiliser les widgets dans Grist

### Option A : Via le manifest (Recommandé)

**Pour Grist self-hosted (Docker) :**

```yaml
services:
  grist:
    image: nic01asfr/grist-core:latest
    environment:
      - GRIST_WIDGET_LIST_URL=https://nic01asfr.github.io/grist-widgets/manifest.json
    ports:
      - "8484:8484"
```

**Pour Grist en ligne :**

1. Configurez l'URL du manifest dans les paramètres
2. Vos widgets apparaîtront dans la galerie !

### Option B : URL directe

Dans Grist :
1. Ajouter une page → Custom Widget
2. URL : `https://nic01asfr.github.io/grist-widgets/geo-map/index.html`
3. Configurer les colonnes

## 🔧 Commandes utiles

```bash
# Vérifier la configuration du dépôt
npm run verify

# Développement local
npm run dev:geo-map

# Build complet
npm run build:all

# Build uniquement geo-map
npm run build:geo-map
```

## 📦 Ajouter un nouveau widget

1. Créez un nouveau dossier dans `packages/`
2. Ajoutez-le dans `scripts/build-manifest.js`
3. Mettez à jour `scripts/prepare-dist.js`
4. Committez et pushez !

## 🐛 Résolution de problèmes

### Le workflow échoue

- Consultez les logs dans l'onglet **Actions**
- Exécutez `npm run verify` localement
- Vérifiez que toutes les dépendances sont installées

### Les widgets ne s'affichent pas

- Vérifiez que GitHub Pages est activé sur "GitHub Actions"
- Attendez 5-10 minutes après le premier déploiement
- Videz le cache de votre navigateur (Ctrl+Shift+R)
- Testez l'URL du manifest dans votre navigateur

### Erreur 404 sur le manifest

- Le déploiement a-t-il réussi ? (vérifiez Actions)
- GitHub Pages est-il activé ?
- Avez-vous attendu suffisamment longtemps ?

## 📚 Documentation complète

- **README.md** : Documentation complète du projet
- **.github/GITHUB_PAGES_SETUP.md** : Guide détaillé GitHub Pages
- **CHANGELOG.md** : Historique des modifications
- **Documentation Grist** : https://support.getgrist.com/widget-custom/

## ✨ Prochaines étapes

1. ✅ Activez GitHub Pages
2. ✅ Attendez le déploiement
3. ✅ Testez le manifest
4. ✅ Utilisez vos widgets dans Grist !
5. 🚀 Développez de nouveaux widgets

---

**Besoin d'aide ?** Consultez les issues GitHub ou la documentation Grist.

**Tout fonctionne ?** Excellent ! Vous pouvez maintenant développer vos propres widgets. 🎉
