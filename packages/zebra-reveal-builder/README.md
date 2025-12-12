# ZEBRA Reveal Builder Widget

## 🎯 Vue d'ensemble

Widget Grist optimisé pour créer des présentations Reveal.js à partir de données ZEBRA (diagnostic sécurité passages piétons).

### Fonctionnalités

✅ **Architecture 3 panneaux** : Navigation slides / Éditeur / Propriétés
✅ **14 sections pré-configurées ZEBRA** : Intro → Problème → Solution → Données → IA → Résultats → Impact
✅ **Templates intelligents** : Génération automatique depuis données Grist
✅ **Intégration MCP Server** : Communication avec Claude pour génération IA
✅ **Export multi-formats** : HTML standalone, PDF, PPTX
✅ **Preview temps réel** : Visualisation immédiate des modifications

## 📊 Structure de données Grist requise

### Table: ZEBRA_Presentations

```yaml
Columns:
  - id: Text (unique)
  - title: Text
  - subtitle: Text
  - author: Text
  - date: Date
  - theme: Choice(white, black, league, sky, beige)
  - transition: Choice(none, fade, slide, convex, concave, zoom)
  - slides_data: Text (JSON)
  - config_json: Text (JSON)
  - created_at: DateTime
  - updated_at: DateTime
```

### Table: ZEBRA_Slides

```yaml
Columns:
  - id: Text
  - presentation_id: Reference(ZEBRA_Presentations)
  - section: Choice(intro, probleme, solution, donnees, ia, processus, resultats, impact, techno, deploiement, partenaires, qr, ressources, conclusion)
  - order: Numeric
  - type: Choice(horizontal, vertical)
  - title: Text
  - content: Text (Markdown)
  - notes: Text
  - background: Text
  - background_image: Text
  - transition: Choice
  - data_source: Text (query Grist)
  - template: Choice(title, content, two-columns, image-left, image-right, quote, stats, comparison, timeline)
```

## 🚀 Installation

### 1. Ajouter le widget dans Grist

**URL du widget:**
```
https://nic01asfr.github.io/grist-widgets/zebra-reveal-builder/
```

**Access Level:** `full` (read + write)

### 2. Créer les tables

Le widget crée automatiquement les tables nécessaires au premier lancement.

### 3. Configuration MCP Server (optionnel)

Pour activer la génération IA via Claude:

```json
{
  "mcpServers": {
    "grist-zebra": {
      "command": "node",
      "args": ["path/to/mcp-server-grist-zebra/index.js"],
      "env": {
        "GRIST_API_KEY": "your_api_key",
        "GRIST_DOC_ID": "your_doc_id"
      }
    }
  }
}
```

## 🎨 Utilisation

### Mode Builder (Interface principale)

#### Panneau Gauche - Navigation
- **Liste slides** : Vue d'ensemble hiérarchique
- **Sections** : 14 sections pré-configurées ZEBRA
- **Drag & Drop** : Réorganiser l'ordre
- **Actions** : Ajouter, dupliquer, supprimer

#### Panneau Central - Éditeur
- **Éditeur Markdown** : Syntaxe Reveal.js supportée
- **Preview live** : Mise à jour temps réel
- **Toolbar** : Formatage rapide
- **Data binding** : `{{variable}}` depuis Grist

#### Panneau Droit - Propriétés
- **Slide Settings** : Type, transition, background
- **Template** : 9 templates pré-conçus
- **Data Source** : Requête Grist pour données dynamiques
- **Notes** : Notes présentateur

## 🎓 Structure des 14 Sections ZEBRA

1. **Intro** - Titre principal, contexte
2. **Problème** - Chiffres accidents, limites méthode actuelle
3. **Solution** - Concept ZEBRA, 3 ingrédients
4. **Données** - IGN, Panoramax, OSM
5. **IA** - Apprentissage, 12 critères, technologies
6. **Processus** - 3 phases (Détection, Analyse, Scoring)
7. **Résultats** - Livrables (Excel, Carte, PDF)
8. **Impact** - Bénéficiaires, cas d'usage, ROI
9. **Techno** - 5 innovations, architecture, performances
10. **Déploiement** - Roadmap, adoption
11. **Partenaires** - Institutions, Open Source
12. **Q&R** - Questions fréquentes
13. **Ressources** - Documentation, contact
14. **Conclusion** - Messages clés, appel à l'action

## 🤖 Intégration MCP Server

### Commandes Disponibles

#### Générer présentation complète

```javascript
const result = await mcp.call('zebra_generate_presentation', {
  doc_id: 'your_doc_id',
  presentation_type: 'complete', // ou 'executive', 'technical'
  target_audience: 'elus', // ou 'techniciens', 'grand_public'
  data_scope: {
    commune: 'Grenoble',
    date_diagnostic: '2025-01-15'
  }
});
```

## 📄 Export

- **HTML Standalone** : Bundle complet offline
- **PDF** : Via print-pdf
- **PPTX** : Via API conversion

## 📚 Ressources

- [Reveal.js Documentation](https://revealjs.com/)
- [Grist Widget API](https://support.getgrist.com/widget-custom/)
- [ZEBRA Project](https://github.com/cerema/zebra)
- [MCP Protocol](https://modelcontextprotocol.io/)

## 📄 Licence

MIT License

## 👥 Contributeurs

- Nicolas F. (@nic01asFr)
- Équipe ZEBRA / CEREMA

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-13
