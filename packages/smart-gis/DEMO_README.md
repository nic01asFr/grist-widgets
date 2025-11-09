# Smart GIS Widget v3.0 - Demo Mode

## Testing Phase 1 & 2 Components

To visually test the new UI components and layout:

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

## Next Steps

### Phase 3: Map Selection (Pending)
- `hooks/useMapSelection.js`
- `components/map/SelectionTools.js`
- `components/map/SelectionActionsBar.js`

### Phase 4: Layer Management (Pending)
- `components/menu/LayersSection.js`
- `components/menu/LayerItem.js`
- `components/panels/EntityList.js`

### Phase 5: Style Editor (Pending)
- `components/panels/StyleEditor.js`
- Visual pickers for colors, opacity, borders

## Architecture

```
src/
├── components/
│   ├── ui/           ✅ Phase 1
│   ├── layout/       ✅ Phase 2
│   ├── menu/         ⏳ Phase 4
│   ├── panels/       ⏳ Phase 5
│   ├── map/          ⏳ Phase 3
│   └── DemoPage.js   ✅ Test page
├── constants/        ✅ Phase 1
├── hooks/            ⏳ Phase 3+
└── utils/            ⏳ Phase 3+
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
