## Summary

This PR implements a complete, professional data-driven styling and attribute query system for Smart-GIS v2, enabling users to:

- **Style layers based on data attributes** (categorized, graduated, proportional)
- **Query and filter features** using multi-condition attribute queries
- **Visualize data** with auto-generated legends
- **Persist styles** efficiently using metadata rows pattern

This transforms Smart-GIS v2 into a SaaS-quality GIS widget with professional data visualization capabilities.

---

## Core Features

### 1. Data-Driven Styling (4 Types)

**Categorized Styling** - Unique values with distinct colors
- Works for both string fields and numeric fields
- Auto-detects unique values
- Color scheme picker (10+ palettes)

**Graduated Styling** - Numeric ranges with color gradients (choropleth)
- Classification methods: Quantile, Equal Interval, Jenks/Natural Breaks
- Color ramps: Sequential, diverging, custom
- 5 automatic classes with smart breaks

**Proportional Styling** - Size based on numeric values
- Min/max size configuration
- Linear scaling
- Works for all geometry types

### 2. Attribute Query Builder

- **Visual query interface** - No SQL knowledge required
- **15+ operators**: =, !=, >, <, >=, <=, LIKE, NOT LIKE, IN, NOT IN, BETWEEN, IS NULL, IS NOT NULL, STARTS WITH, ENDS WITH
- **Multi-condition support** - AND/OR logic
- **Actions**: Select features, filter map, save as layer
- **SQL preview** - See generated query

### 3. Dynamic Legends

- **Auto-generated** from active style rules
- **Collapsible overlay** on map
- **Color swatches** with value labels
- **Updates automatically** when styles change

---

## Architecture

### Service Layer (3 new services)

**DataAnalyzer.js** (325 lines)
- Analyzes field data for styling decisions
- Statistical analysis and classification
- Supports both string and numeric fields

**StyleRuleEngine.js** (299 lines)
- Applies data-driven rules to map features
- Generates Leaflet-compatible styles
- Legend generation

**SelectionQueryEngine.js** (338 lines)
- Executes multi-condition attribute queries
- 15+ operators with type-safe comparisons
- AND/OR logic evaluation

### UI Layer (3 new components)

**DataDrivenStyleEditor.jsx** (450 lines + CSS)
- 4-step workflow: Type → Field → Configuration → Preview
- Live preview with color scheme selection
- Field analysis display

**AttributeQueryBuilder.jsx** (380 lines + CSS)
- Visual condition builder
- Results preview
- Action buttons

**LegendPanel.jsx** (120 lines + CSS)
- Dynamic map overlay
- Auto-generated from style rules
- Collapsible interface

### Integration Updates

**LayersPanel.jsx** - Added style/query editors + modal system
**LayerRenderer.jsx** - StyleRuleEngine integration with immediate updates
**MapView.jsx** - LegendPanel integration
**SmartGISWidget.jsx** - Metadata row separation and loading
**TableSchemas.js** - Added style_rule column for auto-creation

---

## Storage Pattern: Metadata Rows (Option 3)

Style rules are persisted using **metadata rows** in the existing GIS_WorkSpace table:

- **Metadata rows**: geometry = NULL, contains style_rule JSON
- **Feature rows**: geometry != NULL, no style_rule
- **One metadata row per layer** (no duplication)

**Benefits**:
- No new table required
- Clean separation (geometry vs metadata)
- One style per layer (automatic deduplication)
- Easy to query: WHERE geometry IS NULL

---

## Bug Fixes

1. **TypeError: toFixed is not a function** - Fixed Number() conversion (8608dbc)
2. **Empty configuration for numeric categorization** - Fixed uniqueValues check (87022ad)
3. **StateManager.notify is not a function** - Removed invalid calls (2b7231a)
4. **Scroll not working in modal** - Changed to max-height: 90vh (496c2d3)
5. **KeyError 'style_rule'** - Added to TableSchemas.js (65d16b8)
6. **Visual update not immediate** - Fixed with state subscription (87d0008)

---

## Files Changed

### New Files (6)
- DataAnalyzer.js (325 lines)
- StyleRuleEngine.js (299 lines)
- SelectionQueryEngine.js (338 lines)
- DataDrivenStyleEditor.jsx + CSS (450 + 395 lines)
- AttributeQueryBuilder.jsx + CSS (380 + 340 lines)
- LegendPanel.jsx (120 lines)

### Modified Files (5)
- LayersPanel.jsx
- LayerRenderer.jsx
- MapView.jsx
- SmartGISWidget.jsx
- TableSchemas.js

---

## Impact

This PR elevates Smart-GIS v2 to professional GIS software quality, matching capabilities found in QGIS, ArcGIS Online, and Mapbox Studio.

**Business value:**
- Enables advanced spatial analysis without leaving Grist
- Professional visualizations for presentations
- No-code attribute queries for non-technical users
- SaaS-quality user experience

---

## Migration Notes

The widget will automatically:
1. Create the style_rule column in GIS_WorkSpace on first load
2. Continue displaying existing data normally
3. Enable new styling features without data migration

No manual intervention required.
