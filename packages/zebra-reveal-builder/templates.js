// ================================
// ZEBRA Reveal Builder - Templates
// ================================

const ZEBRA_TEMPLATES = {
    // Template 1: Titre simple
    title: {
        name: 'Titre',
        icon: '📄',
        content: `# {{title}}
## {{subtitle}}

{{author}}`,
        description: 'Slide de titre simple'
    },

    // Template 2: Deux colonnes
    twoColumns: {
        name: 'Deux colonnes',
        icon: '⚌',
        content: `## {{title}}

<div class="r-hstack">
<div class="r-stack" style="flex: 1;">

{{left_content}}

</div>
<div class="r-stack" style="flex: 1;">

{{right_content}}

</div>
</div>`,
        description: 'Contenu en deux colonnes égales'
    },

    // Template 3: Image à gauche
    imageLeft: {
        name: 'Image gauche',
        icon: '🖼️',
        content: `## {{title}}

<div class="r-hstack">
<div style="flex: 1;">
<img src="{{image_url}}" alt="{{image_alt}}">
</div>
<div style="flex: 1; padding-left: 20px;">

{{content}}

</div>
</div>`,
        description: 'Image à gauche, texte à droite'
    },

    // Template 4: Image à droite
    imageRight: {
        name: 'Image droite',
        icon: '🖼️',
        content: `## {{title}}

<div class="r-hstack">
<div style="flex: 1; padding-right: 20px;">

{{content}}

</div>
<div style="flex: 1;">
<img src="{{image_url}}" alt="{{image_alt}}">
</div>
</div>`,
        description: 'Texte à gauche, image à droite'
    },

    // Template 5: Citation
    quote: {
        name: 'Citation',
        icon: '💬',
        content: `## {{title}}

<div style="font-size: 1.5em; font-style: italic; text-align: center; padding: 40px;">
"{{quote}}"
</div>

<div style="text-align: right; padding-right: 40px;">
— {{author}}
</div>`,
        description: 'Citation mise en avant'
    },

    // Template 6: Statistiques (grille)
    stats: {
        name: 'Statistiques',
        icon: '📊',
        content: `## {{title}}

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 40px;">
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
<div style="font-size: 3em; font-weight: bold;">{{stat1_value}}</div>
<div style="font-size: 1.2em; margin-top: 10px;">{{stat1_label}}</div>
</div>
<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
<div style="font-size: 3em; font-weight: bold;">{{stat2_value}}</div>
<div style="font-size: 1.2em; margin-top: 10px;">{{stat2_label}}</div>
</div>
<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
<div style="font-size: 3em; font-weight: bold;">{{stat3_value}}</div>
<div style="font-size: 1.2em; margin-top: 10px;">{{stat3_label}}</div>
</div>
<div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
<div style="font-size: 3em; font-weight: bold;">{{stat4_value}}</div>
<div style="font-size: 1.2em; margin-top: 10px;">{{stat4_label}}</div>
</div>
</div>`,
        description: 'Grille de 4 statistiques'
    },

    // Template 7: Comparaison Avant/Après
    comparison: {
        name: 'Comparaison',
        icon: '⚖️',
        content: `## {{title}}

<div class="r-hstack" style="margin-top: 40px;">
<div style="flex: 1; padding: 20px; background: #fee; border-radius: 10px;">
<h3 style="text-align: center; color: #c00;">❌ Avant</h3>
<ul>
{{before_items}}
</ul>
</div>
<div style="flex: 1; padding: 20px; background: #efe; border-radius: 10px;">
<h3 style="text-align: center; color: #0a0;">✅ Après</h3>
<ul>
{{after_items}}
</ul>
</div>
</div>`,
        description: 'Comparaison avant/après'
    },

    // Template 8: Timeline
    timeline: {
        name: 'Timeline',
        icon: '📅',
        content: `## {{title}}

<div style="position: relative; padding-left: 40px; margin-top: 40px;">
{{timeline_items}}
</div>

<style>
.timeline-item {
    position: relative;
    padding-left: 40px;
    padding-bottom: 40px;
    border-left: 3px solid #3498db;
}
.timeline-item::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 0;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #3498db;
}
.timeline-date {
    font-weight: bold;
    color: #3498db;
}
</style>`,
        description: 'Frise chronologique'
    },

    // Template 9: Liste à puces enrichie
    richList: {
        name: 'Liste enrichie',
        icon: '📋',
        content: `## {{title}}

<div style="margin-top: 30px;">
{{list_items}}
</div>

<style>
.rich-list-item {
    display: flex;
    align-items: start;
    margin-bottom: 25px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}
.rich-list-icon {
    font-size: 2em;
    margin-right: 15px;
    min-width: 50px;
}
.rich-list-content h4 {
    margin: 0 0 8px 0;
    color: #2c3e50;
}
.rich-list-content p {
    margin: 0;
    color: #7f8c8d;
}
</style>`,
        description: 'Liste avec icônes et descriptions'
    }
};

// Templates ZEBRA pré-configurés par section
const ZEBRA_SECTION_TEMPLATES = {
    intro: {
        title: '# ZEBRA\n## Diagnostic Automatique Sécurité Passages Piétons',
        content: `<div style="text-align: center; margin-top: 60px;">
<div style="font-size: 1.5em; margin-bottom: 20px;">
🚸 Intelligence Artificielle + Données Géographiques
</div>
<div style="font-size: 1.2em; color: #7f8c8d;">
CEREMA - {{date}}
</div>
</div>`
    },

    probleme: {
        title: '## Le Problème',
        content: `### Chiffres clés

- 🚨 **{{accidents_pietons}}** accidents piétons/an en France
- 📍 **{{nb_passages}}** passages piétons à auditer
- ⏱️ **{{heures_diagnostic}}h** par passage (méthode manuelle)
- 💰 **Budget limité** des collectivités

### Limites actuelles

❌ Diagnostics manuels chronophages  
❌ Pas de priorisation objective  
❌ Données fragmentées  
❌ Absence de suivi temporel`
    },

    solution: {
        title: '## La Solution ZEBRA',
        content: `### 🎯 Concept

Diagnostic automatique multi-sources pour évaluer et prioriser les interventions

### 🧩 3 Ingrédients

<div class="r-hstack" style="margin-top: 30px;">
<div style="flex: 1; text-align: center; padding: 20px;">
📸<br><strong>Imagerie</strong><br>Aérien + Street View
</div>
<div style="flex: 1; text-align: center; padding: 20px;">
🤖<br><strong>Intelligence Artificielle</strong><br>12 modèles spécialisés
</div>
<div style="flex: 1; text-align: center; padding: 20px;">
🗺️<br><strong>SIG</strong><br>Analyse géospatiale
</div>
</div>`
    },

    donnees: {
        title: '## Les Données',
        content: `### 🛰️ IGN - Vue Aérienne

- PCRS 5cm (haute résolution)
- BD Ortho 20cm (couverture nationale)
- Mise à jour régulière

### 🚗 Panoramax - Vue Immersive

- Street view contributif
- Images 360° et plates
- API STAC

### 🗺️ OpenStreetMap - Contexte

- Infrastructure routière
- Équipements urbains
- Données contributives`
    },

    ia: {
        title: '## Intelligence Artificielle',
        content: `### 🧠 Apprentissage

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
<div style="text-align: center; padding: 20px; background: #ecf0f1; border-radius: 8px;">
<div style="font-size: 2.5em;">📊</div>
<div><strong>Datasets</strong></div>
<div style="font-size: 0.9em; color: #7f8c8d;">OSM + IGN → Training</div>
</div>
<div style="text-align: center; padding: 20px; background: #ecf0f1; border-radius: 8px;">
<div style="font-size: 2.5em;">🎯</div>
<div><strong>YOLOv8 + SAM2</strong></div>
<div style="font-size: 0.9em; color: #7f8c8d;">Détection + Segmentation</div>
</div>
<div style="text-align: center; padding: 20px; background: #ecf0f1; border-radius: 8px;">
<div style="font-size: 2.5em;">📈</div>
<div><strong>95% mAP</strong></div>
<div style="font-size: 0.9em; color: #7f8c8d;">Précision validée</div>
</div>
</div>

### 🔍 12 Critères Détectés

C1-Ralentisseurs | C2-Visibilité | C3-Feux | C4-Pistes cyclables  
C5-Éclairage | C6-Longueur | C7-Stationnement | C8-Îlots  
C9-BEV | C10-Plateaux | C11-Giratoires | C12-Arrêts bus`
    },

    processus: {
        title: '## Le Processus ZEBRA',
        content: `<div class="timeline-item">
<div class="timeline-date">Phase 1</div>
<h4>🔍 Détection</h4>
<p>YOLOv8 détecte les passages piétons sur imagerie aérienne</p>
</div>

<div class="timeline-item">
<div class="timeline-date">Phase 2</div>
<h4>📊 Analyse</h4>
<p>12 modèles IA analysent chaque critère de sécurité</p>
</div>

<div class="timeline-item">
<div class="timeline-date">Phase 3</div>
<h4>🎯 Scoring</h4>
<p>Classification P1-P4 et priorisation des interventions</p>
</div>`
    },

    resultats: {
        title: '## Résultats & Livrables',
        content: `### 📊 Livrables

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px;">
<div style="padding: 20px; background: #e8f5e9; border-radius: 8px;">
<h4>📑 Tableau Excel</h4>
<p>Liste complète avec scores par critère</p>
</div>
<div style="padding: 20px; background: #e3f2fd; border-radius: 8px;">
<h4>🗺️ Carte Interactive</h4>
<p>Visualisation géographique + filtres</p>
</div>
<div style="padding: 20px; background: #fff3e0; border-radius: 8px;">
<h4>📦 Projet QGIS</h4>
<p>Analyse spatiale avancée</p>
</div>
<div style="padding: 20px; background: #fce4ec; border-radius: 8px;">
<h4>📄 Rapport PDF</h4>
<p>Synthèse et recommandations</p>
</div>
</div>`
    },

    impact: {
        title: '## Impact & Bénéfices',
        content: `### 🎯 Pour qui ?

**🏛️ Collectivités** : Priorisation objective des budgets  
**🔧 Services voirie** : Gain de temps sur diagnostics  
**👥 Citoyens** : Amélioration sécurité piétonne  
**📊 Chercheurs** : Données standardisées

### 💡 Cas d'usage

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
<strong>Grenoble Métropole (49 communes)</strong><br>
✅ 450 passages détectés en 2h<br>
✅ 23 P1 identifiés → Actions urgentes<br>
✅ Budget optimisé : 580 000€ ciblés
</div>`
    },

    conclusion: {
        title: '## 🎯 En Résumé',
        content: `### 3 Messages Clés

1️⃣ **Automatisation** : Diagnostic 100x plus rapide  
2️⃣ **Objectivité** : Scoring standardisé P1-P4  
3️⃣ **Open Source** : Déployable par toute collectivité

### 🚀 Prochaines Étapes

- 📦 Release Plugin QGIS (Février 2025)
- 🗺️ Déploiement France entière
- 🤝 Formation utilisateurs

<div style="text-align: center; margin-top: 40px; font-size: 1.3em;">
**Merci !**<br>
Questions ?
</div>`
    }
};

// Fonction d'export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZEBRA_TEMPLATES, ZEBRA_SECTION_TEMPLATES };
}
