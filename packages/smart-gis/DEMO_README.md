# Smart GIS Widget v3.0 - Demo Mode

## Testing Phase 1, 2, 3 & 4 Components

To visually test the new UI components, layout, selection system, and layer management:

### Method 1: Temporary Switch
```bash
cd packages/smart-gis/src
mv index.js index-main.js
mv index-demo.js index.js
npm start
```

Then visit: http://localhost:3000

### Method 2: Direct Component Import
Import components directly in your test files:

```javascript
import { Button, Input, ColorPicker, Slider } from './components/ui';
import { Navbar, MainMenu, AdjacentPanel } from './components/layout';
```

## What's Implemented

### Phase 1: Design System (✅ Complete)
- **Constants**: colors.js, styles.js
- **UI Components**:
  - Button (5 variants, 3 sizes)
  - Input (with icon, error states)
  - ColorPicker (react-colorful, presets)
  - Slider (custom styled)
  - Checkbox (custom checkmark)
  - Select (custom dropdown)
  - Modal (overlay, animations)

### Phase 2: Layout (✅ Complete)
- **Navbar**: Editable project name, menu toggle, fullscreen button
- **MainMenu**: Collapsible side menu with sections
- **AdjacentPanel**: Contextual panel (for StyleEditor, EntityList, etc.)
- **MenuSection**: Collapsible section component
- **MenuDivider**: Visual separator

### Phase 3: Map Selection (✅ Complete)
- **useMapSelection Hook**: Selection state management with layer filtering
- **SelectionTools**: Floating toolbar with 4 selection modes (pointer, rectangle, circle, lasso)
- **SelectionActionsBar**: Bottom action bar with copy, delete, export, style, zoom, edit buttons
- **Selection Behaviors**: Click, Ctrl+click (toggle), Shift+click (range)
- **Geometric Selection**: Rectangle, Circle, Lasso (with modifier support)

### Phase 4: Layer Management (✅ Complete)
- **LayersSection**: Full layer management with search, sorting, visibility toggle
- **LayerItem**: Individual layer display with actions (👁️ visibility, 📋 list, 📊 stats, 🎨 style, ✏️ rename, 🗑️ delete)
- **EntityList Panel**: Filterable entity list with checkbox selection, sorting, batch actions
- **StatsPanel**: Layer statistics (entity count, geometry types distribution, bounding box, extent)
- **Geometry Type Detection**: Automatic detection and icons for POINT, LINESTRING, POLYGON, MULTI*
- **Layer Visibility**: Toggle individual layers on/off
- **Active Layer Context**: Selection and operations respect active layer

## Demo Page Features

The demo page (`src/components/DemoPage.js`) showcases:

1. **Navbar**
   - Click project name to edit
   - Toggle menu with ☰ button
   - Toggle fullscreen with 🗺️ button

2. **MainMenu**
   - Collapsible sections
   - All UI components displayed
   - Adjacent panel trigger
   - **NEW (Phase 3)**: Selection controls with layer filter, quick selection buttons, mode toggles

3. **AdjacentPanel**
   - Opens to the right of menu
   - Example style editor
   - Overlay + close button

4. **All UI Components**
   - Interactive buttons
   - Color picker with presets
   - Slider with value display
   - Checkbox
   - Select dropdown
   - Modal dialog

5. **Map Selection System (Phase 3)**
   - SelectionTools floating at top of map
   - 4 selection modes with visual feedback
   - Active layer context display
   - Selection count badge
   - SelectionActionsBar at bottom when entities selected
   - Action buttons: Zoom, Style, Edit, Copy, Export, Delete
   - Selection info in menu sidebar

6. **Layer Management (Phase 4)**
   - LayersSection in menu with search and sorting
   - Layer visibility toggles (eye icon)
   - Click layer to set as active
   - Hover layer for action buttons
   - Click "📋 Liste" to open EntityList panel
   - Click "📊 Stats" to open StatsPanel
   - Click "🎨 Style" to open style editor
   - Click "✏️" to rename layer (inline editing)
   - Click "🗑️" to delete layer (with confirmation)
   - EntityList panel: search, filter by geometry type, sort, checkbox selection, batch actions
   - StatsPanel: entity count, geometry type distribution with bars, bounding box

## Next Steps

### Phase 5: Style Editor (Pending)
- `components/panels/StyleEditor.js`
- Visual pickers for colors, opacity, borders

## Architecture

```
src/
├── components/
│   ├── ui/           ✅ Phase 1 (7 components: Button, Input, ColorPicker, Slider, Checkbox, Select, Modal)
│   ├── layout/       ✅ Phase 2 (3 components: Navbar, MainMenu+MenuSection, AdjacentPanel)
│   ├── map/          ✅ Phase 3 (2 components: SelectionTools, SelectionActionsBar)
│   ├── menu/         ✅ Phase 4 (2 components: LayersSection, LayerItem)
│   ├── panels/       ✅ Phase 4 (2 components: EntityList, StatsPanel)
│   └── DemoPage.js   ✅ Test page (updated for Phases 1-4)
├── constants/        ✅ Phase 1 (colors.js, styles.js)
├── hooks/            ✅ Phase 3 (useMapSelection.js)
└── utils/            ⏳ Future phases
```

## Keyboard Shortcuts (Planned)

- `Ctrl + A`: Select all
- `Échap`: Clear selection
- `F`: Fit to selection
- `Suppr`: Delete selection

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
