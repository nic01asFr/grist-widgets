/**
 * RASTER LAYERS COMPONENT
 *
 * Gère l'affichage des couches raster (tile layers) dans la carte
 * Lit les records de type layer_type="raster" et les affiche via L.tileLayer
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const RasterLayers = ({ records, layerVisibility }) => {
  const map = useMap();

  useEffect(() => {
    if (!records || records.length === 0) return;

    // Filtrer les raster layers
    const rasterRecords = records.filter(r => r.layer_type === 'raster');

    if (rasterRecords.length === 0) return;

    console.log(`🖼️ Rendering ${rasterRecords.length} raster layers`);

    // Map pour stocker les tile layers actifs
    const tileLayers = new Map();

    // Créer/mettre à jour les tile layers
    rasterRecords.forEach(record => {
      const layerName = record.layer_name || record.nom || `Raster ${record.id}`;
      const isVisible = layerVisibility[layerName] !== false && record.is_visible !== false;

      if (!isVisible) {
        // Si layer existe et est maintenant invisible, le retirer
        if (tileLayers.has(record.id)) {
          map.removeLayer(tileLayers.get(record.id));
          tileLayers.delete(record.id);
        }
        return;
      }

      // Si layer déjà créé, pas besoin de le recréer
      if (tileLayers.has(record.id)) {
        return;
      }

      // Créer nouveau tile layer
      const tileUrl = record.raster_url || record.endpoint_url;

      if (!tileUrl) {
        console.warn(`No tile URL for raster layer: ${layerName}`);
        return;
      }

      // Options du tile layer
      const options = {
        attribution: record.attribution || '',
        opacity: 1.0,
        zIndex: record.z_index || 0,
        maxZoom: 19
      };

      // Créer et ajouter le tile layer
      const tileLayer = L.tileLayer(tileUrl, options);
      tileLayer.addTo(map);

      tileLayers.set(record.id, tileLayer);

      console.log(`✓ Added raster layer: ${layerName}`);
    });

    // Cleanup: retirer les layers qui ne sont plus dans records
    return () => {
      tileLayers.forEach((layer, id) => {
        map.removeLayer(layer);
      });
      tileLayers.clear();
    };
  }, [records, layerVisibility, map]);

  return null; // Ce composant ne rend rien, il gère juste les tile layers
};

export default RasterLayers;
