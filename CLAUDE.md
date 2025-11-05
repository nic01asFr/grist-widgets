# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository hosts custom widgets for Grist (spreadsheet application) on GitHub Pages. It contains multiple widgets:
- **geo-map** (React): Geo-semantic map with WKT support, interactive editing via Leaflet.pm
- **smart-gis** (React): Smart GIS system with multi-source support (IGN, OSM), advanced editing, custom styles
- **cluster-quest** (Static HTML/JS): Interactive training for learning Grist clusters and vectors

## Development Commands

### Build Commands
```bash
# Install root dependencies
npm install

# Build specific widget (React-based)
npm run build:geo-map

# Build all widgets and prepare distribution
npm run build:all

# Prepare dist folder (copies built and static widgets)
npm run prepare-dist
```

### Development
```bash
# React widgets (e.g., geo-map, smart-gis)
cd packages/geo-map
npm install
npm start  # or npm run dev:geo-map from root

# Static widgets (e.g., cluster-quest)
# Open packages/cluster-quest/public/index.html directly in browser
```

### Testing Widget Integration
To test a widget with Grist locally:
1. Run the dev server (for React widgets) or use a local server for static widgets
2. In Grist, add Custom Widget with URL: `http://localhost:3000`
3. Configure column mappings as required by the widget

## Architecture Principles

### Critical: Grist = Backend, Widget = Frontend

**Golden Rule**: If Grist can do it → Widget READS it, does NOT CALCULATE it

- **Grist responsibilities** (source of truth):
  - All business calculations (ST_* geospatial functions, VECTOR_SEARCH)
  - Data storage, validation, relationships
  - Formulas, aggregations, history

- **Widget responsibilities** (view/interface):
  - Display and visualization ONLY
  - User interactions (click, select, edit UI)
  - UI optimization (caching, debouncing)
  - NO business logic calculations

Example:
```javascript
// ✅ GOOD: Widget reads calculated values from Grist
const area = columnHelper.getValue(record, 'area_km2');

// ❌ BAD: Widget recalculates (should be formula in Grist)
const area = calculateAreaFromGeometry(record.geometry);
```

### Widget Architecture Components

Widgets should follow this structure (see `/docs/ARCHITECTURE.md` for details):

1. **GristWidgetBase** - Base class with 7-phase initialization:
   - detectMode() → initializeGristApi() → loadConfiguration() → declareRequirements() → setupEventListeners() → loadDocumentMetadata() → initializeBusinessComponents()

2. **ColumnHelper** - Safe access to mapped columns, prevents undefined errors

3. **DataValidator** - Validate all incoming data, sanitize HTML to prevent XSS

4. **PerformanceManager** - Caching, debouncing, throttling, memoization

### Data Flow
```
Grist calculates → API events (onRecords) → Widget receives → Widget displays →
User action → Widget notifies Grist (setCursorPos, applyUserActions) →
Grist updates → Cycle repeats
```

## Project Structure

```
grist-widgets/
├── packages/
│   ├── geo-map/              # React widget (needs build)
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── smart-gis/            # React widget (needs build)
│   └── cluster-quest/        # Static widget (no build)
│       └── public/
│           ├── index.html
│           ├── app.js
│           └── styles.css
├── scripts/
│   ├── build-manifest.js     # Generates manifest.json
│   └── prepare-dist.js       # Prepares distribution folder
├── docs/                     # Architecture and development guides
│   ├── ARCHITECTURE.md       # Core architectural principles
│   ├── WIDGET_DEVELOPMENT_GUIDE.md
│   ├── API_REFERENCE.md
│   └── VECTOR_SEARCH_PATTERNS.md
└── .github/workflows/
    └── deploy.yml           # Auto-deployment to GitHub Pages
```

## Widget Types

### Built Widgets (React)
- Source code in `src/`
- Build output in `build/` (generated, gitignored)
- Listed in `builtWidgets` array in `scripts/prepare-dist.js`
- Examples: geo-map, smart-gis

### Static Widgets (HTML/CSS/JS)
- All files in `public/` directory
- No build step required
- Listed in `staticWidgets` array in `scripts/prepare-dist.js`
- Example: cluster-quest

## Deployment

**Automatic**: Push to `main` branch triggers GitHub Actions workflow that:
1. Builds React widgets (geo-map, smart-gis)
2. Copies static widgets (cluster-quest)
3. Runs `prepare-dist.js` to populate `dist/` folder
4. Runs `build-manifest.js` to generate `dist/manifest.json`
5. Deploys `dist/` to GitHub Pages

**Manual deployment is NOT needed** - the workflow handles everything.

URLs after deployment:
- Manifest: `https://nic01asfr.github.io/grist-widgets/manifest.json`
- Widgets: `https://nic01asfr.github.io/grist-widgets/{widget-name}/index.html`

## Adding a New Widget

### For React/Built Widget:
1. Create folder in `packages/`
2. Add to `builtWidgets` array in `scripts/prepare-dist.js`
3. Add widget config to `scripts/build-manifest.js`
4. Create build script in root `package.json` (e.g., `build:my-widget`)

### For Static Widget:
1. Create folder in `packages/` with `public/` subdirectory
2. Add to `staticWidgets` array in `scripts/prepare-dist.js`
3. Add widget config to `scripts/build-manifest.js`

## Widget Development Guidelines

### Required Practices:
1. Extend GristWidgetBase for widget classes
2. Use ColumnHelper for all column access (never hardcode column names)
3. Validate all input data with DataValidator
4. Handle all UI states: loading, empty, error, success
5. Implement selection highlighting (sync with Grist cursor)
6. Always sanitize HTML output to prevent XSS
7. Use try/catch for all async operations

### Performance:
- Use PerformanceManager.memoize() for expensive calculations
- Debounce user inputs (search, filters)
- Use requestAnimationFrame for batch UI updates
- Cache parsed geometries/data structures

### Security:
- Validate all data before use: `DataValidator.validate(value, 'geometry')`
- Sanitize HTML: `DataValidator.sanitizeHTML(userInput)`
- Never trust user input or external data

## Key Documentation

- `/docs/ARCHITECTURE.md` - Core architectural principles (READ THIS FIRST)
- `/docs/WIDGET_DEVELOPMENT_GUIDE.md` - Practical development guide
- `/docs/API_REFERENCE.md` - Complete API documentation
- `/docs/VECTOR_SEARCH_PATTERNS.md` - Vector search patterns in Grist
- `/packages/cluster-quest/README.md` - Cluster Quest widget specifics

## Common Patterns

### Grist Geospatial Functions (use in Grist formulas, read in widget):
```python
# In Grist column formulas:
area_km2 = ST_AREA($geometry, 'km2')
length_km = ST_LENGTH($geometry, 'km')
center = ST_CENTROID($geometry)
is_inside = ST_CONTAINS($zone, $point)
```

### Grist Vector Functions (use in Grist formulas, read in widget):
```python
# In Grist column formulas:
vector = CREATE_VECTOR($title, $description)
results = VECTOR_SEARCH(Documents, $query, embedding_column="vector")
similarity = VECTOR_SIMILARITY($vec1, $vec2, 'cosine')
```

### Widget Data Access:
```javascript
// Always use ColumnHelper, never direct property access
const value = this.columnHelper.getValue(record, 'column_name', defaultValue);

// Handle selection
handleClick(recordId) {
  this.gristApi.setCursorPos({ rowId: recordId });
}

// Update data in Grist
await this.docApi.applyUserActions([
  ['UpdateRecord', tableName, recordId, { field: newValue }]
]);
```

## Known Issues & Solutions

### Widget doesn't display:
- Verify GitHub Pages is enabled (Settings → Pages)
- Check manifest URL in Grist settings
- Check browser console for errors

### Build errors:
- Run `npm install` in both root and widget package directory
- Check GitHub Actions logs in Actions tab

### Cluster Quest blank page:
- Requires Reveal.js which only works on hosted pages
- Must use hosted URL: `https://nic01asfr.github.io/grist-widgets/cluster-quest/`
- Cannot use direct local HTML file

## Git Branch Strategy

- **main**: Production branch, auto-deploys to GitHub Pages
- **claude/*** : Feature branches for Claude Code work (follow naming convention: `claude/{description}-{session-id}`)

Always develop on designated feature branches and create PRs to main when ready.
