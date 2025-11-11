# Panoramax Explorer Widget

A custom Grist widget for exploring and viewing [Panoramax](https://panoramax.fr) street-level imagery directly within Grist documents.

## Overview

The Panoramax Explorer widget provides an interactive interface to:
- **Explore mode**: Click on a map to discover nearby Panoramax panoramic images
- **View mode**: Select records in Grist to view associated panoramas
- Auto-create a `Panoramax_Views` table to save favorite views
- Seamlessly integrate with Grist for data management

## Features

### Two Modes

**🔍 Explorer Mode**
- Click anywhere on the interactive Leaflet map
- Searches for nearby Panoramax imagery
- Displays numbered markers for available panoramas
- Click markers to view panoramas
- Save favorite views to Grist with one click

**👁️ View Mode**
- Select a row in Grist's `Panoramax_Views` table
- Automatically loads the corresponding panorama
- Displays saved panoramas as markers on the map
- Perfect for reviewing saved locations

### Auto-Created Table

The widget automatically creates a `Panoramax_Views` table with the following columns:
- `lat` (Numeric): Latitude
- `lon` (Numeric): Longitude
- `sequence_id` (Text): Panoramax collection ID
- `picture_id` (Text): Panoramax picture ID
- `heading` (Numeric): Camera heading
- `capture_date` (DateTime): Photo capture date
- `description` (Text): Description
- `saved_at` (DateTime): When saved to Grist

## Usage in Grist

### Adding the Widget

1. In your Grist document, add a **Custom Widget**
2. Set the widget URL to:
   ```
   https://nic01asfr.github.io/grist-widgets/panoramax-explorer/index.html
   ```
3. Grant **full access** when prompted (required to create the table)

### Explorer Mode

1. Click the **🔍 Explorer** button in the top-right of the map panel
2. Click anywhere on the map to search for panoramas
3. The widget will display numbered markers for nearby panoramas
4. Click a marker to view its panorama
5. Click **💾 Save this view** to save it to the `Panoramax_Views` table

### View Mode

1. Click the **👁️ View** button in the top-right of the map panel
2. Select a row in the `Panoramax_Views` table
3. The panorama will load automatically
4. Green checkmark markers show all saved panoramas on the map

## Technical Details

### Architecture

The widget uses a two-iframe architecture to avoid UMD module compatibility issues in Grist's iframe context:

1. **Main widget** (`index.html`): Contains the Leaflet map, Grist API integration, and UI
2. **Viewer iframe** (`panoramax-viewer-frame.html`): Loads the Panoramax Web Viewer in a clean context

Communication between iframes uses `postMessage` API.

### Dependencies

- **Grist Plugin API**: For Grist integration
- **Leaflet 1.9.4**: Interactive map
- **Panoramax Web Viewer 4.1.0**: Street-level imagery viewer (loaded via CDN)

### API Integration

- **Panoramax API**: `https://api.panoramax.xyz/api`
- Searches for imagery using bounding box queries
- Fetches panorama metadata and displays in viewer

## Development

This is a **static widget** (no build step required).

### Testing Locally

```bash
cd packages/panoramax-explorer/public
python -m http.server 8000
```

Then open: `http://localhost:8000/index.html`

To test with Grist:
1. Add a Custom Widget in Grist
2. Set URL to: `http://localhost:8000/index.html`
3. Grant full access

### Files

- `index.html` - Main widget with map and Grist integration
- `panoramax-viewer-frame.html` - Iframe for Panoramax viewer
- `README.md` - This file

## Deployment

The widget is automatically deployed to GitHub Pages when changes are merged to `main`:

```
https://nic01asfr.github.io/grist-widgets/panoramax-explorer/index.html
```

No manual deployment needed - GitHub Actions handles the build and deployment.

## Use Cases

- **Field surveys**: Save interesting street-level views during data collection
- **Urban planning**: Document street conditions and infrastructure
- **Historical documentation**: Track changes over time by saving dated panoramas
- **Research**: Collect geolocated visual data for analysis
- **Public engagement**: Share curated views of public spaces

## Limitations

- Requires internet connection for Panoramax API access
- Coverage depends on Panoramax data availability (mainly France and some European cities)
- Panoramax viewer may take a few seconds to load (CDN dependency)

## Credits

- Built for [Grist](https://www.getgrist.com/)
- Uses [Panoramax](https://panoramax.fr) open street-level imagery
- Map powered by [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/)

## License

MIT License - See repository root for details
