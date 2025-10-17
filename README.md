# Grist Custom Widgets

🗺️ Collection de widgets custom pour Grist, hébergés sur GitHub Pages.

## 📦 Widgets Disponibles

### Geo-Semantic Map
Carte géospatiale interactive avec support WKT complet :
- ✅ Affichage : Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon
- ✅ Édition interactive via Leaflet.pm
- ✅ Recherche sémantique
- ✅ Filtrage par similarité

## 🚀 Utilisation dans Grist

### Configuration Docker

```yaml
services:
  grist:
    image: nic01asfr/grist-core:latest
    environment:
      - GRIST_WIDGET_LIST_URL=https://nic01asfr.github.io/grist-widgets/manifest.json
    ports:
      - "8484:8484"
```

### Dans Grist

1. Ouvrir un document Grist
2. Ajouter une page
3. Widget → Custom
4. Les widgets apparaissent dans la galerie !

## 🔗 URLs

- **Manifest** : https://nic01asfr.github.io/grist-widgets/manifest.json
- **Geo Map** : https://nic01asfr.github.io/grist-widgets/geo-map/
- **Repo** : https://github.com/nic01asFr/grist-widgets

## 📚 Documentation

- [Grist Custom Widgets](https://support.getgrist.com/widget-custom/)
- [Grist Plugin API](https://support.getgrist.com/code/modules/grist_plugin_api/)

## 📄 License

Apache-2.0