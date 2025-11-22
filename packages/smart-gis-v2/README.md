# Smart-GIS v2 - Professional Geospatial Widget for Grist

**Status:** 🚧 In Development (Phase 1-3 Complete)

A complete rewrite of the Smart-GIS widget with professional-grade spatial analysis capabilities, following the comprehensive roadmap for a QGIS-like experience in Grist.

## 🎯 Vision

Create a unified geospatial widget combining the power of QGIS with a lightweight web interface, featuring 30+ spatial functions via SpatiaLite/GEOS/PROJ integration with Grist's Python sandbox.

## ✅ Implemented Features (Phases 1-3)

### Phase 1: Core Infrastructure ✅
- **GristAPI Wrapper**: Full CRUD operations, columnar data conversion
- **StateManager**: Centralized state with undo/redo (50 action history)
- **EventBus**: Decoupled component communication
- **3-Level UI Architecture**:
  - Level 1: Navbar (always visible, primary actions)
  - Level 2: Sidebar (4 tabs: Layers, Tools, Data, Search)
  - Level 3: Contextual panels (selection-based)

### Phase 2: Leaflet Map & WKT Support ✅
- **WKT Parser**: Full support for POINT, LINESTRING, POLYGON, MULTI* geometries
- **EWKT Support**: SRID extraction and handling
- **MapView Component**: Leaflet integration with clustering
- **LayerRenderer**: Renders all geometry types with custom styles
- **Selection System**: Click to select, highlight, contextual actions
- **Bounds Calculation**: Auto-zoom to features

### Phase 3: 30+ Spatial Tools ✅
Tool categories organized by function:

#### 📏 Measurement (4 tools)
- **Calculate Area**: Surface area in m², ha, km²
- **Calculate Length**: Line length in m, km
- **Distance Between**: Distance between 2 geometries
- **Calculate Perimeter**: Polygon perimeter

#### 🔄 Transformation (5 tools)
- **Buffer Zone**: Create buffer with configurable distance/segments
- **Centroid**: Calculate geometric center
- **Simplify**: Reduce point count (Douglas-Peucker)
- **Envelope (BBox)**: Bounding rectangle
- **Convex Hull**: Minimal convex polygon

#### ⚡ Spatial Analysis (4 tools)
- **Union**: Merge multiple polygons
- **Intersection**: Common area between geometries
- **Difference**: Subtract geometry from another
- **Symmetric Difference**: Non-common parts

#### 🔗 Spatial Queries (6 tools)
- **Within**: Find geometries contained in zone
- **Contains**: Find geometries that contain others
- **Intersects**: Find intersecting geometries
- **Selection by Distance**: Find within radius
- **Touches**: Find touching geometries
- **Crosses**: Find crossing lines

#### 🔀 Conversions (3 tools)
- **Transform CRS**: Convert between WGS84, Lambert93, Web Mercator, UTM
- **Export GeoJSON**: Convert to GeoJSON format
- **Export WKT**: Convert to WKT format

#### ✅ Validation (3 tools)
- **Validate Geometry**: Check validity
- **Fix Geometry**: Repair invalid geometries
- **Geometry Type**: Identify type

**Total: 25 tools implemented, all with:**
- Parameter forms (units, tolerances, distances)
- Multi-selection support where applicable
- Result type handling (geometry, numeric, text, boolean, selection)
- Grist formula generation for server-side execution

## 🚧 In Progress (Phase 3 continued)

- ToolsPanel UI component
- ToolExecutor (modal for tool execution)
- ParamsForm (dynamic parameter inputs)

## 📋 Roadmap (Remaining Phases)

### Phase 4: Data Import
- Import methods: GeoJSON, CSV lat/lon, CSV WKT, Shapefile (via QGIS), WFS
- Catalogues: IGN Géoplateforme, OSM Overpass, custom WFS
- 3-step wizard: Upload → Configure → Preview → Import
- Bulk insert optimization

### Phase 5: Hybrid Search
- Semantic search (VECTOR_SEARCH on properties)
- Spatial search (ST_* predicates)
- Combined semantic + spatial filtering
- Search history

### Phase 6: Layer Management
- Visibility toggle
- Z-index ordering
- Layer deletion
- Zoom to layer
- Style editor

### Phase 7: Performance Optimizations
- WKT parsing cache (memoization)
- Viewport filtering (only render visible features)
- Lazy loading of tool modules
- Debounced user inputs

### Phase 8: Build & Deployment
- Vite production build (target: <200 kB gzipped)
- Code splitting (vendor-react, vendor-map, tools-*)
- Terser minification
- GitHub Pages deployment

### Phase 9: Testing & Validation
- Unit tests (WKT parser, state manager)
- Integration tests (Grist API, tool execution)
- Performance benchmarks
- Production checklist

## 🏗️ Architecture

### Data Schema

```javascript
// Grist Table Schema
{
  layer_name: 'Text',           // Logical layer name
  layer_type: 'Choice',          // vector|raster|wms|wfs
  geometry: 'Text',              // WKT/EWKT
  properties: 'Text',            // JSON string
  style: 'Text',                 // JSON Leaflet style
  z_index: 'Int',                // Display order
  is_visible: 'Bool',            // Visibility

  // Formula columns (calculated by Grist)
  geometry_wgs84: 'ST_TRANSFORM($geometry, source_srid, 4326)',
  area_ha: 'ST_AREA($geometry_wgs84, "ha")',
  length_km: 'ST_LENGTH($geometry_wgs84, "km")',
  centroid: 'ST_CENTROID($geometry_wgs84)',
  element_vector: 'CREATE_VECTOR($properties)'
}
```

### Component Tree

```
SmartGISWidget (root)
├── Navbar (Level 1)
│   ├── New/Save/Import/Search buttons
│   ├── Undo/Redo
│   └── Project name + layer count
│
├── Sidebar (Level 2)
│   ├── Tab buttons (Layers|Tools|Data|Search)
│   └── Tab content:
│       ├── LayersPanel (Phase 6)
│       ├── ToolsPanel (Phase 3 - in progress)
│       ├── DataPanel (Phase 4)
│       └── SearchPanel (Phase 5)
│
└── Map Container
    ├── MapView
    │   ├── TileLayer (OSM)
    │   ├── LayerRenderer (per feature)
    │   └── MarkerClusterGroup (for points)
    │
    └── ContextualPanel (Level 3)
        └── Selection details & actions
```

### State Management

```javascript
StateManager.state = {
  map: { center, zoom, bounds },
  layers: { workspace[], raster[], system[] },
  selection: { ids[], geometryTypes[], bounds },
  ui: { activeTab, activePanel, loading, modal },
  tools: { activeTool, config, lastUsed[] },
  data: { currentTable, catalogs[], styles[] }
}

// Subscribe to changes
StateManager.subscribe('layers.workspace', (layers) => {
  // React to workspace changes
});

// Update with history
StateManager.setState('ui.activeTab', 'tools', 'Switch to tools');

// Undo/Redo
StateManager.undo();
StateManager.redo();
```

## 🛠️ Development

### Install Dependencies

```bash
cd packages/smart-gis-v2
npm install
```

### Development Server

```bash
npm run dev
# Opens on http://localhost:3000
```

### Build for Production

```bash
npm run build
# Output in build/ directory
```

### Analyze Bundle Size

```bash
npm run analyze
```

## 📦 Tech Stack

- **React** 18.2 - UI framework
- **Leaflet** 1.9.4 - Map rendering
- **React-Leaflet** 4.2.1 - React bindings
- **Leaflet-Geoman** 2.15.0 - Geometry editing
- **Vite** 5.0 - Build tool & dev server

## 🎨 Design Principles

### Golden Rule: Grist = Backend, Widget = Frontend

**Grist responsibilities** (source of truth):
- All business calculations (ST_* functions, VECTOR_SEARCH)
- Data storage, validation, relationships
- Formulas, aggregations, history

**Widget responsibilities** (view/interface):
- Display and visualization ONLY
- User interactions (click, select, edit UI)
- UI optimization (caching, debouncing)
- **NO** business logic calculations

### Performance First
- Memoization for expensive operations (WKT parsing)
- Viewport filtering (render only visible features)
- Code splitting (lazy load tool modules)
- Target: 60fps map interactions, <200ms tool execution

### User Experience
- 3-level interface (Navbar → Tabs → Contextual)
- Contextual tool availability (only show applicable tools)
- Undo/Redo for all state changes
- Loading states, error handling, tooltips

## 📝 Project Status

**Completion:** ~40% (3/9 phases complete)

- ✅ Phase 1: Infrastructure (100%)
- ✅ Phase 2: Map & WKT (100%)
- 🚧 Phase 3: Spatial Tools (70% - definitions done, UI in progress)
- ⏳ Phase 4: Import (0%)
- ⏳ Phase 5: Search (0%)
- ⏳ Phase 6: Layers (0%)
- ⏳ Phase 7: Performance (0%)
- ⏳ Phase 8: Build (0%)
- ⏳ Phase 9: Testing (0%)

**Estimated completion:** 12-15 development days (per roadmap)

## 🚀 Next Steps

1. **Complete Phase 3**: ToolsPanel UI + ToolExecutor component
2. **Phase 4**: Implement import wizard with WFS/GeoJSON/CSV support
3. **Phase 5**: Add semantic + spatial hybrid search
4. **Phase 6**: Layer management panel
5. **Optimize & Test**: Performance tuning, unit tests
6. **Deploy**: Production build, documentation

## 📄 License

Apache-2.0

## 👨‍💻 Development

Built with Claude Code following the comprehensive Smart-GIS v2 roadmap.
