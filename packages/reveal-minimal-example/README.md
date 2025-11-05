# Minimal Reveal.js Widget Example

This is a **minimal working example** of a Grist custom widget using Reveal.js for presentation-style interfaces.

## Purpose

This example demonstrates:
- ✅ Correct Reveal.js initialization in Grist iframe
- ✅ Avoiding common pitfalls (stack overflow, blank screen)
- ✅ Grist API integration (reading and writing data)
- ✅ Safe configuration for iframe contexts
- ✅ Proper layout updates after DOM changes

## Files

- `public/index.html` - Minimal HTML structure with slides
- `public/app.js` - Initialization logic and Grist integration
- `public/styles.css` - Required CSS for Reveal.js in iframes

## Quick Start

### 1. Local Testing

```bash
# From repository root
cd packages/reveal-minimal-example/public
python -m http.server 8000

# Open: http://localhost:8000
```

### 2. Test in Grist

1. Open a Grist document
2. Add a "Custom Widget" section
3. Set widget URL to: `http://localhost:8000`
4. (Optional) Create a table named "Inputs" with columns: `value` (Text), `timestamp` (DateTime)

### 3. Deploy to GitHub Pages

This widget will be automatically deployed with the repository to:
```
https://nic01asfr.github.io/grist-widgets/reveal-minimal-example/
```

## How It Works

### HTML Structure (index.html)

```html
<!-- Required structure -->
<div class="reveal">
    <div class="slides">
        <section>Your slide content</section>
        <section>Another slide</section>
    </div>
</div>
```

### Critical JavaScript (app.js)

```javascript
// 1. Polling for Reveal.js load
function waitForReveal() {
    if (typeof Reveal !== 'undefined') {
        initializeRevealJS();
    } else {
        setTimeout(waitForReveal, 100);
    }
}

// 2. Safe configuration
Reveal.initialize({
    hash: false,        // CRITICAL for iframes
    embedded: true,     // CRITICAL for iframe mode
    // NO percentage width/height!
});

// 3. Layout update after visibility changes
requestAnimationFrame(() => {
    Reveal.layout();
});
```

### Required CSS (styles.css)

```css
body {
    margin: 0;
    padding: 0;
    overflow: hidden;
}

.reveal {
    width: 100%;
    height: 100vh;
    position: relative;
    z-index: 1;
}
```

## Key Learnings

### ✅ DO
- Use `hash: false`
- Use `embedded: true`
- Use polling to wait for Reveal.js
- Call `Reveal.layout()` in `requestAnimationFrame` after DOM changes
- Set explicit dimensions on `.reveal` in CSS

### ❌ DON'T
- Don't use `width: '100%'` or `height: '100%'` in Reveal.initialize()
- Don't use `hash: true`
- Don't call `Reveal.sync()` in iframe contexts
- Don't assume Reveal.js loads synchronously

## Customization

### Add More Slides

Edit `index.html`:
```html
<section data-slide-id="my-slide">
    <h2>My Custom Slide</h2>
    <p>Content here</p>
</section>
```

### Change Theme

Replace in `index.html`:
```html
<!-- Change 'black' to: white, league, sky, beige, simple, serif, night, moon, solarized -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.css">
```

### Connect to Different Grist Table

Edit `app.js`:
```javascript
await docApi.applyUserActions([
    ['AddRecord', 'MyTable', null, {  // Change 'MyTable'
        my_column: value
    }]
]);
```

## Troubleshooting

### Slides Don't Appear
1. Check browser console for errors
2. Verify Reveal.js loaded: `typeof Reveal !== 'undefined'`
3. Check `.reveal` has dimensions (inspect element)
4. Try manually: `Reveal.layout()` in console

### Stack Overflow Error
- Remove any `width: '100%'` or `height: '100%'` from `Reveal.initialize()`
- Ensure `hash: false` is set

### Grist Data Not Loading
- Check table name matches in code
- Verify required columns exist
- Check console for API errors

## Reference

For complete documentation, see: `/docs/REVEAL_WIDGET_GUIDE.md`

## License

MIT - Feel free to use as a template for your own widgets!
