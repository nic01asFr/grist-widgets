#!/usr/bin/env node

/**
 * Script de vérification de la configuration du dépôt
 * Vérifie que tout est prêt pour le déploiement
 */

const fs = require('fs');
const path = require('path');

const CHECKS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

let hasErrors = false;
let hasWarnings = false;

console.log('\n🔍 Vérification de la configuration du dépôt...\n');

// Vérifier la structure des dossiers
console.log('📁 Structure des dossiers:');

const requiredDirs = [
  'packages/geo-map',
  'packages/geo-map/src',
  'packages/geo-map/public',
  'scripts',
  '.github/workflows'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ${CHECKS.success} ${dir}`);
  } else {
    console.log(`  ${CHECKS.error} ${dir} - MANQUANT`);
    hasErrors = true;
  }
});

// Vérifier les fichiers essentiels
console.log('\n📄 Fichiers essentiels:');

const requiredFiles = [
  { path: 'package.json', required: true },
  { path: 'packages/geo-map/package.json', required: true },
  { path: 'packages/geo-map/src/index.js', required: true },
  { path: 'packages/geo-map/public/index.html', required: true },
  { path: 'scripts/build-manifest.js', required: true },
  { path: 'scripts/prepare-dist.js', required: true },
  { path: '.github/workflows/deploy.yml', required: true },
  { path: 'packages/geo-map/package-lock.json', required: false }
];

requiredFiles.forEach(({ path: filePath, required }) => {
  if (fs.existsSync(filePath)) {
    console.log(`  ${CHECKS.success} ${filePath}`);
  } else {
    if (required) {
      console.log(`  ${CHECKS.error} ${filePath} - MANQUANT`);
      hasErrors = true;
    } else {
      console.log(`  ${CHECKS.warning} ${filePath} - Manquant (optionnel)`);
      hasWarnings = true;
    }
  }
});

// Vérifier le contenu des package.json
console.log('\n📦 Configuration des packages:');

try {
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (rootPkg.scripts && rootPkg.scripts['prepare-dist']) {
    console.log(`  ${CHECKS.success} Script prepare-dist trouvé`);
  } else {
    console.log(`  ${CHECKS.error} Script prepare-dist manquant`);
    hasErrors = true;
  }

  if (rootPkg.devDependencies && rootPkg.devDependencies['fs-extra']) {
    console.log(`  ${CHECKS.success} Dépendance fs-extra trouvée`);
  } else {
    console.log(`  ${CHECKS.error} Dépendance fs-extra manquante`);
    hasErrors = true;
  }
} catch (err) {
  console.log(`  ${CHECKS.error} Erreur de lecture du package.json racine`);
  hasErrors = true;
}

try {
  const widgetPkg = JSON.parse(fs.readFileSync('packages/geo-map/package.json', 'utf8'));
  
  if (widgetPkg.scripts && widgetPkg.scripts.build) {
    console.log(`  ${CHECKS.success} Script build trouvé dans geo-map`);
  } else {
    console.log(`  ${CHECKS.error} Script build manquant dans geo-map`);
    hasErrors = true;
  }

  if (widgetPkg.dependencies && widgetPkg.dependencies['grist-plugin-api']) {
    console.log(`  ${CHECKS.success} grist-plugin-api installé`);
  } else {
    console.log(`  ${CHECKS.error} grist-plugin-api manquant`);
    hasErrors = true;
  }
} catch (err) {
  console.log(`  ${CHECKS.error} Erreur de lecture du package.json de geo-map`);
  hasErrors = true;
}

// Vérifier le workflow GitHub Actions
console.log('\n⚙️ Workflow GitHub Actions:');

try {
  const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  
  if (workflow.includes('actions/checkout@v4')) {
    console.log(`  ${CHECKS.success} Action checkout configurée`);
  }
  
  if (workflow.includes('actions/setup-node@v4')) {
    console.log(`  ${CHECKS.success} Action setup-node configurée`);
  }
  
  if (workflow.includes('actions/configure-pages@v4')) {
    console.log(`  ${CHECKS.success} Action configure-pages configurée`);
  }
  
  if (workflow.includes('actions/deploy-pages@v4')) {
    console.log(`  ${CHECKS.success} Action deploy-pages configurée`);
  }
  
  if (workflow.includes('npm run prepare-dist')) {
    console.log(`  ${CHECKS.success} Étape prepare-dist présente`);
  } else {
    console.log(`  ${CHECKS.error} Étape prepare-dist manquante`);
    hasErrors = true;
  }
} catch (err) {
  console.log(`  ${CHECKS.error} Erreur de lecture du workflow`);
  hasErrors = true;
}

// Résumé
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log(`\n${CHECKS.error} Des erreurs ont été détectées. Veuillez les corriger avant de déployer.`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`\n${CHECKS.warning} Configuration correcte avec quelques avertissements.`);
  console.log(`${CHECKS.info} Le déploiement devrait fonctionner.`);
} else {
  console.log(`\n${CHECKS.success} Toutes les vérifications sont passées !`);
  console.log(`${CHECKS.info} Le dépôt est prêt pour le déploiement.`);
}

console.log('\n📝 Prochaines étapes:');
console.log('  1. Activez GitHub Pages (Settings → Pages → Source: GitHub Actions)');
console.log('  2. Poussez vos changements sur main');
console.log('  3. Surveillez l\'onglet Actions pour le déploiement');
console.log('  4. Une fois déployé, testez: https://nic01asfr.github.io/grist-widgets/manifest.json\n');
