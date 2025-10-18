# Configuration GitHub Pages

## ⚙️ Activation de GitHub Pages

Pour que les widgets soient accessibles publiquement, vous devez activer GitHub Pages :

### Étapes de configuration

1. Allez dans les **Settings** du dépôt
2. Dans le menu de gauche, cliquez sur **Pages**
3. Dans la section **Build and deployment** :
   - **Source** : Sélectionnez "GitHub Actions"
   - Ceci permettra au workflow `.github/workflows/deploy.yml` de déployer automatiquement

### Vérification du déploiement

1. Allez dans l'onglet **Actions** du dépôt
2. Vérifiez que le workflow "Deploy Widgets to GitHub Pages" s'exécute sans erreur
3. Une fois le déploiement terminé, vos widgets seront accessibles à :
   - **Manifest** : https://nic01asfr.github.io/grist-widgets/manifest.json
   - **Geo Map** : https://nic01asfr.github.io/grist-widgets/geo-map/

### Délai de propagation

- Premier déploiement : peut prendre 5-10 minutes
- Déploiements suivants : 1-3 minutes

### Troubleshooting

#### Le site ne s'affiche pas après 10 minutes

1. Vérifiez que GitHub Pages est bien configuré sur "GitHub Actions"
2. Consultez les logs dans l'onglet Actions
3. Vérifiez que le workflow s'est terminé avec succès (✅)

#### Erreur 404 sur le manifest.json

1. Attendez quelques minutes supplémentaires
2. Videz le cache du navigateur (Ctrl+Shift+R)
3. Vérifiez que le fichier `dist/manifest.json` a été créé dans l'artifact

#### Le workflow échoue

Consultez les logs détaillés dans Actions → [workflow name] → job details

## 🔄 Déploiement automatique

Chaque push sur la branche `main` déclenche automatiquement :

1. ✅ Installation des dépendances
2. ✅ Build du widget geo-map
3. ✅ Génération du dossier dist/
4. ✅ Création du manifest.json
5. ✅ Déploiement sur GitHub Pages

## 📊 Monitoring

Surveillez l'état du déploiement dans l'onglet Actions :
- 🟢 Vert : Déploiement réussi
- 🔴 Rouge : Erreur de déploiement
- 🟡 Jaune : En cours

## 🌐 URLs publiques

Une fois GitHub Pages activé, vos widgets seront accessibles à :

```
https://nic01asfr.github.io/grist-widgets/manifest.json
https://nic01asfr.github.io/grist-widgets/geo-map/
```

Utilisez ces URLs dans votre configuration Grist !
