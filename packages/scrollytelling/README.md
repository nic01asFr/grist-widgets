# Scrollytelling Widget for Grist

**Professional visual storytelling widget with smooth image transitions and text overlays**

## 🎬 Features

- **Smooth Transitions**: 6 transition types (fade, slide-up, slide-down, zoom-in, zoom-out, crossfade)
- **Flexible Text Positioning**: 9 configurable positions (top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right)
- **Markdown Support**: Rich text formatting with headings, lists, links, code blocks
- **Navigation**: Progress bar, navigation dots, keyboard controls (arrow keys)
- **Scroll Modes**: Free scroll or snapped (one scene per viewport)
- **Auto-Configuration**: Automatically creates necessary tables on first use
- **Responsive**: Works on desktop and mobile devices

## 📊 Auto-Created Tables

The widget automatically creates two tables on first initialization:

### 1. Scrollytelling_Scenes

| Column | Type | Description |
|--------|------|-------------|
| scene_order | Numeric | Order of scenes (1, 2, 3...) |
| title | Text | Scene title |
| image_url | Text | URL to image (or Grist attachment) |
| text_content | Text | Markdown text content |
| text_position | Choice | Position: top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right |
| text_alignment | Choice | Text alignment: left, center, right, justify |
| transition_type | Choice | Transition: fade, slide-up, slide-down, zoom-in, zoom-out, crossfade |
| transition_duration | Numeric | Duration in milliseconds (default: 800) |
| text_color | Text | Text color (hex or rgba) |
| text_bg_color | Text | Text background color (rgba for transparency) |
| enabled | Bool | Enable/disable scene |

### 2. Scrollytelling_Config

| Column | Type | Description |
|--------|------|-------------|
| scroll_mode | Choice | free (smooth scroll) or snapped (snap to scenes) |
| show_progress | Bool | Show progress bar at top |
| show_navigation | Bool | Show navigation dots on right |
| keyboard_nav | Bool | Enable keyboard navigation (arrow keys) |
| auto_height | Bool | Auto height (experimental) |

## 🚀 Quick Start

### 1. Add Widget to Grist

1. In your Grist document, click **Add New** → **Add Widget to Page**
2. Select **Custom Widget**
3. Enter the widget URL:
   ```
   https://nic01asfr.github.io/grist-widgets/scrollytelling/index.html
   ```
4. Click **Save**

### 2. Widget Auto-Configuration

On first load, the widget will automatically:
- Create the `Scrollytelling_Scenes` table with 3 sample scenes
- Create the `Scrollytelling_Config` table with default settings
- Display the sample scenes

### 3. Customize Your Story

#### Edit Scenes

Go to the `Scrollytelling_Scenes` table and modify:

- **scene_order**: Change the order (1, 2, 3, 4...)
- **image_url**: Add your image URLs (Unsplash, Imgur, or Grist attachments)
- **text_content**: Write your story using Markdown:
  ```markdown
  # Main Title
  ## Subtitle

  Your paragraph text with **bold** and *italic*.

  - Bullet point 1
  - Bullet point 2
  ```
- **text_position**: Choose where text appears on the image
- **transition_type**: Select transition effect

#### Configure Widget Settings

Go to the `Scrollytelling_Config` table (1 row only):

- **scroll_mode**: `free` (smooth) or `snapped` (one scene per screen)
- **show_progress**: Show/hide progress bar
- **show_navigation**: Show/hide navigation dots
- **keyboard_nav**: Enable/disable arrow key navigation

## 🎨 Examples

### Example 1: Simple Story

```
scene_order: 1
title: Welcome
image_url: https://images.unsplash.com/photo-1506905925346-21bda4d32df4
text_content: # Welcome to Our Story\n\nScroll down to explore
text_position: center
transition_type: fade
```

### Example 2: Image Gallery with Captions

```
scene_order: 1
title: Mountain Sunrise
image_url: https://images.unsplash.com/photo-1506905925346-21bda4d32df4
text_content: ## Mountain Sunrise\n*Photo taken at 6:00 AM*
text_position: bottom-center
transition_type: slide-up
transition_duration: 1000
```

### Example 3: Data Visualization Story

```
scene_order: 1
title: Sales Growth
image_url: [chart image URL]
text_content: ### Q4 Results\n\n- Revenue: +35%\n- Customers: +1,200\n- Satisfaction: 98%
text_position: top-right
text_alignment: left
transition_type: zoom-in
```

## 🎯 Use Cases

- **Product Launches**: Tell your product story with beautiful visuals
- **Data Reports**: Present data with visual context
- **Photo Essays**: Create immersive photo narratives
- **Tutorials**: Guide users through processes with images
- **Case Studies**: Showcase projects with before/after images
- **Travel Stories**: Share journeys with location photos

## ⌨️ Keyboard Controls

- **Arrow Down** / **Page Down**: Next scene
- **Arrow Up** / **Page Up**: Previous scene

## 🎨 Styling Tips

### Text Backgrounds

For better readability, use semi-transparent backgrounds:
- Dark: `rgba(0,0,0,0.6)` (black with 60% opacity)
- Light: `rgba(255,255,255,0.8)` (white with 80% opacity)
- Colored: `rgba(76,175,80,0.7)` (green with 70% opacity)

### Text Positioning

- **Center**: Best for hero sections and main titles
- **Bottom-center**: Great for captions
- **Top-right**: Good for annotations and notes
- **Bottom-left**: Useful for credits and sources

### Transitions

- **fade**: Universal, works for any content
- **slide-up**: Good for revealing content from bottom
- **zoom-in**: Creates focus and emphasis
- **crossfade**: Best for smooth image changes

## 🔧 Advanced Configuration

### Using Grist Attachments

Instead of external URLs, you can use Grist attachments:

1. Add an Attachment column to `Scrollytelling_Scenes`
2. Upload your images
3. Use the attachment URL in `image_url` column

### Dynamic Content

You can use Grist formulas to generate dynamic content:

```python
# In text_content column
f"# Scene {$scene_order}\n\nData updated: {$last_update}"
```

### Multiple Stories

Create multiple configurations by:
1. Duplicating the `Scrollytelling_Scenes` table
2. Add a `story_id` column
3. Filter scenes by story

## 🐛 Troubleshooting

**Scenes not showing?**
- Check that `enabled` column is `True`
- Verify `scene_order` is set correctly
- Check browser console for errors

**Images not loading?**
- Verify image URLs are accessible
- Check CORS settings for external images
- Try using Grist attachments instead

**Transitions not smooth?**
- Reduce `transition_duration` for faster transitions
- Check browser performance
- Ensure images are optimized (< 500KB recommended)

## 📱 Mobile Support

The widget is responsive and works on mobile devices. For best mobile experience:
- Use shorter text content
- Test text positioning on small screens
- Consider using `snapped` scroll mode

## 🛠️ Development

### Local Development

```bash
# Install dependencies
cd packages/scrollytelling
npm install

# Start dev server
npm start

# Build for production
npm run build
```

### Technology Stack

- **React 18**: UI framework
- **Framer Motion**: Animation library
- **React Markdown**: Markdown rendering
- **Grist Widget API**: Data integration

## 📄 License

Apache-2.0

## 👤 Author

**nic01asFr**
- GitHub: [@nic01asFr](https://github.com/nic01asFr)

## 🤝 Contributing

Contributions welcome! Please read the main repository's contribution guidelines.

## 🔗 Links

- [Grist](https://www.getgrist.com/)
- [Widget Repository](https://github.com/nic01asFr/grist-widgets)
- [Documentation](https://github.com/nic01asFr/grist-widgets/tree/main/docs)
