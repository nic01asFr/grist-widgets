# 🎮 Grist Cluster Quest

Formation interactive pour apprendre à maîtriser les clusters et vecteurs dans Grist.

## 🎯 Fonctionnalités

- **9 Chapitres progressifs** : De débutant à avancé
- **Exercices pratiques** : Créez de vraies données dans Grist
- **Mode collaboratif** : Sessions multi-utilisateurs avec authentification Grist
- **Leaderboard** : Comparez vos scores avec les autres participants
- **Progression sauvegardée** : Toutes les réponses sont enregistrées dans Grist

## 📋 Tables Grist requises

Le widget créera automatiquement ces tables :

### 1. Users
- `grist_user_id` (Text) - ID unique Grist
- `grist_email` (Text) - Email de l'utilisateur
- `grist_name` (Text) - Nom de l'utilisateur
- `date_inscription` (DateTime) - Date d'inscription

### 2. Sessions
- `user_id` (Ref:Users) - Référence utilisateur
- `chapitre` (Int) - Chapitre actuel
- `score` (Int) - Score total
- `date` (DateTime) - Date de la session
- `temps_passe` (Int) - Temps passé en secondes

### 3. Exercices
- `user_id` (Ref:Users) - Référence utilisateur
- `chapitre` (Int) - Numéro du chapitre
- `exercice_id` (Text) - ID de l'exercice
- `reponse` (Text) - Réponse donnée
- `correct` (Bool) - Réponse correcte ou non
- `date` (DateTime) - Date de soumission

### 4. Exercices_Produits
- `user_id` (Ref:Users) - Référence utilisateur
- `nom` (Text) - Nom du produit
- `description` (Text) - Description
- `prix` (Numeric) - Prix
- `categorie` (Choice) - Catégorie
- `date_creation` (DateTime) - Date de création

### 5. Exercices_Produits_Avances
- `user_id` (Ref:Users) - Référence utilisateur
- `nom` (Text) - Nom du produit
- `description_marketing` (Text) - Description marketing
- `caracteristiques_techniques` (Text) - Specs techniques
- `tags` (Text) - Tags
- `date_creation` (DateTime) - Date de création

## 🚀 Utilisation

### Dans Grist

1. Ajouter une page → Widget → Custom
2. URL du widget : `https://nic01asfr.github.io/grist-widgets/cluster-quest/`
3. Le widget détectera automatiquement les tables existantes
4. Si les tables n'existent pas, un bouton permettra de les créer automatiquement

### Démarrage

1. Le widget récupère automatiquement votre compte Grist connecté
2. Cliquez sur "Démarrer la Formation"
3. Suivez les 9 chapitres avec exercices
4. Votre progression est sauvegardée en temps réel

## 📊 Chapitres

1. **Les Bases** - Quiz sur les concepts fondamentaux
2. **Comment ça marche** - Théorie des vecteurs
3. **Créer un Produit** - Exercice pratique avec CREATE_VECTOR()
4. **Recherche Sémantique** - VECTOR_SEARCH() en action
5. **Multi-Vecteurs** - Exercice avancé avec plusieurs vecteurs
6. **Optimisation** - Ajuster les paramètres
7. **Cas d'Usage** - Applications réelles
8. **Aller Plus Loin** - Techniques avancées
9. **Leaderboard** - Classement des participants

## 🎓 Système de points

- Quiz simple : **100 points**
- Création produit : **150 points**
- Produit multi-vecteurs : **200 points**

## 🔧 Développement local

```bash
# Ouvrir directement le fichier
open packages/cluster-quest/public/index.html

# Ou avec un serveur local
python -m http.server 8000
# Puis ouvrir http://localhost:8000/packages/cluster-quest/public/
```

## 🐛 Dépannage

### Le widget affiche "Impossible de récupérer votre identifiant Grist"

**Solution** : Le widget passera en mode manuel et vous demandera votre nom.

### Les tables ne sont pas détectées

**Solution** : Cliquez sur "Créer automatiquement les tables" dans l'interface.

### Page blanche

**Causes possibles** :
- Vérifiez que le widget est bien hébergé sur GitHub Pages
- Consultez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que Grist a les permissions d'accès requises (`requiredAccess: 'full'`)

## 📝 Notes techniques

- **Reveal.js** : Utilisé pour la navigation entre slides (fonctionne uniquement sur GitHub Pages)
- **Authentification** : Utilise `grist.getUser()` avec fallback sur mode manuel
- **Détection des tables** : Utilise `fetchTable()` pour tester l'existence
- **Pas de localStorage pour les données** : Toutes les données sont stockées dans Grist

## 🔗 Liens utiles

- [Documentation Grist Vectors](https://support.getgrist.com/functions/#vector)
- [Grist Plugin API](https://support.getgrist.com/code/modules/grist_plugin_api/)
- [Reveal.js Documentation](https://revealjs.com/)

## 📄 Licence

Apache-2.0